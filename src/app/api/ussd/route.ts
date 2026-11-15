import { NextResponse, type NextRequest } from "next/server";
import { handleUssd, phoneWebhookAuthorized } from "@/lib/phone-access";

/** Africa's Talking USSD callback (form-encoded). Configure the callback URL as /api/ussd?key=<PHONE_WEBHOOK_KEY>. */
export async function POST(req: NextRequest) {
  if (!phoneWebhookAuthorized(req.url)) return new NextResponse("END Service unavailable.", { status: 403, headers: { "Content-Type": "text/plain" } });
  const form = await req.formData();
  const reply = await handleUssd({ phoneNumber: String(form.get("phoneNumber") ?? ""), text: String(form.get("text") ?? "") });
  return new NextResponse(reply, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
