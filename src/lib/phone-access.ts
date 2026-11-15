import "server-only";
import { withActor, withService } from "./db";
import { env } from "./env";
import { safeEqual } from "./crypto";
import { hashPassword, verifyPassword } from "./auth/password";
import { queueMessage } from "./mailer";
import { normalisePhone } from "./validation/common";
import { LANGS, isLang, translate, type Lang, type MessageKey } from "./i18n/dictionaries";
import { CATEGORY } from "./labels";

const MAX_ATTEMPTS = 5;

/** USSD and SMS callbacks carry ?key=<PHONE_WEBHOOK_KEY>. Without the key configured, phone access is off. */
export function phoneWebhookAuthorized(url: string) {
  const key = env().PHONE_WEBHOOK_KEY;
  if (!key) return false;
  return safeEqual(new URL(url).searchParams.get("key") ?? "", key);
}

type Patient = { patient_id: string; user_id: string | null; full_name: string; lang: Lang };

async function patientByPhone(raw: string): Promise<Patient | null> {
  const phone = normalisePhone(raw);
  if (!phone) return null;
  const [p] = await withService((tx) => tx<{ patient_id: string; user_id: string | null; full_name: string; preferred_language: string }[]>`
    select pp.patient_id, p.user_id, pp.full_name, pp.preferred_language
    from patient_profiles pp join patients p on p.id = pp.patient_id
    where pp.phone = ${phone} and p.status = 'active' order by p.created_at limit 1`);
  return p ? { ...p, lang: isLang(p.preferred_language) ? p.preferred_language : "en" } : null;
}

export async function setPhonePin(patientId: string, pin: string) {
  const hashed = await hashPassword(pin);
  await withService((tx) => tx`insert into phone_access(patient_id, pin_hash) values (${patientId}, ${hashed})
    on conflict (patient_id) do update set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null, enabled = true, updated_at = now()`);
}

/** "ok" | "wrong" | "locked" | "none" */
async function checkPin(patientId: string, pin: string) {
  const [row] = await withService((tx) => tx<{ pin_hash: string; failed_attempts: number; locked: boolean; enabled: boolean }[]>`
    select pin_hash, failed_attempts, coalesce(locked_until > now(), false) as locked, enabled from phone_access where patient_id = ${patientId}`);
  if (!row || !row.enabled) return "none" as const;
  if (row.locked) return "locked" as const;
  if (/^\d{4,6}$/.test(pin) && (await verifyPassword(row.pin_hash, pin))) {
    await withService((tx) => tx`update phone_access set failed_attempts = 0 where patient_id = ${patientId}`);
    return "ok" as const;
  }
  const n = row.failed_attempts + 1;
  await withService((tx) => tx`update phone_access set failed_attempts = ${n},
    locked_until = case when ${n} >= ${MAX_ATTEMPTS} then now() + interval '30 minutes' end where patient_id = ${patientId}`);
  return n >= MAX_ATTEMPTS ? ("locked" as const) : ("wrong" as const);
}

async function emergencySummary(p: Patient, t: (k: MessageKey) => string) {
  const [d] = await withService((tx) => tx<{ health_id: string | null; blood_group: string | null; genotype: string | null; allergies: string | null }[]>`
    select (select value from health_identifiers h where h.patient_id = ${p.patient_id} and h.identifier_type = 'platform_hid') as health_id,
           hp.blood_group, hp.genotype, hp.allergies
    from (select 1) x left join patient_health_profiles hp on hp.patient_id = ${p.patient_id}`);
  const hid = d?.health_id ? `${d.health_id.slice(0, 2)} ${d.health_id.slice(2, 6)} ${d.health_id.slice(6, 10)} ${d.health_id.slice(10)}` : "-";
  const known = (v: string | null | undefined) => (v && v !== "unknown" ? v : "?");
  return `${t("ussd.healthId")}: ${hid}\n${t("ussd.blood")}: ${known(d?.blood_group)}  ${t("ussd.genotype")}: ${known(d?.genotype)}\n${t("ussd.allergies")}: ${d?.allergies ?? t("ussd.none")}`;
}

/**
 * Africa's Talking USSD callback. `text` is every input so far joined by "*",
 * e.g. "2*1234*1*1" = menu 2, PIN 1234, request 1, approve.
 * Replies start with "CON" (keep the session open) or "END".
 */
