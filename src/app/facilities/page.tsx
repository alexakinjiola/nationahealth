import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/shell/public-shell";
import { withService } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { CountUp, Reveal } from "@/components/ui/motion";
import { INSTITUTION_TYPE } from "@/lib/labels";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { formatInstitutionCode } from "@/lib/validation/common";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Find a verified facility", description: "Hospitals, clinics and laboratories verified on the platform, with their Institution IDs." };

const TYPE_ICON: Record<string, IconName> = {
  hospital: "local_hospital", clinic: "medical_services", laboratory: "science", diagnostic_centre: "radiology",
  primary_health_centre: "health_and_safety", pharmacy: "local_pharmacy",
};

type Row = { name: string; institution_type: string; institution_code: string; city: string | null; state: string | null; lga: string | null;
  phone: string | null; website: string | null; verified_since: string | null };

export default async function FacilitiesPage({ searchParams }: { searchParams: Promise<{ state?: string; type?: string; q?: string }> }) {
  const sp = await searchParams;
  const state = NIGERIAN_STATES.includes(sp.state as never) ? sp.state! : null;
  const type = sp.type && sp.type in INSTITUTION_TYPE ? sp.type : null;
  const q = sp.q?.trim().slice(0, 80) || null;
  const { rows, stats } = await withService(async (tx) => ({
    rows: await tx<Row[]>`select * from app.public_facility_directory(${state}, ${type}::institution_type, ${q})`,
    stats: await tx<{ state: string; institution_type: string; total: number }[]>`select * from app.public_facility_stats()`,
  }));
  const total = stats.reduce((t, s) => t + s.total, 0);
  const statesCovered = new Set(stats.map((s) => s.state)).size;
  const byType = Object.keys(INSTITUTION_TYPE).map((t) => ({ t, n: stats.filter((s) => s.institution_type === t).reduce((a, s) => a + s.total, 0) }));

  return (
    <PublicShell current="/facilities">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow">Find a facility</p>
          <h1 className="mt-3 text-[2.25rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[3rem]">
            Verified care, <span className="accent-word">near you.</span>
          </h1>
          <p className="mt-4 text-lg leading-8 text-ink-2">Every facility listed here has had its licence checked. Use the Institution ID to confirm you're dealing with the real one before you share your records.</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[["domain", total === 1 ? "Verified facility" : "Verified facilities", total], ["map", statesCovered === 1 ? "State covered" : "States covered", statesCovered], ["science", "Laboratories & diagnostics", byType.filter((b) => ["laboratory", "diagnostic_centre"].includes(b.t)).reduce((a, b) => a + b.n, 0)]].map(([icon, label, n], i) => (
            <Reveal key={label as string} delay={i * 80}><div className="card flex items-center gap-4 p-5">
              <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon name={icon as IconName} size={24} /></span>
              <div><p className="text-3xl font-bold text-ink"><CountUp value={n as number} /></p><p className="text-sm text-ink-3">{label}</p></div>
            </div></Reveal>
          ))}
        </div>

        <form method="get" role="search" aria-label="Search facilities" className="sticky top-3 z-20 mt-8 grid gap-2 rounded-xl bg-surface p-2.5 shadow-lg ring-1 ring-line/70 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <label className="flex items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-brand-50/60">
            <Icon name="search" size={22} className="text-brand-600" />
            <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink-3">Name, town or Institution ID</span>
              <input name="q" defaultValue={q ?? ""} placeholder="e.g. Ikeja or HOS 4821…" className="h-9 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-placeholder" /></span>
          </label>
          <label className="flex items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-brand-50/60 md:border-l md:border-line">
            <Icon name="location_on" size={22} className="text-brand-600" />
            <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink-3">State</span>
              <select name="state" defaultValue={state ?? ""} className="h-9 w-full bg-transparent text-[15px] text-ink outline-none"><option value="">All states</option>{NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select></span>
          </label>
          <label className="flex items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-brand-50/60 md:border-l md:border-line">
            <Icon name="filter_alt" size={22} className="text-brand-600" />
            <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink-3">Type</span>
              <select name="type" defaultValue={type ?? ""} className="h-9 w-full bg-transparent text-[15px] text-ink outline-none"><option value="">All types</option>{Object.entries(INSTITUTION_TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></span>
          </label>
          <Button type="submit" size="lg" icon="search" className="m-1">Search</Button>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          {byType.filter((b) => b.n > 0).map((b) => (
            <Link key={b.t} href={`/facilities?type=${b.t}${state ? `&state=${state}` : ""}`} className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${type === b.t ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong bg-surface text-ink-2 hover:border-brand-300"}`}>
              <Icon name={TYPE_ICON[b.t]} size={16} />{INSTITUTION_TYPE[b.t]} <span className="opacity-70">{b.n}</span>
            </Link>
          ))}
          {(state || type || q) && <Link href="/facilities" className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-brand-600 hover:underline"><Icon name="close" size={16} />Clear</Link>}
        </div>

        <p className="mt-6 text-sm text-ink-3" aria-live="polite">{rows.length} {rows.length === 1 ? "facility" : "facilities"}{state ? ` in ${state}` : ""}</p>
        {rows.length === 0 ? (
          <div className="card mt-4 grid place-items-center p-12 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon name="travel_explore" size={32} /></span>
            <p className="mt-4 text-lg font-bold text-ink">No verified facilities match yet</p>
            <p className="mt-1 max-w-md text-ink-3">Facilities appear here once their licence has been checked. Ask your hospital to register.</p>
            <Button asChild className="mt-6"><Link href="/register/provider">Register a facility</Link></Button>
          </div>
        ) : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((f, i) => (
              <Reveal as="li" key={f.institution_code} delay={(i % 6) * 50}>
                <article className="card group flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-accent-600 text-white shadow-md transition-transform group-hover:scale-110"><Icon name={TYPE_ICON[f.institution_type] ?? "domain"} size={24} /></span>
                    <Badge tone="success" icon="verified">Verified</Badge>
                  </div>
                  <h2 className="mt-4 text-lg font-bold leading-snug text-ink">{f.name}</h2>
                  <p className="text-sm text-ink-3">{INSTITUTION_TYPE[f.institution_type]}</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-ink-2"><Icon name="location_on" size={18} className="text-ink-3" /><dt className="sr-only">Location</dt><dd>{[f.city, f.lga, f.state].filter(Boolean).join(", ")}</dd></div>
                    {f.phone && <div className="flex items-center gap-2 text-ink-2"><Icon name="call" size={18} className="text-ink-3" /><dt className="sr-only">Phone</dt><dd><a href={`tel:${f.phone}`} className="hover:text-brand-600">{f.phone}</a></dd></div>}
                  </dl>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/80 pt-4 mt-5">
                    <span className="text-xs text-ink-3">Institution ID<span className="block font-mono text-sm font-semibold text-ink">{formatInstitutionCode(f.institution_code)}</span></span>
                    {f.verified_since && <span className="text-right text-xs text-ink-3">Verified<span className="block text-ink-2">{formatDate(f.verified_since)}</span></span>}
                  </div>
                </article>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </PublicShell>
  );
}
