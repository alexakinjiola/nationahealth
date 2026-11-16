"use server";
import { cookies } from "next/headers";
import { z } from "zod";
import { handle, parse } from "@/lib/action";
import { withActor } from "@/lib/db";
import { requestMeta } from "@/lib/request";
import { ACTING_PATIENT_COOKIE, getActor, hasRecentReauth, requirePatientContext, type Actor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors";
import { stepUp } from "@/server/auth";
import { requestInPersonVerification, submitNinVerification } from "@/server/identity";
import { optionalPhoneSchema, uuid } from "@/lib/validation/common";
import { CATEGORY_KEYS } from "@/lib/labels";

async function ensureStepUp(actor: Actor, credential?: string) {
  if (hasRecentReauth(actor)) return;
  if (!credential) throw new AppError(401, "Confirm it's you to continue.");
  await stepUp(actor, credential);
}

async function ctx() {
  const c = await requirePatientContext();
  return { ...c, meta: await requestMeta() };
}

const decisionSchema = z.object({
  requestId: uuid,
  decision: z.enum(["approve", "partial", "reject"]),
  categories: z.array(z.enum(CATEGORY_KEYS as [string, ...string[]])).optional(),
  recordIds: z.array(uuid).max(200).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  durationDays: z.coerce.number().int().min(1).max(365).optional(),
  restrictToRequester: z.boolean().optional(),
  note: z.string().max(500).optional(),
  credential: z.string().max(128).optional(),
  acknowledged: z.boolean().optional(),
});

export async function decideRequestAction(input: unknown) {
  return handle("decide_request", async () => {
    const v = parse(decisionSchema, input);
    const { actor, meta } = await ctx();
    if (v.decision !== "reject") {
      if (!v.acknowledged) throw new AppError(400, "Confirm that you understand what you are sharing.");
      await ensureStepUp(actor, v.credential);
    }
    const id = await withActor(actor.userId, async (tx) => {
      const [r] = await tx`select app.decide_access_request(${v.requestId}, ${v.decision}, ${v.categories ?? null}::text[],
        ${v.recordIds?.length ? v.recordIds : null}::uuid[], ${v.dateFrom ?? null}::date, ${v.dateTo ?? null}::date,
        ${v.durationDays ?? null}::int, ${v.restrictToRequester ?? false}, ${v.note ?? null}) as id`;
      return r.id as string | null;
    }, meta);
    return { permissionId: id };
  }, "Your decision has been saved.");
}

export async function revokePermissionAction(permissionId: string, input: { reason: string; credential: string }) {
  return handle("revoke_permission", async () => {
    const { actor, meta } = await ctx();
    await ensureStepUp(actor, input.credential);
    await withActor(actor.userId, (tx) => tx`select app.revoke_permission(${uuid.parse(permissionId)}, ${input.reason.slice(0, 500) || null})`, meta);
  }, "Access revoked. The institution can no longer view your records here.");
}

const correctionSchema = z.object({
  recordId: uuid, kind: z.enum(["flag_error", "correction_request", "dispute"]),
  details: z.string().trim().min(10, "Tell us what's wrong in at least 10 characters.").max(4000),
});
export async function raiseCorrectionAction(input: unknown) {
  return handle("raise_correction", async () => {
    const v = parse(correctionSchema, input);
    const { actor, meta } = await ctx();
    await withActor(actor.userId, (tx) => tx`select app.raise_record_correction(${v.recordId}, ${v.kind}, ${v.details})`, meta);
  }, "Thanks — we've recorded your query and told the institution.");
}

export async function markUploadInErrorAction(recordId: string, input: { reason: string }) {
  return handle("upload_in_error", async () => {
    const { actor, meta } = await ctx();
    await withActor(actor.userId, (tx) => tx`select app.patient_mark_upload_in_error(${uuid.parse(recordId)}, ${input.reason || null})`, meta);
  }, "The document is marked as uploaded in error and hidden from your records.");
}

export async function reportSuspiciousAction(input: { eventId?: string | null; details: string; credential?: string }) {
  return handle("report_suspicious", async () => {
    const { actor, patientId, meta } = await ctx();
    const details = z.string().trim().min(10, "Tell us what looks wrong in at least 10 characters.").max(2000).parse(input.details);
    const eventId = input.eventId ? z.coerce.number().int().positive().parse(input.eventId) : null;
    const [r] = await withActor(actor.userId, (tx) => tx`select app.report_suspicious_activity(${patientId}, ${eventId}, ${details}) as ref`, meta);
    return { reference: r.ref as string };
  }, "Report sent to our security team.");
}

export async function markNotificationsReadAction(ids?: string[]) {
  return handle("notifications_read", async () => {
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again.");
    const list = ids ? z.array(uuid).max(200).parse(ids) : null;
    await withActor(actor.userId, (tx) => tx`update notifications set read_at = now()
      where user_id = ${actor.userId} and read_at is null and (${list}::uuid[] is null or id = any(${list}::uuid[]))`);
  });
}

const profileSchema = z.object({
  phone: optionalPhoneSchema,
  addressLine: z.string().trim().max(200),
  stateOfResidence: z.string().trim().max(60),
  lga: z.string().trim().max(80),
  preferredLanguage: z.enum(["en", "yo", "ig", "ha", "pcm"]),
  emergencyContactName: z.string().trim().max(120),
  emergencyContactPhone: optionalPhoneSchema,
  emergencyContactRelationship: z.string().trim().max(60),
});
export async function updateProfileAction(input: unknown) {
  return handle("update_profile", async () => {
    const v = parse(profileSchema, input);
    const { actor, patientId, meta } = await ctx();
    const rows = await withActor(actor.userId, (tx) => tx`
      update patient_profiles set phone = ${v.phone}, address_line = ${v.addressLine || null}, state_of_residence = ${v.stateOfResidence || null},
        lga = ${v.lga || null}, preferred_language = ${v.preferredLanguage}, emergency_contact_name = ${v.emergencyContactName || null},
        emergency_contact_phone = ${v.emergencyContactPhone}, emergency_contact_relationship = ${v.emergencyContactRelationship || null}
      where patient_id = ${patientId} returning patient_id`, meta);
    if (!rows.length) throw new AppError(403, "You can't change this profile.");
  }, "Profile updated.");
}

const OPTIONAL_TYPES = ["new_record", "access_granted", "permission_expired", "record_correction", "support", "access_request_decision"] as const;
export async function updateNotificationPrefsAction(input: Record<string, { in_app: boolean; email: boolean }>) {
  return handle("notification_prefs", async () => {
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again.");
    await withActor(actor.userId, async (tx) => {
      for (const t of OPTIONAL_TYPES) {
        const p = input[t];
        if (!p) continue;
        await tx`insert into notification_preferences(user_id, type, in_app, email) values (${actor.userId}, ${t}, ${!!p.in_app}, ${!!p.email})
                 on conflict (user_id, type) do update set in_app = excluded.in_app, email = excluded.email, updated_at = now()`;
      }
    });
  }, "Notification preferences saved.");
}

export async function verifyNinAction(input: unknown) {
  return handle("verify_nin", async () => {
    const { nin, consent } = parse(z.object({
      nin: z.string().trim().regex(/^\d{11}$/, "Your NIN is 11 digits."),
      consent: z.literal(true, { message: "Confirm you agree to the identity check." }),
    }), input);
    void consent;
    const { actor } = await ctx();
    return { status: await submitNinVerification(actor, nin) };
  });
}

export async function inPersonVerificationAction(input: { note: string }) {
  return handle("verify_in_person", async () => {
    const { actor } = await ctx();
    await requestInPersonVerification(actor, input.note ?? "");
  }, "Request recorded. Bring a valid ID to a participating facility or wait for our team to contact you.");
}

const ticketSchema = z.object({
  category: z.enum(["account_access", "identity_verification", "duplicate_account", "profile_correction", "record_correction",
    "suspicious_activity", "data_subject_request", "account_closure", "technical", "other"]),
  subject: z.string().trim().min(4, "Add a short subject.").max(200),
  description: z.string().trim().min(10, "Describe the issue in at least 10 characters.").max(5000),
});
export async function createTicketAction(input: unknown) {
  return handle("create_ticket", async () => {
    const v = parse(ticketSchema, input);
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again.");
    const [r] = await withActor(actor.userId, (tx) => tx`select app.create_support_ticket(${v.category}, ${v.subject}, ${v.description}, null, null) as ref`, await requestMeta());
    return { reference: r.ref as string };
  }, "Request sent. We'll reply here and by email.");
}

export async function commentTicketAction(ticketId: string, note: string) {
  return handle("comment_ticket", async () => {
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again.");
    await withActor(actor.userId, (tx) => tx`select app.requester_comment_ticket(${uuid.parse(ticketId)}, ${note})`);
  }, "Message sent.");
}

export async function setActingForAction(patientId: string | null) {
  return handle("acting_for", async () => {
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again.");
    const jar = await cookies();
    if (!patientId || patientId === actor.patient?.id) { jar.delete(ACTING_PATIENT_COOKIE); return; }
    if (!actor.representations.some((r) => r.patientId === patientId)) throw new AppError(403, "You're not a verified representative for that person.");
    jar.set(ACTING_PATIENT_COOKIE, patientId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  });
}

const repSchema = z.object({
  healthId: z.string().trim().min(5), dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter their date of birth."),
  relationship: z.enum(["parent", "legal_guardian", "court_appointed_representative", "power_of_attorney"]),
  note: z.string().trim().max(500),
});
export async function requestRepresentationAction(input: unknown) {
  return handle("request_representation", async () => {
    const v = parse(repSchema, input);
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again.");
    const [r] = await withActor(actor.userId, (tx) => tx`select app.request_representation(${v.healthId.replace(/[\s-]/g, "").toUpperCase()},
      ${v.dateOfBirth}::date, ${v.relationship}, ${v.note}) as ref`);
    return { reference: r.ref as string };
  }, "Request sent. Our team will ask for legal documents before activating it.");
}

// ── Emergency health profile ────────────────────────────────────────────────
const healthProfileSchema = z.object({
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]),
  genotype: z.enum(["AA", "AS", "AC", "SS", "SC", "CC", "unknown"]),
  allergies: z.string().trim().max(500).optional().default(""),
  conditions: z.array(z.string().trim().min(2).max(80)).max(20).default([]),
  medications: z.string().trim().max(500).optional().default(""),
  nhiaNumber: z.string().trim().max(30).regex(/^$|^[A-Za-z0-9/-]{4,30}$/, "Use letters, numbers, / or - only.").optional().default(""),
  hmoName: z.string().trim().max(120).optional().default(""),
  organDonor: z.boolean().default(false),
  pregnant: z.boolean().nullable().optional(),
  disabilities: z.string().trim().max(300).optional().default(""),
  shareInEmergency: z.boolean().default(true),
});

