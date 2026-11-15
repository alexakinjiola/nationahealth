"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { formatHealthId } from "@/lib/validation/common";
import { cn } from "@/lib/cn";

export function HealthIdChip({ value, className, inverted }: { value: string; className?: string; inverted?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("inline-flex items-center gap-3 rounded-md px-3 py-2", inverted ? "bg-white/[0.07] ring-1 ring-white/10" : "bg-surface ring-1 ring-line", className)}>
      <div>
        <p className={cn("text-2xs font-semibold uppercase tracking-[0.08em]", inverted ? "text-navy-300" : "text-ink-3")}>Health ID</p>
        <p className={cn("font-mono text-[15px] font-medium tracking-[0.06em]", inverted ? "text-white" : "text-ink")}>{formatHealthId(value)}</p>
      </div>
      <button
        type="button"
        onClick={async () => { await navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className={cn("grid size-8 place-items-center rounded-md", inverted ? "text-navy-200 hover:bg-white/10" : "text-ink-3 hover:bg-sunken hover:text-ink")}
      >
        <Icon name={copied ? "check" : "content_copy"} size={18} label={copied ? "Copied" : "Copy Health ID"} />
      </button>
      <span aria-live="polite" className="sr-only">{copied ? "Health ID copied" : ""}</span>
    </div>
  );
}

/** The Health ID as a frosted card — the one thing a patient shares at reception. Sits on the blue welcome banner. */
export function HealthIdCard({ value, name }: { value: string; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-white/[0.12] px-5 py-4 text-white ring-1 ring-white/25 backdrop-blur-md sm:w-[300px]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-100">Health ID</p>
        <Icon name="id_card" size={20} className="text-brand-100" />
      </div>
      <p className="mt-2 font-mono text-[20px] font-medium tracking-[0.08em]">{formatHealthId(value)}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="truncate text-[13px] text-brand-100">{name}</p>
        <button
          type="button"
          onClick={async () => { await navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="-mr-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-semibold text-white hover:bg-white/25"
        >
          <Icon name={copied ? "check" : "content_copy"} size={15} />{copied ? "Copied" : "Copy"}
          <span className="sr-only"> Health ID</span>
        </button>
      </div>
      <span aria-live="polite" className="sr-only">{copied ? "Health ID copied" : ""}</span>
    </div>
  );
}
