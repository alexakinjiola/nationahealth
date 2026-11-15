"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CheckboxCard } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/form-error";
import { toast } from "@/components/ui/toast";
import { CATEGORY } from "@/lib/labels";
import { createReferralAction } from "../../actions";

type Rec = { id: string; title: string; category_key: string; clinical_date: string | null };

export function ReferDialog({ patientId, patientName, records }: { patientId: string; patientName: string; records: Rec[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [v, setV] = React.useState({ toCode: "", specialty: "", urgency: "routine", reason: "", summary: "" });
  const [ids, setIds] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [fe, setFe] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setError(null); setFe({}); } }}>
      <DialogTrigger asChild><Button icon="send">Refer patient</Button></DialogTrigger>
      <DialogContent title={`Refer ${patientName}`} description="The patient must agree before anything is sent. Only the records you tick go with the referral.">
        <form noValidate className="space-y-5" onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError(null); setFe({});
            const res = await createReferralAction({ patientId, ...v, recordIds: ids });
            if (res.ok) { toast.success(res.message!); setOpen(false); router.push("/provider/referrals"); }
            else { setError(res.error); if ("fieldErrors" in res && res.fieldErrors) setFe(res.fieldErrors); }
          });
        }}>
          <FormError message={error} />
          <Field label="Refer to (Institution ID)" hint="Find it on the facility directory, e.g. HOS 4821 9375 2." required error={fe.toCode}>
            <Input value={v.toCode} onChange={(e) => set("toCode", e.target.value)} className="font-mono uppercase" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Specialty or service" optional><Input value={v.specialty} onChange={(e) => set("specialty", e.target.value)} placeholder="e.g. Cardiology" /></Field>
            <Field label="Urgency" required>
              <Select value={v.urgency} onChange={(e) => set("urgency", e.target.value)}>
                <option value="routine">Routine</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option>
              </Select>
            </Field>
          </div>
          <Field label="Reason for referral" required error={fe.reason}><Textarea rows={2} value={v.reason} onChange={(e) => set("reason", e.target.value)} /></Field>
          <Field label="Clinical summary for the receiving team" optional><Textarea rows={3} value={v.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
          <fieldset>
            <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium text-ink">Records to send <span className="text-xs font-normal text-ink-3">{ids.length} selected</span></legend>
            {records.length === 0 ? <p className="text-sm text-ink-3">No records you can share yet. The referral letter can still be sent.</p> : (
              <div className="grid max-h-[32vh] gap-2 overflow-y-auto pr-1">
                {records.map((r) => (
                  <CheckboxCard key={r.id} id={`ref-${r.id}`} checked={ids.includes(r.id)} onCheckedChange={(x) => setIds((s) => (x ? [...s, r.id] : s.filter((y) => y !== r.id)))}
                    label={r.title} description={`${CATEGORY[r.category_key]?.singular ?? r.category_key}${r.clinical_date ? ` · ${new Date(r.clinical_date).toLocaleDateString("en-GB")}` : ""}`} />
                ))}
              </div>
            )}
          </fieldset>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={pending} icon="send">Send to patient for approval</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
