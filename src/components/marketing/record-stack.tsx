import { Icon } from "@/components/ui/icon";

/** A circular rubber-stamp mark. Purely decorative. */
export function Stamp({ text, className }: { text: string; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <path id="stamp-circle" d="M60 60 m-43 0 a43 43 0 1 1 86 0 a43 43 0 1 1 -86 0" />
      </defs>
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="60" cy="60" r="33" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text fontFamily="IBM Plex Mono, monospace" fontSize="9.6" fontWeight="500" letterSpacing="2.6" fill="currentColor">
        <textPath href="#stamp-circle">{text}</textPath>
      </text>
      <path d="M46 61l9 9 19-20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const RESULTS = [
  { test: "Haemoglobin", value: "12.8", unit: "g/dL", range: "12.0–15.5" },
  { test: "White cells", value: "6.2", unit: "×10⁹/L", range: "4.0–11.0" },
  { test: "Platelets", value: "248", unit: "×10⁹/L", range: "150–400" },
  { test: "Fasting glucose", value: "5.4", unit: "mmol/L", range: "3.9–5.5" },
];

/**
 * The hero illustration: real-looking paper records with a consent slip on top.
 * Everything here is synthetic and hidden from assistive tech except the caption.
 */
export function RecordStack() {
  return (
    <figure className="relative mx-auto w-full max-w-[540px]">
      <div aria-hidden className="relative h-[500px] sm:h-[580px]">
        {/* Back sheet — discharge summary */}
        <div className="paper absolute -left-[2%] top-2 hidden w-[70%] -rotate-[6deg] rounded-sm border border-line px-7 py-6 shadow-paper sm:block">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Discharge summary</p>
          <div className="mt-3 space-y-2">
            {[92, 80, 86, 64, 74].map((w, i) => <div key={i} className="h-[5px] rounded-full bg-sunken" style={{ width: `${w}%` }} />)}
          </div>
        </div>

        {/* Middle sheet — lab report */}
        <div className="absolute right-0 top-0 w-[94%] rotate-[2.5deg] sm:top-6 sm:w-[86%] rounded-sm border border-line bg-surface shadow-paper ">
          <div className="flex items-start justify-between border-b border-dashed border-line-strong px-6 pb-4 pt-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Laboratory report</p>
              <p className="mt-1 font-display text-[1.35rem] leading-tight text-ink">Full blood count</p>
              <p className="mt-0.5 whitespace-nowrap text-xs text-ink-3">Meridian Diagnostics · Ibadan</p>
            </div>
            <p className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 sm:block">Ref. MD-20418</p>
          </div>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                <th className="px-6 pb-1.5 pt-3 font-medium">Test</th><th className="pb-1.5 pt-3 font-medium">Result</th><th className="hidden px-6 pb-1.5 pt-3 text-right font-medium sm:table-cell">Range</th>
              </tr>
            </thead>
            <tbody>
              {RESULTS.map((r) => (
                <tr key={r.test} className="border-t border-line/70">
                  <td className="px-6 py-2 text-ink-2">{r.test}</td>
                  <td className="whitespace-nowrap py-2 pr-6 font-mono text-ink sm:pr-0">{r.value} <span className="text-ink-3">{r.unit}</span></td>
                  <td className="hidden px-6 py-2 text-right font-mono text-ink-3 sm:table-cell">{r.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-end justify-end px-6 pb-6 pt-4 text-right">
            <div className="mr-24">
              <p className="font-display text-xl italic leading-none text-ink-2">F. Adeyemi</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Reviewed · 14 Oct 2026</p>
            </div>
          </div>
          <Stamp text="VERIFIED INSTITUTION · ADDED DIRECTLY · " className="absolute -bottom-3 right-3 size-[96px] -rotate-[12deg] text-brand-600/75" />
        </div>

        {/* Front — the consent slip */}
        <div className="absolute bottom-0 left-0 w-[88%] -rotate-[1.5deg] rounded-md bg-surface shadow-lg ring-1 ring-ink/10 sm:w-[70%]">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3">
            <span className="size-2 rounded-full bg-clay-500" />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-clay-700">Needs your decision</p>
          </div>
          <div className="px-5 pb-5 pt-4">
            <p className="text-[15px] leading-snug text-ink"><span className="font-semibold">Ikeja Specialist Hospital</span> would like to see your</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700"><Icon name="science" size={14} />Lab results</span>
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700"><Icon name="medication" size={14} />Prescriptions</span>
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-sunken px-2 py-1 text-xs font-medium text-ink-2"><Icon name="schedule" size={14} />30 days</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <span className="inline-flex h-9 items-center justify-center rounded-md border border-line-strong text-[13px] font-medium text-ink">Decline</span>
              <span className="inline-flex h-9 items-center justify-center rounded-md bg-ink text-[13px] font-medium text-white">Allow</span>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Illustration · synthetic details</figcaption>
    </figure>
  );
}
