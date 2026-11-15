-- ---------------------------------------------------------------------------
-- 018 — Every patient and every institution carries a unique, permanent
-- platform identifier, issued by the database itself.
--
-- Patients:      Health ID      NG + 9 digits + Luhn check digit   e.g. NG 4471 0286 15
-- Institutions:  Institution ID  type prefix + 8 digits + Luhn       e.g. HOS 4821 9375 2
--
-- Both are generated on insert (no code path can forget), are unique by
-- constraint, carry a check digit so typos are caught, and cannot be changed
-- afterwards.
-- ---------------------------------------------------------------------------

-- Patients ------------------------------------------------------------------

-- Issue a Health ID for every patient row. Runs at commit (deferred), so code
-- that inserts its own Health ID in the same transaction still works, and any
-- path that forgets gets one automatically.
create or replace function app.issue_health_id() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if exists (select 1 from patients where id = new.id) and not exists (
       select 1 from health_identifiers where patient_id = new.id and identifier_type = 'platform_hid') then
    insert into health_identifiers(patient_id, identifier_type, value, is_primary)
    values (new.id, 'platform_hid', app.generate_health_id(), true);
  end if;
  return new;
end $$;

drop trigger if exists patients_issue_health_id on patients;
create constraint trigger patients_issue_health_id after insert on patients
  deferrable initially deferred
  for each row execute function app.issue_health_id();

-- Backfill: any patient created before this migration without a Health ID.
insert into health_identifiers(patient_id, identifier_type, value, is_primary)
select p.id, 'platform_hid', app.generate_health_id(),
       not exists (select 1 from health_identifiers h where h.patient_id = p.id and h.is_primary)
from patients p
where not exists (select 1 from health_identifiers h where h.patient_id = p.id and h.identifier_type = 'platform_hid');

-- A Health ID is permanent: it may be removed only together with the patient.
create or replace function app.protect_health_id() returns trigger
language plpgsql as $$
begin
  if old.identifier_type = 'platform_hid' and new.value is distinct from old.value then
    raise exception 'A Health ID cannot be changed once issued' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists health_identifiers_protect on health_identifiers;
create trigger health_identifiers_protect before update on health_identifiers
  for each row execute function app.protect_health_id();

alter table health_identifiers drop constraint if exists health_identifiers_platform_hid_format;
alter table health_identifiers add constraint health_identifiers_platform_hid_format
  check (identifier_type <> 'platform_hid' or app.is_valid_health_id(value));

-- Institutions --------------------------------------------------------------

create or replace function app.institution_code_prefix(p_type institution_type) returns text
language sql immutable as $$
  select case p_type
    when 'hospital' then 'HOS'
    when 'clinic' then 'CLN'
    when 'laboratory' then 'LAB'
    when 'diagnostic_centre' then 'DXC'
    when 'primary_health_centre' then 'PHC'
    when 'pharmacy' then 'PHA'
  end
$$;

create or replace function app.is_valid_institution_code(p_value text) returns boolean
language sql immutable as $$
  select p_value ~ '^(HOS|CLN|LAB|DXC|PHC|PHA)[1-9][0-9]{8}$'
     and app.luhn_check_digit(substr(p_value, 4, 8)) = substr(p_value, 12, 1)::integer
$$;

create or replace function app.generate_institution_code(p_type institution_type) returns text
language plpgsql volatile security definer set search_path = public, extensions, pg_temp as $$
declare
  body text;
  candidate text;
begin
  loop
    body := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 100000000)::text, 8, '0');
    if left(body, 1) = '0' then continue; end if;
    candidate := app.institution_code_prefix(p_type) || body || app.luhn_check_digit(body)::text;
    exit when not exists (select 1 from healthcare_institutions where institution_code = candidate);
  end loop;
  return candidate;
end $$;

alter table healthcare_institutions add column if not exists institution_code text;

update healthcare_institutions
   set institution_code = app.generate_institution_code(institution_type)
 where institution_code is null;

alter table healthcare_institutions alter column institution_code set not null;
alter table healthcare_institutions drop constraint if exists healthcare_institutions_code_uq;
alter table healthcare_institutions add constraint healthcare_institutions_code_uq unique (institution_code);
alter table healthcare_institutions drop constraint if exists healthcare_institutions_code_format;
alter table healthcare_institutions add constraint healthcare_institutions_code_format
  check (app.is_valid_institution_code(institution_code));

-- Issue on insert; never change afterwards (even if the type is corrected).
create or replace function app.manage_institution_code() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    new.institution_code := app.generate_institution_code(new.institution_type);
  elsif new.institution_code is distinct from old.institution_code then
    raise exception 'An Institution ID cannot be changed once issued' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists institutions_code on healthcare_institutions;
create trigger institutions_code before insert or update on healthcare_institutions
  for each row execute function app.manage_institution_code();

-- Show the Institution ID wherever a patient sees who is asking for access
-- (same function as in 005, with the institution code added).
create or replace function app.patient_request_detail(p_request uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v jsonb; v_patient uuid;
begin
  select patient_id into v_patient from access_requests where id = p_request;
  if v_patient is null or not app.can_act_for_patient(v_patient) then perform app.fail('NP404', 'Request not found.'); end if;
  select jsonb_build_object(
    'id', ar.id, 'reference', ar.reference, 'status', ar.status, 'purpose', ar.purpose, 'purpose_detail', ar.purpose_detail,
    'date_from', ar.date_from, 'date_to', ar.date_to, 'duration_days', ar.requested_duration_days,
    'created_at', ar.created_at, 'respond_by', ar.respond_by, 'decided_at', ar.decided_at, 'patient_id', ar.patient_id,
    'categories', (select jsonb_agg(category_key order by category_key) from access_request_categories where request_id = ar.id),
    'institution', jsonb_build_object('id', i.id, 'name', i.name, 'type', i.institution_type, 'status', i.status,
                                      'city', i.city, 'state', i.state, 'verified_at', i.reviewed_at,
                                      'code', i.institution_code),
    'professional', jsonb_build_object('name', hp.full_name, 'profession', hp.profession, 'verification', hp.verification_status,
                                       'license_body', hp.license_body,
                                       'role', (select r.name from professional_affiliations a join roles r on r.id = a.role_id
                                                where a.professional_id = hp.id and a.institution_id = i.id
                                                order by a.created_at desc limit 1)),
    'matching_records', (select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'category_key', r.category_key,
                                  'clinical_date', r.clinical_date, 'source', r.source) order by r.clinical_date desc nulls last)
                         from medical_records r
                         where r.patient_id = ar.patient_id and r.status in ('available','under_review')
                           and r.category_key in (select category_key from access_request_categories where request_id = ar.id)
                           and (ar.date_from is null or coalesce(r.clinical_date, r.created_at::date) >= ar.date_from)
                           and (ar.date_to is null or coalesce(r.clinical_date, r.created_at::date) <= ar.date_to)),
    'previous_requests', (select count(*) from access_requests x where x.patient_id = ar.patient_id
                          and x.institution_id = ar.institution_id and x.id <> ar.id))
  into v
  from access_requests ar
  join healthcare_institutions i on i.id = ar.institution_id
  join healthcare_professionals hp on hp.id = ar.requested_by_professional_id
  where ar.id = p_request;
  return v;
end $$;

-- The format checks run inside CHECK constraints for whoever writes the row.
grant execute on function app.is_valid_institution_code(text), app.institution_code_prefix(institution_type)
  to authenticated, service_role;

comment on column healthcare_institutions.institution_code is
  'Platform Institution ID: type prefix + 8 digits + Luhn check digit. Issued on insert, immutable.';
