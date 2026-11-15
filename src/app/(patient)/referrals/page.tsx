import type { Metadata } from "next";
import { requirePatientContext } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { CategoryIcon } from "@/components/domain/category-icon";
import { CATEGORY, REFERRAL_STATUS } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatInstitutionCode } from "@/lib/validation/common";
import { decideReferralAction } from "../actions";

export const metadata: Metadata = { title: "Referrals" };

type Row = { id: string; reference: string; status: string; urgency: string; specialty: string | null; reason: string; from_institution: string;
  to_institution: string; to_code: string; referrer: string; records: { id: string; title: string; category_key: string; clinical_date: string | null }[];
  created_at: string; respond_by: string; response_note: string | null; appointment_at: string | null };

export default async function PatientReferrals() {
  const { actor, patientId } = await requirePatientContext("/referrals");
  const rows = await withActor(actor.userId, (tx) => tx<Row[]>`select * from app.patient_referrals(${patientId})`);
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Referrals" description="When a doctor refers you to another facility, you decide whether to send your records with it." />
      {rows.length === 0 ? <Card><EmptyState icon="send" title="No referrals">If a clinician refers you to a specialist or another hospital, it will appear here for you to approve.</EmptyState></Card> : (
        <ul className="space-y-5">
          {rows.map((r) => (
            <li key={r.id} className={`card overflow-hidden ${r.status === "awaiting_patient" ? "border-warning-line" : ""}`}>
              <div className={`flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6 ${r.status === "awaiting_patient" ? "bg-warning-bg/60" : "bg-canvas/60"}`}>
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className="rounded-full bg-surface px-3 py-1.5 shadow-xs">{r.from_institution}</span>
                  <Icon name="arrow_forward" size={20} className="text-brand-600" />
                  <span className="rounded-full bg-brand-600 px-3 py-1.5 text-white shadow-xs">{r.to_institution}</span>
                </div>
                <span className="ml-auto flex gap-2"><Badge tone={REFERRAL_STATUS[r.status]?.tone}>{REFERRAL_STATUS[r.status]?.label}</Badge>{r.urgency !== "routine" && <Badge tone="warning">{r.urgency}</Badge>}</span>
              </div>
              <div className="space-y-4 p-5 sm:p-6">
                <div>
                  <p className="text-sm text-ink-3">Referred by {r.referrer}{r.specialty ? ` for ${r.specialty}` : ""} · {formatDate(r.created_at)} · <span className="font-mono">{r.reference}</span></p>
                  <p className="mt-1 text-[15px] text-ink">{r.reason}</p>
                  <p className="mt-1 text-[13px] text-ink-3">Receiving facility's Institution ID: <span className="font-mono text-ink-2">{formatInstitutionCode(r.to_code)}</span></p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{r.records.length ? `Records that would be sent (${r.records.length})` : "No records attached: only the referral letter"}</p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">{r.records.map((x) => (
                    <li key={x.id} className="flex items-center gap-3 rounded-md border border-line/80 px-3 py-2.5">
                      <CategoryIcon category={x.category_key} size="sm" />
                      <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{x.title}</span><span className="text-xs text-ink-3">{CATEGORY[x.category_key]?.singular} · {formatDate(x.clinical_date)}</span></span>
                    </li>
                  ))}</ul>
                </div>
                {r.appointment_at && <p className="flex items-center gap-2 rounded-md bg-accent-50 px-3 py-2.5 text-sm font-semibold text-accent-700"><Icon name="event_available" size={18} />Appointment booked for {formatDateTime(r.appointment_at)}. We'll text you the day before.</p>}
                {r.response_note && <p className="rounded-md bg-sunken px-3 py-2 text-sm text-ink-2">Note from {r.to_institution}: “{r.response_note}”</p>}
                {r.status === "awaiting_patient" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/80 pt-4">
                    <p className="text-[13px] text-ink-3">If you approve, {r.to_institution} can see only these records for 30 days. Every view is logged. Answer by {formatDate(r.respond_by)}.</p>
                    <div className="flex gap-2">
                      <ConfirmDialog trigger={<Button variant="secondary">Decline</Button>} title="Decline this referral?" confirmLabel="Decline"
                        description="Nothing will be shared. Your doctor will be told." onConfirm={decideReferralAction.bind(null, r.id, false)} />
                      <ConfirmDialog trigger={<Button variant="accent" icon="check">Approve and send</Button>} title={`Send to ${r.to_institution}?`} confirmLabel="Approve"
                        description={`${r.to_institution} will see the ${r.records.length} record(s) listed for 30 days. You can revoke this any time from Access & sharing.`}
                        onConfirm={decideReferralAction.bind(null, r.id, true)} />
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
