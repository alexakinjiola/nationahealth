import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized, runExpiry } from "@/lib/jobs";

/** Scheduled job: expire permissions/requests and send expiry warnings. */
async function handler(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runExpiry()) });
}
export { handler as GET, handler as POST };
