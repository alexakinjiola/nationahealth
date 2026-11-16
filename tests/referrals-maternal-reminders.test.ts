/**
 * Migration 020: emergency profile for permitted hospitals, referrals,
 * maternal health, SMS reminders and USSD phone access.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { admin, app, expectCode } from "./helpers";
import { as, createClinician, createPatient, createRecord } from "../scripts/fixtures";
import { handleUssd, setPhonePin } from "../src/lib/phone-access";

type W = Awaited<ReturnType<typeof world>>;
async function world() {
  const ada = await createPatient(admin, { fullName: "Referral Patient", dob: "1992-02-02", phone: "+2348031119901", sex: "female" });
  const gp = await createClinician(admin, { fullName: "Dr GP" });
  const cardio = await createClinician(admin, { fullName: "Dr Cardio" });
  const [code] = await admin<{ c: string }[]>`select institution_code c from healthcare_institutions where id = ${cardio.institutionId}`;
  const lab = await createRecord(admin, { patientId: ada.patientId, category: "lab_result", title: "Lipid profile", clinicalDate: "2026-01-10",
    institutionId: gp.institutionId, professionalId: gp.professionalId, submittedBy: gp.userId });
  const dx = await createRecord(admin, { patientId: ada.patientId, category: "diagnosis", title: "Hypertension", clinicalDate: "2026-01-10",
    institutionId: gp.institutionId, professionalId: gp.professionalId, submittedBy: gp.userId });
  const other = await createRecord(admin, { patientId: ada.patientId, category: "lab_result", title: "HIV test", clinicalDate: "2025-06-01",
    institutionId: gp.institutionId, professionalId: gp.professionalId, submittedBy: gp.userId });
  await admin`insert into care_relationships(patient_id, institution_id, established_via) values (${ada.patientId}, ${gp.institutionId}, 'attested_encounter')`;
  await admin`insert into patient_health_profiles(patient_id, blood_group, genotype, allergies) values (${ada.patientId}, 'O+', 'AS', 'Penicillin')`;
  return { ada, gp, cardio, cardioCode: code.c, lab, dx, other };
}
let w: W;
beforeAll(async () => { w = await world(); });

describe("emergency profile for hospitals", () => {
  it("is hidden without a permission and the attempt is logged", async () => {
    const [{ h }] = await as(app, w.cardio.userId, (tx) => tx<{ h: unknown }[]>`select app.provider_health_profile(${w.cardio.institutionId}, ${w.ada.patientId}) as h`);
    expect(h).toBeNull();
    const [e] = await admin<{ outcome: string }[]>`select outcome from access_events where patient_id = ${w.ada.patientId} and actor_user_id = ${w.cardio.userId} order by id desc limit 1`;
    expect(e.outcome).toBe("denied");
  });
});

describe("referrals", () => {
  let referral: string;
  it("only sends records the referring hospital can see", async () => {
    const stranger = await createPatient(admin, { fullName: "Stranger" });
    const [r] = await admin<{ id: string }[]>`select id from medical_records where patient_id = ${stranger.patientId} limit 1`;
    void r;
    await expectCode(as(app, w.gp.userId, (tx) => tx`select app.create_referral(${w.gp.institutionId}, ${stranger.patientId}, ${w.cardioCode}, 'Cardiology',
      'Uncontrolled blood pressure', '', 'routine', '{}'::uuid[])`), "NP403");
  });

  it("creates a referral that waits for the patient", async () => {
    [{ id: referral }] = await as(app, w.gp.userId, (tx) => tx<{ id: string }[]>`select app.create_referral(${w.gp.institutionId}, ${w.ada.patientId},
      ${w.cardioCode}, 'Cardiology', 'Uncontrolled blood pressure despite two medicines', 'BP 170/105', 'urgent', array[${w.lab}, ${w.dx}]::uuid[]) as id`);
    const [r] = await admin<{ status: string }[]>`select status from referrals where id = ${referral}`;
    expect(r.status).toBe("awaiting_patient");
    // The receiving hospital can't see it yet.
    const incoming = await as(app, w.cardio.userId, (tx) => tx`select * from app.provider_referrals(${w.cardio.institutionId})`);
    expect(incoming).toHaveLength(0);
  });

  it("shares exactly the selected records once the patient approves", async () => {
    await as(app, w.ada.userId!, (tx) => tx`select app.patient_decide_referral(${referral}, true, 30)`);
    const seen = await as(app, w.cardio.userId, (tx) => tx<{ id: string }[]>`select id from app.provider_list_records(${w.cardio.institutionId}, ${w.ada.patientId})`);
    expect(seen.map((r) => r.id).sort()).toEqual([w.lab, w.dx].sort());
    expect(seen.map((r) => r.id)).not.toContain(w.other);
    const [{ h }] = await as(app, w.cardio.userId, (tx) => tx<{ h: { blood_group: string; genotype: string } }[]>`select app.provider_health_profile(${w.cardio.institutionId}, ${w.ada.patientId}) as h`);
    expect(h).toMatchObject({ blood_group: "O+", genotype: "AS" });
  });

  it("tells only the permitted hospital how long its access lasts", async () => {
    const [win] = await as(app, w.cardio.userId, (tx) => tx<{ active_count: number; expires_at: Date }[]>`select * from app.provider_access_window(${w.cardio.institutionId}, ${w.ada.patientId})`);
    expect(win.active_count).toBeGreaterThan(0);
    expect(new Date(win.expires_at).getTime()).toBeGreaterThan(Date.now());
    // Staff of another institution can't probe someone else's access.
    const other = await as(app, w.gp.userId, (tx) => tx`select * from app.provider_access_window(${w.cardio.institutionId}, ${w.ada.patientId})`);
    expect(other).toHaveLength(0);
  });

  it("lets the receiving hospital accept with an appointment, which books a reminder", async () => {
    const appt = new Date(Date.now() + 5 * 86_400_000).toISOString();
    await as(app, w.cardio.userId, (tx) => tx`select app.institution_respond_referral(${referral}, 'accepted', 'See you soon', ${appt}::timestamptz)`);
    const [rem] = await admin<{ kind: string }[]>`select kind from reminders where patient_id = ${w.ada.patientId} and kind = 'appointment'`;
    expect(rem.kind).toBe("appointment");
    await expectCode(as(app, w.gp.userId, (tx) => tx`select app.institution_respond_referral(${referral}, 'completed', null, null)`), "NP404");
  });
});

describe("maternal health and reminders", () => {
  it("tracks a pregnancy and adds an antenatal reminder for the next visit", async () => {
    const lmp = new Date(Date.now() - 100 * 86_400_000).toISOString().slice(0, 10);
    const [{ id }] = await as(app, w.ada.userId!, (tx) => tx<{ id: string }[]>`select app.start_pregnancy(${w.ada.patientId}, ${lmp}::date, 2::smallint, 1::smallint, 'Booking clinic', '') as id`);
    const next = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
    await as(app, w.ada.userId!, (tx) => tx`select app.add_antenatal_visit(${id}, current_date, 118::smallint, 76::smallint, 64.5, 11.8, 18::smallint, '', ${next}::date)`);
    const [p] = await admin<{ edd: string }[]>`select edd::text from pregnancies where id = ${id}`;
    expect(p.edd).toBe(new Date(new Date(lmp).getTime() + 280 * 86_400_000).toISOString().slice(0, 10));
    const [r] = await admin<{ n: number }[]>`select count(*)::int n from reminders where patient_id = ${w.ada.patientId} and kind = 'antenatal' and active`;
    expect(r.n).toBe(1);
    await expectCode(as(app, w.ada.userId!, (tx) => tx`select app.start_pregnancy(${w.ada.patientId}, ${lmp}::date, null, null, '', '')`), "NP409");
  });

  it("sends a medicine reminder by SMS without the medicine name, then schedules the next dose", async () => {
    const [{ id }] = await as(app, w.ada.userId!, (tx) => tx<{ id: string }[]>`select app.save_reminder(${w.ada.patientId}, null, 'medication', 'Amlodipine 5 mg',
      array['08:00','20:00'], current_date, null, null, 24::smallint, 'sms', false, true) as id`);
    await admin`update reminders set next_due_at = now() - interval '1 minute' where id = ${id}`;
    const [{ r }] = await admin<{ r: { queued: number } }[]>`select app.run_reminders() as r`;
    expect(r.queued).toBeGreaterThanOrEqual(1);
    const [m] = await admin<{ body: string; recipient: string }[]>`select body, recipient from message_outbox where template = 'reminder_medication' order by created_at desc limit 1`;
    expect(m.recipient).toBe("+2348031119901");
    expect(m.body).not.toContain("Amlodipine");
    const [after] = await admin<{ next: Date }[]>`select next_due_at as next from reminders where id = ${id}`;
    expect(after.next.getTime()).toBeGreaterThan(Date.now());
  });

  it("respects STOP: SMS reminders are skipped while paused", async () => {
    await admin`update patient_profiles set sms_reminders_enabled = false where patient_id = ${w.ada.patientId}`;
    await admin`update reminders set next_due_at = now() - interval '1 minute' where patient_id = ${w.ada.patientId} and kind = 'medication'`;
    const [{ r }] = await admin<{ r: { queued: number; skipped: number } }[]>`select app.run_reminders() as r`;
    expect(r.skipped).toBeGreaterThanOrEqual(1);
    await admin`update patient_profiles set sms_reminders_enabled = true where patient_id = ${w.ada.patientId}`;
  });

  it("rejects reminder times that aren't quarter hours", async () => {
    await expectCode(as(app, w.ada.userId!, (tx) => tx`select app.save_reminder(${w.ada.patientId}, null, 'medication', 'Metformin',
      array['08:07'], current_date, null, null, 24::smallint, 'sms', false, true)`), "23514");
  });
});

describe("USSD", () => {
  it("shows the menu, requires the PIN, and locks after repeated wrong PINs", async () => {
    expect(await handleUssd({ phoneNumber: "+2348031119901", text: "" })).toMatch(/^CON .*Health ID/s);
    expect(await handleUssd({ phoneNumber: "+2348031119901", text: "1*1234" })).toMatch(/^END .*phone PIN/);
    await setPhonePin(w.ada.patientId, "4826");
    const ok = await handleUssd({ phoneNumber: "+2348031119901", text: "1*4826" });
    expect(ok).toMatch(/^END Health ID: NG/);
    expect(ok).toContain("Genotype: AS");
    for (let i = 0; i < 4; i++) await handleUssd({ phoneNumber: "+2348031119901", text: "1*0000" });
    expect(await handleUssd({ phoneNumber: "+2348031119901", text: "1*1111" })).toMatch(/Too many wrong PINs/);
    expect(await handleUssd({ phoneNumber: "+2348031119901", text: "1*4826" })).toMatch(/Too many wrong PINs/);
    await admin`update phone_access set locked_until = null, failed_attempts = 0 where patient_id = ${w.ada.patientId}`;
  });

  it("answers in the patient's language and refuses unknown numbers", async () => {
    await handleUssd({ phoneNumber: "+2348031119901", text: "5*2" });
    expect(await handleUssd({ phoneNumber: "+2348031119901", text: "" })).toContain("Bayanan lafiya");
    expect(await handleUssd({ phoneNumber: "+2348039999999", text: "" })).toMatch(/^END .*isn't linked/);
    await admin`update patient_profiles set preferred_language = 'en' where patient_id = ${w.ada.patientId}`;
  });

  it("approves a pending access request with the PIN", async () => {
    const [{ id }] = await as(app, w.gp.userId, (tx) => tx<{ id: string }[]>`select app.create_access_request(${w.gp.institutionId}, ${w.ada.patientId},
      'ongoing_care', 'Follow-up of blood pressure treatment', array['lab_result']::text[], null, null, 30) as id`).catch(async () => {
      // Patients must be identity-verified to be requested; fixtures create verified patients by default.
      throw new Error("request failed");
    });
    expect(await handleUssd({ phoneNumber: "+2348031119901", text: "2*4826" })).toMatch(/^CON .*1\./s);
    expect(await handleUssd({ phoneNumber: "+2348031119901", text: "2*4826*1*1" })).toMatch(/^END Approved/);
    const [r] = await admin<{ status: string }[]>`select status from access_requests where id = ${id}`;
    expect(r.status).toBe("approved");
  });
});
