import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePlatformCapability } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { toAppError } from "@/lib/errors";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ProvenanceBadge } from "@/components/domain/provenance";
import { StructuredData } from "@/components/domain/structured-data";
import { CATEGORY } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Record (oversight)" };

type Rec = {
  id: string; title: string; description: string | null; category_key: string; clinical_date: string | null; source: string;
  verification_status: string; status: string; institution_name: string | null; attending_professional: string | null;
  originating_facility: string | null; created_at: string; structured_data: unknown;
  attachments: { id: string; file_name: string; mime_type: string; size_bytes: number }[];
};

export default async function OversightRecord({ params }: { params: Promise<{ id: string; recordId: string }> }) {
  const actor = await requirePlatformCapability("records:oversight");
  const { id, recordId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(recordId)) notFound();
  let r: Rec;
  try {
    [{ v: r }] = await withActor(actor.userId, (tx) => tx<{ v: Rec }[]>`select app.oversight_record(${recordId}) as v`);
  } catch (e) {
    if (toAppError(e).status === 401) redirect(`/admin/patients/${id}`);
    throw e;
  }
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader eyebrow={CATEGORY[r.category_key]?.singular ?? "Record"} title={r.title}
        description={`${r.institution_name ?? r.originating_facility ?? "Patient upload"} · ${formatDate(r.clinical_date)}`}
        actions={<Button asChild variant="secondary" icon="arrow_back"><Link href={`/admin/patients/${id}`}>Back to patient</Link></Button>} />
      <div className="flex flex-wrap gap-2"><ProvenanceBadge source={r.source} /><Badge tone="neutral">{r.status.replace(/_/g, " ")}</Badge>
        <Badge tone="warning" icon="visibility">This view was logged</Badge></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardBody><p className="whitespace-pre-wrap leading-7 text-ink-2">{r.description ?? "No description."}</p></CardBody></Card>
          {r.structured_data ? <StructuredData data={r.structured_data as never} /> : null}
        </div>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Provenance</CardTitle></CardHeader>
            <CardBody><dl className="space-y-3 text-sm">
              <div><dt className="text-ink-3">Clinician</dt><dd className="text-ink">{r.attending_professional ?? "—"}</dd></div>
              <div><dt className="text-ink-3">Verification</dt><dd className="text-ink">{r.verification_status.replace(/_/g, " ")}</dd></div>
              <div><dt className="text-ink-3">Added</dt><dd className="text-ink">{formatDateTime(r.created_at)}</dd></div>
            </dl></CardBody></Card>
          <Card><CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
            {r.attachments.length === 0 ? <CardBody><p className="text-sm text-ink-3">None.</p></CardBody> : (
              <ul className="divide-y divide-line/80">{r.attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-sm"><Icon name="attach_file" size={18} className="text-ink-3" />
                  <span className="min-w-0 flex-1 truncate text-ink">{a.file_name}</span><span className="text-xs text-ink-3">{Math.round(a.size_bytes / 1024)} KB</span></li>
              ))}</ul>
            )}
            <CardBody className="border-t border-line/80 pt-4"><p className="text-xs text-ink-3">Files aren't downloadable from the oversight console, to limit copies of clinical data.</p></CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
