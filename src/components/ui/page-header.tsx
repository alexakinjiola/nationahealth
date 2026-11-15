import * as React from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  eyebrow, title, description, actions, className, display = false,
}: { eyebrow?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string; display?: boolean }) {
  return (
    <header className={cn("flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
        <h1 className={cn("font-bold tracking-[-0.025em] text-ink", display ? "text-[2.1rem] leading-[1.15] sm:text-[2.6rem]" : "text-[1.75rem] leading-[1.2] sm:text-[2rem]")}>
          {title}
        </h1>
        {description && <p className="mt-3 max-w-2xl text-[15px] leading-6 text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
