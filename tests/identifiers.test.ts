/**
 * Every patient and every institution gets a unique, permanent platform ID
 * issued by the database (migration 018).
 */
import { describe, expect, it } from "vitest";
import { admin } from "./helpers";
import { createInstitution, createPatient, createUser } from "../scripts/fixtures";

describe("platform identifiers", () => {
  it("issues a valid Health ID to a patient row created by any code path", async () => {
    const userId = await createUser(admin, { name: "Direct Insert" });
    const [p] = await admin<{ id: string }[]>`insert into patients(user_id, is_synthetic) values (${userId}, true) returning id`;
    const ids = await admin<{ value: string; is_primary: boolean; valid: boolean }[]>`
      select value, is_primary, app.is_valid_health_id(value) as valid
      from health_identifiers where patient_id = ${p.id} and identifier_type = 'platform_hid'`;
    expect(ids).toHaveLength(1);
    expect(ids[0].value).toMatch(/^NG[1-9]\d{9}$/);
    expect(ids[0].valid).toBe(true);
    expect(ids[0].is_primary).toBe(true);
  });

  it("keeps a Health ID the application issued itself in the same transaction", async () => {
    const userId = await createUser(admin, { name: "Explicit Insert" });
    const value = await admin.begin(async (tx) => {
      const [p] = await tx<{ id: string }[]>`insert into patients(user_id, is_synthetic) values (${userId}, true) returning id`;
      const [h] = await tx<{ value: string }[]>`insert into health_identifiers(patient_id, identifier_type, value, is_primary)
        values (${p.id}, 'platform_hid', app.generate_health_id(), true) returning value`;
      return { id: p.id, value: h.value };
    });
    const rows = await admin<{ value: string }[]>`select value from health_identifiers
      where patient_id = ${value.id} and identifier_type = 'platform_hid'`;
    expect(rows.map((r) => r.value)).toEqual([value.value]);
  });

  it("gives every patient a different Health ID and never lets one change", async () => {
    const a = await createPatient(admin, { fullName: "Unique One", dob: "1991-01-01" });
    const b = await createPatient(admin, { fullName: "Unique Two", dob: "1992-02-02" });
    expect(a.healthId).not.toBe(b.healthId);
    await expect(admin`update health_identifiers set value = ${b.healthId}
                       where patient_id = ${a.patientId} and identifier_type = 'platform_hid'`).rejects.toThrow(/cannot be changed/);
    await expect(admin`insert into health_identifiers(patient_id, identifier_type, value, is_primary)
                       values (${a.patientId}, 'platform_hid', 'NG1234567890', false)`).rejects.toThrow();
  });

  it("issues an Institution ID with a type prefix and a valid check digit", async () => {
    const hospital = await createInstitution(admin, { type: "hospital" });
    const lab = await createInstitution(admin, { type: "laboratory" });
    const rows = await admin<{ id: string; institution_code: string; valid: boolean }[]>`
      select id, institution_code, app.is_valid_institution_code(institution_code) as valid
      from healthcare_institutions where id in (${hospital}, ${lab})`;
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId[hospital].institution_code).toMatch(/^HOS[1-9]\d{8}$/);
    expect(byId[lab].institution_code).toMatch(/^LAB[1-9]\d{8}$/);
    expect(rows.every((r) => r.valid)).toBe(true);
  });

  it("ignores a caller-supplied Institution ID and never lets one change", async () => {
    const owner = await createUser(admin, { name: "Owner" });
    const [i] = await admin<{ id: string; institution_code: string }[]>`
      insert into healthcare_institutions(name, institution_type, institution_code, created_by, is_synthetic)
      values ('Code Supplied Clinic', 'clinic', 'CLN111111111', ${owner}, true) returning id, institution_code`;
    expect(i.institution_code).not.toBe("CLN111111111");
    expect(i.institution_code).toMatch(/^CLN[1-9]\d{8}$/);
    await expect(admin`update healthcare_institutions set institution_code = 'CLN222222222' where id = ${i.id}`)
      .rejects.toThrow(/cannot be changed/);
    // Correcting the type later keeps the original ID.
    await admin`update healthcare_institutions set institution_type = 'hospital' where id = ${i.id}`;
    const [after] = await admin<{ institution_code: string }[]>`select institution_code from healthcare_institutions where id = ${i.id}`;
    expect(after.institution_code).toBe(i.institution_code);
  });

  it("catches a single mistyped digit with the check digit", async () => {
    const hospital = await createInstitution(admin, { type: "hospital" });
    const [{ institution_code: code }] = await admin<{ institution_code: string }[]>`
      select institution_code from healthcare_institutions where id = ${hospital}`;
    const typo = code.slice(0, 5) + ((Number(code[5]) + 1) % 10) + code.slice(6);
    const [r] = await admin<{ ok: boolean; bad: boolean; short: boolean }[]>`
      select app.is_valid_institution_code(${code}) as ok, app.is_valid_institution_code(${typo}) as bad,
             app.is_valid_institution_code('HOS123') as short`;
    expect(r).toEqual({ ok: true, bad: false, short: false });
  });
});
