import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { handleInboundSms, phoneWebhookAuthorized } from "@/lib/phone-access";
import { kickDelivery } from "@/lib/jobs";

/** Africa's Talking incoming-SMS callback. Configure as /api/sms/inbound?key=<PHONE_WEBHOOK_KEY>. */
export async function POST(req: NextRequest) {
  if (!phoneWebhookAuthorized(req.url)) return NextResponse.json({ ok: false }, { status: 403 });
  const form = await req.formData();
  const res = await handleInboundSms({ from: String(form.get("from") ?? ""), text: String(form.get("text") ?? "") });
  after(kickDelivery);
  return NextResponse.json(res);
}
