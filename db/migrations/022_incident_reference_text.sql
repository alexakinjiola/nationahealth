-- A report made without picking a specific event used to end with an empty
-- "Referenced activity # (, )." line, because format() turns nulls into ''.
-- Only mention the referenced activity when there is one, and tidy old rows.
create or replace function app.report_suspicious_activity(p_patient uuid, p_access_event bigint, p_details text)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_ref text := app.short_ref('INC');
  v_ev access_events%rowtype;
begin
  if not app.can_act_for_patient(p_patient) then perform app.fail('NP403', 'Not permitted.'); end if;
  if char_length(coalesce(trim(p_details), '')) < 10 then
    perform app.fail('NP400', 'Tell us what looks wrong in at least 10 characters.');
  end if;
  if p_access_event is not null then
    select * into v_ev from access_events where id = p_access_event and patient_id = p_patient;
    if not found then perform app.fail('NP404', 'Activity not found.'); end if;
  end if;
  insert into security_incidents(reference, title, description, category, severity, source,
                                 related_patient_id, related_institution_id, related_user_id, reported_by)
  values (v_ref, 'Patient reported suspicious activity',
          trim(p_details) || case when v_ev.id is null then '' else format(E'\n\nReferenced activity #%s (%s, %s).', v_ev.id, v_ev.action, v_ev.outcome) end,
          'patient_report', 'high', 'patient_report', p_patient, v_ev.institution_id, v_ev.actor_user_id, app.uid());
  perform app.audit('security.patient_report', 'security_incident', v_ref, p_patient, v_ev.institution_id,
                    jsonb_build_object('access_event', p_access_event));
  perform app.notify_platform_role('security_officer', 'security_incident', 'Patient reported suspicious activity',
          'A patient reported activity on their record that they do not recognise.', '/admin/security', 'critical');
  perform app.notify_patient(p_patient, 'security', 'We received your report',
          format('Your report %s is with our security team. We will contact you through the platform.', v_ref), '/activity', 'info');
  return v_ref;
end $$;

update security_incidents
   set description = regexp_replace(description, E'\n\nReferenced activity # \\(, \\)\\.$', '')
 where description like E'%\n\nReferenced activity # (, ).';
