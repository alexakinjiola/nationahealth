"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActingForAction } from "./actions";

export function ActingForSwitcher({ current, options }: { current: string; options: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="rounded-lg bg-brand-50 p-3.5">
      <label htmlFor="acting-for" className="text-xs font-semibold text-brand-700">Viewing records for</label>
      <select id="acting-for" disabled={pending} value={current}
        onChange={(e) => start(async () => { await setActingForAction(e.target.value); router.push("/dashboard"); router.refresh(); })}
        className="mt-2 h-10 w-full rounded-full border border-brand-200 bg-surface px-3.5 text-sm font-semibold text-ink">
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
