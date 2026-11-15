import "server-only";
import { db, withService } from "./db";
import { env } from "./env";
import { safeEqual } from "./crypto";
import { log } from "./log";
import { deliverDue, deliveryConfigFromEnv } from "./messaging/delivery";

/** Cron requests carry `Authorization: Bearer <CRON_SECRET>` (Vercel Cron adds it automatically). */
export function cronAuthorized(req: Request) {
  return safeEqual(req.headers.get("authorization") ?? "", `Bearer ${env().CRON_SECRET}`);
}

export async function runExpiry() {
  const [{ r, k }] = await withService((tx) => tx`select app.run_expiry() as r, app.integration_expiry_warnings() as k`);
  return { ...(r as object), integration_key_warnings: k };
}

export async function runReminders() {
  const [{ r }] = await withService((tx) => tx`select app.run_reminders() as r`);
  return r as { queued: number; skipped: number };
}

export async function runDelivery(limit = 50) {
  return deliverDue(db(), deliveryConfigFromEnv(), limit);
}

/**
 * Send whatever is waiting right now, without waiting for the scheduler.
 * Called after a request finishes (next/server `after`), so users get their
 * email or SMS within seconds even on plans where cron runs once a day.
 */
export async function kickDelivery() {
  try {
    const cfg = deliveryConfigFromEnv();
    if (cfg.mailDriver === "outbox" && cfg.smsDriver === "none") return;
    await deliverDue(db(), cfg, 20);
  } catch (e) {
    log.error("delivery.kick_failed", { kind: (e as Error)?.name });
  }
}
