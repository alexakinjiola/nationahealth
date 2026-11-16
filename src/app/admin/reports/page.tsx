import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformCapability } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { CountUp, Reveal } from "@/components/ui/motion";
import { Donut, Funnel, Gauge, MultiLine, Pyramid, StackedBars, TrendArea } from "@/components/domain/report-charts";
import { PALETTE } from "@/lib/chart-palette";
import { CATEGORY, INSTITUTION_TYPE, purposeLabel } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { formatInstitutionCode } from "@/lib/validation/common";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Reports & analytics" };

type N = number;
type Report = {
  period: { from: string; to: string };
  kpis: Record<"patients_total" | "patients_new" | "patients_verified" | "institutions_approved" | "institutions_pending" | "professionals_verified" |
    "records_total" | "records_new" | "requests" | "requests_approved" | "active_permissions" | "emergency" | "denied" | "oversight" | "open_incidents", N> & { median_response_hours: N | null };
  growth: { week: string; patients: N; records: N; institutions: N }[];
  funnel: { stage: string; value: N }[];
  records_by_category: { key: string; label: string; value: N }[];
  records_by_source: { source: string; value: N }[];
  records_weekly_by_category: Record<string, N | string>[];
  requests_weekly: { week: string; approved: N; rejected: N; expired: N; pending: N }[];
  requests_by_purpose: { purpose: string; value: N }[];
  response_hours: { bucket: string; value: N }[];
  access_daily: { day: string; allowed: N; denied: N; emergency: N }[];
  denial_reasons: { reason: string; value: N }[];
  institutions_by_type: { type: string; approved: N; pending: N; other: N }[];
  states: { state: string; patients: N; institutions: N; records: N }[];
  demographics: { band: string; female: N; male: N; other: N }[];
  conditions: { condition: string; value: N }[];
  conditions_monthly: Record<string, N | string>[];
  conditions_by_state: { state: string; condition: string; value: N }[];
  immunisation: { antigen: string; children: N }[];
  genotypes: { genotype: string; value: N }[];
  blood_groups: { group: string; value: N }[];
  nhia_coverage: { with_nhia: N; profiles: N };
  top_institutions: { name: string; code: string; records: N }[];
  integrations: { active: N; records: N };
};

const PERIODS = [["30", "30 days"], ["90", "90 days"], ["180", "6 months"], ["365", "12 months"]] as const;
const SOURCE: Record<string, string> = { institution_submission: "Hospitals & labs", patient_upload: "Patient uploads", integration: "System integrations" };
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const show = (n: number) => (n === -1 ? "<5" : n.toLocaleString("en-NG"));

