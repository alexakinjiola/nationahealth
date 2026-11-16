import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import doctorChild from "../../../../public/images/doctor-child.webp";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { ProgressRing, Reveal } from "@/components/ui/motion";
import { withActor } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
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


function greetingKey() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()));
  return h < 12 ? "dash.morning" : h < 17 ? "dash.afternoon" : "dash.evening";
}

export default async function DashboardPage() {
  const { actor, patientId, actingAs } = await requirePatientContext("/dashboard");
  const d = await dashboardData(actor.userId, patientId);
  const t = await getT();
  const [hp] = await withActor(actor.userId, (tx) => tx<{ blood_group: string; genotype: string; allergies: string | null; chronic_conditions: string[]; nhia_number: string | null }[]>`
    select blood_group, genotype, allergies, chronic_conditions, nhia_number from patient_health_profiles where patient_id = ${patientId}`);
  const hpScore = Math.round(([hp?.blood_group && hp.blood_group !== "unknown", hp?.genotype && hp.genotype !== "unknown", !!hp?.allergies,
    (hp?.chronic_conditions?.length ?? 0) > 0, !!hp?.nhia_number, !!d.profile.emergency_contact_name].filter(Boolean).length / 6) * 100);
  const v = VERIFICATION[d.profile.verification_status];
  const firstName = d.profile.full_name.split(" ")[0];

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 px-6 py-8 text-white shadow-lg sm:px-9 sm:py-10">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-white/[0.07]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 right-1/3 size-64 rounded-full bg-accent-500/25 blur-2xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-100">{formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="mt-2 text-[2rem] font-bold leading-[1.15] tracking-[-0.025em] sm:text-[2.5rem]">
              {actingAs ? `${firstName}'s health record` : <>{t(greetingKey())}, <span className="font-display font-normal italic text-accent-200">{firstName}</span></>}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-semibold ring-1 ring-white/20">
                <Icon name={v.icon} size={15} filled />{v.label}
              </span>
              {!d.profile.emergency_contact_name && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-brand-100 ring-1 ring-white/15"><Icon name="info" size={15} />No emergency contact yet</span>
              )}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="secondary" className="border-transparent"><Link href="/records/upload"><Icon name="upload_file" size={20} />{t("dash.upload")}</Link></Button>
              <Button asChild variant="accent"><Link href="/access"><Icon name="shield_person" size={20} />{t("dash.manage")}</Link></Button>
            </div>
          </div>
          {d.profile.health_id && <HealthIdCard value={d.profile.health_id} name={d.profile.full_name} />}
        </div>
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
        <Card as="section" aria-labelledby="pending-title" className="overflow-hidden border-warning-line">
          <div className="flex flex-wrap items-center gap-4 bg-warning-bg/70 px-5 py-4 sm:px-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-warning-fg shadow-xs"><Icon name="pending_actions" size={22} /></span>
            <div className="min-w-0 flex-1">
              <h2 id="pending-title" className="text-base font-bold text-ink">{plural(d.pending.length, "institution")} {d.pending.length === 1 ? "is" : "are"} waiting for your decision</h2>
              <p className="text-sm text-ink-3">Nothing is shared until you approve. Unanswered requests expire automatically.</p>
            </div>
          </div>
          <ul className="divide-y divide-line/80">
            {d.pending.map((r) => (
              <li key={r.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <span className="hidden size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 sm:grid"><Icon name="local_hospital" size={22} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{r.institution_name}</p>
                  <p className="text-sm text-ink-3">{purposeLabel(r.purpose)} · {plural(r.categories, "category", "categories")} · asked {relativeTime(r.created_at)}</p>
                </div>
                <span className="inline-flex h-7 items-center gap-1.5 self-start rounded-full bg-warning-bg px-3 text-xs font-semibold text-warning-fg sm:self-auto"><Icon name="schedule" size={15} />Expires in {plural(Math.max(daysUntil(r.respond_by), 0), "day")}</span>
                <Button asChild><Link href={`/access/requests/${r.id}`}>Review request<Icon name="arrow_forward" size={18} /></Link></Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <Reveal><Stat label="Medical records" value={d.counts.records} hint={`${d.counts.uploads} uploaded by you`} icon="folder_open" href="/records" /></Reveal>
        <Reveal delay={80}><Stat label="Contributing institutions" value={d.counts.institutions} hint="Hospitals and labs" icon="domain" href="/timeline" /></Reveal>
        <Reveal delay={160}><Stat label="Active permissions" value={d.perm.active} icon="shield_person" href="/access?tab=active"
          hint={d.perm.next_expiry ? `Next ends ${formatDate(d.perm.next_expiry)}` : "No one has access right now"} /></Reveal>
        <Reveal delay={240}><Stat label="Pending requests" value={d.pending.length} icon="pending_actions" href="/access" tone={d.pending.length ? "attention" : "neutral"}
          hint={d.pending.length ? "Needs your decision" : "You're all caught up"} /></Reveal>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="items-center">
              <CardTitle>Recently added records</CardTitle>
              <Link href="/records" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">All records<Icon name="chevron_right" size={18} /></Link>
            </CardHeader>
            {d.recent.length === 0 ? (
              <EmptyState icon="folder_open" title="No records yet" action={<Button asChild variant="secondary" icon="upload_file"><Link href="/records/upload">Upload a document</Link></Button>}>
                Records appear here when a verified institution adds them, or when you upload documents you already have.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line/80">
                {d.recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`/records/${r.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-brand-50/50 sm:px-6">
                      <CategoryIcon category={r.category_key} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold text-ink">{r.title}</span>
                        <span className="block truncate text-[13px] text-ink-3">{CATEGORY[r.category_key]?.singular} · {r.institution_name ?? "Your upload"} · {formatDate(r.clinical_date)}</span>
                      </span>
                      <span className="hidden sm:block"><ProvenanceBadge source={r.source} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader className="items-center">
              <CardTitle>Recent activity on your record</CardTitle>
              <Link href="/activity" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">Full history<Icon name="chevron_right" size={18} /></Link>
            </CardHeader>
            {d.activity.length === 0 ? (
              <EmptyState compact icon="history" title="No activity yet">Every request, view and download involving your records will be listed here.</EmptyState>
            ) : (
              <ul className="divide-y divide-line/80 px-5 sm:px-6">{(d.activity as unknown as ActivityRow[]).map((a) => <ActivityItem key={a.event_key} a={a} compact />)}</ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-4 bg-gradient-to-r from-danger-bg to-warning-bg/60 px-5 py-4">
              <ProgressRing value={hpScore} size={64} stroke={7} color="var(--color-danger-600)"><span className="text-sm font-bold text-ink">{hpScore}%</span></ProgressRing>
              <div><p className="font-bold text-ink">Emergency profile</p><p className="text-[13px] text-ink-3">{hpScore === 100 ? "Ready for any emergency" : "A few details missing"}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              <div className="rounded-lg bg-danger-bg/60 p-3 text-center"><p className="text-[11px] font-semibold uppercase tracking-wider text-danger-fg">Blood group</p><p className="mt-0.5 text-2xl font-extrabold text-ink">{hp?.blood_group && hp.blood_group !== "unknown" ? hp.blood_group : "—"}</p></div>
              <div className="rounded-lg bg-warning-bg/70 p-3 text-center"><p className="text-[11px] font-semibold uppercase tracking-wider text-warning-fg">Genotype</p><p className="mt-0.5 text-2xl font-extrabold text-ink">{hp?.genotype && hp.genotype !== "unknown" ? hp.genotype : "—"}</p></div>
            </div>
            <div className="flex gap-2 border-t border-line/80 px-5 py-3">
              <Link href="/health-profile" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"><Icon name="emergency_home" size={18} />{hp ? "Update" : "Set up"}</Link>
              <span className="text-line-strong">·</span>
              <Link href="/immunisations" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"><Icon name="vaccines" size={18} />Immunisations</Link>
            </div>
          </Card>
          <Card>
            <CardHeader className="items-center"><CardTitle>Notifications</CardTitle><Link href="/notifications" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">See all<Icon name="chevron_right" size={18} /></Link></CardHeader>
            {d.notifications.length === 0 ? <CardBody><p className="text-sm text-ink-3">Nothing new.</p></CardBody> : (
              <ul className="divide-y divide-line/80">
                {d.notifications.map((n) => (
                  <li key={n.id} className="flex gap-3 px-5 py-3.5 sm:px-6">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full ${n.read_at ? "bg-sunken text-ink-3" : "bg-brand-50 text-brand-600"}`}><Icon name="notifications" size={18} /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{n.title}{!n.read_at && <span className="sr-only"> (unread)</span>}</p>
                      <p className="text-xs text-ink-3">{relativeTime(n.created_at)}</p>
                    </div>
                    {!n.read_at && <span aria-hidden className="ml-auto mt-1.5 size-2 shrink-0 rounded-full bg-accent-500" />}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <section className="relative min-h-[300px] overflow-hidden rounded-lg shadow-card">
            <Image src={doctorChild} alt="" fill placeholder="blur" sizes="360px" className="object-cover" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-brand-900/95 via-brand-900/60 to-brand-900/10" />
            <div className="relative flex min-h-[300px] flex-col justify-end p-6 text-white">
              <span className="grid size-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/25"><Icon name="privacy_tip" size={20} /></span>
              <p className="mt-4 text-lg font-bold">Your record isn't public</p>
              <p className="mt-1 text-sm leading-6 text-white/85">Hospitals can confirm who you are with your Health ID, but can't see any record until you approve.</p>
              <Link href="/access" className="mt-4 inline-flex h-9 items-center gap-1.5 self-start rounded-full bg-surface px-4 text-[13px] font-semibold text-brand-700 hover:bg-brand-50">Manage access<Icon name="arrow_forward" size={16} /></Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
