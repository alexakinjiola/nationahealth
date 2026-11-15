"use server";
import { cookies } from "next/headers";
import { getActor } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { isLang } from "./dictionaries";
import { LANG_COOKIE } from "./server";

export async function setLanguageAction(lang: string) {
  if (!isLang(lang)) return { ok: false as const };
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" });
  const actor = await getActor();
  if (actor?.patient) {
    // Also used for SMS reminders and USSD.
    await withActor(actor.userId, (tx) => tx`update patient_profiles set preferred_language = ${lang} where patient_id = ${actor.patient!.id}`).catch(() => {});
  }
  return { ok: true as const };
}
