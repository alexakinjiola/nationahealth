import type { Metadata } from "next";
import Link from "next/link";
import { requirePatientContext, hasRecentReauth } from "@/lib/auth/actor";
import { withActor, withService } from "@/lib/db";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { Icon } from "@/components/ui/icon";
import { SettingsNav } from "../settings-nav";
import { PinForm } from "./form";

export const metadata: Metadata = { title: "Phone access" };

export default async function PhoneAccessPage() {
  const { actor, patientId } = await requirePatientContext("/settings/phone");
  const [prof] = await withActor(actor.userId, (tx) => tx<{ phone: string | null }[]>`select phone from patient_profiles where patient_id = ${patientId}`);
  const [pa] = await withService((tx) => tx<{ updated_at: string }[]>`select updated_at from phone_access where patient_id = ${patientId} and enabled`);
  const code = env().USSD_SERVICE_CODE;
  const live = !!env().PHONE_WEBHOOK_KEY;
  return (
    <div className="animate-fade-in">
      <PageHeader title="Profile & settings" />
      <SettingsNav current="phone" />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader><div><CardTitle>Use your record from any phone</CardTitle><CardDescription>No smartphone or data needed. Dial a USSD code or send a text.</CardDescription></div>
            {pa ? <Badge tone="success" icon="check_circle">On</Badge> : <Badge tone="neutral">Off</Badge>}</CardHeader>
          <CardBody className="space-y-5">
            {!prof?.phone ? (
              <Callout tone="warning" icon="sms" title="Add your phone number first">Phone access works only from the number on your profile. <Link href="/settings" className="underline">Add it in Profile</Link>.</Callout>
            ) : (
              <>
                <p className="text-sm text-ink-2">Works from <strong className="font-mono">{prof.phone}</strong>. Your PIN protects your information if someone else picks up your phone. Never share it, not even with health workers.</p>
                <PinForm hasPin={!!pa} needsCredential={!hasRecentReauth(actor)} />
              </>
            )}
            {!live && <p className="text-[13px] text-ink-3">The USSD and SMS service will be switched on once the platform's mobile network partner is connected.</p>}
          </CardBody>
        </Card>
        <div className="space-y-6">
          <div className="rounded-lg bg-gradient-to-br from-navy-900 to-brand-700 p-6 text-white shadow-lg">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-100"><Icon name="dialpad" size={16} />USSD menu</p>
            {code ? <p className="mt-3 font-mono text-3xl font-bold">{code}</p> : <p className="mt-3 text-lg font-semibold">Short code coming soon</p>}
            <ol className="mt-4 space-y-1.5 font-mono text-sm text-white/90">
              <li>1. Health ID & emergency info</li><li>2. Approve or decline access requests</li><li>3. Recent activity</li><li>4. My reminders</li><li>5. Language</li>
            </ol>
          </div>
          <Card><CardHeader><CardTitle>Text commands</CardTitle></CardHeader>
            <CardBody><dl className="space-y-3 text-sm">
              {[["ID 1234", "Your Health ID, blood group, genotype and allergies (use your PIN)"], ["STOP", "Pause SMS reminders"], ["START", "Turn SMS reminders back on"], ["HELP", "List of commands"]].map(([c, d]) => (
                <div key={c} className="flex gap-3"><dt className="w-20 shrink-0 rounded-md bg-sunken px-2 py-1 text-center font-mono font-semibold text-ink">{c}</dt><dd className="pt-1 text-ink-2">{d}</dd></div>
              ))}
            </dl></CardBody></Card>
        </div>
      </div>
    </div>
  );
}
