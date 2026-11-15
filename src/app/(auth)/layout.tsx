import Image from "next/image";
import { Logo } from "@/components/shell/logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { SkipLink } from "@/components/shell/skip-link";
import heroDoctor from "../../../public/images/hero-doctor.webp";

const POINTS: { icon: IconName; title: string }[] = [
  { icon: "shield_person", title: "You decide who sees what" },
  { icon: "history", title: "Every view is recorded" },
  { icon: "verified", title: "Verified institutions only" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <SkipLink />
      <aside className="relative hidden p-4 lg:block">
        <div className="sticky top-4 h-[calc(100dvh-2rem)] overflow-hidden rounded-xl">
          <div className="absolute inset-0"><Image src={heroDoctor} alt="" fill priority placeholder="blur" sizes="50vw" className="object-cover object-top" /></div>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-brand-900/70 via-brand-900/20 via-40% to-brand-900/95" />
          <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-12">
            <Logo inverted />
            <div className="max-w-md">
              <p className="text-[2.4rem] font-bold leading-[1.12] tracking-[-0.025em]">
                Your records should follow you — <span className="font-display font-normal italic text-accent-200">not stay behind.</span>
              </p>
              <ul className="mt-8 flex flex-wrap gap-2">
                {POINTS.map((p) => (
                  <li key={p.title} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-[13px] font-semibold backdrop-blur-md ring-1 ring-white/20">
                    <Icon name={p.icon} size={18} />{p.title}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[13px] text-white/75">Encrypted in transit and at rest. We never put health details in emails or texts.</p>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50/60 to-surface lg:bg-none">
        <div className="px-5 pt-5 lg:hidden"><Logo /></div>
        <main id="main" className="flex flex-1 items-start justify-center px-5 py-10 sm:items-center sm:px-8">
          <div className="w-full max-w-[440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