export async function saveHealthProfileAction(input: unknown) {
  return handle("health_profile", async () => {
    const v = parse(healthProfileSchema, input);
    const { actor, patientId } = await requirePatientContext();
    await withActor(actor.userId, (tx) => tx`select app.save_health_profile(${patientId}, ${v.bloodGroup}, ${v.genotype}, ${v.allergies},
      ${v.conditions}, ${v.medications}, ${v.nhiaNumber}, ${v.hmoName}, ${v.organDonor}, ${v.pregnant ?? null}, ${v.disabilities}, ${v.shareInEmergency})`, await requestMeta());
  }, "Emergency profile saved.");
}

// ── Referrals ────────────────────────────────────────────────────────────────
export async function decideReferralAction(referralId: string, approve: boolean, input: { reason: string; credential: string }) {
  return handle("decide_referral", async () => {
    const { actor } = await requirePatientContext();
    await withActor(actor.userId, (tx) => tx`select app.patient_decide_referral(${uuid.parse(referralId)}, ${approve}, 30)`, await requestMeta());
    void input;
  }, approve ? "Referral approved. The receiving facility can now see the records you agreed to." : "Referral declined. Nothing was shared.");
}

// ── Maternal health ─────────────────────────────────────────────────────────
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");
const optNum = (min: number, max: number) => z.union([z.literal(""), z.coerce.number().min(min).max(max)]).optional().transform((v) => (v === "" || v === undefined ? null : v));

