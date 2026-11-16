import type { Metadata } from "next";
import { requirePatientContext } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/motion";
import { formatDate, formatDateTime } from "@/lib/format";
import { deleteReminderAction } from "../actions";
import { ReminderDialog, SmsToggle } from "./form";

export const metadata: Metadata = { title: "Reminders" };

type R = { id: string; kind: string; title: string; times: string[]; ends_on: string | null; appointment_at: string | null; channel: string;
  include_details: boolean; active: boolean; next_due_at: string | null; last_sent_at: string | null; sent_count: number };
const KIND: Record<string, { icon: IconName; label: string; tone: string }> = {
  medication: { icon: "medication", label: "Medicine", tone: "bg-brand-50 text-brand-600" },
  appointment: { icon: "event", label: "Appointment", tone: "bg-accent-50 text-accent-600" },
  antenatal: { icon: "pregnant_woman", label: "Antenatal", tone: "bg-[#fce7f3] text-[#9d174d]" },
  immunisation: { icon: "vaccines", label: "Vaccination", tone: "bg-[#e0f2fe] text-[#075985]" },
  custom: { icon: "alarm", label: "Reminder", tone: "bg-sunken text-ink-2" },
};

export default async function RemindersPage() {
  const { actor, patientId } = await requirePatientContext("/reminders");
  const d = await withActor(actor.userId, async (tx) => ({
    rows: await tx<R[]>`select * from reminders where patient_id = ${patientId} order by active desc, next_due_at nulls last`,
    prof: (await tx<{ phone: string | null; sms_reminders_enabled: boolean }[]>`select phone, sms_reminders_enabled from patient_profiles where patient_id = ${patientId}`)[0],
  }));
  const active = d.rows.filter((r) => r.active);
  const past = d.rows.filter((r) => !r.active).slice(0, 10);
  const hasPhone = !!d.prof.phone;
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Reminders" description="Never miss a dose or a clinic visit. Reminders arrive by text message, even on a basic phone."
        actions={<><ReminderDialog kind="appointment" hasPhone={hasPhone} /><ReminderDialog kind="medication" hasPhone={hasPhone} /></>} />
      <div className="flex flex-wrap items-center gap-3">
        <SmsToggle enabled={d.prof.sms_reminders_enabled} />
        <span className="text-sm text-ink-3">{hasPhone ? `Texts go to ${d.prof.phone}. Reply STOP to any reminder to pause them.` : "Add a phone number in Profile & settings to get text reminders."}</span>
      </div>
      {!hasPhone && <Callout tone="warning" icon="sms" title="No phone number yet">Reminders can still go by email until you add one.</Callout>}

      {active.length === 0 ? <Card><EmptyState icon="alarm" title="No reminders yet">Add your regular medicines and upcoming appointments. Antenatal visit reminders are added for you when you record your next clinic date.</EmptyState></Card> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {active.map((r, i) => {
            const k = KIND[r.kind] ?? KIND.custom;
            return (
              <Reveal as="li" key={r.id} delay={Math.min(i, 6) * 60}>
                <article className="card lift flex h-full gap-4 p-5">
                  <span className={`grid size-12 shrink-0 place-items-center rounded-full ${k.tone}`}><Icon name={k.icon} size={24} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-ink">{r.title}</h2><Badge tone="neutral">{k.label}</Badge></div>
                    {r.kind === "medication"
                      ? <p className="mt-1 flex flex-wrap gap-1.5">{r.times.map((t) => <span key={t} className="rounded-full bg-brand-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-brand-700">{t}</span>)}</p>
                      : <p className="mt-1 text-sm text-ink-2">{r.appointment_at ? formatDateTime(r.appointment_at) : ""}</p>}
                    <p className="mt-2 text-[13px] text-ink-3">
                      <Icon name={r.channel === "sms" ? "sms" : "mail"} size={14} className="mr-1 inline-block align-[-2px]" />
                      {r.next_due_at ? `Next ${formatDateTime(r.next_due_at)}` : "Done"}{r.ends_on ? ` · until ${formatDate(r.ends_on)}` : ""}{r.sent_count ? ` · ${r.sent_count} sent` : ""}
                    </p>
                  </div>
                  <ConfirmDialog trigger={<Button size="icon-sm" variant="ghost" aria-label={`Delete reminder ${r.title}`}><Icon name="delete" size={18} /></Button>}
                    title="Delete this reminder?" tone="danger" confirmLabel="Delete" onConfirm={deleteReminderAction.bind(null, r.id)} />
                </article>
              </Reveal>
            );
          })}
        </ul>
      )}
      {past.length > 0 && (
        <Card><CardHeader><CardTitle>Finished</CardTitle></CardHeader>
          <ul className="divide-y divide-line/80">{past.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm text-ink-3 sm:px-6"><Icon name={KIND[r.kind]?.icon ?? "alarm"} size={18} />{r.title}<span className="ml-auto">{r.last_sent_at ? `Sent ${formatDate(r.last_sent_at)}` : ""}</span></li>
          ))}</ul>
        </Card>
      )}
    </div>
  );
}
