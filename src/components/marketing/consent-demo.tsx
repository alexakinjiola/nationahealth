"use client";
import * as React from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const CATS: { key: string; label: string; icon: IconName; sample: string[] }[] = [
  { key: "lab", label: "Lab results", icon: "science", sample: ["Full blood count · 14 Oct", "Lipid profile · 3 Nov"] },
  { key: "rx", label: "Prescriptions", icon: "medication", sample: ["Amlodipine 5 mg · active"] },
  { key: "dx", label: "Diagnoses", icon: "diagnosis", sample: ["Essential hypertension"] },
  { key: "allergy", label: "Allergies", icon: "allergy", sample: ["Penicillin — rash"] },
  { key: "img", label: "Imaging", icon: "radiology", sample: ["Chest X-ray report · 2019"] },
  { key: "vax", label: "Vaccinations", icon: "vaccines", sample: ["Hepatitis B · dose 3"] },
];
const DURATIONS = [7, 30, 90] as const;

/** Lets a visitor play the patient: choose what a hospital may see and watch the preview change. */
export function ConsentDemo() {
  const [on, setOn] = React.useState<string[]>(["lab", "rx"]);
  const [days, setDays] = React.useState<(typeof DURATIONS)[number]>(30);
  const [decided, setDecided] = React.useState<"approved" | "declined" | null>(null);
  const visible = CATS.filter((c) => on.includes(c.key));
  const hidden = CATS.length - visible.length;
  const toggle = (k: string) => { setDecided(null); setOn((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k])); };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-warning-bg text-warning-fg"><Icon name="pending_actions" size={22} /></span>
          <div><p className="font-bold text-ink">Ikeja Specialist Hospital is asking</p><p className="text-sm text-ink-3">Dr Chidi Eze · Cardiology · for a blood pressure review</p></div>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-ink">What can they see?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATS.map((c) => {
              const active = on.includes(c.key);
              return (
                <button key={c.key} type="button" aria-pressed={active} onClick={() => toggle(c.key)}
                  className={cn("inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-200 active:scale-95",
                    active ? "border-brand-600 bg-brand-600 text-white shadow-[0_8px_18px_-8px_rgb(11_76_180_/_0.7)]" : "border-line-strong bg-surface text-ink-2 hover:border-brand-300")}>
                  <Icon name={active ? "check" : c.icon} size={18} />{c.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-ink">For how long?</legend>
          <div className="mt-3 inline-flex rounded-full border border-line/80 bg-canvas p-1">
            {DURATIONS.map((d) => (
              <button key={d} type="button" aria-pressed={days === d} onClick={() => { setDecided(null); setDays(d); }}
                className={cn("rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200", days === d ? "bg-surface text-brand-700 shadow-card" : "text-ink-3 hover:text-ink")}>
                {d} days
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setDecided("declined")} className="h-12 rounded-full border border-line-strong bg-surface text-sm font-semibold text-ink transition-all hover:bg-danger-bg hover:text-danger-fg active:scale-95">Decline</button>
          <button type="button" disabled={on.length === 0} onClick={() => setDecided("approved")}
            className="h-12 rounded-full bg-accent-600 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgb(20_111_59_/_0.6)] transition-all hover:bg-accent-700 active:scale-95 disabled:opacity-50">
            Allow {on.length ? `${on.length} ${on.length === 1 ? "type" : "types"}` : ""}
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 p-6 text-white shadow-lg sm:p-8">
        <div aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-white/[0.07]" />
        <p className="relative text-xs font-bold uppercase tracking-[0.14em] text-brand-100">What the hospital sees</p>
        <div aria-live="polite" className="relative mt-4">
          {decided === "declined" ? (
            <div key="declined" className="animate-pop rounded-lg bg-white/10 p-6 text-center ring-1 ring-white/20">
              <Icon name="block" size={40} className="mx-auto text-white/90" />
              <p className="mt-3 text-lg font-bold">Nothing at all.</p>
              <p className="mt-1 text-sm text-white/80">They're told you declined. Your records stay private.</p>
            </div>
          ) : (
            <div key={`${on.join()}-${days}-${decided}`} className="animate-pop space-y-3">
              {visible.length === 0 ? (
                <p className="rounded-lg bg-white/10 p-5 text-sm text-white/85 ring-1 ring-white/15">Pick at least one type of record to share, or decline.</p>
              ) : visible.map((c) => (
                <div key={c.key} className="rounded-lg bg-white/[0.12] p-4 ring-1 ring-white/15 backdrop-blur">
                  <p className="flex items-center gap-2 text-sm font-bold"><Icon name={c.icon} size={18} />{c.label}</p>
                  <ul className="mt-1.5 space-y-0.5 text-[13px] text-white/80">{c.sample.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              ))}
              {hidden > 0 && <p className="flex items-center gap-2 rounded-lg border border-dashed border-white/30 px-4 py-3 text-[13px] text-white/80"><Icon name="lock" size={16} />{hidden} other {hidden === 1 ? "type stays" : "types stay"} hidden</p>}
              <p className="flex items-center gap-2 pt-1 text-[13px] text-white/85">
                <Icon name="schedule" size={16} />Access ends automatically in {days} days{decided === "approved" ? " — or the moment you revoke it." : "."}
              </p>
              {decided === "approved" && <p className="animate-pop inline-flex items-center gap-2 rounded-full bg-accent-500 px-3.5 py-1.5 text-[13px] font-bold"><Icon name="check_circle" size={16} />Approved — every view will appear in your activity history</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
