/**
 * Super-admin oversight access, configurable roles and the national report
 * (migration 019). Every call runs as a real actor through RLS.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { admin, app, expectCode } from "./helpers";
import { as, createClinician, createPatient, createRecord, createUser, grantPlatformRole } from "../scripts/fixtures";

type W = Awaited<ReturnType<typeof world>>;
async function world() {
  const patient = await createPatient(admin, { fullName: "Oversight Patient", dob: "1990-05-05" });
  const doc = await createClinician(admin, { fullName: "Dr Oversight" });
  const record = await createRecord(admin, { patientId: patient.patientId, category: "diagnosis", title: "Uncomplicated malaria",
    institutionId: doc.institutionId, professionalId: doc.professionalId, submittedBy: doc.userId });
  const superAdmin = await createUser(admin, { name: "Super" });
  await grantPlatformRole(admin, superAdmin, "super_admin");
  const platformAdmin = await createUser(admin, { name: "Plain Admin" });
  await grantPlatformRole(admin, platformAdmin, "platform_admin");
  const analyst = await createUser(admin, { name: "Analyst" });
  await grantPlatformRole(admin, analyst, "analyst");
  const owner = await createClinician(admin, { institutionId: doc.institutionId, roleKey: "institution_admin", fullName: "Inst Owner" });
  return { patient, doc, record, superAdmin, platformAdmin, analyst, owner };
}

let w: W;
beforeAll(async () => { w = await world(); });

describe("oversight access to patient records", () => {
  it("is refused to a platform admin without the oversight permission", async () => {
    await expectCode(as(app, w.platformAdmin, (tx) => tx`select app.oversight_open(${w.patient.patientId}, 'Looking into a complaint about records')`), "NP403");
  });

  it("needs a reason of at least 15 characters", async () => {
    await expectCode(as(app, w.superAdmin, (tx) => tx`select app.oversight_open(${w.patient.patientId}, 'curious')`), "NP400");
  });

  it("can't read anything before a session is opened", async () => {
    await expectCode(as(app, w.superAdmin, (tx) => tx`select app.oversight_patient(${w.patient.patientId})`), "NP401");
    await expectCode(as(app, w.superAdmin, (tx) => tx`select app.oversight_record(${w.record})`), "NP401");
  });

  it("opens a time-limited session, logs every view and tells the patient", async () => {
    await as(app, w.superAdmin, (tx) => tx`select app.oversight_open(${w.patient.patientId}, 'Investigating complaint SUP-1042 about a lab result')`);
    const [{ v }] = await as(app, w.superAdmin, (tx) => tx<{ v: { records: { id: string }[] } }[]>`select app.oversight_patient(${w.patient.patientId}) as v`);
    expect(v.records.map((r) => r.id)).toContain(w.record);
    const [{ r }] = await as(app, w.superAdmin, (tx) => tx<{ r: { title: string } }[]>`select app.oversight_record(${w.record}) as r`);
    expect(r.title).toBe("Uncomplicated malaria");

    const [s] = await admin<{ minutes: number }[]>`select extract(epoch from expires_at - opened_at) / 60 as minutes from oversight_sessions where patient_id = ${w.patient.patientId}`;
    expect(Math.round(Number(s.minutes))).toBe(30);
    const actions = (await admin<{ action: string }[]>`select action from audit_logs where patient_id = ${w.patient.patientId} and action like 'oversight.%' order by id`).map((a) => a.action);
    expect(actions).toEqual(["oversight.session_opened", "oversight.record_list_viewed", "oversight.record_viewed"]);
    const [n] = await admin<{ n: number }[]>`select count(*)::int n from notifications where user_id = ${w.patient.userId} and type = 'oversight.opened'`;
    expect(n.n).toBe(1);

    // The patient sees who looked, at what, and why.
    const seen = await as(app, w.patient.userId!, (tx) => tx<{ action: string; admin_name: string; reason: string }[]>`select * from app.patient_oversight_activity(${w.patient.patientId})`);
    expect(seen.find((x) => x.action === "oversight.record_viewed")?.reason).toContain("SUP-1042");
  });

  it("stops working once the session expires or is closed", async () => {
    await admin`update oversight_sessions set expires_at = now() - interval '1 second' where patient_id = ${w.patient.patientId}`;
    await expectCode(as(app, w.superAdmin, (tx) => tx`select app.oversight_record(${w.record})`), "NP401");
  });

  it("stays invisible to other patients", async () => {
    const other = await createPatient(admin, { fullName: "Someone Else", dob: "1991-01-01" });
    await expectCode(as(app, other.userId!, (tx) => tx`select * from app.patient_oversight_activity(${w.patient.patientId})`), "NP403");
  });
});

describe("roles and permissions", () => {
  it("lets an institution admin create a custom role and assign it", async () => {
    const [{ id }] = await as(app, w.owner.userId, (tx) => tx<{ id: string }[]>`
      select app.institution_upsert_role(${w.doc.institutionId}, null, 'Ward nurse', 'Views authorised records', array['records:view_authorized','access:request']) as id`);
    await as(app, w.owner.userId, (tx) => tx`select app.institution_set_staff_role(${w.doc.affiliationId}, ${id})`);
    const [a] = await admin<{ caps: string[] }[]>`select r.capabilities caps from professional_affiliations a join roles r on r.id = a.role_id where a.id = ${w.doc.affiliationId}`;
    expect(a.caps).toEqual(["records:view_authorized", "access:request"]);
    // Losing records:submit takes effect immediately.
    const [{ can }] = await as(app, w.doc.userId, (tx) => tx<{ can: boolean }[]>`select app.has_capability(${w.doc.institutionId}, 'records:submit') as can`);
    expect(can).toBe(false);
  });

  it("rejects platform permissions on an institution role and editing built-in roles", async () => {
    await expectCode(as(app, w.owner.userId, (tx) => tx`
      select app.institution_upsert_role(${w.doc.institutionId}, null, 'Sneaky', '', array['records:oversight'])`), "NP400");
    const [builtIn] = await admin<{ id: string }[]>`select id from roles where key = 'clinician'`;
    await expectCode(as(app, w.owner.userId, (tx) => tx`
      select app.institution_upsert_role(${w.doc.institutionId}, ${builtIn.id}, 'Clinician', '', array['records:submit'])`), "NP403");
  });

  it("stops a clinician from managing roles", async () => {
    const nurse = await createClinician(admin, { institutionId: w.doc.institutionId });
    await expectCode(as(app, nurse.userId, (tx) => tx`
      select app.institution_upsert_role(${w.doc.institutionId}, null, 'Self promotion', '', array['staff:manage'])`), "NP403");
  });

  it("lets only a super admin hand out oversight, and protects the last super admin", async () => {
    const [{ id: roleId }] = await as(app, w.platformAdmin, (tx) => tx<{ id: string }[]>`
      select app.admin_upsert_platform_role(null, 'Report reader', 'Reports only', array['reports:view']) as id`);
    expect(roleId).toBeTruthy();
    await expectCode(as(app, w.platformAdmin, (tx) => tx`
      select app.admin_upsert_platform_role(null, 'Record reader', '', array['records:oversight'])`), "NP403");
    const target = await createUser(admin, { name: "New Staff" });
    await as(app, w.platformAdmin, (tx) => tx`select app.admin_set_user_platform_roles(${target}, array[${roleId}]::uuid[], 'Needs to read reports')`);
    const [{ caps }] = await admin<{ caps: string[] }[]>`select app.platform_capabilities(${target}) as caps`;
    expect(caps).toEqual(["reports:view"]);
    await expectCode(as(app, w.platformAdmin, (tx) => tx`select app.admin_set_user_platform_roles(${w.platformAdmin}, '{}'::uuid[], 'Removing myself')`), "NP409");
  });
});

describe("national report", () => {
  it("is available to analysts but not to support staff", async () => {
    const [{ r }] = await as(app, w.analyst, (tx) => tx<{ r: { kpis: { patients_total: number } } }[]>`select app.admin_report(null, null) as r`);
    expect(r.kpis.patients_total).toBeGreaterThan(0);
    const support = await createUser(admin, { name: "Support" });
    await grantPlatformRole(admin, support, "support_agent");
    await expectCode(as(app, support, (tx) => tx`select app.admin_report(null, null)`), "NP403");
  });

  it("suppresses small groups so individuals can't be singled out", async () => {
    const [{ a, b, c }] = await admin<{ a: number; b: number; c: number }[]>`select app.k_anon(0) a, app.k_anon(3) b, app.k_anon(7) c`;
    expect([a, b, c]).toEqual([0, -1, 7]);
    const [{ r }] = await as(app, w.analyst, (tx) => tx<{ r: { conditions: { value: number }[] } }[]>`select app.admin_report(null, null) as r`);
    expect(r.conditions.every((c) => c.value === -1 || c.value >= 5)).toBe(true);
  });
});
