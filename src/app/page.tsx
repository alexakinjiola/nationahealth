import Link from "next/link";
import { PublicShell } from "@/components/shell/public-shell";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { RecordStack } from "@/components/marketing/record-stack";

const JOURNEY: { city: string; year: string; title: string; body: string; who: string }[] = [
  { city: "Lagos", year: "2019", title: "A chest X-ray from an old envelope", body: "You photograph it and add it yourself. It's clearly labelled as your upload, so nobody mistakes it for a hospital record.", who: "Added by you" },
  { city: "Ibadan", year: "2024", title: "Hepatitis B vaccine, dose three", body: "The clinic adds it straight to your record. No paper card to lose, no need to remember which dose you're on.", who: "Added by the clinic" },
  { city: "Abuja", year: "2026", title: "A new cardiologist asks to look", body: "She sees your name, not your history. You let her see lab results and prescriptions for 30 days. Nothing else.", who: "Shared with your permission" },
];

const LEDGER: { when: string; who: string; what: string; basis: string; tone: "ok" | "blocked" | "you" }[] = [
  { when: "Today, 09:41", who: "Dr Funmilayo A. · Lagos Island General", what: "Opened your full blood count", basis: "Your permission, ends 13 Feb", tone: "ok" },
  { when: "Today, 09:12", who: "Ikeja Specialist Hospital", what: "Tried to open your record", basis: "Blocked: no permission", tone: "blocked" },
  { when: "Yesterday", who: "You", what: "Ended access for Meridian Diagnostics", basis: "Took effect immediately", tone: "you" },
  { when: "12 Nov", who: "Dr Chidi E. · Ikeja Specialist", what: "Asked to see lab results", basis: "Waiting for you", tone: "ok" },
];

const RULES: { icon: IconName; title: string; body: string }[] = [
  { icon: "verified", title: "Only verified institutions can ask", body: "We check a hospital's or laboratory's licence before it can request a record or add one." },
  { icon: "lock", title: "Documents never get a public link", body: "Files are encrypted before they're stored and can only be opened through a signed-in, permitted session." },
  { icon: "do_not_disturb_on", title: "Saying no is always one tap away", body: "Revoke access whenever you like. It ends immediately, even if their screen is still open." },
  { icon: "emergency", title: "Emergency access is the exception", body: "Break-glass access is limited, expires quickly and is reviewed by a person afterwards — and you're told." },
];

