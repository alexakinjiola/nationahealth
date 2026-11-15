import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized, runDelivery, runReminders } from "@/lib/jobs";

/** Scheduled job: queue due medicine, appointment, antenatal and vaccination reminders, then send them. */
async function handler(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const reminders = await runReminders();
  const delivery = await runDelivery(100);
  return NextResponse.json({ ok: true, reminders, delivery });
}
export { handler as GET, handler as POST };
