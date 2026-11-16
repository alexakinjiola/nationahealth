-- ---------------------------------------------------------------------------
-- 020 — Emergency profile for permitted hospitals, referrals between
-- hospitals, maternal health, SMS reminders, and USSD/SMS phone access.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. Hospitals with access can see the emergency profile
-- ===========================================================================
-- Any active permission (consent or emergency access) at the institution is
-- enough, provided the patient chose to share their emergency profile.
create or replace function app.provider_health_profile(p_institution uuid, p_patient uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_reason text; v_perm uuid; v jsonb;
begin
  v_reason := app.provider_denial_reason(p_institution, 'records:view_authorized');
  v_perm := (app.active_permission_ids(p_institution, p_patient))[1];
  if v_reason is null and v_perm is null then v_reason := 'no_active_permission'; end if;
  if v_reason is not null then
    perform app.log_access('view_patient_summary', 'denied', p_institution, p_patient, null, 'emergency_profile', null, v_reason);
    return null;
  end if;
  select jsonb_build_object('blood_group', hp.blood_group, 'genotype', hp.genotype, 'allergies', hp.allergies,
           'chronic_conditions', hp.chronic_conditions, 'current_medications', hp.current_medications,
           'nhia_number', hp.nhia_number, 'hmo_name', hp.hmo_name, 'organ_donor', hp.organ_donor,
           'pregnant', hp.pregnant, 'disabilities', hp.disabilities, 'updated_at', hp.updated_at,
           'emergency_contact', (select jsonb_build_object('name', pp.emergency_contact_name, 'phone', pp.emergency_contact_phone,
                                   'relationship', pp.emergency_contact_relationship) from patient_profiles pp where pp.patient_id = p_patient))
    into v
    from patient_health_profiles hp where hp.patient_id = p_patient and hp.share_in_emergency;
  perform app.log_access('view_patient_summary', 'allowed', p_institution, p_patient, null, 'emergency_profile', v_perm, null,
                         'Emergency health profile');
  return v;
end $$;

-- ===========================================================================
-- 2. Referrals between hospitals
-- ===========================================================================
do $$ begin
  create type referral_status as enum ('awaiting_patient','declined_by_patient','sent','accepted','declined','completed','cancelled','expired');
exception when duplicate_object then null; end $$;
do $$ begin
  create type referral_urgency as enum ('routine','urgent','emergency');
exception when duplicate_object then null; end $$;

create table if not exists referrals (
  id                   uuid primary key default gen_random_uuid(),
  reference            text not null unique,
  patient_id           uuid not null references patients(id) on delete cascade,
  from_institution_id  uuid not null references healthcare_institutions(id),
  from_professional_id uuid not null references healthcare_professionals(id),
  from_user_id         uuid not null references users(id),
  to_institution_id    uuid not null references healthcare_institutions(id),
  specialty            text check (char_length(specialty) <= 120),
  reason               text not null check (char_length(reason) between 10 and 1000),
  clinical_summary     text check (char_length(clinical_summary) <= 4000),
  urgency              referral_urgency not null default 'routine',
  record_ids           uuid[] not null default '{}',
  status               referral_status not null default 'awaiting_patient',
  permission_id        uuid references permissions(id),
  respond_by           timestamptz not null,
  decided_at           timestamptz,
  responded_at         timestamptz,
  response_note        text check (char_length(response_note) <= 1000),
  appointment_at       timestamptz,
  created_at           timestamptz not null default now(),
  check (from_institution_id <> to_institution_id)
);
create index if not exists referrals_patient_idx on referrals(patient_id, created_at desc);
create index if not exists referrals_from_idx on referrals(from_institution_id, created_at desc);
create index if not exists referrals_to_idx on referrals(to_institution_id, created_at desc);
alter table referrals enable row level security;
alter table referrals force row level security;
drop policy if exists referrals_read on referrals;
create policy referrals_read on referrals for select to authenticated using (
  app.can_act_for_patient(patient_id) or app.is_institution_member(from_institution_id)
  or (app.is_institution_member(to_institution_id) and status not in ('awaiting_patient','declined_by_patient','cancelled')));
grant select on referrals to authenticated;
grant all on referrals to service_role;

create or replace function app.create_referral(
  p_from_institution uuid, p_patient uuid, p_to_code text, p_specialty text, p_reason text, p_summary text,
  p_urgency referral_urgency, p_record_ids uuid[]) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_to healthcare_institutions%rowtype; v_from_name text; v_id uuid; v_ref text; v_code text;
begin
  if not app.has_capability(p_from_institution, 'records:view_authorized') or not app.has_capability(p_from_institution, 'records:submit') then
    perform app.fail('NP403', 'Only verified clinicians can refer patients.');
  end if;
  if cardinality(app.active_permission_ids(p_from_institution, p_patient)) = 0
     and not exists (select 1 from care_relationships where patient_id = p_patient and institution_id = p_from_institution) then
    perform app.fail('NP403', 'You can only refer patients your institution is caring for.');
  end if;
  v_code := upper(regexp_replace(coalesce(p_to_code, ''), '[^A-Za-z0-9]', '', 'g'));
  select * into v_to from healthcare_institutions where institution_code = v_code;
  if not found or v_to.status <> 'approved' then perform app.fail('NP404', 'No verified institution has that Institution ID.'); end if;
  if v_to.id = p_from_institution then perform app.fail('NP400', 'Choose a different institution to refer to.'); end if;
  if char_length(trim(coalesce(p_reason, ''))) < 10 then perform app.fail('NP400', 'Give the reason for referral in at least 10 characters.'); end if;
  -- Every attached record must already be visible to the referring institution.
  if exists (select 1 from unnest(coalesce(p_record_ids, '{}')) rid
             left join medical_records r on r.id = rid
             where r.id is null or r.patient_id <> p_patient
                or (r.institution_id is distinct from p_from_institution and app.authorizing_permission(p_from_institution, rid) is null)) then
    perform app.fail('NP403', 'You can only send records your institution is allowed to see.');
  end if;
  v_ref := app.short_ref('REF');
  insert into referrals(reference, patient_id, from_institution_id, from_professional_id, from_user_id, to_institution_id,
                        specialty, reason, clinical_summary, urgency, record_ids, respond_by)
  values (v_ref, p_patient, p_from_institution, app.current_professional_id(), app.uid(), v_to.id,
          nullif(trim(p_specialty), ''), trim(p_reason), nullif(trim(p_summary), ''), coalesce(p_urgency, 'routine'),
          coalesce(p_record_ids, '{}'), now() + interval '7 days')
  returning id into v_id;
  select name into v_from_name from healthcare_institutions where id = p_from_institution;
  perform app.audit('referral.created', 'referral', v_id::text, p_patient, p_from_institution,
                    jsonb_build_object('reference', v_ref, 'to', v_to.name, 'records', cardinality(coalesce(p_record_ids, '{}')), 'urgency', p_urgency));
  perform app.notify_patient(p_patient, 'referral', 'You have been referred',
    format('%s would like to refer you to %s and send %s of your records with the referral. Nothing is shared until you agree.',
           v_from_name, v_to.name, cardinality(coalesce(p_record_ids, '{}'))), '/referrals', 'warning');
  return v_id;
end $$;

create or replace function app.patient_decide_referral(p_referral uuid, p_approve boolean, p_days integer default 30) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_r referrals%rowtype; v_perm uuid; v_cat text; v_rec uuid; v_to_name text; v_cats text[]; v_consent uuid; v_from date; v_to date;
begin
  select * into v_r from referrals where id = p_referral for update;
  if not found or not app.can_act_for_patient(v_r.patient_id) then perform app.fail('NP404', 'Referral not found.'); end if;
  if v_r.status <> 'awaiting_patient' then perform app.fail('NP409', 'This referral has already been answered.'); end if;
  if v_r.respond_by <= now() then
    update referrals set status = 'expired' where id = p_referral;
    perform app.fail('NP409', 'This referral expired. Ask your clinician to send it again.');
  end if;
  select name into v_to_name from healthcare_institutions where id = v_r.to_institution_id;
  if not p_approve then
    update referrals set status = 'declined_by_patient', decided_at = now() where id = p_referral;
    perform app.audit('referral.declined_by_patient', 'referral', p_referral::text, v_r.patient_id, v_r.from_institution_id, '{}');
    perform app.notify(v_r.from_user_id, 'referral', 'Referral declined by the patient',
      format('Referral %s to %s was declined by the patient. No records were shared.', v_r.reference, v_to_name), '/provider/referrals', 'warning');
    return;
  end if;
  v_consent := app.latest_consent_version('access_grant');
  select array_agg(distinct category_key), min(coalesce(clinical_date, created_at::date)), max(coalesce(clinical_date, created_at::date))
    into v_cats, v_from, v_to from medical_records where id = any(v_r.record_ids);
  insert into permissions(reference, patient_id, institution_id, purpose, purpose_detail, authorization_basis, consent_version_id,
                          granted_by_user_id, valid_from, expires_at)
  values (app.short_ref('PRM'), v_r.patient_id, v_r.to_institution_id, 'referral', 'Referral ' || v_r.reference || ': ' || v_r.reason,
          case when exists (select 1 from patients where id = v_r.patient_id and user_id = app.uid()) then 'patient_consent'::authorization_basis else 'representative_consent'::authorization_basis end,
          v_consent, app.uid(), now(), now() + make_interval(days => greatest(1, least(coalesce(p_days, 30), 90))))
  returning id into v_perm;
  -- Only the attached records are shared; with none attached the hospital sees the referral letter only.
  foreach v_cat in array coalesce(v_cats, '{}') loop
    for v_rec in select id from medical_records where id = any(v_r.record_ids) and category_key = v_cat loop
      insert into permission_scopes(permission_id, category_key, record_id) values (v_perm, v_cat, v_rec);
    end loop;
  end loop;
  update referrals set status = 'sent', decided_at = now(), permission_id = v_perm where id = p_referral;
  insert into care_relationships(patient_id, institution_id, established_via) values (v_r.patient_id, v_r.to_institution_id, 'access_permission')
    on conflict (patient_id, institution_id) do nothing;
  perform app.audit('permission.granted', 'permission', v_perm::text, v_r.patient_id, v_r.to_institution_id,
                    jsonb_build_object('referral', v_r.reference, 'specific_records', cardinality(v_r.record_ids), 'days', p_days));
  perform app.audit('referral.sent', 'referral', p_referral::text, v_r.patient_id, v_r.to_institution_id, jsonb_build_object('reference', v_r.reference));
  perform app.notify_institution(v_r.to_institution_id, 'records:view_authorized', 'referral', 'New referral received',
    format('Referral %s (%s) is waiting for your team.', v_r.reference, v_r.urgency), '/provider/referrals', (case when v_r.urgency = 'routine' then 'info' else 'warning' end)::notification_severity);
  perform app.notify(v_r.from_user_id, 'referral', 'Referral sent', format('The patient agreed. Referral %s has been sent to %s.', v_r.reference, v_to_name), '/provider/referrals', 'success');
end $$;

create or replace function app.institution_respond_referral(p_referral uuid, p_status referral_status, p_note text, p_appointment timestamptz default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_r referrals%rowtype; v_to_name text;
begin
  select * into v_r from referrals where id = p_referral for update;
  if not found or not app.has_capability(v_r.to_institution_id, 'records:view_authorized') then perform app.fail('NP404', 'Referral not found.'); end if;
  if not (p_status in ('accepted','declined','completed')) then perform app.fail('NP400', 'Unknown response.'); end if;
  if not ((v_r.status = 'sent' and p_status in ('accepted','declined')) or (v_r.status = 'accepted' and p_status in ('completed','declined'))) then
    perform app.fail('NP409', 'This referral can''t be changed now.');
  end if;
  if p_status = 'declined' and char_length(trim(coalesce(p_note, ''))) < 5 then perform app.fail('NP400', 'Say why the referral can''t be taken.'); end if;
  update referrals set status = p_status, responded_at = now(), response_note = nullif(trim(p_note), ''),
         appointment_at = coalesce(p_appointment, appointment_at) where id = p_referral;
  select name into v_to_name from healthcare_institutions where id = v_r.to_institution_id;
  perform app.audit('referral.' || p_status::text, 'referral', p_referral::text, v_r.patient_id, v_r.to_institution_id, jsonb_build_object('note', p_note));
  perform app.notify(v_r.from_user_id, 'referral', 'Referral ' || p_status::text,
    format('%s %s referral %s.', v_to_name, p_status::text, v_r.reference), '/provider/referrals', (case when p_status = 'declined' then 'warning' else 'success' end)::notification_severity);
  perform app.notify_patient(v_r.patient_id, 'referral', 'Update on your referral',
    format('%s has %s your referral%s.', v_to_name, p_status::text,
           case when p_appointment is not null then ' and booked an appointment for ' || to_char(p_appointment at time zone 'Africa/Lagos', 'DD Mon YYYY HH24:MI') else '' end),
    '/referrals', 'info');
  if p_status = 'accepted' and p_appointment is not null then
    insert into reminders(patient_id, created_by_user_id, kind, title, appointment_at, remind_before_hours, next_due_at)
    values (v_r.patient_id, app.uid(), 'appointment', 'Referral appointment at ' || v_to_name, p_appointment, 24, p_appointment - interval '24 hours');
  end if;
end $$;

create or replace function app.cancel_referral(p_referral uuid, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_r referrals%rowtype;
begin
  select * into v_r from referrals where id = p_referral for update;
  if not found or not app.has_capability(v_r.from_institution_id, 'records:view_authorized') then perform app.fail('NP404', 'Referral not found.'); end if;
  if v_r.status not in ('awaiting_patient','sent','accepted') then perform app.fail('NP409', 'This referral is already closed.'); end if;
  update referrals set status = 'cancelled', response_note = nullif(trim(p_note), '') where id = p_referral;
  if v_r.permission_id is not null then
    update permissions set status = 'revoked', revoked_at = now(), revoked_by_user_id = app.uid() where id = v_r.permission_id and status = 'active';
  end if;
  perform app.audit('referral.cancelled', 'referral', p_referral::text, v_r.patient_id, v_r.from_institution_id, jsonb_build_object('note', p_note));
end $$;

create or replace function app.provider_referrals(p_institution uuid)
returns table (id uuid, reference text, direction text, status referral_status, urgency referral_urgency, specialty text, reason text,
               clinical_summary text, record_count integer, patient_id uuid, patient_name text, health_id text, other_institution text,
               other_code text, referrer text, created_at timestamptz, respond_by timestamptz, responded_at timestamptz,
               response_note text, appointment_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_institution_member(p_institution) then perform app.fail('NP403', 'Not permitted.'); end if;
  return query
    select r.id, r.reference, case when r.from_institution_id = p_institution then 'outgoing' else 'incoming' end, r.status, r.urgency,
           r.specialty, r.reason, r.clinical_summary, cardinality(r.record_ids), r.patient_id,
           case when r.from_institution_id = p_institution or r.status not in ('awaiting_patient','declined_by_patient')
                then pp.full_name else app.mask_name(pp.full_name) end,
           (select h.value from health_identifiers h where h.patient_id = r.patient_id and h.identifier_type = 'platform_hid'),
           oi.name, oi.institution_code, hp.full_name, r.created_at, r.respond_by, r.responded_at, r.response_note, r.appointment_at
    from referrals r
    join patient_profiles pp on pp.patient_id = r.patient_id
    join healthcare_institutions oi on oi.id = case when r.from_institution_id = p_institution then r.to_institution_id else r.from_institution_id end
    join healthcare_professionals hp on hp.id = r.from_professional_id
    where r.from_institution_id = p_institution
       or (r.to_institution_id = p_institution and r.status not in ('awaiting_patient','declined_by_patient','cancelled'))
    order by r.created_at desc limit 200;
end $$;

create or replace function app.patient_referrals(p_patient uuid)
returns table (id uuid, reference text, status referral_status, urgency referral_urgency, specialty text, reason text,
               from_institution text, to_institution text, to_code text, referrer text, records jsonb, created_at timestamptz,
               respond_by timestamptz, response_note text, appointment_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.can_act_for_patient(p_patient) then perform app.fail('NP403', 'Not permitted.'); end if;
  return query
    select r.id, r.reference, r.status, r.urgency, r.specialty, r.reason, fi.name, ti.name, ti.institution_code, hp.full_name,
           coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'category_key', m.category_key, 'clinical_date', m.clinical_date))
                     from medical_records m where m.id = any(r.record_ids)), '[]'),
           r.created_at, r.respond_by, r.response_note, r.appointment_at
    from referrals r
    join healthcare_institutions fi on fi.id = r.from_institution_id
    join healthcare_institutions ti on ti.id = r.to_institution_id
    join healthcare_professionals hp on hp.id = r.from_professional_id
    where r.patient_id = p_patient order by r.created_at desc;
end $$;

-- ===========================================================================
-- 3. Maternal health
-- ===========================================================================
create table if not exists pregnancies (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  lmp           date not null check (lmp <= current_date and lmp > current_date - 320),
  edd           date not null,
  gravida       smallint check (gravida between 1 and 20),
  parity        smallint check (parity between 0 and 20),
  booking_facility text check (char_length(booking_facility) <= 200),
  risk_notes    text check (char_length(risk_notes) <= 1000),
  status        text not null default 'active' check (status in ('active','delivered','ended')),
  outcome_date  date,
  created_by_user_id uuid not null references users(id),
  created_at    timestamptz not null default now()
);
create unique index if not exists pregnancies_one_active on pregnancies(patient_id) where status = 'active';

create table if not exists antenatal_visits (
  id             uuid primary key default gen_random_uuid(),
  pregnancy_id   uuid not null references pregnancies(id) on delete cascade,
  visit_date     date not null check (visit_date <= current_date + 1),
  bp_systolic    smallint check (bp_systolic between 60 and 260),
  bp_diastolic   smallint check (bp_diastolic between 30 and 180),
  weight_kg      numeric(5,1) check (weight_kg between 25 and 250),
  haemoglobin    numeric(4,1) check (haemoglobin between 3 and 20),
  fundal_height_cm smallint check (fundal_height_cm between 5 and 50),
  notes          text check (char_length(notes) <= 1000),
  next_visit_date date,
  source         text not null default 'patient' check (source in ('patient','institution')),
  institution_id uuid references healthcare_institutions(id),
  recorded_by_user_id uuid not null references users(id),
  created_at     timestamptz not null default now()
);
create index if not exists antenatal_visits_preg_idx on antenatal_visits(pregnancy_id, visit_date);

alter table pregnancies enable row level security; alter table pregnancies force row level security;
alter table antenatal_visits enable row level security; alter table antenatal_visits force row level security;
drop policy if exists pregnancies_self on pregnancies;
create policy pregnancies_self on pregnancies for select to authenticated using (app.can_act_for_patient(patient_id));
drop policy if exists anc_self on antenatal_visits;
create policy anc_self on antenatal_visits for select to authenticated
  using (exists (select 1 from pregnancies p where p.id = pregnancy_id and app.can_act_for_patient(p.patient_id)));
grant select on pregnancies, antenatal_visits to authenticated;
grant all on pregnancies, antenatal_visits to service_role;

create or replace function app.start_pregnancy(p_patient uuid, p_lmp date, p_gravida smallint, p_parity smallint, p_facility text, p_notes text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if not app.can_act_for_patient(p_patient) then perform app.fail('NP403', 'Not permitted.'); end if;
  if exists (select 1 from pregnancies where patient_id = p_patient and status = 'active') then perform app.fail('NP409', 'A pregnancy is already being tracked.'); end if;
  insert into pregnancies(patient_id, lmp, edd, gravida, parity, booking_facility, risk_notes, created_by_user_id)
  values (p_patient, p_lmp, p_lmp + 280, p_gravida, p_parity, nullif(trim(p_facility), ''), nullif(trim(p_notes), ''), app.uid()) returning id into v_id;
  perform app.audit('record.pregnancy_started', 'pregnancy', v_id::text, p_patient, null, '{}');
  return v_id;
end $$;

create or replace function app.add_antenatal_visit(p_pregnancy uuid, p_date date, p_sys smallint, p_dia smallint, p_weight numeric,
  p_hb numeric, p_fundal smallint, p_notes text, p_next date) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_p pregnancies%rowtype; v_id uuid;
begin
  select * into v_p from pregnancies where id = p_pregnancy;
  if not found or not app.can_act_for_patient(v_p.patient_id) then perform app.fail('NP404', 'Pregnancy not found.'); end if;
  if v_p.status <> 'active' then perform app.fail('NP409', 'This pregnancy is no longer being tracked.'); end if;
  if p_next is not null and p_next <= p_date then perform app.fail('NP400', 'The next visit must be after this one.'); end if;
  insert into antenatal_visits(pregnancy_id, visit_date, bp_systolic, bp_diastolic, weight_kg, haemoglobin, fundal_height_cm, notes, next_visit_date, recorded_by_user_id)
  values (p_pregnancy, p_date, p_sys, p_dia, p_weight, p_hb, p_fundal, nullif(trim(p_notes), ''), p_next, app.uid()) returning id into v_id;
  -- Remind the day before the next visit, at 08:00 Lagos time.
  if p_next is not null then
    update reminders set active = false where patient_id = v_p.patient_id and kind = 'antenatal' and active;
    insert into reminders(patient_id, created_by_user_id, kind, title, appointment_at, remind_before_hours, next_due_at)
    values (v_p.patient_id, app.uid(), 'antenatal', 'Antenatal clinic visit', (p_next::timestamp + time '09:00') at time zone 'Africa/Lagos', 25,
            ((p_next - 1)::timestamp + time '08:00') at time zone 'Africa/Lagos');
  end if;
  return v_id;
end $$;

create or replace function app.end_pregnancy(p_pregnancy uuid, p_status text, p_date date) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_p pregnancies%rowtype;
begin
  select * into v_p from pregnancies where id = p_pregnancy for update;
  if not found or not app.can_act_for_patient(v_p.patient_id) then perform app.fail('NP404', 'Pregnancy not found.'); end if;
  if p_status not in ('delivered','ended') then perform app.fail('NP400', 'Unknown outcome.'); end if;
  update pregnancies set status = p_status, outcome_date = coalesce(p_date, current_date) where id = p_pregnancy;
  update reminders set active = false where patient_id = v_p.patient_id and kind = 'antenatal' and active;
end $$;

-- ===========================================================================
-- 4. Reminders (medicines, appointments, antenatal, immunisation) by SMS
-- ===========================================================================
-- Times are quarter hours ("07:30"), matching how often the reminder job runs.
create or replace function app.valid_reminder_times(p_times text[]) returns boolean
language sql immutable as $$
  select coalesce(bool_and(t ~ '^([01][0-9]|2[0-3]):(00|15|30|45)$'), true) from unnest(p_times) t
$$;
grant execute on function app.valid_reminder_times(text[]) to authenticated, service_role;

create table if not exists reminders (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references patients(id) on delete cascade,
  created_by_user_id  uuid references users(id),
  kind                text not null check (kind in ('medication','appointment','antenatal','immunisation','custom')),
  title               text not null check (char_length(title) between 2 and 120),
  times               text[] not null default '{}' check (app.valid_reminder_times(times)),
  starts_on           date not null default current_date,
  ends_on             date,
  appointment_at      timestamptz,
  remind_before_hours smallint not null default 24 check (remind_before_hours between 1 and 168),
  channel             text not null default 'sms' check (channel in ('sms','email')),
  include_details     boolean not null default false,
  active              boolean not null default true,
  next_due_at         timestamptz,
  last_sent_at        timestamptz,
  sent_count          integer not null default 0,
  created_at          timestamptz not null default now(),
  check (kind <> 'medication' or cardinality(times) between 1 and 6)
);
create index if not exists reminders_due_idx on reminders(next_due_at) where active;
alter table reminders enable row level security; alter table reminders force row level security;
drop policy if exists reminders_self on reminders;
create policy reminders_self on reminders for select to authenticated using (app.can_act_for_patient(patient_id));
grant select on reminders to authenticated;
grant all on reminders to service_role;

alter table patient_profiles add column if not exists sms_reminders_enabled boolean not null default true;
grant update (sms_reminders_enabled) on patient_profiles to authenticated;

-- Next medicine time after `p_after`, in Lagos time.
create or replace function app.next_medication_time(p_times text[], p_starts date, p_ends date, p_after timestamptz) returns timestamptz
language sql stable as $$
  select min(ts) from (
    select ((d::date)::timestamp + t::time) at time zone 'Africa/Lagos' as ts
    from generate_series(greatest(p_starts, (p_after at time zone 'Africa/Lagos')::date), (p_after at time zone 'Africa/Lagos')::date + 2, interval '1 day') d
    cross join unnest(p_times) t
  ) x where ts > p_after and (p_ends is null or (ts at time zone 'Africa/Lagos')::date <= p_ends)
$$;

create or replace function app.save_reminder(
  p_patient uuid, p_reminder uuid, p_kind text, p_title text, p_times text[], p_starts date, p_ends date,
  p_appointment timestamptz, p_before smallint, p_channel text, p_details boolean, p_active boolean) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_next timestamptz;
begin
  if not app.can_act_for_patient(p_patient) then perform app.fail('NP403', 'Not permitted.'); end if;
  if p_kind = 'medication' then
    if coalesce(cardinality(p_times), 0) = 0 then perform app.fail('NP400', 'Add at least one time of day.'); end if;
    v_next := app.next_medication_time(p_times, coalesce(p_starts, current_date), p_ends, now());
  else
    if p_appointment is null then perform app.fail('NP400', 'Choose the date and time.'); end if;
    if p_appointment <= now() then perform app.fail('NP400', 'Choose a time in the future.'); end if;
    v_next := greatest(now() + interval '1 minute', p_appointment - make_interval(hours => coalesce(p_before, 24)));
  end if;
  if p_reminder is null then
    insert into reminders(patient_id, created_by_user_id, kind, title, times, starts_on, ends_on, appointment_at, remind_before_hours,
                          channel, include_details, active, next_due_at)
    values (p_patient, app.uid(), p_kind, trim(p_title), coalesce(p_times, '{}'), coalesce(p_starts, current_date), p_ends, p_appointment,
            coalesce(p_before, 24), coalesce(p_channel, 'sms'), coalesce(p_details, false), true, v_next) returning id into v_id;
  else
    update reminders set title = trim(p_title), times = coalesce(p_times, '{}'), starts_on = coalesce(p_starts, starts_on), ends_on = p_ends,
           appointment_at = p_appointment, remind_before_hours = coalesce(p_before, 24), channel = coalesce(p_channel, channel),
           include_details = coalesce(p_details, false), active = coalesce(p_active, true), next_due_at = v_next
     where id = p_reminder and patient_id = p_patient returning id into v_id;
    if v_id is null then perform app.fail('NP404', 'Reminder not found.'); end if;
  end if;
  return v_id;
end $$;

create or replace function app.delete_reminder(p_patient uuid, p_reminder uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.can_act_for_patient(p_patient) then perform app.fail('NP403', 'Not permitted.'); end if;
  delete from reminders where id = p_reminder and patient_id = p_patient;
end $$;

-- Reminder text in the patient's language. Clinical detail only when the patient opted in.
create or replace function app.reminder_text(p_lang text, p_kind text, p_title text, p_details boolean, p_when timestamptz) returns text
language sql immutable as $$
  select case coalesce(p_lang, 'en')
    when 'ha' then case p_kind
      when 'medication' then 'Tunatarwa: lokacin shan magani ya yi' || case when p_details then ' (' || p_title || ')' else '' end || '.'
      when 'antenatal' then 'Tunatarwa: kuna da ziyarar asibitin mata masu ciki gobe.'
      else 'Tunatarwa: kuna da alƙawari a ' || to_char(p_when at time zone 'Africa/Lagos', 'DD/MM HH24:MI') || case when p_details then ' - ' || p_title else '' end || '.' end
    when 'yo' then case p_kind
      when 'medication' then 'Ìrántí: àsìkò láti lo oògùn rẹ ti tó' || case when p_details then ' (' || p_title || ')' else '' end || '.'
      when 'antenatal' then 'Ìrántí: o ní àbẹ̀wò ilé-ìwòsàn aboyún lọ́la.'
      else 'Ìrántí: o ní ìpàdé ní ' || to_char(p_when at time zone 'Africa/Lagos', 'DD/MM HH24:MI') || case when p_details then ' - ' || p_title else '' end || '.' end
    when 'ig' then case p_kind
      when 'medication' then 'Ncheta: oge ị ṅụ ọgwụ gị eruola' || case when p_details then ' (' || p_title || ')' else '' end || '.'
      when 'antenatal' then 'Ncheta: ị nwere nleta ụlọ ọgwụ ime echi.'
      else 'Ncheta: ị nwere oge nhọpụta na ' || to_char(p_when at time zone 'Africa/Lagos', 'DD/MM HH24:MI') || case when p_details then ' - ' || p_title else '' end || '.' end
    when 'pcm' then case p_kind
      when 'medication' then 'Reminder: time don reach to take your medicine' || case when p_details then ' (' || p_title || ')' else '' end || '.'
      when 'antenatal' then 'Reminder: you get antenatal clinic visit tomorrow.'
      else 'Reminder: you get appointment for ' || to_char(p_when at time zone 'Africa/Lagos', 'DD/MM HH24:MI') || case when p_details then ' - ' || p_title else '' end || '.' end
    else case p_kind
      when 'medication' then 'Reminder: it''s time for your medicine' || case when p_details then ' (' || p_title || ')' else '' end || '.'
      when 'antenatal' then 'Reminder: you have an antenatal clinic visit tomorrow.'
      when 'immunisation' then 'Reminder: a child''s vaccination is due on ' || to_char(p_when at time zone 'Africa/Lagos', 'DD/MM') || '.'
      else 'Reminder: you have an appointment on ' || to_char(p_when at time zone 'Africa/Lagos', 'DD/MM at HH24:MI') || case when p_details then ' - ' || p_title else '' end || '.' end
  end || ' Reply STOP to pause SMS reminders.'
$$;

-- Queue every due reminder and work out the next one. Safe to run often.
create or replace function app.run_reminders(p_limit integer default 500) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; v_queued integer := 0; v_skipped integer := 0; v_to text; v_next timestamptz;
begin
  for r in
    select rm.*, pp.phone, pp.preferred_language, pp.sms_reminders_enabled, u.email, u.id as uid
    from reminders rm
    join patient_profiles pp on pp.patient_id = rm.patient_id
    join patients p on p.id = rm.patient_id
    left join users u on u.id = p.user_id
    where rm.active and rm.next_due_at <= now()
    order by rm.next_due_at limit p_limit for update of rm skip locked
  loop
    v_to := case when r.channel = 'sms' then r.phone else r.email end;
    if v_to is not null and (r.channel <> 'sms' or r.sms_reminders_enabled) then
      insert into message_outbox(channel, recipient, user_id, template, subject, body)
      values (r.channel, v_to, r.uid, 'reminder_' || r.kind, case when r.channel = 'email' then 'Reminder' end,
              app.reminder_text(r.preferred_language, r.kind, r.title, r.include_details, coalesce(r.appointment_at, r.next_due_at)));
      v_queued := v_queued + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
    if r.kind = 'medication' then
      v_next := app.next_medication_time(r.times, r.starts_on, r.ends_on, greatest(now(), r.next_due_at));
      update reminders set last_sent_at = now(), sent_count = sent_count + 1, next_due_at = v_next, active = v_next is not null where id = r.id;
    else
      update reminders set last_sent_at = now(), sent_count = sent_count + 1, active = false where id = r.id;
    end if;
  end loop;
  return jsonb_build_object('queued', v_queued, 'skipped', v_skipped);
end $$;

-- ===========================================================================
-- 5. Phone access: USSD PIN and SMS commands
-- ===========================================================================
create table if not exists phone_access (
  patient_id      uuid primary key references patients(id) on delete cascade,
  pin_hash        text not null,
  failed_attempts smallint not null default 0,
  locked_until    timestamptz,
  enabled         boolean not null default true,
  updated_at      timestamptz not null default now()
);
alter table phone_access enable row level security; alter table phone_access force row level security;
grant all on phone_access to service_role;

create table if not exists ussd_sessions (
  session_id  text primary key,
  phone       text not null,
  patient_id  uuid references patients(id) on delete cascade,
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table ussd_sessions enable row level security; alter table ussd_sessions force row level security;
grant all on ussd_sessions to service_role;

-- ===========================================================================
-- 6. Grants
-- ===========================================================================
grant execute on function
  app.provider_health_profile(uuid, uuid),
  app.create_referral(uuid, uuid, text, text, text, text, referral_urgency, uuid[]),
  app.patient_decide_referral(uuid, boolean, integer), app.institution_respond_referral(uuid, referral_status, text, timestamptz),
  app.cancel_referral(uuid, text), app.provider_referrals(uuid), app.patient_referrals(uuid),
  app.start_pregnancy(uuid, date, smallint, smallint, text, text),
  app.add_antenatal_visit(uuid, date, smallint, smallint, numeric, numeric, smallint, text, date), app.end_pregnancy(uuid, text, date),
  app.save_reminder(uuid, uuid, text, text, text[], date, date, timestamptz, smallint, text, boolean, boolean), app.delete_reminder(uuid, uuid),
  app.next_medication_time(text[], date, date, timestamptz), app.reminder_text(text, text, text, boolean, timestamptz)
to authenticated, service_role;
grant execute on function app.run_reminders(integer) to service_role;
