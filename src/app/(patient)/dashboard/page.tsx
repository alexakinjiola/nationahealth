import type { Metadata } from "next";
import Link from "next/link";
import { requirePatientContext } from "@/lib/auth/actor";
import { dashboardData } from "@/server/patient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { HealthIdCard } from "@/components/domain/health-id";
import { CategoryIcon } from "@/components/domain/category-icon";
import { ProvenanceBadge } from "@/components/domain/provenance";
import { ActivityItem, type ActivityRow } from "@/components/domain/activity-item";
import { VERIFICATION, purposeLabel, CATEGORY } from "@/lib/labels";
import { formatDate, relativeTime, daysUntil, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };


function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const { actor, patientId, actingAs } = await requirePatientContext("/dashboard");
  const d = await dashboardData(actor.userId, patientId);
  const v = VERIFICATION[d.profile.verification_status];
  const firstName = d.profile.full_name.split(" ")[0];

  const summary: { label: string; value: number; hint: string; href: string; attention?: boolean }[] = [
    { label: "Medical records", value: d.counts.records, hint: `${d.counts.uploads} uploaded by you`, href: "/records" },
    { label: "Contributing institutions", value: d.counts.institutions, hint: "Hospitals and labs that added records", href: "/timeline" },
    { label: "Active permissions", value: d.perm.active, hint: d.perm.next_expiry ? `Next ends ${formatDate(d.perm.next_expiry)}` : "No one has access right now", href: "/access?tab=active" },
    { label: "Pending requests", value: d.pending.length, hint: d.pending.length ? "Needs your decision" : "You're all caught up", href: "/access", attention: d.pending.length > 0 },
  ];

  return (
    <div className="space-y-10 animate-fade-in">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-3 font-display text-[2.5rem] font-normal leading-[1.05] tracking-[-0.03em] text-ink sm:text-[3.1rem]">
            {actingAs ? `${firstName}'s health record` : <>{greeting()}, <em className="italic text-brand-700">{firstName}</em></>}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone={v.tone} icon={v.icon}>{v.label}</Badge>
            {!d.profile.emergency_contact_name && <Badge tone="neutral" icon="info">No emergency contact yet</Badge>}
          </div>
        </div>
        {d.profile.health_id && <HealthIdCard value={d.profile.health_id} name={d.profile.full_name} />}
      </section>

      {d.profile.verification_status !== "verified" && (
        <Callout tone={d.profile.verification_status === "failed" ? "danger" : "warning"}
          title={d.profile.verification_status === "pending" || d.profile.verification_status === "under_review" ? "We're checking your identity" : "Verify your identity to connect with hospitals"}
          action={d.profile.verification_status === "pending" || d.profile.verification_status === "under_review" ? undefined :
            <Button asChild size="sm" variant="secondary"><Link href="/onboarding/identity">Verify now</Link></Button>}>
          Until your identity is confirmed, healthcare institutions can't find you or add records to your account. You can still upload your own documents.
        </Callout>
      )}

      {d.pending.length > 0 && (
        <section aria-labelledby="pending-title" className="relative overflow-hidden rounded-lg border border-line bg-surface">
          <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-clay-500" />
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-6 py-4 sm:px-7">
            <h2 id="pending-title" className="flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-clay-700">
              <span aria-hidden className="size-2 rounded-full bg-clay-500" />
              {plural(d.pending.length, "institution")} {d.pending.length === 1 ? "is" : "are"} waiting for your decision
            </h2>
            <p className="text-[13px] text-ink-3">Nothing is shared until you approve.</p>
          </div>
          <ul className="divide-y divide-line">
            {d.pending.map((r) => (
              <li key={r.id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:px-7">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[1.45rem] leading-tight text-ink">{r.institution_name}</p>
                  <p className="mt-1 text-sm text-ink-3">{purposeLabel(r.purpose)} · {plural(r.categories, "category", "categories")} · asked {relativeTime(r.created_at)}</p>
                </div>
                <p className="font-mono text-xs text-clay-700">Expires in {plural(Math.max(daysUntil(r.respond_by), 0), "day")}</p>
                <Button asChild variant="ink" iconRight="arrow_forward"><Link href={`/access/requests/${r.id}`}>Review request</Link></Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Summary" className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-line gap-px lg:grid-cols-4">
        {summary.map((s) => (
          <Link key={s.label} href={s.href} className="group bg-surface px-5 py-5 transition-colors hover:bg-canvas sm:px-6">
            <span className="flex items-center justify-between text-[13px] font-medium text-ink-3">
              {s.label}
              <Icon name="arrow_forward" size={16} className="text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
            <span className={`mt-3 block font-display text-[2.6rem] leading-none tracking-[-0.02em] tabular ${s.attention ? "text-clay-700" : "text-ink"}`}>{s.value}</span>
            <span className="mt-2 block text-xs text-ink-3">{s.hint}</span>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="recent-title">
          <div className="flex items-end justify-between gap-4 border-b border-ink pb-3">
            <h2 id="recent-title" className="font-display text-[1.6rem] leading-none text-ink">Recently added</h2>
            <div className="flex items-center gap-4">
              <Link href="/records/upload" className="hidden text-sm font-medium text-ink-2 hover:text-ink sm:inline-flex sm:items-center sm:gap-1.5"><Icon name="upload_file" size={18} />Upload</Link>
              <Link href="/records" className="link text-sm">All records</Link>
            </div>
          </div>
          {d.recent.length === 0 ? (
            <EmptyState icon="folder_open" title="No records yet" action={<Button asChild variant="secondary" icon="upload_file"><Link href="/records/upload">Upload a document</Link></Button>}>
              Records appear here when a verified institution adds them, or when you upload documents you already have.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {d.recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/records/${r.id}`} className="group -mx-3 flex items-center gap-4 rounded-md px-3 py-4 hover:bg-surface">
                    <CategoryIcon category={r.category_key} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{r.title}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-ink-3">{CATEGORY[r.category_key]?.singular} · {r.institution_name ?? "Your upload"}</span>
                    </span>
                    <span className="hidden shrink-0 font-mono text-xs text-ink-3 md:block">{formatDate(r.clinical_date)}</span>
                    <span className="hidden sm:block"><ProvenanceBadge source={r.source} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-12 flex items-end justify-between gap-4 border-b border-ink pb-3">
            <h2 className="font-display text-[1.6rem] leading-none text-ink">Activity on your record</h2>
            <Link href="/activity" className="link text-sm">Full history</Link>
          </div>
          {d.activity.length === 0 ? (
            <EmptyState compact icon="history" title="No activity yet">Every request, view and download involving your records will be listed here.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">{(d.activity as unknown as ActivityRow[]).map((a) => <ActivityItem key={a.event_key} a={a} compact />)}</ul>
          )}
        </section>

        <aside className="space-y-8" aria-label="Updates">
          <section aria-labelledby="notif-title">
            <div className="flex items-end justify-between gap-4 border-b border-ink pb-3">
              <h2 id="notif-title" className="font-display text-[1.6rem] leading-none text-ink">Notifications</h2>
              <Link href="/notifications" className="link text-sm">See all</Link>
            </div>
            {d.notifications.length === 0 ? <p className="py-4 text-sm text-ink-3">Nothing new.</p> : (
              <ul className="divide-y divide-line">
                {d.notifications.map((n) => (
                  <li key={n.id} className="flex gap-3 py-3.5">
                    <span className={`mt-2 size-2 shrink-0 rounded-full ${n.read_at ? "bg-line-strong" : "bg-clay-500"}`} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{n.title}{!n.read_at && <span className="sr-only"> (unread)</span>}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-ink-3">{relativeTime(n.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg bg-sand-50 p-6 ring-1 ring-sand-100">
            <Icon name="privacy_tip" size={22} className="text-brand-700" />
            <p className="mt-4 font-display text-[1.3rem] leading-snug text-ink">Your record isn't public.</p>
            <p className="mt-2 text-sm leading-6 text-ink-2">
              Hospitals can confirm who you are with your Health ID, but they can't see any record until you approve a request.
            </p>
            <Link href="/access" className="link mt-4 inline-block text-sm">Manage who has access</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
