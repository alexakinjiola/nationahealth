import Link from "next/link";
import { cn } from "@/lib/cn";

/** URL-driven tabs: each tab is a real link, so they work without JavaScript and are bookmarkable. */
export function TabsNav({ tabs, current, label }: {
  tabs: { key: string; label: string; href: string; count?: number }[]; current: string; label: string;
}) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto">
      <ul className="inline-flex min-w-max gap-1 rounded-full border border-line/80 bg-surface p-1 shadow-xs">
        {tabs.map((t) => {
          const active = t.key === current;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
                  active ? "bg-brand-600 text-white" : "text-ink-3 hover:bg-brand-50 hover:text-brand-700",
                )}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={cn("rounded-full px-1.5 text-xs tabular leading-5", active ? "bg-white/20 text-white" : "bg-sunken text-ink-3")}>
                    {t.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
