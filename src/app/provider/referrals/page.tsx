import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { TabsNav } from "@/components/ui/tabs-nav";
import { Reveal } from "@/components/ui/motion";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { REFERRAL_STATUS } from "@/lib/labels";
import { formatHealthId, formatInstitutionCode } from "@/lib/validation/common";
import { cancelReferralAction, respondReferralAction } from "../actions";
import { AcceptReferral } from "./accept";

export const metadata: Metadata = { title: "Referrals" };

type Row = { id: string; reference: string; direction: "incoming" | "outgoing"; status: string; urgency: string; specialty: string | null; reason: string;
  clinical_summary: string | null; record_count: number; patient_id: string; patient_name: string; health_id: string | null; other_institution: string;
  other_code: string; referrer: string; created_at: string; respond_by: string; responded_at: string | null; response_note: string | null; appointment_at: string | null };

const URGENCY: Record<string, Tone> = { routine: "neutral", urgent: "warning", emergency: "danger" };

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { actor, current, can } = await requireProviderContext("/provider/referrals");
  if (!current || !can("records:view_authorized")) redirect("/provider");
  const tab = (await searchParams).tab === "outgoing" ? "outgoing" : "incoming";
  const rows = await withActor(actor.userId, (tx) => tx<Row[]>`select * from app.provider_referrals(${current.institutionId})`);
  const list = rows.filter((r) => r.direction === tab);
  const incomingNew = rows.filter((r) => r.direction === "incoming" && r.status === "sent").length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Referrals" description="Send patients to other verified facilities with the records they need, and manage referrals sent to you. Patients approve every referral before it's sent." />
      <TabsNav label="Referral direction" current={tab} tabs={[
        { key: "incoming", label: "Received", href: "/provider/referrals", count: incomingNew },
        { key: "outgoing", label: "Sent", href: "/provider/referrals?tab=outgoing", count: rows.filter((r) => r.direction === "outgoing").length },
      ]} />
      {list.length === 0 ? <Card><EmptyState icon="send" title={tab === "incoming" ? "No referrals received yet" : "You haven't referred anyone yet"}>
        {tab === "outgoing" ? "Open a patient you have access to and choose “Refer patient”." : "When another facility refers a patient to you and the patient agrees, it appears here."}</EmptyState></Card> : (
        <ul className="space-y-4">
          {list.map((r, i) => (
            <Reveal as="li" key={r.id} delay={Math.min(i, 5) * 60}>
              <article className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-start gap-4">
                  <span className={`grid size-12 shrink-0 place-items-center rounded-full ${r.urgency === "emergency" ? "bg-danger-bg text-danger-fg" : r.urgency === "urgent" ? "bg-warning-bg text-warning-fg" : "bg-brand-50 text-brand-600"}`}>
                    <Icon name={tab === "incoming" ? "inbox" : "send"} size={22} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-ink">{r.patient_name}</h2>
                      <Badge tone={REFERRAL_STATUS[r.status]?.tone}>{REFERRAL_STATUS[r.status]?.label ?? r.status}</Badge>
                      <Badge tone={URGENCY[r.urgency]}>{r.urgency}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-3">
                      {tab === "incoming" ? "From" : "To"} <strong className="text-ink-2">{r.other_institution}</strong> <span className="font-mono text-xs">{formatInstitutionCode(r.other_code)}</span>
                      {r.specialty ? ` · ${r.specialty}` : ""} · <span className="font-mono text-xs">{r.reference}</span>
                    </p>
                    <p className="mt-3 text-[15px] text-ink-2">{r.reason}</p>
                    {r.clinical_summary && <details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold text-brand-600">Clinical summary</summary><p className="mt-1 whitespace-pre-wrap text-ink-2">{r.clinical_summary}</p></details>}
                    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-3">
                      <span className="inline-flex items-center gap-1"><Icon name="person" size={16} />{r.referrer}</span>
                      <span className="inline-flex items-center gap-1"><Icon name="attach_file" size={16} />{r.record_count} record{r.record_count === 1 ? "" : "s"} attached</span>
                      <span className="inline-flex items-center gap-1"><Icon name="schedule" size={16} />{relativeTime(r.created_at)}</span>
                      {r.health_id && r.status !== "awaiting_patient" && <span className="font-mono">{formatHealthId(r.health_id)}</span>}
                      {r.appointment_at && <span className="inline-flex items-center gap-1 font-semibold text-accent-700"><Icon name="event" size={16} />Appointment {formatDateTime(r.appointment_at)}</span>}
                    </p>
                    {r.response_note && <p className="mt-2 rounded-md bg-sunken px-3 py-2 text-sm text-ink-2">“{r.response_note}”</p>}
                    {r.status === "awaiting_patient" && <p className="mt-2 text-[13px] text-warning-fg">Patient has until {formatDate(r.respond_by)} to agree.</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tab === "incoming" && ["sent", "accepted"].includes(r.status) && r.record_count > 0 &&
                      <Button asChild size="sm" variant="secondary" icon="folder_open"><Link href={`/provider/patients/${r.patient_id}`}>Open records</Link></Button>}
                    {tab === "incoming" && r.status === "sent" && <AcceptReferral id={r.id} reference={r.reference} />}
                    {tab === "incoming" && r.status === "accepted" && <ConfirmDialog trigger={<Button size="sm" variant="accent" icon="task_alt">Mark complete</Button>}
                      title="Mark referral complete?" confirmLabel="Complete" reason={{ label: "Outcome note (optional)" }} onConfirm={respondReferralAction.bind(null, r.id, "completed")} />}
                    {tab === "incoming" && ["sent", "accepted"].includes(r.status) && <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-danger-fg">Decline</Button>}
                      title="Decline this referral?" tone="danger" confirmLabel="Decline" reason={{ label: "Reason (shared with the patient and referrer)", required: true, minLength: 5 }}
                      onConfirm={respondReferralAction.bind(null, r.id, "declined")} />}
                    {tab === "outgoing" && ["awaiting_patient", "sent", "accepted"].includes(r.status) && <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-danger-fg">Cancel</Button>}
                      title="Cancel this referral?" tone="danger" confirmLabel="Cancel referral" description="Any access the receiving facility got through this referral is revoked."
                      reason={{ label: "Reason", required: true, minLength: 5 }} onConfirm={cancelReferralAction.bind(null, r.id)} />}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}
