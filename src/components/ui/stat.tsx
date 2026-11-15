import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

export function Stat({
  label, value, hint, icon, href, tone = "neutral",
}: { label: string; value: number | string; hint?: string; icon?: IconName; href?: string; tone?: "neutral" | "attention" }) {
  const body = (
    <div className="flex items-start gap-4">
      {icon && (
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", tone === "attention" ? "bg-warning-bg text-warning-fg" : "bg-brand-50 text-brand-600")}>
          <Icon name={icon} size={22} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-3">{label}</p>
        <p className="mt-1 text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-ink tabular">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
      </div>
    </div>
  );
  const cls = cn(
    "block rounded-lg border bg-surface p-5 shadow-card",
    tone === "attention" ? "border-warning-line" : "border-line/80",
    href && "transition-[box-shadow,border-color] hover:border-brand-200 hover:shadow-md",
  );
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}
