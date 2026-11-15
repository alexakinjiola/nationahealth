"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";

export type NavItem = { href: string; label: string; icon: IconName; badge?: number; exact?: boolean };

export function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SideNav({ items, dark, onNavigate }: { items: NavItem[]; dark?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-10 items-center gap-3 rounded-md px-3 text-[14px] font-medium transition-colors",
                "before:absolute before:-left-4 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:transition-colors",
                dark
                  ? active ? "bg-white/[0.07] text-white before:bg-brand-200" : "text-navy-200 hover:bg-white/[0.04] hover:text-white"
                  : active ? "bg-sunken/80 text-ink before:bg-brand-600" : "text-ink-2 hover:bg-sunken/60 hover:text-ink",
              )}
            >
              <Icon name={item.icon} size={20} filled={active}
                className={cn(dark ? (active ? "text-brand-200" : "text-navy-300 group-hover:text-navy-200") : active ? "text-brand-600" : "text-ink-3")} />
              <span className="flex-1">{item.label}</span>
              {!!item.badge && (
                <span className={cn("min-w-5 rounded-full px-1.5 text-center text-xs font-semibold leading-5 tabular",
                  dark ? "bg-brand-500 text-white" : "bg-clay-50 text-clay-700 ring-1 ring-inset ring-clay-100")}>
                  {item.badge}<span className="sr-only"> pending</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {items.slice(0, 5).map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined}
                className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-brand-700" : "text-ink-3")}>
                <Icon name={item.icon} size={22} filled={active} />
                {item.label}
                {!!item.badge && <span className="absolute right-[calc(50%-18px)] top-2.5 size-2 rounded-full bg-warning-fg" aria-label={`${item.badge} pending`} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
