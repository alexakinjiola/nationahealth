"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CheckboxCard } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/form-error";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { BLOOD_GROUPS, COMMON_CONDITIONS, GENOTYPES } from "@/lib/nigeria";
import { saveHealthProfileAction } from "../actions";

export type HealthProfile = {
  blood_group: string; genotype: string; allergies: string | null; chronic_conditions: string[]; current_medications: string | null;
  nhia_number: string | null; hmo_name: string | null; organ_donor: boolean; pregnant: boolean | null; disabilities: string | null; share_in_emergency: boolean;
};

export function HealthProfileForm({ initial, sex }: { initial: HealthProfile | null; sex: string }) {
  const router = useRouter();
  const [v, setV] = React.useState({
    bloodGroup: initial?.blood_group ?? "unknown", genotype: initial?.genotype ?? "unknown", allergies: initial?.allergies ?? "",
    conditions: initial?.chronic_conditions ?? [], medications: initial?.current_medications ?? "", nhiaNumber: initial?.nhia_number ?? "",
    hmoName: initial?.hmo_name ?? "", organDonor: initial?.organ_donor ?? false, pregnant: initial?.pregnant ?? null,
    disabilities: initial?.disabilities ?? "", shareInEmergency: initial?.share_in_emergency ?? true,
  });
  const [other, setOther] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));
  const toggleCondition = (c: string) => set("conditions", v.conditions.includes(c) ? v.conditions.filter((x) => x !== c) : [...v.conditions, c]);

  return (
    <form noValidate className="space-y-8" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        setError(null); setFieldErrors({});
        const res = await saveHealthProfileAction(v);
        if (res.ok) { toast.success(res.message!); router.refresh(); }
        else { setError(res.error); if ("fieldErrors" in res && res.fieldErrors) setFieldErrors(res.fieldErrors); }
      });
    }}>
      <FormError message={error} />
      <fieldset className="space-y-4">
        <legend className="text-lg font-bold text-ink">Blood and genotype</legend>
        <div>
          <p className="mb-2 text-sm font-medium text-ink" id="bg-label">Blood group</p>
          <div role="radiogroup" aria-labelledby="bg-label" className="flex flex-wrap gap-2">
            {BLOOD_GROUPS.map((b) => (
              <button key={b} type="button" role="radio" aria-checked={v.bloodGroup === b} onClick={() => set("bloodGroup", b)}
                className={cn("h-11 min-w-14 rounded-full border px-4 text-sm font-bold transition-all",
                  v.bloodGroup === b ? "scale-105 border-danger-600 bg-danger-600 text-white shadow-md" : "border-line-strong bg-surface text-ink hover:border-danger-600/50")}>
                {b === "unknown" ? "Don't know" : b}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink" id="gt-label">Genotype</p>
          <div role="radiogroup" aria-labelledby="gt-label" className="flex flex-wrap gap-2">
            {GENOTYPES.map((g) => (
              <button key={g} type="button" role="radio" aria-checked={v.genotype === g} onClick={() => set("genotype", g)}
                className={cn("h-11 min-w-14 rounded-full border px-4 text-sm font-bold transition-all",
                  v.genotype === g ? "scale-105 border-brand-600 bg-brand-600 text-white shadow-md" : "border-line-strong bg-surface text-ink hover:border-brand-300")}>
                {g === "unknown" ? "Don't know" : g}
              </button>
            ))}
          </div>
          {["SS", "SC"].includes(v.genotype) && <p className="mt-2 flex gap-2 text-[13px] text-ink-3"><Icon name="info" size={16} className="mt-0.5 shrink-0 text-brand-600" />Emergency teams will see this first. It changes how they manage pain, fever and anaesthesia.</p>}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-bold text-ink">Conditions, allergies and medicines</legend>
        <div className="flex flex-wrap gap-2">
          {[...COMMON_CONDITIONS, ...v.conditions.filter((c) => !COMMON_CONDITIONS.includes(c))].map((c) => (
            <button key={c} type="button" aria-pressed={v.conditions.includes(c)} onClick={() => toggleCondition(c)}
              className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                v.conditions.includes(c) ? "border-accent-600 bg-accent-50 text-accent-700" : "border-line-strong bg-surface text-ink-2 hover:border-accent-500")}>
              {v.conditions.includes(c) && <Icon name="check" size={16} />}{c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input aria-label="Add another condition" placeholder="Add another condition" value={other} onChange={(e) => setOther(e.target.value)} className="max-w-xs" />
          <Button type="button" variant="secondary" onClick={() => { const c = other.trim(); if (c.length > 1 && !v.conditions.includes(c)) set("conditions", [...v.conditions, c]); setOther(""); }}>Add</Button>
        </div>
        <Field label="Allergies" hint="Medicines, foods or anything else, and what happens." error={fieldErrors.allergies}><Textarea rows={2} value={v.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="e.g. Penicillin — rash and swelling" /></Field>
        <Field label="Medicines you take regularly" error={fieldErrors.medications}><Textarea rows={2} value={v.medications} onChange={(e) => set("medications", e.target.value)} placeholder="e.g. Amlodipine 5 mg once daily" /></Field>
        <Field label="Disability or access needs" optional><Input value={v.disabilities} onChange={(e) => set("disabilities", e.target.value)} /></Field>
        {sex === "female" && (
          <Field label="Are you currently pregnant?" optional>
            <Select value={v.pregnant === null ? "" : v.pregnant ? "yes" : "no"} onChange={(e) => set("pregnant", e.target.value === "" ? null : e.target.value === "yes")}>
              <option value="">Prefer not to say</option><option value="yes">Yes</option><option value="no">No</option>
            </Select>
          </Field>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-bold text-ink">Health insurance</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="NHIA number" optional error={fieldErrors.nhiaNumber}><Input value={v.nhiaNumber} onChange={(e) => set("nhiaNumber", e.target.value)} /></Field>
          <Field label="HMO" optional><Input value={v.hmoName} onChange={(e) => set("hmoName", e.target.value)} /></Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-lg font-bold text-ink">Choices</legend>
        <CheckboxCard id="share" checked={v.shareInEmergency} onCheckedChange={(x) => set("shareInEmergency", x)}
          label="Show this on my emergency card" description="Your card and its QR code show blood group, genotype, allergies, conditions and your emergency contact. Nothing else from your record." />
        <CheckboxCard id="donor" checked={v.organDonor} onCheckedChange={(x) => set("organDonor", x)} label="I'm willing to be an organ donor" />
      </fieldset>
      <div className="flex justify-end"><Button type="submit" size="lg" loading={pending} icon="check">Save emergency profile</Button></div>
    </form>
  );
}