export async function handleUssd(input: { phoneNumber: string; text: string }): Promise<string> {
  const p = await patientByPhone(input.phoneNumber);
  if (!p) return `END ${translate("en", "ussd.notRegistered")} ${env().APP_URL.replace(/^https?:\/\//, "")}`;
  const t = (k: MessageKey) => translate(p.lang, k);
  const parts = input.text ? input.text.split("*") : [];
  const [choice, pin, a, b] = parts;
  try {
    if (!choice) return `CON ${t("ussd.menu")}`;
    if (choice === "0") return `END ${t("ussd.bye")}`;
    if (choice === "5") {
      if (!pin) return `CON ${t("ussd.pickLang")}\n${LANGS.map((l, i) => `${i + 1}. ${l.native}`).join("\n")}`;
      const lang = LANGS[Number(pin) - 1];
      if (!lang) return `END ${t("ussd.invalid")}`;
      await withService((tx) => tx`update patient_profiles set preferred_language = ${lang.code} where patient_id = ${p.patient_id}`);
      return `END ${translate(lang.code, "ussd.langSaved")}`;
    }
    if (!["1", "2", "3", "4"].includes(choice)) return `END ${t("ussd.invalid")}`;
    if (pin === undefined) return `CON ${t("ussd.enterPin")}`;
    const ok = await checkPin(p.patient_id, pin);
    if (ok === "none") return `END ${t("ussd.noPin")}`;
    if (ok === "locked") return `END ${t("ussd.locked")}`;
    if (ok === "wrong") return `END ${t("ussd.wrongPin")}`;

    await withService((tx) => tx`select app.audit('phone_access.used', 'patient', ${p.patient_id}, ${p.patient_id}::uuid, null, ${tx.json({ menu: choice, channel: "ussd" })})`);

    if (choice === "1") return `END ${await emergencySummary(p, t)}`;

    if (choice === "3") {
      const rows = await withService((tx) => tx<{ occurred_at: string; who: string | null; action: string }[]>`
        select e.occurred_at, i.name as who, e.action::text as action from access_events e left join healthcare_institutions i on i.id = e.institution_id
        where e.patient_id = ${p.patient_id} order by e.occurred_at desc limit 3`);
      if (!rows.length) return `END ${t("ussd.noActivity")}`;
      return `END ${rows.map((r) => `${new Date(r.occurred_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} ${r.who ?? "-"}: ${r.action.replace(/_/g, " ")}`).join("\n")}`;
    }

    if (choice === "4") {
      const rows = await withService((tx) => tx<{ title: string; kind: string; next_due_at: string }[]>`
        select title, kind, next_due_at from reminders where patient_id = ${p.patient_id} and active and next_due_at is not null order by next_due_at limit 3`);
      if (!rows.length) return `END ${t("ussd.noReminders")}`;
      return `END ${rows.map((r) => `${new Date(r.next_due_at).toLocaleString("en-GB", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} ${r.kind === "medication" ? "medicine" : r.kind}`).join("\n")}`;
    }

    // choice 2: pending access requests
    if (!p.user_id) return `END ${t("ussd.noRequests")}`;
    const reqs = await withService((tx) => tx<{ id: string; name: string; cats: string[]; days: number }[]>`
      select ar.id, i.name, array(select category_key from access_request_categories c where c.request_id = ar.id) as cats, ar.requested_duration_days as days
      from access_requests ar join healthcare_institutions i on i.id = ar.institution_id
      where ar.patient_id = ${p.patient_id} and ar.status = 'pending' and ar.respond_by > now() order by ar.created_at limit 3`);
    if (!reqs.length) return `END ${t("ussd.noRequests")}`;
    if (a === undefined) {
      return `CON ${t("ussd.pickRequest")}\n${reqs.map((r, i) => `${i + 1}. ${r.name.slice(0, 28)} (${r.cats.map((c) => CATEGORY[c]?.label ?? c).join(", ").slice(0, 40)}; ${r.days}d)`).join("\n")}`;
    }
    const req = reqs[Number(a) - 1];
    if (!req) return `END ${t("ussd.invalid")}`;
    if (b === undefined) return `CON ${req.name}\n${t("ussd.decide")}`;
    if (b !== "1" && b !== "2") return `END ${t("ussd.invalid")}`;
    await withActor(p.user_id, (tx) => tx`select app.decide_access_request(${req.id}, ${b === "1" ? "approve" : "reject"})`);
    return `END ${t(b === "1" ? "ussd.approved" : "ussd.declined")}`;
  } catch {
    return `END ${t("ussd.error")}`;
  }
}

/** Inbound SMS commands: HELP, STOP, START, ID <PIN>. Replies are queued as SMS. */
export async function handleInboundSms(input: { from: string; text: string }) {
  const p = await patientByPhone(input.from);
  const phone = normalisePhone(input.from);
  if (!phone) return { ok: false };
  const lang: Lang = p?.lang ?? "en";
  const t = (k: MessageKey) => translate(lang, k);
  const [cmd, arg] = input.text.trim().toUpperCase().split(/\s+/);
  let reply: string;
  if (!p) reply = `${translate("en", "ussd.notRegistered")} ${env().APP_URL.replace(/^https?:\/\//, "")}`;
  else if (cmd === "STOP") {
    await withService((tx) => tx`update patient_profiles set sms_reminders_enabled = false where patient_id = ${p.patient_id}`);
    reply = t("sms.stopped");
  } else if (cmd === "START") {
    await withService((tx) => tx`update patient_profiles set sms_reminders_enabled = true where patient_id = ${p.patient_id}`);
    reply = t("sms.started");
  } else if (cmd === "ID") {
    const ok = await checkPin(p.patient_id, arg ?? "");
    reply = ok === "ok" ? await emergencySummary(p, t) : ok === "locked" ? t("ussd.locked") : ok === "none" ? t("ussd.noPin") : t("ussd.wrongPin");
  } else reply = t("sms.help");
  await withService((tx) => queueMessage(tx, { channel: "sms", to: phone, userId: p?.user_id ?? null, template: "sms_reply", body: reply }));
  return { ok: true };
}