export default function Landing() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-16 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[1.08fr_1fr] lg:gap-10 lg:pb-28 lg:pt-14">
        <div className="animate-slide-up">
          <p className="eyebrow flex items-center gap-2.5"><span aria-hidden className="size-1.5 rounded-full bg-clay-500" />Personal health records for Nigeria</p>
          <h1 className="mt-6 font-display text-[3rem] font-normal leading-[0.98] tracking-[-0.035em] text-ink sm:text-[4.6rem]">
            Your medical history, <em className="font-light italic text-brand-700">wherever</em> you go next.
          </h1>
          <p className="mt-7 max-w-[34rem] text-lg leading-8 text-ink-2">
            Move cities, change hospitals or see a specialist — your diagnoses, results and prescriptions come with you.
            Nobody reads them unless you say so.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Button asChild size="lg" variant="ink" iconRight="arrow_forward" className="sm:px-7"><Link href="/register">Create your free record</Link></Button>
            <Link href="/register/provider" className="group inline-flex h-12 items-center gap-2 text-[15px] font-medium text-ink">
              <span className="underline decoration-line-strong underline-offset-[6px] transition-colors group-hover:decoration-ink">I represent a hospital or lab</span>
            </Link>
          </div>
          <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
            {[["Free", "for patients, always"], ["Any phone", "no app to download"], ["Every view", "logged with a name"]].map(([k, v]) => (
              <div key={k}><dt className="font-display text-xl text-ink">{k}</dt><dd className="mt-1 text-[13px] leading-5 text-ink-3">{v}</dd></div>
            ))}
          </dl>
        </div>
        <RecordStack />
      </section>

      {/* Journey */}
      <section id="how" aria-labelledby="how-title" className="scroll-mt-8 border-y border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <h2 id="how-title" className="font-display text-[2.4rem] font-normal leading-[1.05] tracking-[-0.025em] text-ink sm:text-[3.2rem]">
              One record, <br className="hidden sm:block" />every hospital you visit.
            </h2>
            <p className="max-w-md text-[17px] leading-7 text-ink-3 lg:justify-self-end">
              Most people's history is scattered across folders, phones and filing rooms in three different cities. Here it gathers in one place — and stays yours.
            </p>
          </div>

          <ol className="relative mt-16 grid gap-12 lg:mt-20 lg:grid-cols-3 lg:gap-10">
            <span aria-hidden className="absolute left-[7px] top-2 bottom-2 w-px bg-line-strong lg:left-0 lg:right-0 lg:top-[7px] lg:bottom-auto lg:h-px lg:w-auto" />
            {JOURNEY.map((j, i) => (
              <li key={j.city} className="relative pl-10 lg:pl-0 lg:pt-12">
                <span aria-hidden className={`absolute left-0 top-1 size-[15px] rounded-full border-2 lg:top-0 ${i === JOURNEY.length - 1 ? "border-clay-500 bg-clay-500" : "border-ink bg-surface"}`} />
                <p className="flex items-baseline gap-3"><span className="font-display text-[1.7rem] text-ink">{j.city}</span><span className="font-mono text-xs text-ink-3">{j.year}</span></p>
                <h3 className="mt-3 text-[17px] font-semibold text-ink">{j.title}</h3>
                <p className="mt-2 max-w-sm leading-7 text-ink-3">{j.body}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-brand-700">{j.who}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Control — the activity ledger */}
      <section id="privacy" aria-labelledby="privacy-title" className="scroll-mt-8 bg-navy-900 text-white">
        <div className="mx-auto grid max-w-[1200px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-28">
          <div>
            <p className="eyebrow !text-navy-300">You hold the keys</p>
            <h2 id="privacy-title" className="mt-5 font-display text-[2.4rem] font-normal leading-[1.05] tracking-[-0.025em] sm:text-[3.2rem]">
              Nobody reads your record unless you say so.
            </h2>
            <p className="mt-6 max-w-md text-[17px] leading-7 text-navy-200">
              A hospital can confirm who you are with your Health ID. It can't see a single result until you approve — and you choose which records, for what purpose and for how long.
            </p>
            <p className="mt-4 max-w-md text-[17px] leading-7 text-navy-200">
              Every time someone opens something, it shows up in your history with their name and the permission they used.
            </p>
          </div>

          <figure className="self-center">
            <div className="overflow-hidden rounded-lg bg-navy-950/60 ring-1 ring-white/10">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                <p className="text-sm font-semibold">Activity on your record</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-navy-300">Live</p>
              </div>
              <ul>
                {LEDGER.map((l) => (
                  <li key={l.when + l.what} className="grid gap-1 border-b border-white/[0.07] px-5 py-4 last:border-0 sm:grid-cols-[110px_1fr] sm:gap-5">
                    <p className="font-mono text-xs text-navy-300 sm:pt-0.5">{l.when}</p>
                    <div>
                      <p className="text-[15px] text-white">{l.what}</p>
                      <p className="mt-0.5 text-[13px] text-navy-300">{l.who}</p>
                      <p className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium ${l.tone === "blocked" ? "text-clay-100" : l.tone === "you" ? "text-navy-200" : "text-brand-200"}`}>
                        <Icon name={l.tone === "blocked" ? "block" : l.tone === "you" ? "person" : "shield_person"} size={14} />{l.basis}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <figcaption className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-navy-300">Example · synthetic details</figcaption>
          </figure>
        </div>
      </section>

      {/* Rules */}
      <section aria-labelledby="rules-title" className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <h2 id="rules-title" className="font-display text-[2.2rem] font-normal leading-[1.08] tracking-[-0.02em] text-ink sm:text-[2.8rem]">
              Rules we can't quietly change.
            </h2>
            <p className="mt-5 max-w-sm text-[17px] leading-7 text-ink-3">
              Health information is among the most personal there is. These protections are enforced on our servers and in the database itself — not just hidden on your screen.
            </p>
          </div>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {RULES.map((r) => (
              <li key={r.title} className="border-t border-ink py-7">
                <Icon name={r.icon} size={22} className="text-brand-700" />
                <h3 className="mt-4 font-display text-[1.35rem] leading-snug text-ink">{r.title}</h3>
                <p className="mt-2 leading-7 text-ink-3">{r.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Institutions */}
      <section aria-labelledby="inst-title" className="border-t border-line bg-sand-50">
        <div className="mx-auto grid max-w-[1200px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="eyebrow">For hospitals, clinics and laboratories</p>
            <h2 id="inst-title" className="mt-5 font-display text-[2.2rem] font-normal leading-[1.08] tracking-[-0.02em] text-ink sm:text-[2.8rem]">
              The patient's history, in the consulting room — with their permission.
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                "Find a patient by Health ID and request exactly what you need.",
                "Submit records from your existing systems, with full provenance. FHIR R4 supported.",
                "Every view by your staff is logged under their own name, not a shared account.",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-[16px] leading-7 text-ink-2"><Icon name="check" size={20} className="mt-1 shrink-0 text-brand-700" />{t}</li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="ink"><Link href="/register/provider">Register your institution</Link></Button>
              <Button asChild size="lg" variant="secondary"><Link href="/sign-in">Staff sign in</Link></Button>
            </div>
          </div>

          <div aria-hidden className="rounded-lg border border-line bg-surface shadow-paper">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <p className="font-display text-xl text-ink">Adaeze Okafor</p>
                <p className="font-mono text-xs tracking-[0.06em] text-ink-3">NG 4471 0286 15 · F · 34</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-success-bg px-2 py-1 text-xs font-medium text-success-fg"><Icon name="verified_user" size={14} filled />Access granted</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
              {[["Lab results", "6"], ["Prescriptions", "3"], ["Ends in", "28 days"]].map(([k, v]) => (
                <div key={k} className="px-6 py-4"><p className="text-xs text-ink-3">{k}</p><p className="mt-1 font-display text-2xl text-ink">{v}</p></div>
              ))}
            </div>
            <ul className="divide-y divide-line">
              {[["Lipid profile", "Meridian Diagnostics", "3 Nov 2026"], ["Amlodipine 5 mg", "Lagos Island General", "Active"], ["Full blood count", "Meridian Diagnostics", "14 Oct 2026"]].map(([a, b, c]) => (
                <li key={a} className="flex items-center justify-between px-6 py-3.5">
                  <div><p className="text-sm font-medium text-ink">{a}</p><p className="text-xs text-ink-3">{b}</p></div>
                  <p className="font-mono text-xs text-ink-3">{c}</p>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-6 py-3 text-xs text-ink-3">Purpose: hypertension review · approved by the patient</p>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-[1200px] px-5 pt-24 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-8 border-t border-ink pt-10 md:flex-row md:items-end">
          <h2 className="max-w-2xl font-display text-[2.4rem] font-normal leading-[1.05] tracking-[-0.025em] text-ink sm:text-[3.4rem]">
            Start your record today. <span className="italic text-ink-3">It's free, and it's yours.</span>
          </h2>
          <Button asChild size="lg" variant="ink" iconRight="arrow_forward" className="shrink-0 sm:px-7"><Link href="/register">Create your free record</Link></Button>
        </div>
      </section>
    </PublicShell>
  );
}
