import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformCapability } from "@/lib/auth/actor";
import { withActor, withService } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { CategoryIcon } from "@/components/domain/category-icon";
import { ProvenanceBadge } from "@/components/domain/provenance";
import { Countdown } from "@/components/domain/countdown";
import { CATEGORY, PERMISSION_STATUS, VERIFICATION, purposeLabel } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatHealthId } from "@/lib/validation/common";
import { closeOversightAction, openOversightAction } from "../../manage-actions";

export const metadata: Metadata = { title: "Patient record (oversight)" };

type Overview = {
  profile: { full_name: string; date_of_birth: string; sex: string; phone: string | null; state_of_residence: string | null; lga: string | null;
             emergency_contact_name: string | null; emergency_contact_phone: string | null; emergency_contact_relationship: string | null };
  patient: { status: string; verification: string; created_at: string; health_id: string | null };
  health_profile: null | { blood_group: string; genotype: string; allergies: string | null; chronic_conditions: string[];
                           current_medications: string | null; nhia_number: string | null; hmo_name: string | null; organ_donor: boolean };
  records: { id: string; title: string; category_key: string; clinical_date: string | null; source: string; verification: string; status: string;
             institution: string | null; professional: string | null }[];
  permissions: { reference: string; institution: string; status: string; purpose: string; starts_at: string; expires_at: string }[];
  oversight_history: { admin: string; reason: string; opened_at: string; closed_at: string | null; expires_at: string }[];
  session: { id: string; expires_at: string; reason: string };
};

