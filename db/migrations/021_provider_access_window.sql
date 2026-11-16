-- The provider record screen and its live access check need to know how long
-- the current permission lasts. app.active_permission_ids is an internal
-- helper (not granted to signed-in users, since it would reveal whether any
-- institution has access to any patient), so expose only the answer, and
-- only to staff who can view records for that institution.
create or replace function app.provider_access_window(p_institution uuid, p_patient uuid)
returns table (active_count integer, expires_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select cardinality(ids), (select min(p.expires_at) from permissions p where p.id = any(ids))
  from (select app.active_permission_ids(p_institution, p_patient) as ids) s
  where app.has_capability(p_institution, 'records:view_authorized')
$$;
revoke all on function app.provider_access_window(uuid, uuid) from public;
grant execute on function app.provider_access_window(uuid, uuid) to authenticated;
