"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { LANGS, type Lang } from "@/lib/i18n/dictionaries";
import { setLanguageAction } from "@/lib/i18n/actions";
import { cn } from "@/lib/cn";

/** Compact language picker. A native select keeps it accessible and usable on any phone. */
export function LanguageSwitcher({ current, label = "Language", className, dark }: { current: Lang; label?: string; className?: string; dark?: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <label className={cn("relative inline-flex h-9 items-center gap-1.5 rounded-full border pl-2.5 pr-2 text-[13px] font-semibold transition-colors has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-brand-500 has-[select:focus-visible]:ring-offset-2",
      dark ? "border-white/20 text-white hover:bg-white/10" : "border-line-strong bg-surface text-ink-2 hover:border-brand-300", pending && "opacity-60", className)}>
      <Icon name="translate" size={18} className={dark ? "text-white" : "text-brand-600"} />
      <span className="sr-only">{label}</span>
      <select value={current} disabled={pending} onChange={(e) => { const v = e.target.value; start(async () => { await setLanguageAction(v); router.refresh(); }); }}
        className="h-full cursor-pointer appearance-none bg-transparent pr-1 outline-none">
        {LANGS.map((l) => <option key={l.code} value={l.code} className="text-ink">{l.native}</option>)}
      </select>
      <Icon name="keyboard_arrow_down" size={16} className="pointer-events-none" />
    </label>
  );
}