export default async function OversightPatient({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePlatformCapability("records:oversight");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  // Minimal header before any session: name and Health ID only.
  const [head] = await withService((tx) => tx<{ full_name: string; health_id: string | null }[]>`
    select pp.full_name, (select value from health_identifiers h where h.patient_id = pp.patient_id and h.identifier_type = 'platform_hid') as health_id
    from patient_profiles pp where pp.patient_id = ${id}`);
  if (!head) notFound();

  const [session] = await withActor(actor.userId, (tx) => tx<{ id: string | null }[]>`select (app.oversight_session(${id})).id`);
  const active = !!session?.id;
  const d = active ? (await withActor(actor.userId, (tx) => tx<{ v: Overview }[]>`select app.oversight_patient(${id}) as v`))[0].v : null;

  const header = (
    <PageHeader eyebrow="Oversight access" title={head.full_name}
      description={<>Health ID <span className="font-mono text-ink-2">{head.health_id ? formatHealthId(head.health_id) : "—"}</span></>}
      actions={<Button asChild variant="secondary" icon="arrow_back"><Link href="/admin/patients">All patients</Link></Button>} />
  );

  if (!d) {
    return (
      <div className="animate-fade-in space-y-6">
        {header}
        <Card className="overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[1fr_1.2fr]">
            <div className="bg-gradient-to-br from-brand-800 to-brand-600 p-8 text-white">
              <span className="grid size-14 place-items-center rounded-full bg-white/15 ring-1 ring-white/25"><Icon name="policy" size={28} /></span>
              <h2 className="mt-6 text-2xl font-bold">Open this patient's record</h2>
              <p className="mt-3 leading-7 text-white/85">Oversight access is for investigations, complaints, safety reviews and legal obligations, not for curiosity.</p>
            </div>
            <CardBody className="space-y-5 p-8">
              <ul className="space-y-3 text-[15px] text-ink-2">
                {[
                  ["edit_note", "You must give a reason. It's stored with every view."],
                  ["key", "You'll confirm it's you with your authenticator code."],
                  ["schedule", "Access closes automatically after 30 minutes."],
                  ["notifications", "The patient is notified with your name and reason, and sees each view in their activity history."],
                  ["fact_check", "Security officers are alerted and every page you open is written to the tamper-evident audit trail."],
                ].map(([icon, text]) => (
                  <li key={text} className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon name={icon as never} size={18} /></span><span className="pt-1.5">{text}</span></li>
                ))}
              </ul>
              <ConfirmDialog
                trigger={<Button icon="lock_open" size="lg">Open record with a reason</Button>}
                title={`Open ${head.full_name}'s record`}
                description="State why you need access. The patient will see exactly what you write."
                confirmLabel="Open record" reauth
                reason={{ label: "Reason for access", required: true, minLength: 15, placeholder: "e.g. Investigating complaint SUP-1042 about an incorrect lab result" }}
                onConfirm={openOversightAction.bind(null, id)} />
            </CardBody>
          </div>
        </Card>
      </div>
    );
  }

  const byCategory = d.records.reduce<Record<string, number>>((m, r) => ((m[r.category_key] = (m[r.category_key] ?? 0) + 1), m), {});
  const hp = d.health_profile;
  return (
    <div className="animate-fade-in space-y-6">
      {header}
      <div className="sticky top-16 z-10 flex flex-wrap items-center gap-4 rounded-lg border border-warning-line bg-warning-bg/95 px-5 py-3.5 shadow-card backdrop-blur">
        <span className="grid size-10 place-items-center rounded-full bg-surface text-warning-fg"><Icon name="visibility" size={20} /></span>
        <div className="min-w-0 flex-1 text-sm text-warning-fg">
          <p className="font-bold">Oversight session open · closes in <Countdown until={d.session.expires_at} className="font-mono" /></p>
          <p className="truncate">Reason: {d.session.reason}</p>
        </div>
        <ConfirmDialog trigger={<Button size="sm" variant="secondary">End session now</Button>} title="End oversight session?"
          description="You'll need a new reason to open this record again." confirmLabel="End session" onConfirm={closeOversightAction.bind(null, id)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: "folder_open", label: "Records", value: d.records.length, tone: "bg-brand-50 text-brand-600" },
          { icon: "shield_person", label: "Active permissions", value: d.permissions.filter((p) => p.status === "active").length, tone: "bg-accent-50 text-accent-600" },
          { icon: "bloodtype", label: "Blood group", value: hp?.blood_group && hp.blood_group !== "unknown" ? hp.blood_group : "—", tone: "bg-danger-bg text-danger-fg" },
          { icon: "genetics", label: "Genotype", value: hp?.genotype && hp.genotype !== "unknown" ? hp.genotype : "—", tone: "bg-warning-bg text-warning-fg" },
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-4 p-5">
            <span className={`grid size-12 place-items-center rounded-full ${s.tone}`}><Icon name={s.icon as never} size={24} /></span>
            <div><p className="text-[13px] text-ink-3">{s.label}</p><p className="text-2xl font-bold text-ink">{s.value}</p></div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader><CardTitle>Records ({d.records.length})</CardTitle>
            <div className="flex flex-wrap gap-1.5">{Object.entries(byCategory).map(([k, n]) => <Badge key={k} tone="brand">{CATEGORY[k]?.label ?? k} · {n}</Badge>)}</div>
          </CardHeader>
          {d.records.length === 0 ? <EmptyState compact icon="folder_open" title="No records" /> : (
            <ul className="divide-y divide-line/80">
              {d.records.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/patients/${id}/records/${r.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-brand-50/50 sm:px-6">
                    <CategoryIcon category={r.category_key} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold text-ink">{r.title}</span>
                      <span className="block truncate text-[13px] text-ink-3">{CATEGORY[r.category_key]?.singular} · {r.institution ?? "Patient upload"} · {formatDate(r.clinical_date)}</span>
                    </span>
                    <span className="hidden sm:block"><ProvenanceBadge source={r.source} /></span>
                    <Icon name="chevron_right" size={20} className="text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Patient</CardTitle><Badge tone={VERIFICATION[d.patient.verification]?.tone}>{VERIFICATION[d.patient.verification]?.label}</Badge></CardHeader>
            <CardBody>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <dt className="text-ink-3">Born</dt><dd className="text-ink">{formatDate(d.profile.date_of_birth)}</dd>
                <dt className="text-ink-3">Sex</dt><dd className="capitalize text-ink">{d.profile.sex}</dd>
                <dt className="text-ink-3">State</dt><dd className="text-ink">{d.profile.state_of_residence ?? "—"}</dd>
                <dt className="text-ink-3">Phone</dt><dd className="text-ink">{d.profile.phone ?? "—"}</dd>
                <dt className="text-ink-3">Emergency contact</dt><dd className="text-ink">{d.profile.emergency_contact_name ? `${d.profile.emergency_contact_name} (${d.profile.emergency_contact_relationship ?? "contact"})` : "—"}</dd>
                <dt className="text-ink-3">Joined</dt><dd className="text-ink">{formatDate(d.patient.created_at)}</dd>
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Emergency health profile</CardTitle></CardHeader>
            <CardBody>
              {!hp ? <p className="text-sm text-ink-3">The patient hasn't filled this in.</p> : (
                <dl className="space-y-3 text-sm">
                  <div><dt className="text-ink-3">Allergies</dt><dd className="text-ink">{hp.allergies ?? "None recorded"}</dd></div>
                  <div><dt className="text-ink-3">Long-term conditions</dt><dd className="text-ink">{hp.chronic_conditions.length ? hp.chronic_conditions.join(", ") : "None recorded"}</dd></div>
                  <div><dt className="text-ink-3">Current medicines</dt><dd className="text-ink">{hp.current_medications ?? "None recorded"}</dd></div>
                  <div><dt className="text-ink-3">Insurance</dt><dd className="text-ink">{hp.nhia_number ? `NHIA ${hp.nhia_number}` : "No NHIA number"}{hp.hmo_name ? ` · ${hp.hmo_name}` : ""}</dd></div>
                </dl>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Who has access</CardTitle></CardHeader>
        {d.permissions.length === 0 ? <EmptyState compact icon="shield_person" title="No institution has ever been given access" /> : (
          <Table caption="Permissions">
            <THead><tr><Th>Institution</Th><Th>Purpose</Th><Th>Status</Th><Th>From</Th><Th>Until</Th></tr></THead>
            <TBody>{d.permissions.map((p) => (
              <Tr key={p.reference}>
                <Td><p className="font-medium text-ink">{p.institution}</p><p className="font-mono text-xs text-ink-3">{p.reference}</p></Td>
                <Td className="text-ink-2">{purposeLabel(p.purpose)}</Td>
                <Td><Badge tone={PERMISSION_STATUS[p.status]?.tone}>{PERMISSION_STATUS[p.status]?.label ?? p.status}</Badge></Td>
                <Td className="text-ink-3">{formatDate(p.starts_at)}</Td>
                <Td className="text-ink-3">{formatDate(p.expires_at)}</Td>
              </Tr>
            ))}</TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>Oversight history on this patient</CardTitle><Link href="/admin/audit?action=oversight." className="text-sm font-semibold text-brand-600">Full audit trail</Link></CardHeader>
        <ul className="divide-y divide-line/80">
          {d.oversight_history.map((o) => (
            <li key={o.opened_at} className="flex gap-4 px-5 py-3.5 sm:px-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warning-bg text-warning-fg"><Icon name="policy" size={18} /></span>
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-ink">{o.admin} <span className="font-normal text-ink-3">· {formatDateTime(o.opened_at)}</span></p>
                <p className="text-ink-2">{o.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Callout tone="info" icon="info">Viewing is read-only. Clinical corrections must come from the institution that created the record.</Callout>
    </div>
  );
}
