import Link from "next/link";
import { Logo } from "./logo";
import { SkipLink } from "./skip-link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

const NAV: [string, string][] = [
  ["Home", "/"],
  ["How it works", "/#how"],
  ["Patients", "/#who"],
  ["Find a facility", "/facilities"],
  ["Institutions", "/#institutions"],
  ["Privacy", "/privacy"],
];

const FOOTER: { title: string; links: [string, string][] }[] = [
  { title: "Patients", links: [["Create a record", "/register"], ["Sign in", "/sign-in"], ["Account help", "/help/account-recovery"]] },
  { title: "Institutions", links: [["Register your institution", "/register/provider"], ["Staff sign in", "/sign-in"], ["How access works", "/#how"]] },
  { title: "Trust", links: [["Find a verified facility", "/facilities"], ["Privacy notice", "/privacy"], ["Your rights", "/privacy"]] },
];

export function PublicShell({ children, current }: { children: React.ReactNode; current?: string }) {
  return (
    <div className="min-h-dvh bg-surface">
      <SkipLink />
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-20 max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-8">
          <Logo />
          <nav aria-label="Site" className="hidden items-center gap-1 lg:flex">
            {NAV.map(([label, href]) => {
              const active = href === current;
              return (
                <Link key={label} href={href} aria-current={active ? "page" : undefined}
                  className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? "text-brand-600" : "text-ink-2 hover:text-brand-600"}`}>
                  {label}
                  {active && <span aria-hidden className="absolute bottom-0 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-brand-600" />}
                </Link>
              );
            })}
          </nav>
          <nav aria-label="Account" className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href="/sign-in" className="hidden items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-sm font-semibold text-ink hover:text-brand-600 sm:inline-flex">
              <span className="grid size-9 place-items-center rounded-full bg-surface text-brand-600 shadow-card ring-1 ring-line/80"><Icon name="person" size={20} /></span>
              Sign in
            </Link>
            <Link href="/sign-in" className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-semibold text-ink sm:hidden">Sign in</Link>
            <Button asChild size="sm"><Link href="/register" aria-label="Create account"><span className="hidden min-[380px]:inline">Create account</span><span aria-hidden className="min-[380px]:hidden">Join</span></Link></Button>
          </nav>
        </div>
      </header>
      <main id="main" className={current === "/" ? undefined : "bg-gradient-to-b from-brand-50 to-surface to-[420px] pb-24 pt-24"}>{children}</main>
      <footer className="bg-navy-950 text-white">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 pb-12 pt-16 sm:px-8 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Logo inverted />
            <p className="mt-5 max-w-xs text-sm leading-6 text-navy-200">Personal health records for Nigeria. Your history follows you from hospital to hospital — and nobody sees it unless you say so.</p>
          </div>
          {FOOTER.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="text-sm font-bold text-white">{c.title}</p>
              <ul className="mt-4 space-y-3 text-sm">
                {c.links.map(([label, href]) => <li key={label}><Link href={href} className="text-navy-200 transition-colors hover:text-white">{label}</Link></li>)}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-5 py-6 text-[13px] text-navy-300 sm:flex-row sm:justify-between sm:px-8">
            <p>Pilot service. Examples on this site use synthetic data.</p>
            <p>Photography via Unsplash.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
