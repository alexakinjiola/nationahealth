"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { toast } from "@/components/ui/toast";
import { respondReferralAction } from "../actions";

export function AcceptReferral({ id, reference }: { id: string; reference: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [appointment, setAppointment] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="accent" icon="check">Accept</Button></DialogTrigger>
      <DialogContent title={`Accept referral ${reference}`} description="Book an appointment now if you can. The patient gets an SMS reminder the day before.">
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); start(async () => {
          setError(null);
          const res = await respondReferralAction(id, "accepted", { reason: note, appointment: appointment || undefined });
          if (res.ok) { toast.success(res.message!); setOpen(false); router.refresh(); } else setError(res.error);
        }); }}>
          <FormError message={error} />
          <Field label="Appointment date and time" optional><Input type="datetime-local" value={appointment} onChange={(e) => setAppointment(e.target.value)} /></Field>
          <Field label="Note to the patient and referring clinician" optional><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="accent" loading={pending}>Accept referral</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