export async function startPregnancyAction(input: unknown) {
  return handle("start_pregnancy", async () => {
    const v = parse(z.object({ lmp: isoDate, gravida: optNum(1, 20), parity: optNum(0, 20), facility: z.string().max(200).default(""), notes: z.string().max(1000).default("") }), input);
    const { actor, patientId } = await requirePatientContext();
    await withActor(actor.userId, (tx) => tx`select app.start_pregnancy(${patientId}, ${v.lmp}::date, ${v.gravida}::smallint, ${v.parity}::smallint, ${v.facility}, ${v.notes})`, await requestMeta());
  }, "Pregnancy tracking started. Congratulations.");
}

export async function addAntenatalVisitAction(pregnancyId: string, input: unknown) {
  return handle("anc_visit", async () => {
    const v = parse(z.object({
      visitDate: isoDate, systolic: optNum(60, 260), diastolic: optNum(30, 180), weight: optNum(25, 250), hb: optNum(3, 20),
      fundal: optNum(5, 50), notes: z.string().max(1000).default(""), nextVisit: z.union([z.literal(""), isoDate]).default(""),
    }), input);
    const { actor } = await requirePatientContext();
    await withActor(actor.userId, (tx) => tx`select app.add_antenatal_visit(${uuid.parse(pregnancyId)}, ${v.visitDate}::date, ${v.systolic}::smallint,
      ${v.diastolic}::smallint, ${v.weight}::numeric, ${v.hb}::numeric, ${v.fundal}::smallint, ${v.notes}, ${v.nextVisit || null}::date)`, await requestMeta());
  }, "Visit saved.");
}

