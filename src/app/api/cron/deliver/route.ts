import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized, runDelivery } from "@/lib/jobs";

/** Scheduled job: deliver queued emails/SMS. GET is what Vercel Cron sends; POST for other schedulers. */
async function handler(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runDelivery()) });
}
export { handler as GET, handler as POST };
