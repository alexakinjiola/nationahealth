-- ---------------------------------------------------------------------------
-- 019 — Super-admin oversight access, configurable roles and user management,
-- emergency health profile, public facility directory and national reports.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. Capability catalogue
-- ===========================================================================
create table if not exists capabilities (
  key          text primary key check (key ~ '^[a-z_]+:[a-z_]+$'),
  scope        role_scope not null,
  label        text not null,
  description  text not null,
  is_clinical  boolean not null default false,
  sort_order   smallint not null default 100
);
alter table capabilities enable row level security;
alter table capabilities force row level security;
drop policy if exists capabilities_read on capabilities;
create policy capabilities_read on capabilities for select to authenticated using (true);
grant select on capabilities to authenticated, service_role;

insert into capabilities(key, scope, label, description, is_clinical, sort_order) values
  ('institutions:review', 'platform', 'Review institutions',        'Approve, reject and suspend hospitals, clinics and labs.', false, 10),
  ('professionals:review','platform', 'Verify professionals',       'Check and verify clinician licences.', false, 20),
  ('patients:support',    'platform', 'Patient account support',    'See patient account metadata, verify identity, lock or unlock accounts.', false, 30),
  ('support:manage',      'platform', 'Handle support tickets',     'Answer and resolve support requests.', false, 40),
  ('settings:manage',     'platform', 'Manage system settings',     'Change platform-wide configuration.', false, 50),
  ('security:monitor',    'platform', 'Monitor security',           'See security incidents and access anomalies.', false, 60),
  ('audit:read',          'platform', 'Read audit logs',            'Search the tamper-evident audit trail.', false, 70),
  ('emergency:review',    'platform', 'Review emergency access',    'Review break-glass access after the fact.', false, 80),
  ('reports:view',        'platform', 'View national reports',      'See aggregate, de-identified statistics and charts.', false, 90),
  ('users:manage',        'platform', 'Manage platform users',      'Invite platform staff and assign their roles.', false, 100),
  ('roles:manage',        'platform', 'Manage roles',               'Create custom roles and choose their permissions.', false, 110),
  ('records:oversight',   'platform', 'Oversight access to records','Open a patient''s clinical record for a stated reason. Time-limited, fully audited and visible to the patient.', true, 120),
  ('staff:manage',        'institution', 'Manage staff',            'Invite staff, change their roles and remove access.', false, 10),
  ('institution:manage',  'institution', 'Manage institution profile', 'Edit the institution profile and licensing documents.', false, 20),
  ('activity:view',       'institution', 'View activity logs',      'See who in the institution accessed which records.', false, 30),
  ('integrations:manage', 'institution', 'Manage integrations',     'Connect hospital systems and manage API keys.', false, 40),
  ('access:request',      'institution', 'Request patient access',  'Search by Health ID and ask patients for access.', false, 50),
  ('records:view_authorized','institution','View authorised records','Open records a patient has granted access to.', true, 60),
  ('records:submit',      'institution', 'Submit records',          'Add new records to a patient''s history.', true, 70),
  ('emergency:access',    'institution', 'Emergency access',        'Use time-limited break-glass access in an emergency.', true, 80)
on conflict (key) do update set label = excluded.label, description = excluded.description,
  is_clinical = excluded.is_clinical, sort_order = excluded.sort_order, scope = excluded.scope;

-- ===========================================================================
-- 2. Roles: custom roles per institution / platform, new system roles
-- ===========================================================================
alter table roles add column if not exists institution_id uuid references healthcare_institutions(id) on delete cascade;
alter table roles add column if not exists is_system boolean not null default true;
alter table roles add column if not exists created_by uuid references users(id);
alter table roles drop constraint if exists roles_custom_scope;
alter table roles add constraint roles_custom_scope check (institution_id is null or scope = 'institution');

-- Platform admins keep their old powers; reports and user management are added.
update roles set capabilities = '{institutions:review,professionals:review,patients:support,settings:manage,reports:view,users:manage,roles:manage}',
                 description = 'Verifies institutions and professionals, manages settings, users and roles, and sees national reports. No clinical access.'
 where key = 'platform_admin';

insert into roles(key, scope, name, description, capabilities) values
  ('super_admin', 'platform', 'Super administrator',
   'Full platform control, including time-limited oversight access to patient records. Every record view is audited and shown to the patient.',
   (select array_agg(key order by sort_order) from capabilities where scope = 'platform')),
  ('analyst', 'platform', 'Health data analyst',
   'Sees de-identified national reports and charts only. No access to individual patients.', '{reports:view}')
on conflict (key) do update set capabilities = excluded.capabilities, description = excluded.description;

-- The owner's bootstrap admin becomes the first super admin.
insert into user_platform_roles(user_id, role_id)
select upr.user_id, (select id from roles where key = 'super_admin')
from user_platform_roles upr join roles r on r.id = upr.role_id
where r.key = 'platform_admin'
  and not exists (select 1 from user_platform_roles x join roles rx on rx.id = x.role_id where rx.key = 'super_admin')
  and upr.user_id = (select upr2.user_id from user_platform_roles upr2 join roles r2 on r2.id = upr2.role_id
                      where r2.key = 'platform_admin' order by upr2.granted_at limit 1)
on conflict do nothing;

-- Capabilities held by the current user across all their platform roles.
create or replace function app.platform_capabilities(p_user uuid default null) returns text[]
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(array_agg(distinct c), '{}')
  from user_platform_roles upr
  join roles r on r.id = upr.role_id and r.scope = 'platform'
  join users u on u.id = upr.user_id and u.status = 'active'
  cross join lateral unnest(r.capabilities) c
  where upr.user_id = coalesce(p_user, app.uid())
$$;