export async function endPregnancyAction(pregnancyId: string, status: "delivered" | "ended", input: { reason: string }) {
  return handle("end_pregnancy", async () => {
    const { actor } = await requirePatientContext();
    void input;
    await withActor(actor.userId, (tx) => tx`select app.end_pregnancy(${uuid.parse(pregnancyId)}, ${status}, current_date)`, await requestMeta());
  }, status === "delivered" ? "Congratulations on your baby. Remember to start their immunisations." : "Pregnancy tracking ended.");
}

// ── Reminders ───────────────────────────────────────────────────────────────
const reminderSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  kind: z.enum(["medication", "appointment", "immunisation", "custom"]),
  title: z.string().trim().min(2, "Give the reminder a name.").max(120),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):(00|15|30|45)$/)).max(6).default([]),
  startsOn: z.union([z.literal(""), isoDate]).default(""),
  endsOn: z.union([z.literal(""), isoDate]).default(""),
  appointmentAt: z.string().default(""),
  beforeHours: z.coerce.number().int().min(1).max(168).default(24),
  channel: z.enum(["sms", "email"]).default("sms"),
  includeDetails: z.boolean().default(false),
});

export async function saveReminderAction(input: unknown) {
  return handle("save_reminder", async () => {
    const v = parse(reminderSchema, input);
    // datetime-local values are Lagos local time.
    const appt = v.appointmentAt ? new Date(`${v.appointmentAt}:00+01:00`) : null;
    const { actor, patientId } = await requirePatientContext();
    await withActor(actor.userId, (tx) => tx`select app.save_reminder(${patientId}, ${v.id ?? null}, ${v.kind}, ${v.title}, ${v.times}::text[],
      ${v.startsOn || null}::date, ${v.endsOn || null}::date, ${appt && !isNaN(appt.getTime()) ? appt.toISOString() : null}::timestamptz,
      ${v.beforeHours}::smallint, ${v.channel}, ${v.includeDetails}, true)`, await requestMeta());
  }, "Reminder saved.");
}

export async function deleteReminderAction(reminderId: string) {
  return handle("delete_reminder", async () => {
    const { actor, patientId } = await requirePatientContext();
    await withActor(actor.userId, (tx) => tx`select app.delete_reminder(${patientId}, ${uuid.parse(reminderId)})`, await requestMeta());
  }, "Reminder deleted.");
}

export async function setSmsRemindersAction(enabled: boolean) {
  return handle("sms_reminders", async () => {
    const { actor, patientId } = await requirePatientContext();
    await withActor(actor.userId, (tx) => tx`update patient_profiles set sms_reminders_enabled = ${enabled} where patient_id = ${patientId}`, await requestMeta());
  }, enabled ? "SMS reminders turned on." : "SMS reminders paused.");
}

// ── Phone (USSD/SMS) access ────────────────────────────────────────────────
export async function setPhonePinAction(input: unknown) {
  return handle("phone_pin", async () => {
    const v = parse(z.object({
      pin: z.string().regex(/^\d{4,6}$/, "Use 4 to 6 digits."),
      confirm: z.string(),
      credential: z.string().optional().default(""),
    }).refine((x) => x.pin === x.confirm, { path: ["confirm"], message: "The two PINs don't match." })
      .refine((x) => !/^(\d)\1+$/.test(x.pin) && !["1234", "12345", "123456", "0000"].includes(x.pin), { path: ["pin"], message: "Choose a PIN that's harder to guess." }), input);
    const { actor, patientId } = await requirePatientContext();
    if (!hasRecentReauth(actor)) {
      if (!v.credential) throw new AppError(401, "Enter your password to confirm it's you.");
      await stepUp(actor, v.credential);
    }
    const { setPhonePin } = await import("@/lib/phone-access");
    await setPhonePin(patientId, v.pin);
    const { withService } = await import("@/lib/db");
    await withService((tx) => tx`insert into audit_logs(actor_user_id, actor_type, action, entity_type, entity_id, patient_id, metadata)
      values (${actor.userId}, 'user', 'phone_access.pin_set', 'patient', ${patientId}, ${patientId}, '{}'::jsonb)`);
  }, "Phone PIN saved. You can now use your record by USSD and SMS.");
}
