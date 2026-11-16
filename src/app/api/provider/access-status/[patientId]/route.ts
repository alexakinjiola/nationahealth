import { NextResponse, type NextRequest } from "next/server";
import { getActor } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { jsonError } from "@/lib/route";

/**
 * Lightweight re-validation polled by open patient screens, so a revocation or
 * expiry locks the view within seconds. (Reads are re-authorised server-side on
 * every request regardless — this only keeps the open screen honest.)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ patientId: string }> }) {
  try {
    const { patientId } = await params;
    const inst = req.nextUrl.searchParams.get("institution");
    if (!/^[0-9a-f-]{36}$/.test(patientId) || !inst || !/^[0-9a-f-]{36}$/.test(inst)) throw new AppError(400, "Invalid request.");
    const actor = await getActor();
    if (!actor || (actor.mfaEnabled && !actor.mfaVerified)) return NextResponse.json({ active: false, reason: "signed_out" }, { status: 401 });
    const [r] = await withActor(actor.userId, (tx) => tx`
      select app.has_capability(${inst}, 'records:view_authorized') as cap,
             w.expires_at as next_expiry, coalesce(w.active_count, 0) as n
      from (select 1) one left join app.provider_access_window(${inst}, ${patientId}) w on true`);
    const active = r.cap && r.n > 0;
    return NextResponse.json({ active, expiresAt: r.next_expiry, reason: active ? null : r.cap ? "no_active_permission" : "not_authorised" },
      { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return jsonError(err, "provider.access_status");
  }
}
