import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized, runDelivery, runExpiry, runReminders } from "@/lib/jobs";

/** Every job in one call, for a single frequent scheduler (GitHub Actions every 15 minutes). */
async function handler(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const expiry = await runExpiry();
  const reminders = await runReminders();
  const delivery = await runDelivery(100);
  return NextResponse.json({ ok: true, expiry, reminders, delivery });
}
export { handler as GET, handler as POST };
export const maxDuration = 60;
