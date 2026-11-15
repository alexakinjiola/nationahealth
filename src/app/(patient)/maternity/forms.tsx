"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { toast } from "@/components/ui/toast";
import { addAntenatalVisitAction, startPregnancyAction } from "../actions";

function useForm<T extends Record<string, string>>(initial: T) {
  const [v, setV] = React.useState(initial);
  return { v, set: (k: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value })), reset: () => setV(initial) };
}

export function StartPregnancyForm() {
  const router = useRouter();
  const f = useForm({ lmp: "", gravida: "", parity: "", facility: "", notes: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [fe, setFe] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  return (
    <form noValidate className="space-y-5" onSubmit={(e) => { e.preventDefault(); start(async () => {
      setError(null); setFe({});
      const res = await startPregnancyAction(f.v);
      if (res.ok) { toast.success(res.message!); router.refresh(); } else { setError(res.error); if ("fieldErrors" in res && res.fieldErrors) setFe(res.fieldErrors); }
    }); }}>
      <FormError message={error} />
      <Field label="First day of your last menstrual period (LMP)" hint="We use this to work out your due date and clinic schedule." required error={fe.lmp}><Input type="date" value={f.v.lmp} onChange={f.set("lmp")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Number of pregnancies, including this one" optional error={fe.gravida}><Input inputMode="numeric" value={f.v.gravida} onChange={f.set("gravida")} /></Field>
        <Field label="Number of previous births" optional error={fe.parity}><Input inputMode="numeric" value={f.v.parity} onChange={f.set("parity")} /></Field>
      </div>
      <Field label="Where you're booked for antenatal care" optional><Input value={f.v.facility} onChange={f.set("facility")} placeholder="e.g. Lagos Island Maternity Hospital" /></Field>
      <Field label="Anything your midwife should know" optional><Textarea rows={2} value={f.v.notes} onChange={f.set("notes")} placeholder="e.g. previous caesarean, high blood pressure" /></Field>
      <Button type="submit" size="lg" loading={pending} icon="pregnant_woman">Start tracking</Button>
    </form>
  );
}

export function AddVisitDialog({ pregnancyId }: { pregnancyId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const f = useForm({ visitDate: today, systolic: "", diastolic: "", weight: "", hb: "", fundal: "", notes: "", nextVisit: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [fe, setFe] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { f.reset(); setError(null); setFe({}); } }}>
      <DialogTrigger asChild><Button icon="add">Add clinic visit</Button></DialogTrigger>
      <DialogContent title="Add an antenatal visit" description="Copy the figures from your antenatal card. Add your next appointment and we'll text you the day before.">
        <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => {
          setError(null); setFe({});
          const res = await addAntenatalVisitAction(pregnancyId, f.v);
          if (res.ok) { toast.success(res.message!); setOpen(false); router.refresh(); } else { setError(res.error); if ("fieldErrors" in res && res.fieldErrors) setFe(res.fieldErrors); }
        }); }}>
          <FormError message={error} />
          <Field label="Visit date" required error={fe.visitDate}><Input type="date" value={f.v.visitDate} onChange={f.set("visitDate")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Blood pressure (top)" optional error={fe.systolic}><Input inputMode="numeric" value={f.v.systolic} onChange={f.set("systolic")} placeholder="120" /></Field>
            <Field label="Blood pressure (bottom)" optional error={fe.diastolic}><Input inputMode="numeric" value={f.v.diastolic} onChange={f.set("diastolic")} placeholder="80" /></Field>
            <Field label="Weight (kg)" optional error={fe.weight}><Input inputMode="decimal" value={f.v.weight} onChange={f.set("weight")} /></Field>
            <Field label="Haemoglobin (g/dL)" optional error={fe.hb}><Input inputMode="decimal" value={f.v.hb} onChange={f.set("hb")} /></Field>
          </div>
          <Field label="Notes" optional><Textarea rows={2} value={f.v.notes} onChange={f.set("notes")} /></Field>
          <Field label="Next appointment" optional error={fe.nextVisit}><Input type="date" value={f.v.nextVisit} onChange={f.set("nextVisit")} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={pending}>Save visit</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
