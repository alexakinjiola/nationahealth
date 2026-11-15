import Link from "next/link";
import { Logo } from "./logo";
import { SkipLink } from "./skip-link";
import { Button } from "@/components/ui/button";

const FOOTER: { title: string; links: [string, string][] }[] = [
  { title: "Patients", links: [["Create a record", "/register"], ["Sign in", "/sign-in"], ["Account help", "/help/account-recovery"]] },
  { title: "Institutions", links: [["Register your institution", "/register/provider"], ["Staff sign in", "/sign-in"]] },
  { title: "Trust", links: [["Privacy notice", "/privacy"], ["How access works", "/#privacy"]] },
];

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <SkipLink />
      <header className="mx-auto flex h-20 max-w-[1200px] items-center justify-between gap-2 px-4 sm:px-8">
        <Logo />
        <nav aria-label="Site" className="hidden items-center gap-8 text-sm text-ink-2 md:flex">
          <Link href="/#how" className="hover:text-ink">How it works</Link>
          <Link href="/#privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/register/provider" className="hover:text-ink">For institutions</Link>
        </nav>
        <nav aria-label="Account" className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm"><Link href="/sign-in">Sign in</Link></Button>
          <Button asChild size="sm" variant="ink" className="rounded-full px-4"><Link href="/register" aria-label="Create account"><span className="hidden min-[380px]:inline">Create account</span><span aria-hidden className="min-[380px]:hidden">Join</span></Link></Button>
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className="mt-24 border-t border-line">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-6 text-ink-3">A pilot platform for personal health records in Nigeria. Built so your history follows you, and nobody else.</p>
          </div>
          {FOOTER.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="eyebrow">{c.title}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {c.links.map(([label, href]) => <li key={label}><Link href={href} className="text-ink-2 hover:text-ink hover:underline hover:underline-offset-4">{label}</Link></li>)}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-[1200px] px-5 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 sm:px-8">Pilot service · examples on this site use synthetic data</p>
        </div>
      </footer>
    </div>
  );
}
