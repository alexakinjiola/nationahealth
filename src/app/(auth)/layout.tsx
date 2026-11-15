import { Logo } from "@/components/shell/logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { SkipLink } from "@/components/shell/skip-link";
import { Stamp } from "@/components/marketing/record-stack";

const POINTS: { icon: IconName; title: string; body: string }[] = [
  { icon: "shield_person", title: "You decide who sees what", body: "Hospitals must ask. You choose the records, the purpose and how long." },
  { icon: "history", title: "Every view is recorded", body: "See exactly who opened your records, when, and under which permission." },
  { icon: "verified", title: "Verified institutions only", body: "Providers are checked before they can request or add records." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <SkipLink />
      <aside className="relative hidden overflow-hidden bg-navy-900 text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20">
        <Logo inverted />
        <div className="max-w-lg">
          <p className="eyebrow !text-navy-300">A personal health record for Nigeria</p>
          <p className="mt-6 font-display text-[2.9rem] font-light leading-[1.06] tracking-[-0.03em]">
            Your health records should follow you — <em className="italic text-brand-200">not stay behind</em> at the last hospital.
          </p>
          <ul className="mt-12 border-t border-white/10">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4 border-b border-white/10 py-5">
                <Icon name={p.icon} size={22} className="mt-0.5 shrink-0 text-brand-200" />
                <span>
                  <span className="block text-[15px] font-semibold">{p.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-navy-200">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-navy-300">Encrypted in transit and at rest · No health details in emails or texts</p>
        <Stamp text="YOUR RECORD · YOUR DECISION · " className="pointer-events-none absolute right-10 top-10 size-28 rotate-[10deg] text-white/[0.12]" />
      </aside>
      <div className="flex min-h-dvh flex-col">
        <div className="px-5 pt-5 lg:hidden"><Logo /></div>
        <main id="main" className="flex flex-1 items-start justify-center px-5 py-10 sm:items-center sm:px-8">
          <div className="w-full max-w-[440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