function Kpi({ icon, label, value, hint, tone = "brand", suffix }: { icon: IconName; label: string; value: number; hint?: string; tone?: "brand" | "accent" | "warning" | "danger"; suffix?: string }) {
  const t = { brand: "bg-brand-50 text-brand-600", accent: "bg-accent-50 text-accent-600", warning: "bg-warning-bg text-warning-fg", danger: "bg-danger-bg text-danger-fg" }[tone];
  return (
    <div className="card group relative overflow-hidden p-5 transition-shadow hover:shadow-md">
      <div aria-hidden className={cn("absolute -right-6 -top-6 size-24 rounded-full opacity-40 transition-transform duration-500 group-hover:scale-125", t)} />
      <span className={cn("relative grid size-11 place-items-center rounded-full", t)}><Icon name={icon} size={22} /></span>
      <p className="relative mt-4 text-[13px] font-medium text-ink-3">{label}</p>
      <p className="relative mt-1 text-[1.9rem] font-bold leading-none tracking-[-0.02em] text-ink"><CountUp value={value} />{suffix}</p>
      {hint && <p className="relative mt-2 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

function Section({ id, icon, title, description, children }: { id: string; icon: IconName; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 space-y-5">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-accent-600 text-white shadow-md"><Icon name={icon} size={24} /></span>
        <div><h2 id={`${id}-t`} className="text-xl font-bold tracking-[-0.01em] text-ink">{title}</h2><p className="text-sm text-ink-3">{description}</p></div>
      </div>
      {children}
    </section>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const actor = await requirePlatformCapability("reports:view");
  const sp = await searchParams;
  const days = PERIODS.some(([d]) => d === sp.days) ? Number(sp.days) : 90;
  const [{ r }] = await withActor(actor.userId, (tx) => tx<{ r: Report }[]>`select app.admin_report(current_date - ${days - 1}::int, current_date) as r`);
  const k = r.kpis;
  const conditionNames = r.conditions.map((c) => c.condition);
  const topConditions = conditionNames.slice(0, 5);
  const heatStates = [...new Set(r.conditions_by_state.map((c) => c.state))].slice(0, 12);
  const heatMax = Math.max(1, ...r.conditions_by_state.map((c) => c.value));
  const cats = r.records_by_category.filter((c) => c.value > 0).map((c) => c.key);
  const stateMax = Math.max(1, ...r.states.map((s) => Math.max(s.patients, 0)));
  const genoSum = r.genotypes.reduce((t, g) => t + Math.max(0, g.value), 0);
  const sickleTrait = r.genotypes.filter((g) => ["AS", "SS", "SC", "AC"].includes(g.genotype)).reduce((t, g) => t + Math.max(0, g.value), 0);

  return (
    <div className="animate-fade-in space-y-12">
      <PageHeader eyebrow="National health records" title="Reports & analytics"
        description={`De-identified figures for ${formatDate(r.period.from)} – ${formatDate(r.period.to)}. Groups smaller than five are shown as “<5” to protect privacy.`}
        actions={<>
          <nav aria-label="Reporting period" className="inline-flex rounded-full border border-line/80 bg-surface p-1 shadow-xs">
            {PERIODS.map(([d, l]) => (
              <Link key={d} href={`/admin/reports?days=${d}`} aria-current={Number(d) === days ? "page" : undefined}
                className={cn("rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors", Number(d) === days ? "bg-brand-600 text-white" : "text-ink-3 hover:bg-brand-50 hover:text-brand-700")}>{l}</Link>
            ))}
          </nav>
          <Button asChild variant="secondary" icon="download"><a href={`/api/admin/report?days=${days}`}>Download CSV</a></Button>
        </>} />

      <nav aria-label="Report sections" className="sticky top-16 z-10 -mx-1 flex gap-1.5 overflow-x-auto rounded-full border border-line/80 bg-surface/90 p-1.5 shadow-card backdrop-blur">
        {[["overview", "Overview"], ["growth", "Growth"], ["records", "Records"], ["access", "Consent & access"], ["health", "Public health"], ["network", "Facilities"]].map(([id, l]) => (
          <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-ink-3 transition-colors hover:bg-brand-50 hover:text-brand-700">{l}</a>
        ))}
      </nav>

      <section id="overview" aria-label="Key figures" className="scroll-mt-24 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          <Kpi key="1" icon="groups" label="Registered patients" value={k.patients_total} hint={`${k.patients_new.toLocaleString("en-NG")} new in this period`} />,
          <Kpi key="2" icon="how_to_reg" label="Identity verified" value={pct(k.patients_verified, k.patients_total)} suffix="%" tone="accent" hint={`${k.patients_verified.toLocaleString("en-NG")} patients`} />,
          <Kpi key="3" icon="folder_open" label="Medical records" value={k.records_total} hint={`${k.records_new.toLocaleString("en-NG")} added in this period`} />,
          <Kpi key="4" icon="domain" label="Verified facilities" value={k.institutions_approved} tone="accent" hint={`${k.institutions_pending} waiting for review · ${k.professionals_verified} verified clinicians`} />,
          <Kpi key="5" icon="pending_actions" label="Access requests" value={k.requests} hint={`${pct(k.requests_approved, k.requests)}% approved by patients`} />,
          <Kpi key="6" icon="speed" label="Median patient response" value={k.median_response_hours ?? 0} suffix=" h" tone="accent" hint="From request to decision" />,
          <Kpi key="7" icon="emergency" label="Emergency access" value={k.emergency} tone="warning" hint={`${k.denied} blocked attempts · ${k.oversight} oversight sessions`} />,
          <Kpi key="8" icon="shield_person" label="Active permissions" value={k.active_permissions} tone="accent" hint={`${k.open_incidents} open security incidents`} />,
        ].map((el, i) => <Reveal key={i} delay={i * 60}>{el}</Reveal>)}
      </section>

      <Section id="growth" icon="trending_up" title="Growth" description="New patients, records and facilities each week.">
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <Reveal><Card><CardHeader><div><CardTitle>Weekly growth</CardTitle><CardDescription>Sign-ups, records and facility registrations</CardDescription></div></CardHeader>
            <CardBody><TrendArea title="Weekly growth" data={r.growth} series={[{ key: "patients", label: "Patients" }, { key: "records", label: "Records" }, { key: "institutions", label: "Facilities" }]} /></CardBody></Card></Reveal>
          <Reveal delay={100}><Card className="h-full"><CardHeader><div><CardTitle>Patient journey</CardTitle><CardDescription>How far patients get, all time</CardDescription></div></CardHeader>
            <CardBody><Funnel data={r.funnel} /></CardBody></Card></Reveal>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal><Card><CardHeader><div><CardTitle>Age and sex</CardTitle><CardDescription>Registered patients by age band</CardDescription></div></CardHeader>
            <CardBody><Pyramid title="Age and sex of registered patients" data={r.demographics} /></CardBody></Card></Reveal>
          <Reveal delay={100}><Card><CardHeader><div><CardTitle>Patients by state</CardTitle><CardDescription>Where registered patients live</CardDescription></div></CardHeader>
            <CardBody><ul className="space-y-2.5">{r.states.slice(0, 12).map((s, i) => (
              <li key={s.state} className="grid grid-cols-[110px_1fr_56px] items-center gap-3 text-sm">
                <span className="truncate font-medium text-ink">{s.state}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-sunken"><span className="block h-full rounded-full transition-[width] duration-1000" style={{ width: `${(Math.max(s.patients, 0) / stateMax) * 100}%`, background: PALETTE[i % 2] }} /></span>
                <span className="text-right font-semibold text-ink">{show(s.patients)}</span>
              </li>
            ))}</ul></CardBody></Card></Reveal>
        </div>
      </Section>

      <Section id="records" icon="folder_open" title="Records" description="What's being recorded, by whom, and how fast.">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal><Card><CardHeader><CardTitle>Records by type</CardTitle></CardHeader>
            <CardBody><Donut title="Records by type" centerLabel="records" data={r.records_by_category.map((c) => ({ label: c.label, value: c.value }))} /></CardBody></Card></Reveal>
          <Reveal delay={100}><Card><CardHeader><CardTitle>Where records come from</CardTitle></CardHeader>
            <CardBody><Donut title="Records by source" centerLabel="records" data={r.records_by_source.map((s) => ({ label: SOURCE[s.source] ?? s.source, value: s.value }))} /></CardBody></Card></Reveal>
        </div>
        <Reveal><Card><CardHeader><div><CardTitle>Records added each week, by type</CardTitle><CardDescription>{r.integrations.records.toLocaleString("en-NG")} arrived through {r.integrations.active} connected hospital systems</CardDescription></div></CardHeader>
          <CardBody><StackedBars title="Records added each week by type" xKey="week" data={r.records_weekly_by_category} height={300}
            series={cats.map((c) => ({ key: c, label: CATEGORY[c]?.label ?? c }))} /></CardBody></Card></Reveal>
      </Section>

      <Section id="access" icon="shield_person" title="Consent & access" description="How patients answer requests, and how the platform protects their records.">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal><Card><CardHeader><CardTitle>Access requests by outcome</CardTitle></CardHeader>
            <CardBody><StackedBars title="Access requests by outcome each week" xKey="week" data={r.requests_weekly}
              series={[{ key: "approved", label: "Approved", color: "#146f3b" }, { key: "rejected", label: "Declined", color: "#dc2626" }, { key: "expired", label: "Expired", color: "#94a3b8" }, { key: "pending", label: "Waiting", color: "#d97706" }]} /></CardBody></Card></Reveal>
          <Reveal delay={100}><Card><CardHeader><CardTitle>How fast patients decide</CardTitle></CardHeader>
            <CardBody><StackedBars title="Time from request to decision" xKey="bucket" xFormat="text" data={r.response_hours} series={[{ key: "value", label: "Requests" }]} /></CardBody></Card></Reveal>
        </div>
        <Reveal><Card><CardHeader><div><CardTitle>Access to protected records, daily</CardTitle><CardDescription>Allowed views, blocked attempts and emergency (break-glass) access</CardDescription></div></CardHeader>
          <CardBody><MultiLine title="Daily access attempts" data={r.access_daily}
            series={[{ key: "allowed", label: "Allowed", color: "#0b4cb4" }, { key: "denied", label: "Blocked", color: "#dc2626", dashed: true }, { key: "emergency", label: "Emergency", color: "#d97706" }]} /></CardBody></Card></Reveal>
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal><Card><CardHeader><CardTitle>Why institutions ask</CardTitle></CardHeader>
            <CardBody><StackedBars title="Access requests by purpose" horizontal xKey="label" xFormat="text"
              data={r.requests_by_purpose.map((p) => ({ label: purposeLabel(p.purpose), value: p.value }))} series={[{ key: "value", label: "Requests" }]} /></CardBody></Card></Reveal>
          <Reveal delay={100}><Card><CardHeader><CardTitle>Why access was blocked</CardTitle></CardHeader>
            <CardBody>{r.denial_reasons.length === 0 ? <p className="text-sm text-ink-3">No blocked attempts in this period.</p> :
              <StackedBars title="Blocked attempts by reason" horizontal xKey="label" xFormat="text"
                data={r.denial_reasons.map((d) => ({ label: d.reason.replace(/_/g, " "), value: d.value }))} series={[{ key: "value", label: "Attempts", color: "#dc2626" }]} />}</CardBody></Card></Reveal>
        </div>
      </Section>

      <Section id="health" icon="coronavirus" title="Public health surveillance"
        description="Priority conditions from diagnoses and visits, matched by name. Indicative only: coverage grows as more facilities join.">
        <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
          <Reveal><Card><CardHeader><CardTitle>Patients by condition</CardTitle></CardHeader>
            <CardBody><StackedBars title="Patients with each priority condition" horizontal xKey="condition" xFormat="text" height={340}
              data={r.conditions} series={[{ key: "value", label: "Patients", color: "#146f3b" }]} /></CardBody></Card></Reveal>
          <Reveal delay={100}><Card><CardHeader><CardTitle>Monthly trend, top five conditions</CardTitle></CardHeader>
            <CardBody><MultiLine title="Monthly cases of the top five conditions" xKey="month" xFormat="month" height={340} data={r.conditions_monthly}
              series={topConditions.map((c) => ({ key: c, label: c }))} /></CardBody></Card></Reveal>
        </div>
        <Reveal><Card>
          <CardHeader><div><CardTitle>Condition hotspots by state</CardTitle><CardDescription>Darker cells mean more patients. “&lt;5” is a small group, hidden for privacy.</CardDescription></div></CardHeader>
          <div role="region" aria-label="Condition hotspots by state" tabIndex={0} className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <caption className="sr-only">Patients with each priority condition, by state</caption>
              <thead><tr className="bg-canvas"><th scope="col" className="sticky left-0 bg-canvas px-4 py-2.5 font-semibold text-ink-2">State</th>
                {conditionNames.slice(0, 8).map((c) => <th key={c} scope="col" className="px-2 py-2.5 text-center font-semibold text-ink-2">{c}</th>)}</tr></thead>
              <tbody>{heatStates.map((s) => (
                <tr key={s} className="border-t border-line/70">
                  <th scope="row" className="sticky left-0 bg-surface px-4 py-2 font-medium text-ink">{s}</th>
                  {conditionNames.slice(0, 8).map((c) => {
                    const v = r.conditions_by_state.find((x) => x.state === s && x.condition === c)?.value ?? 0;
                    const a = v === -1 ? 0.12 : v / heatMax;
                    return <td key={c} className="px-1 py-1"><span className="grid h-9 place-items-center rounded-md text-xs font-semibold transition-transform hover:scale-105"
                      style={{ background: `rgb(11 76 180 / ${0.06 + a * 0.85})`, color: a > 0.5 ? "#fff" : "#0e1b34" }}>{v === 0 ? "–" : show(v)}</span></td>;
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card></Reveal>
        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2"><Card className="h-full"><CardHeader><div><CardTitle>Childhood immunisation (NPI)</CardTitle><CardDescription>Children under 15 with at least one recorded dose</CardDescription></div></CardHeader>
            <CardBody><StackedBars title="Children with a recorded dose of each vaccine" xKey="antigen" xFormat="text" data={r.immunisation} series={[{ key: "children", label: "Children", color: "#0891b2" }]} /></CardBody></Card></Reveal>
          <Reveal delay={100}><Card className="h-full"><CardHeader><div><CardTitle>Health insurance</CardTitle><CardDescription>Patients who added an NHIA number</CardDescription></div></CardHeader>
            <CardBody><Gauge value={pct(Math.max(0, r.nhia_coverage.with_nhia), r.nhia_coverage.profiles)} label={`of ${r.nhia_coverage.profiles.toLocaleString("en-NG")} health profiles`} color="#0b4cb4" /></CardBody></Card></Reveal>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal><Card><CardHeader><div><CardTitle>Genotype</CardTitle><CardDescription>{pct(sickleTrait, genoSum)}% carry an S or C gene. Useful for sickle cell counselling.</CardDescription></div></CardHeader>
            <CardBody><Donut title="Genotypes recorded by patients" centerLabel="profiles" data={r.genotypes.map((g) => ({ label: g.genotype, value: g.value }))} /></CardBody></Card></Reveal>
          <Reveal delay={100}><Card><CardHeader><div><CardTitle>Blood groups</CardTitle><CardDescription>Helps blood banks plan donor drives</CardDescription></div></CardHeader>
            <CardBody><StackedBars title="Blood groups recorded by patients" xKey="group" xFormat="text" data={r.blood_groups} series={[{ key: "value", label: "Patients", color: "#dc2626" }]} /></CardBody></Card></Reveal>
        </div>
      </Section>

      <Section id="network" icon="hub" title="Facilities" description="Who's on the network and who contributes most.">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal><Card><CardHeader><CardTitle>Facilities by type and status</CardTitle></CardHeader>
            <CardBody><StackedBars title="Facilities by type and status" xKey="label" xFormat="text"
              data={r.institutions_by_type.map((t) => ({ ...t, label: INSTITUTION_TYPE[t.type] ?? t.type }))}
              series={[{ key: "approved", label: "Verified", color: "#146f3b" }, { key: "pending", label: "In review", color: "#d97706" }, { key: "other", label: "Other", color: "#94a3b8" }]} /></CardBody></Card></Reveal>
          <Reveal delay={100}><Card><CardHeader><CardTitle>Most active facilities this period</CardTitle></CardHeader>
            {r.top_institutions.length === 0 ? <CardBody><p className="text-sm text-ink-3">No records submitted in this period.</p></CardBody> : (
              <ol className="divide-y divide-line/80">{r.top_institutions.map((t, i) => (
                <li key={t.code} className="flex items-center gap-4 px-5 py-3 sm:px-6">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold", i < 3 ? "bg-brand-600 text-white" : "bg-sunken text-ink-2")}>{i + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{t.name}</span><span className="font-mono text-xs text-ink-3">{formatInstitutionCode(t.code)}</span></span>
                  <span className="text-sm font-bold text-ink">{t.records.toLocaleString("en-NG")}</span>
                </li>
              ))}</ol>
            )}</Card></Reveal>
        </div>
        <Reveal><Card><CardHeader><CardTitle>States at a glance</CardTitle></CardHeader>
          <div role="region" aria-label="States at a glance" tabIndex={0} className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">Patients, verified facilities and records by state</caption>
              <thead className="bg-canvas"><tr>{["State", "Patients", "Verified facilities", "Records"].map((h) => <th key={h} scope="col" className="px-5 py-2.5 font-semibold text-ink-2">{h}</th>)}</tr></thead>
              <tbody>{r.states.map((s) => (
                <tr key={s.state} className="border-t border-line/70 hover:bg-brand-50/40">
                  <th scope="row" className="px-5 py-2.5 font-medium text-ink">{s.state}</th>
                  <td className="px-5 py-2.5 text-ink-2">{show(s.patients)}</td><td className="px-5 py-2.5 text-ink-2">{s.institutions}</td><td className="px-5 py-2.5 text-ink-2">{show(s.records)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card></Reveal>
      </Section>

      <p className="flex items-start gap-2 rounded-lg bg-brand-50 p-4 text-sm text-brand-800">
        <Icon name="privacy_tip" size={20} className="shrink-0" />
        Every figure here is an aggregate. No names, Health IDs or individual records are shown, and opening this report is recorded in the audit trail.
      </p>
    </div>
  );
}