create or replace function app.has_platform_capability(p_cap text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select p_cap = any(app.platform_capabilities())
$$;

-- A user "has" a system platform role if they hold it, are a super admin, or
-- hold custom roles that together grant every capability that role grants.
-- Existing checks keep working with custom roles.
create or replace function app.has_platform_role(p_role text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
      select 1 from user_platform_roles upr
      join roles r on r.id = upr.role_id and r.scope = 'platform'
      join users u on u.id = upr.user_id and u.status = 'active'
      where upr.user_id = app.uid() and r.key in (p_role, 'super_admin'))
    or exists (
      select 1 from roles r where r.key = p_role and r.scope = 'platform'
        and cardinality(r.capabilities) > 0 and r.capabilities <@ app.platform_capabilities())
$$;

-- Validate a capability list against the catalogue for a scope.
create or replace function app.assert_capabilities(p_scope role_scope, p_caps text[]) returns void
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if p_caps is null or cardinality(p_caps) = 0 then perform app.fail('NP400', 'Choose at least one permission.'); end if;
  if exists (select 1 from unnest(p_caps) c where not exists (select 1 from capabilities k where k.key = c and k.scope = p_scope)) then
    perform app.fail('NP400', 'One of the chosen permissions is not available for this kind of role.');
  end if;
end $$;

-- ----- Institution roles ----------------------------------------------------
create or replace function app.institution_upsert_role(
  p_institution uuid, p_role uuid, p_name text, p_description text, p_caps text[]) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_role roles%rowtype;
begin
  if not app.has_capability(p_institution, 'staff:manage') then perform app.fail('NP403', 'Only institution administrators can manage roles.'); end if;
  if char_length(trim(coalesce(p_name, ''))) < 3 then perform app.fail('NP400', 'Give the role a name of at least 3 characters.'); end if;
  perform app.assert_capabilities('institution', p_caps);
  if p_role is null then
    insert into roles(key, scope, name, description, capabilities, institution_id, is_system, created_by)
    values ('custom_' || translate(replace(gen_random_uuid()::text, '-', ''), '0123456789', 'ghijklmnop'), 'institution', trim(p_name),
            coalesce(nullif(trim(p_description), ''), 'Custom role'), p_caps, p_institution, false, app.uid())
    returning id into v_id;
    perform app.audit('role.created', 'role', v_id::text, null, p_institution, jsonb_build_object('name', trim(p_name), 'capabilities', p_caps));
  else
    select * into v_role from roles where id = p_role for update;
    if not found or v_role.is_system or v_role.institution_id is distinct from p_institution then
      perform app.fail('NP403', 'Built-in roles can''t be edited. Create a custom role instead.');
    end if;
    update roles set name = trim(p_name), description = coalesce(nullif(trim(p_description), ''), description), capabilities = p_caps
     where id = p_role;
    v_id := p_role;
    perform app.audit('role.updated', 'role', v_id::text, null, p_institution,
                      jsonb_build_object('name', trim(p_name), 'before', v_role.capabilities, 'after', p_caps));
  end if;
  return v_id;
end $$;

create or replace function app.institution_delete_role(p_institution uuid, p_role uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.has_capability(p_institution, 'staff:manage') then perform app.fail('NP403', 'Not permitted.'); end if;
  if not exists (select 1 from roles where id = p_role and institution_id = p_institution and not is_system) then
    perform app.fail('NP404', 'Role not found.');
  end if;
  if exists (select 1 from professional_affiliations where role_id = p_role and status in ('active','suspended'))
     or exists (select 1 from staff_invitations where role_id = p_role and status = 'pending') then
    perform app.fail('NP409', 'Move everyone off this role before deleting it.');
  end if;
  delete from roles where id = p_role;
  perform app.audit('role.deleted', 'role', p_role::text, null, p_institution, '{}');
end $$;

create or replace function app.institution_roles(p_institution uuid)
returns table (id uuid, key text, name text, description text, capabilities text[], is_system boolean, members integer)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_institution_member(p_institution) and not app.is_platform_staff() then perform app.fail('NP403', 'Not permitted.'); end if;
  return query
    select r.id, r.key, r.name, r.description, r.capabilities, r.is_system,
           (select count(*)::int from professional_affiliations a where a.role_id = r.id and a.institution_id = p_institution and a.status = 'active')
    from roles r
    where r.scope = 'institution' and (r.institution_id is null or r.institution_id = p_institution)
    order by r.is_system desc, r.name;
end $$;

create or replace function app.institution_set_staff_role(p_affiliation uuid, p_role uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_aff professional_affiliations%rowtype; v_old text; v_new roles%rowtype; v_me uuid;
begin
  select * into v_aff from professional_affiliations where id = p_affiliation for update;
  if not found then perform app.fail('NP404', 'Staff member not found.'); end if;
  if not app.has_capability(v_aff.institution_id, 'staff:manage') then perform app.fail('NP403', 'Only institution administrators can change roles.'); end if;
  select id into v_me from healthcare_professionals where user_id = app.uid();
  if v_aff.professional_id = v_me then perform app.fail('NP409', 'You can''t change your own role. Ask another administrator.'); end if;
  select * into v_new from roles where id = p_role and scope = 'institution' and (institution_id is null or institution_id = v_aff.institution_id);
  if not found then perform app.fail('NP400', 'Choose a valid role.'); end if;
  select name into v_old from roles where id = v_aff.role_id;
  update professional_affiliations set role_id = p_role where id = p_affiliation;
  perform app.audit('staff.role_changed', 'professional_affiliation', p_affiliation::text, null, v_aff.institution_id,
                    jsonb_build_object('from', v_old, 'to', v_new.name));
  perform app.notify((select user_id from healthcare_professionals where id = v_aff.professional_id), 'staff.role_changed',
    'Your role has changed', 'Your role at your institution is now: ' || v_new.name || '.', '/provider', 'info', false);
end $$;

-- Invitations may now use custom roles belonging to the institution.
create or replace function app.invite_staff(
  p_institution uuid, p_email citext, p_full_name text, p_role_key text, p_token_hash text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_role roles%rowtype; v_id uuid;
begin
  if not app.has_capability(p_institution, 'staff:manage') then
    perform app.fail('NP403', 'Only institution administrators can invite staff.');
  end if;
  select * into v_role from roles where key = p_role_key and scope = 'institution'
    and (institution_id is null or institution_id = p_institution);
  if not found then perform app.fail('NP400', 'Choose a valid role.'); end if;
  update staff_invitations set status = 'cancelled' where institution_id = p_institution and email = p_email and status = 'pending';
  insert into staff_invitations(institution_id, email, full_name, role_id, token_hash, invited_by, expires_at)
  values (p_institution, p_email, trim(p_full_name), v_role.id, p_token_hash, app.uid(), now() + interval '7 days')
  returning id into v_id;
  perform app.audit('staff.invited', 'staff_invitation', v_id::text, null, p_institution,
                    jsonb_build_object('role', v_role.name));
  return v_id;
end $$;

-- ----- Platform roles and users -------------------------------------------
create or replace function app.admin_upsert_platform_role(p_role uuid, p_name text, p_description text, p_caps text[]) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_role roles%rowtype;
begin
  if not app.has_platform_capability('roles:manage') then perform app.fail('NP403', 'You can''t manage roles.'); end if;
  if char_length(trim(coalesce(p_name, ''))) < 3 then perform app.fail('NP400', 'Give the role a name of at least 3 characters.'); end if;
  perform app.assert_capabilities('platform', p_caps);
  if 'records:oversight' = any(p_caps) and not app.has_platform_role('super_admin') then
    perform app.fail('NP403', 'Only a super administrator can grant oversight access to records.');
  end if;
  if p_role is null then
    insert into roles(key, scope, name, description, capabilities, is_system, created_by)
    values ('custom_' || translate(replace(gen_random_uuid()::text, '-', ''), '0123456789', 'ghijklmnop'), 'platform', trim(p_name),
            coalesce(nullif(trim(p_description), ''), 'Custom role'), p_caps, false, app.uid())
    returning id into v_id;
    perform app.audit('role.created', 'role', v_id::text, null, null, jsonb_build_object('name', trim(p_name), 'capabilities', p_caps));
  else
    select * into v_role from roles where id = p_role for update;
    if not found or v_role.is_system or v_role.scope <> 'platform' then perform app.fail('NP403', 'Built-in roles can''t be edited.'); end if;
    update roles set name = trim(p_name), description = coalesce(nullif(trim(p_description), ''), description), capabilities = p_caps where id = p_role;
    v_id := p_role;
    perform app.audit('role.updated', 'role', v_id::text, null, null, jsonb_build_object('before', v_role.capabilities, 'after', p_caps));
  end if;
  return v_id;
end $$;

create or replace function app.admin_delete_platform_role(p_role uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.has_platform_capability('roles:manage') then perform app.fail('NP403', 'Not permitted.'); end if;
  if not exists (select 1 from roles where id = p_role and scope = 'platform' and not is_system) then perform app.fail('NP404', 'Role not found.'); end if;
  if exists (select 1 from user_platform_roles where role_id = p_role) then perform app.fail('NP409', 'Remove this role from everyone before deleting it.'); end if;
  delete from roles where id = p_role;
  perform app.audit('role.deleted', 'role', p_role::text, null, null, '{}');
end $$;

create or replace function app.admin_platform_roles()
returns table (id uuid, key text, name text, description text, capabilities text[], is_system boolean, members integer)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.is_platform_staff() then perform app.fail('NP403', 'Not permitted.'); end if;
  return query
    select r.id, r.key, r.name, r.description, r.capabilities, r.is_system,
           (select count(*)::int from user_platform_roles u where u.role_id = r.id)
    from roles r where r.scope = 'platform' order by r.is_system desc, r.name;
end $$;

create table if not exists platform_invitations (
  id               uuid primary key default gen_random_uuid(),
  email            citext not null,
  full_name        text not null,
  role_ids         uuid[] not null,
  token_hash       text not null unique,
  status           invitation_status not null default 'pending',
  invited_by       uuid not null references users(id),
  expires_at       timestamptz not null,
  accepted_at      timestamptz,
  accepted_user_id uuid references users(id),
  created_at       timestamptz not null default now()
);
create unique index if not exists platform_invitations_pending_uq on platform_invitations(email) where status = 'pending';
alter table platform_invitations enable row level security;
alter table platform_invitations force row level security;
drop policy if exists platform_invitations_staff on platform_invitations;
create policy platform_invitations_staff on platform_invitations for select to authenticated using (app.has_platform_capability('users:manage'));
grant select on platform_invitations to authenticated;
grant all on platform_invitations to service_role;

create or replace function app.admin_invite_platform_user(p_email citext, p_full_name text, p_roles uuid[], p_token_hash text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_names text[];
begin
  if not app.has_platform_capability('users:manage') then perform app.fail('NP403', 'You can''t invite platform users.'); end if;
  if p_roles is null or cardinality(p_roles) = 0 then perform app.fail('NP400', 'Choose at least one role.'); end if;
  if exists (select 1 from unnest(p_roles) x where not exists (select 1 from roles r where r.id = x and r.scope = 'platform')) then
    perform app.fail('NP400', 'Choose valid platform roles.');
  end if;
  if exists (select 1 from roles r where r.id = any(p_roles) and 'records:oversight' = any(r.capabilities)) and not app.has_platform_role('super_admin') then
    perform app.fail('NP403', 'Only a super administrator can grant oversight access to records.');
  end if;
  update platform_invitations set status = 'cancelled' where email = p_email and status = 'pending';
  insert into platform_invitations(email, full_name, role_ids, token_hash, invited_by, expires_at)
  values (p_email, trim(p_full_name), p_roles, p_token_hash, app.uid(), now() + interval '7 days') returning id into v_id;
  select array_agg(name) into v_names from roles where id = any(p_roles);
  perform app.audit('platform_user.invited', 'platform_invitation', v_id::text, null, null, jsonb_build_object('roles', v_names));
  return v_id;
end $$;

create or replace function app.accept_platform_invitation(p_token_hash text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_inv platform_invitations%rowtype; v_user users%rowtype;
begin
  select * into v_inv from platform_invitations where token_hash = p_token_hash for update;
  if not found or v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    perform app.fail('NP404', 'This invitation is invalid or has expired. Ask an administrator for a new one.');
  end if;
  select * into v_user from users where id = app.uid() and status = 'active';
  if not found or v_user.email <> v_inv.email or v_user.email_verified_at is null then
    perform app.fail('NP403', 'Sign in with the verified email address the invitation was sent to.');
  end if;
  insert into user_platform_roles(user_id, role_id, granted_by)
  select app.uid(), r, v_inv.invited_by from unnest(v_inv.role_ids) r on conflict do nothing;
  update platform_invitations set status = 'accepted', accepted_at = now(), accepted_user_id = app.uid() where id = v_inv.id;
  perform app.audit('platform_user.joined', 'user', app.uid()::text, null, null, '{}');
end $$;

create or replace function app.admin_set_user_platform_roles(p_user uuid, p_roles uuid[], p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_before text[]; v_after text[]; v_super uuid := (select id from roles where key = 'super_admin');
begin
  if not app.has_platform_capability('users:manage') then perform app.fail('NP403', 'You can''t manage platform users.'); end if;
  if p_user = app.uid() then perform app.fail('NP409', 'You can''t change your own roles. Ask another administrator.'); end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then perform app.fail('NP400', 'Give a reason for the change.'); end if;
  if exists (select 1 from unnest(coalesce(p_roles, '{}')) x where not exists (select 1 from roles r where r.id = x and r.scope = 'platform')) then
    perform app.fail('NP400', 'Choose valid platform roles.');
  end if;
  -- Granting or removing oversight-capable roles needs a super admin.
  if (exists (select 1 from roles r where r.id = any(coalesce(p_roles, '{}')) and 'records:oversight' = any(r.capabilities))
      or exists (select 1 from user_platform_roles u join roles r on r.id = u.role_id where u.user_id = p_user and 'records:oversight' = any(r.capabilities)))
     and not app.has_platform_role('super_admin') then
    perform app.fail('NP403', 'Only a super administrator can change oversight-capable roles.');
  end if;
  if v_super = any(select role_id from user_platform_roles where user_id = p_user)
     and not (v_super = any(coalesce(p_roles, '{}')))
     and (select count(*) from user_platform_roles where role_id = v_super) <= 1 then
    perform app.fail('NP409', 'This is the last super administrator. Appoint another before removing this one.');
  end if;
  select array_agg(r.name order by r.name) into v_before from user_platform_roles u join roles r on r.id = u.role_id where u.user_id = p_user;
  delete from user_platform_roles where user_id = p_user and not (role_id = any(coalesce(p_roles, '{}')));
  insert into user_platform_roles(user_id, role_id, granted_by) select p_user, r, app.uid() from unnest(coalesce(p_roles, '{}')) r on conflict do nothing;
  select array_agg(r.name order by r.name) into v_after from user_platform_roles u join roles r on r.id = u.role_id where u.user_id = p_user;
  perform app.audit('platform_user.roles_changed', 'user', p_user::text, null, null,
                    jsonb_build_object('before', v_before, 'after', v_after, 'reason', trim(p_reason)));
  perform app.notify(p_user, 'platform.roles_changed', 'Your platform access changed',
    'Your platform roles are now: ' || coalesce(array_to_string(v_after, ', '), 'none') || '.', '/admin', 'warning', true);
end $$;

create or replace function app.admin_platform_users()
returns table (user_id uuid, display_name text, email citext, status text, mfa_enabled boolean, last_sign_in timestamptz,
               role_ids uuid[], role_names text[])
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.has_platform_capability('users:manage') then perform app.fail('NP403', 'Not permitted.'); end if;
  return query
    select u.id, u.display_name, u.email, u.status::text, u.mfa_enabled,
           (select max(s.created_at) from auth_sessions s where s.user_id = u.id),
           array_agg(r.id order by r.name), array_agg(r.name order by r.name)
    from users u join user_platform_roles upr on upr.user_id = u.id join roles r on r.id = upr.role_id
    group by u.id order by u.display_name;
end $$;

-- ===========================================================================
-- 3. Super-admin oversight access to patient records
-- ===========================================================================
create table if not exists oversight_sessions (
  id            uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references users(id),
  patient_id    uuid not null references patients(id) on delete cascade,
  reason        text not null check (char_length(reason) between 15 and 1000),
  opened_at     timestamptz not null default now(),
  expires_at    timestamptz not null,
  closed_at     timestamptz
);
create index if not exists oversight_sessions_patient_idx on oversight_sessions(patient_id, opened_at desc);
alter table oversight_sessions enable row level security;
alter table oversight_sessions force row level security;
drop policy if exists oversight_read on oversight_sessions;
create policy oversight_read on oversight_sessions for select to authenticated
  using (app.has_platform_capability('audit:read') or app.has_platform_capability('records:oversight') or app.can_act_for_patient(patient_id));
grant select on oversight_sessions to authenticated;
grant all on oversight_sessions to service_role;

insert into platform_settings(key, value, description) values
  ('oversight.session_minutes', '30', 'Minutes an oversight session on a patient record stays open.')
on conflict (key) do nothing;

create or replace function app.oversight_open(p_patient uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_name text;
begin
  if not app.has_platform_capability('records:oversight') then perform app.fail('NP403', 'You don''t have oversight access to patient records.'); end if;
  if char_length(trim(coalesce(p_reason, ''))) < 15 then perform app.fail('NP400', 'Explain why you need to see this record (at least 15 characters).'); end if;
  if not exists (select 1 from patients where id = p_patient) then perform app.fail('NP404', 'Patient not found.'); end if;
  update oversight_sessions set closed_at = now() where admin_user_id = app.uid() and patient_id = p_patient and closed_at is null;
  insert into oversight_sessions(admin_user_id, patient_id, reason, expires_at)
  values (app.uid(), p_patient, trim(p_reason), now() + make_interval(mins => app.setting_int('oversight.session_minutes', 30)))
  returning id into v_id;
  select display_name into v_name from users where id = app.uid();
  perform app.audit('oversight.session_opened', 'oversight_session', v_id::text, p_patient, null,
                    jsonb_build_object('reason', trim(p_reason), 'admin', v_name));
  perform app.notify_patient(p_patient, 'oversight.opened', 'A platform administrator opened your record',
    'A platform administrator (' || coalesce(v_name, 'staff') || ') opened your health record for oversight. Reason given: ' || trim(p_reason) ||
    '. You can see every view in your activity history.', '/activity', 'warning', true);
  perform app.notify_platform_role('security_officer', 'oversight.opened', 'Oversight access opened',
    coalesce(v_name, 'An administrator') || ' opened a patient record for oversight.', '/admin/audit?action=oversight', 'warning');
  return v_id;
end $$;

create or replace function app.oversight_close(p_patient uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update oversight_sessions set closed_at = now() where admin_user_id = app.uid() and patient_id = p_patient and closed_at is null;
  perform app.audit('oversight.session_closed', 'patient', p_patient::text, p_patient, null, '{}');
end $$;

create or replace function app.oversight_session(p_patient uuid) returns oversight_sessions
language sql stable security definer set search_path = public, pg_temp as $$
  select * from oversight_sessions
   where admin_user_id = app.uid() and patient_id = p_patient and closed_at is null and expires_at > now()
   order by opened_at desc limit 1
$$;

create or replace function app.oversight_require(p_patient uuid) returns uuid
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if not app.has_platform_capability('records:oversight') then perform app.fail('NP403', 'Not permitted.'); end if;
  select id into v_id from oversight_sessions
   where admin_user_id = app.uid() and patient_id = p_patient and closed_at is null and expires_at > now()
   order by opened_at desc limit 1;
  if v_id is null then perform app.fail('NP401', 'Open an oversight session with a reason first.'); end if;
  return v_id;
end $$;

-- The patient's whole record for oversight. Logged on every call.
create or replace function app.oversight_patient(p_patient uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_session uuid := app.oversight_require(p_patient); v jsonb;
begin
  select jsonb_build_object(
    'profile', (select to_jsonb(pp) - 'address_line' || jsonb_build_object('address_line', pp.address_line) from patient_profiles pp where pp.patient_id = p_patient),
    'patient', (select jsonb_build_object('status', p.status, 'verification', p.verification_status, 'created_at', p.created_at,
                  'health_id', (select value from health_identifiers h where h.patient_id = p.id and h.identifier_type = 'platform_hid'))
                from patients p where p.id = p_patient),
    'health_profile', (select to_jsonb(hp) from patient_health_profiles hp where hp.patient_id = p_patient),
    'records', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'category_key', r.category_key,
                  'clinical_date', r.clinical_date, 'source', r.source, 'verification', r.verification_status, 'status', r.status,
                  'institution', i.name, 'professional', r.attending_professional, 'created_at', r.created_at)
                  order by r.clinical_date desc nulls last, r.created_at desc)
                from medical_records r left join healthcare_institutions i on i.id = r.institution_id
                where r.patient_id = p_patient), '[]'),
    'permissions', coalesce((select jsonb_agg(jsonb_build_object('reference', pm.reference, 'institution', i.name, 'status', pm.status,
                  'purpose', pm.purpose, 'starts_at', pm.valid_from, 'expires_at', pm.expires_at) order by pm.granted_at desc)
                from permissions pm join healthcare_institutions i on i.id = pm.institution_id where pm.patient_id = p_patient), '[]'),
    'oversight_history', coalesce((select jsonb_agg(jsonb_build_object('admin', u.display_name, 'reason', o.reason,
                  'opened_at', o.opened_at, 'closed_at', o.closed_at, 'expires_at', o.expires_at) order by o.opened_at desc)
                from oversight_sessions o join users u on u.id = o.admin_user_id where o.patient_id = p_patient), '[]'),
    'session', (select jsonb_build_object('id', o.id, 'expires_at', o.expires_at, 'reason', o.reason) from oversight_sessions o where o.id = v_session)
  ) into v;
  perform app.audit('oversight.record_list_viewed', 'oversight_session', v_session::text, p_patient, null, '{}');
  return v;
end $$;

create or replace function app.oversight_record(p_record uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_patient uuid; v_session uuid; v jsonb;
begin
  select patient_id into v_patient from medical_records where id = p_record;
  if v_patient is null then perform app.fail('NP404', 'Record not found.'); end if;
  v_session := app.oversight_require(v_patient);
  select to_jsonb(r) || jsonb_build_object('institution_name', i.name,
           'attachments', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'file_name', a.file_name, 'mime_type', a.mime_type,
                             'size_bytes', a.size_bytes)) from medical_record_attachments a where a.record_id = r.id), '[]'))
    into v
    from medical_records r left join healthcare_institutions i on i.id = r.institution_id where r.id = p_record;
  perform app.audit('oversight.record_viewed', 'medical_record', p_record::text, v_patient, null,
                    jsonb_build_object('session', v_session, 'category', v ->> 'category_key'));
  return v;
end $$;

-- Patients see oversight in their own activity history, by name.
create or replace function app.patient_oversight_activity(p_patient uuid)
returns table (occurred_at timestamptz, action text, admin_name text, reason text, record_title text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not app.can_act_for_patient(p_patient) then perform app.fail('NP403', 'Not permitted.'); end if;
  return query
    select a.occurred_at, a.action, u.display_name, coalesce(a.metadata ->> 'reason', o.reason), r.title
    from audit_logs a
    left join users u on u.id = a.actor_user_id
    left join medical_records r on a.entity_type = 'medical_record' and r.id::text = a.entity_id
    left join oversight_sessions o on o.id::text = coalesce(a.metadata ->> 'session', case when a.entity_type = 'oversight_session' then a.entity_id end)
    where a.patient_id = p_patient and a.action like 'oversight.%' and a.action <> 'oversight.session_closed'
    order by a.occurred_at desc limit 200;
end $$;

-- ===========================================================================
-- 4. Emergency health profile (blood group, genotype, NHIA, allergies)
-- ===========================================================================
do $$ begin
  create type blood_group as enum ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown');
exception when duplicate_object then null; end $$;
do $$ begin
  create type genotype as enum ('AA','AS','AC','SS','SC','CC','unknown');
exception when duplicate_object then null; end $$;

create table if not exists patient_health_profiles (
  patient_id          uuid primary key references patients(id) on delete cascade,
  blood_group         blood_group not null default 'unknown',
  genotype            genotype not null default 'unknown',
  allergies           text check (char_length(allergies) <= 500),
  chronic_conditions  text[] not null default '{}',
  current_medications text check (char_length(current_medications) <= 500),
  nhia_number         text check (nhia_number is null or nhia_number ~ '^[A-Za-z0-9/-]{4,30}$'),
  hmo_name            text check (char_length(hmo_name) <= 120),
  organ_donor         boolean not null default false,
  pregnant            boolean,
  disabilities        text check (char_length(disabilities) <= 300),
  share_in_emergency  boolean not null default true,
  updated_at          timestamptz not null default now()
);
drop trigger if exists health_profiles_touch on patient_health_profiles;
create trigger health_profiles_touch before update on patient_health_profiles for each row execute function app.touch_updated_at();
alter table patient_health_profiles enable row level security;
alter table patient_health_profiles force row level security;
drop policy if exists health_profile_self on patient_health_profiles;
create policy health_profile_self on patient_health_profiles for select to authenticated using (app.can_act_for_patient(patient_id));
grant select on patient_health_profiles to authenticated;
grant all on patient_health_profiles to service_role;

create or replace function app.save_health_profile(
  p_patient uuid, p_blood blood_group, p_genotype genotype, p_allergies text, p_conditions text[], p_medications text,
  p_nhia text, p_hmo text, p_donor boolean, p_pregnant boolean, p_disabilities text, p_share boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not app.can_act_for_patient(p_patient) then perform app.fail('NP403', 'Not permitted.'); end if;
  insert into patient_health_profiles(patient_id, blood_group, genotype, allergies, chronic_conditions, current_medications,
    nhia_number, hmo_name, organ_donor, pregnant, disabilities, share_in_emergency)
  values (p_patient, p_blood, p_genotype, nullif(trim(p_allergies), ''), coalesce(p_conditions, '{}'), nullif(trim(p_medications), ''),
          nullif(upper(trim(p_nhia)), ''), nullif(trim(p_hmo), ''), coalesce(p_donor, false), p_pregnant, nullif(trim(p_disabilities), ''), coalesce(p_share, true))
  on conflict (patient_id) do update set blood_group = excluded.blood_group, genotype = excluded.genotype, allergies = excluded.allergies,
    chronic_conditions = excluded.chronic_conditions, current_medications = excluded.current_medications, nhia_number = excluded.nhia_number,
    hmo_name = excluded.hmo_name, organ_donor = excluded.organ_donor, pregnant = excluded.pregnant, disabilities = excluded.disabilities,
    share_in_emergency = excluded.share_in_emergency;
  perform app.audit('record.health_profile_updated', 'patient', p_patient::text, p_patient, null, '{}');
end $$;

-- ===========================================================================
-- 5. Public directory of verified facilities
-- ===========================================================================
create or replace function app.public_facility_directory(p_state text default null, p_type institution_type default null, p_q text default null)
returns table (name text, institution_type institution_type, institution_code text, city text, state text, lga text,
               phone text, website text, verified_since timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select i.name, i.institution_type, i.institution_code, i.city, i.state, i.lga, i.phone, i.website, i.reviewed_at
  from healthcare_institutions i
  where i.status = 'approved'
    and (p_state is null or i.state = p_state)
    and (p_type is null or i.institution_type = p_type)
    and (p_q is null or i.name ilike '%' || p_q || '%' or i.city ilike '%' || p_q || '%' or i.institution_code = upper(replace(p_q, ' ', '')))
  order by i.state, i.name
  limit 300
$$;

create or replace function app.public_facility_stats()
returns table (state text, institution_type institution_type, total integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select i.state, i.institution_type, count(*)::int from healthcare_institutions i where i.status = 'approved' group by 1, 2
$$;

-- ===========================================================================
-- 6. National report (aggregate, de-identified, small numbers suppressed)
-- ===========================================================================
-- Counts between 1 and 4 are returned as -1 and shown as "<5", so that a
-- small group can't be used to identify a person.
create or replace function app.k_anon(n bigint) returns integer
language sql immutable as $$ select case when n between 1 and 4 then -1 else n::int end $$;

create or replace function app.admin_report(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_from timestamptz := coalesce(p_from, current_date - 89)::timestamptz;
  v_to   timestamptz := (coalesce(p_to, current_date) + 1)::timestamptz;
  v jsonb;
begin
  if not app.has_platform_capability('reports:view') then perform app.fail('NP403', 'You don''t have access to reports.'); end if;
  if v_to - v_from > interval '731 days' then perform app.fail('NP400', 'Choose a period of two years or less.'); end if;

  with
  weeks as (select generate_series(date_trunc('week', v_from), date_trunc('week', v_to - interval '1 second'), interval '1 week') as wk),
  pats as (select p.*, pp.sex, pp.date_of_birth, pp.state_of_residence from patients p join patient_profiles pp on pp.patient_id = p.id),
  dx as (
    select r.*, pp.state_of_residence as state, k.condition
    from medical_records r
    join patient_profiles pp on pp.patient_id = r.patient_id
    join lateral (
      select c.condition from (values
        ('Malaria', '%malaria%'), ('Hypertension', '%hypertens%'), ('Diabetes', '%diabet%'), ('Tuberculosis', '%tubercul%'),
        ('HIV', '%hiv%'), ('Sickle cell disease', '%sickle%'), ('Typhoid fever', '%typhoid%'), ('Lassa fever', '%lassa%'),
        ('Cholera', '%cholera%'), ('Pneumonia', '%pneumonia%'), ('Hepatitis B', '%hepatitis b%'), ('Malnutrition', '%malnutrition%')
      ) c(condition, pat)
      where lower(r.title) like c.pat or lower(coalesce(r.description, '')) like c.pat limit 1
    ) k on true
    where r.category_key in ('diagnosis','consultation','admission','discharge_summary','lab_result')
      and r.status <> 'entered_in_error' and coalesce(r.clinical_date::timestamptz, r.created_at) >= v_from
      and coalesce(r.clinical_date::timestamptz, r.created_at) < v_to
  )
  select jsonb_build_object(
    'period', jsonb_build_object('from', v_from, 'to', v_to - interval '1 day'),
    'kpis', jsonb_build_object(
      'patients_total', (select count(*) from patients),
      'patients_new', (select count(*) from patients where created_at >= v_from and created_at < v_to),
      'patients_verified', (select count(*) from patients where verification_status = 'verified'),
      'institutions_approved', (select count(*) from healthcare_institutions where status = 'approved'),
      'institutions_pending', (select count(*) from healthcare_institutions where status in ('submitted','under_review')),
      'professionals_verified', (select count(*) from healthcare_professionals where verification_status = 'verified'),
      'records_total', (select count(*) from medical_records),
      'records_new', (select count(*) from medical_records where created_at >= v_from and created_at < v_to),
      'requests', (select count(*) from access_requests where created_at >= v_from and created_at < v_to),
      'requests_approved', (select count(*) from access_requests where created_at >= v_from and created_at < v_to and status in ('approved','partially_approved')),
      'median_response_hours', (select round(extract(epoch from percentile_cont(0.5) within group (order by decided_at - created_at)) / 3600.0, 1)
                                from access_requests where decided_at is not null and created_at >= v_from and created_at < v_to),
      'active_permissions', (select count(*) from permissions where status = 'active' and (expires_at is null or expires_at > now())),
      'emergency', (select count(*) from access_events where action = 'emergency_access' and occurred_at >= v_from and occurred_at < v_to),
      'denied', (select count(*) from access_events where outcome = 'denied' and occurred_at >= v_from and occurred_at < v_to),
      'oversight', (select count(*) from oversight_sessions where opened_at >= v_from and opened_at < v_to),
      'open_incidents', (select count(*) from security_incidents where status in ('open','investigating'))
    ),
    'growth', (select jsonb_agg(jsonb_build_object('week', w.wk,
        'patients', (select count(*) from patients p where p.created_at >= w.wk and p.created_at < w.wk + interval '1 week'),
        'records', (select count(*) from medical_records r where r.created_at >= w.wk and r.created_at < w.wk + interval '1 week'),
        'institutions', (select count(*) from healthcare_institutions i where i.created_at >= w.wk and i.created_at < w.wk + interval '1 week')) order by w.wk)
      from weeks w),
    'funnel', jsonb_build_array(
      jsonb_build_object('stage', 'Registered', 'value', (select count(*) from patients)),
      jsonb_build_object('stage', 'Email verified', 'value', (select count(*) from patients p join users u on u.id = p.user_id where u.email_verified_at is not null)),
      jsonb_build_object('stage', 'Identity verified', 'value', (select count(*) from patients where verification_status = 'verified')),
      jsonb_build_object('stage', 'Has records', 'value', (select count(distinct patient_id) from medical_records)),
      jsonb_build_object('stage', 'Shared with a provider', 'value', (select count(distinct patient_id) from permissions))),
    'records_by_category', (select coalesce(jsonb_agg(jsonb_build_object('key', c.key, 'label', c.label,
        'value', (select count(*) from medical_records r where r.category_key = c.key)) order by c.sort_order), '[]') from medical_record_categories c),
    'records_by_source', (select coalesce(jsonb_agg(jsonb_build_object('source', s, 'value', n)), '[]')
        from (select source::text s, count(*) n from medical_records group by 1) x),
    'records_weekly_by_category', (select jsonb_agg(row order by row ->> 'week') from (
        select jsonb_build_object('week', w.wk) || coalesce((select jsonb_object_agg(r.category_key, r.n) from (
          select category_key, count(*) n from medical_records where created_at >= w.wk and created_at < w.wk + interval '1 week' group by 1) r), '{}') as row
        from weeks w) t),
    'requests_weekly', (select jsonb_agg(jsonb_build_object('week', w.wk,
        'approved', (select count(*) from access_requests a where a.created_at >= w.wk and a.created_at < w.wk + interval '1 week' and a.status in ('approved','partially_approved')),
        'rejected', (select count(*) from access_requests a where a.created_at >= w.wk and a.created_at < w.wk + interval '1 week' and a.status = 'rejected'),
        'expired', (select count(*) from access_requests a where a.created_at >= w.wk and a.created_at < w.wk + interval '1 week' and a.status = 'expired'),
        'pending', (select count(*) from access_requests a where a.created_at >= w.wk and a.created_at < w.wk + interval '1 week' and a.status = 'pending')) order by w.wk)
      from weeks w),
    'requests_by_purpose', (select coalesce(jsonb_agg(jsonb_build_object('purpose', purpose, 'value', n) order by n desc), '[]')
        from (select purpose::text, count(*) n from access_requests where created_at >= v_from and created_at < v_to group by 1) x),
    'response_hours', (select coalesce(jsonb_agg(jsonb_build_object('bucket', b, 'value', n) order by o), '[]') from (
        select case when h < 1 then '< 1 h' when h < 6 then '1–6 h' when h < 24 then '6–24 h' when h < 72 then '1–3 days' else '3+ days' end b,
               case when h < 1 then 1 when h < 6 then 2 when h < 24 then 3 when h < 72 then 4 else 5 end o, count(*) n
        from (select extract(epoch from decided_at - created_at) / 3600.0 h from access_requests
              where decided_at is not null and created_at >= v_from and created_at < v_to) z group by 1, 2) y),
    'access_daily', (select jsonb_agg(jsonb_build_object('day', d,
        'allowed', (select count(*) from access_events e where e.outcome = 'allowed' and e.occurred_at >= d and e.occurred_at < d + interval '1 day'),
        'denied', (select count(*) from access_events e where e.outcome = 'denied' and e.occurred_at >= d and e.occurred_at < d + interval '1 day'),
        'emergency', (select count(*) from access_events e where e.action = 'emergency_access' and e.occurred_at >= d and e.occurred_at < d + interval '1 day')) order by d)
      from generate_series(greatest(date_trunc('day', v_from), date_trunc('day', v_to) - interval '59 days'), date_trunc('day', v_to - interval '1 second'), interval '1 day') d),
    'denial_reasons', (select coalesce(jsonb_agg(jsonb_build_object('reason', coalesce(denial_reason, 'unspecified'), 'value', n) order by n desc), '[]')
        from (select denial_reason, count(*) n from access_events where outcome = 'denied' and occurred_at >= v_from and occurred_at < v_to group by 1) x),
    'institutions_by_type', (select coalesce(jsonb_agg(jsonb_build_object('type', t, 'approved', a, 'pending', p, 'other', o)), '[]') from (
        select institution_type::text t, count(*) filter (where status = 'approved') a, count(*) filter (where status in ('submitted','under_review')) p,
               count(*) filter (where status not in ('approved','submitted','under_review')) o from healthcare_institutions group by 1) x),
    'states', (select coalesce(jsonb_agg(jsonb_build_object('state', s, 'patients', app.k_anon(pt), 'institutions', ins, 'records', app.k_anon(rc)) order by pt desc nulls last), '[]') from (
        select s, (select count(*) from patient_profiles where state_of_residence = s) pt,
               (select count(*) from healthcare_institutions where state = s and status = 'approved') ins,
               (select count(*) from medical_records r join patient_profiles pp on pp.patient_id = r.patient_id where pp.state_of_residence = s) rc
        from (select distinct state_of_residence s from patient_profiles where state_of_residence is not null
              union select distinct state from healthcare_institutions where state is not null) ss) x),
    'demographics', (select coalesce(jsonb_agg(jsonb_build_object('band', band, 'female', app.k_anon(f), 'male', app.k_anon(m), 'other', app.k_anon(o)) order by ord), '[]') from (
        select case when a < 5 then '0–4' when a < 15 then '5–14' when a < 25 then '15–24' when a < 35 then '25–34' when a < 45 then '35–44'
                    when a < 55 then '45–54' when a < 65 then '55–64' else '65+' end band,
               min(a) ord, count(*) filter (where sex = 'female') f, count(*) filter (where sex = 'male') m,
               count(*) filter (where sex not in ('female','male')) o
        from (select extract(year from age(date_of_birth))::int a, sex from pats) z group by 1) x),
    'conditions', (select coalesce(jsonb_agg(jsonb_build_object('condition', condition, 'value', app.k_anon(n)) order by n desc), '[]')
        from (select condition, count(distinct patient_id) n from dx group by 1) x),
    'conditions_monthly', (select coalesce(jsonb_agg(row order by row ->> 'month'), '[]') from (
        select jsonb_build_object('month', m) || coalesce((select jsonb_object_agg(condition, app.k_anon(n)) from (
            select condition, count(distinct patient_id) n from dx
            where date_trunc('month', coalesce(clinical_date::timestamptz, created_at)) = m group by 1) q), '{}') as row
        from generate_series(date_trunc('month', v_from), date_trunc('month', v_to - interval '1 second'), interval '1 month') m) t),
    'conditions_by_state', (select coalesce(jsonb_agg(jsonb_build_object('state', state, 'condition', condition, 'value', app.k_anon(n))), '[]')
        from (select coalesce(state, 'Not stated') state, condition, count(distinct patient_id) n from dx group by 1, 2) x),
    'immunisation', (select coalesce(jsonb_agg(jsonb_build_object('antigen', antigen, 'children', app.k_anon(n)) order by o), '[]') from (
        select v.antigen, v.o, count(distinct r.patient_id) n
        from (values ('BCG', '%bcg%', 1), ('OPV', '%opv%', 2), ('Hepatitis B', '%hep%', 3), ('Pentavalent', '%penta%', 4), ('PCV', '%pcv%', 5),
                     ('Rotavirus', '%rota%', 6), ('IPV', '%ipv%', 7), ('Measles', '%measles%', 8), ('Yellow fever', '%yellow fever%', 9),
                     ('Meningitis A', '%men%a%', 10), ('HPV', '%hpv%', 11)) v(antigen, pat, o)
        left join medical_records r on r.category_key = 'vaccination' and lower(r.title) like v.pat
        left join patient_profiles pp on pp.patient_id = r.patient_id
        where r.id is null or extract(year from age(pp.date_of_birth)) < 15
        group by 1, 2) x),
    'genotypes', (select coalesce(jsonb_agg(jsonb_build_object('genotype', g, 'value', app.k_anon(n))), '[]')
        from (select genotype::text g, count(*) n from patient_health_profiles where genotype <> 'unknown' group by 1) x),
    'blood_groups', (select coalesce(jsonb_agg(jsonb_build_object('group', g, 'value', app.k_anon(n))), '[]')
        from (select blood_group::text g, count(*) n from patient_health_profiles where blood_group <> 'unknown' group by 1) x),
    'nhia_coverage', (select jsonb_build_object('with_nhia', app.k_anon(count(*) filter (where nhia_number is not null)),
                       'profiles', count(*)) from patient_health_profiles),
    'top_institutions', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'code', code, 'records', n) order by n desc), '[]') from (
        select i.name, i.institution_code code, count(r.id) n from healthcare_institutions i join medical_records r on r.institution_id = i.id
        where r.created_at >= v_from and r.created_at < v_to group by 1, 2 order by 3 desc limit 10) x),
    'integrations', jsonb_build_object(
        'active', (select count(*) from integration_connections where status = 'active'),
        'records', (select count(*) from medical_records where source = 'integration' and created_at >= v_from and created_at < v_to))
  ) into v;
  perform app.audit('report.viewed', 'report', 'national', null, null, jsonb_build_object('from', v_from, 'to', v_to));
  return v;
end $$;

-- ===========================================================================
-- 7. Grants
-- ===========================================================================
grant execute on function
  app.platform_capabilities(uuid), app.has_platform_capability(text), app.assert_capabilities(role_scope, text[]),
  app.institution_upsert_role(uuid, uuid, text, text, text[]), app.institution_delete_role(uuid, uuid), app.institution_roles(uuid),
  app.institution_set_staff_role(uuid, uuid), app.invite_staff(uuid, citext, text, text, text),
  app.admin_upsert_platform_role(uuid, text, text, text[]), app.admin_delete_platform_role(uuid), app.admin_platform_roles(),
  app.admin_invite_platform_user(citext, text, uuid[], text), app.accept_platform_invitation(text),
  app.admin_set_user_platform_roles(uuid, uuid[], text), app.admin_platform_users(),
  app.oversight_open(uuid, text), app.oversight_close(uuid), app.oversight_session(uuid), app.oversight_require(uuid),
  app.oversight_patient(uuid), app.oversight_record(uuid), app.patient_oversight_activity(uuid),
  app.save_health_profile(uuid, blood_group, genotype, text, text[], text, text, text, boolean, boolean, text, boolean),
  app.admin_report(date, date), app.k_anon(bigint)
to authenticated, service_role;

grant execute on function app.public_facility_directory(text, institution_type, text), app.public_facility_stats()
to authenticated, service_role;
