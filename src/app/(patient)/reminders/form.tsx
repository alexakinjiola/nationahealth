"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CheckboxCard } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/form-error";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { saveReminderAction, setSmsRemindersAction } from "../actions";

const QUICK_TIMES = ["06:00", "07:00", "08:00", "12:00", "13:00", "18:00", "20:00", "21:00", "22:00"];

export function ReminderDialog({ kind: initialKind = "medication", hasPhone, preset }: { kind?: "medication" | "appointment"; hasPhone: boolean; preset?: { title: string; appointmentAt: string; kind: "immunisation" | "appointment" } }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<"medication" | "appointment" | "immunisation">(preset?.kind ?? initialKind);
  const [title, setTitle] = React.useState(preset?.title ?? "");
  const [times, setTimes] = React.useState<string[]>(["08:00"]);
  const [custom, setCustom] = React.useState("");
  const [endsOn, setEndsOn] = React.useState("");
  const [appointmentAt, setAppointmentAt] = React.useState(preset?.appointmentAt ?? "");
  const [beforeHours, setBeforeHours] = React.useState("24");
  const [channel, setChannel] = React.useState(hasPhone ? "sms" : "email");
  const [details, setDetails] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const toggle = (t: string) => setTimes((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t].sort()));
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null); }}>
      <DialogTrigger asChild>{preset
        ? <Button size="sm" variant="secondary" icon="alarm">Remind me</Button>
        : <Button icon={initialKind === "medication" ? "medication" : "event"} variant={initialKind === "medication" ? "primary" : "secondary"}>{initialKind === "medication" ? "Medicine reminder" : "Appointment reminder"}</Button>}
      </DialogTrigger>
      <DialogContent title={kind === "medication" ? "Remind me to take my medicine" : "Remind me about an appointment"} description="We'll send a short text message. Health details are left out unless you choose to include them.">
        <form noValidate className="space-y-5" onSubmit={(e) => { e.preventDefault(); start(async () => {
          setError(null);
          const res = await saveReminderAction({ kind, title, times: kind === "medication" ? times : [], endsOn, appointmentAt, beforeHours, channel, includeDetails: details });
          if (res.ok) { toast.success(res.message!); setOpen(false); router.refresh(); } else setError(res.error);
        }); }}>
          <FormError message={error} />
          <Field label={kind === "medication" ? "Medicine" : "What is it?"} required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "medication" ? "e.g. Amlodipine 5 mg" : "e.g. Eye clinic at LUTH"} />
          </Field>
          {kind === "medication" ? (
            <>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-ink">Times of day</legend>
                <div className="flex flex-wrap gap-2">
                  {[...new Set([...QUICK_TIMES, ...times])].sort().map((t) => (
                    <button key={t} type="button" aria-pressed={times.includes(t)} onClick={() => toggle(t)}
                      className={cn("h-10 rounded-full border px-4 font-mono text-sm font-semibold transition-all active:scale-95",
                        times.includes(t) ? "border-brand-600 bg-brand-600 text-white shadow-md" : "border-line-strong bg-surface text-ink-2 hover:border-brand-300")}>{t}</button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input aria-label="Add another time" type="time" step={900} value={custom} onChange={(e) => setCustom(e.target.value)} className="max-w-40" />
                  <Button type="button" variant="secondary" onClick={() => {
                    const [h, m] = custom.split(":").map(Number);
                    if (!isNaN(h)) { const q = String(Math.round((m || 0) / 15) * 15 % 60).padStart(2, "0"); toggle(`${String(h).padStart(2, "0")}:${q}`); }
                    setCustom("");
                  }}>Add time</Button>
                </div>
                <p className="mt-2 text-xs text-ink-3">Times are Nigerian time, in 15-minute steps.</p>
              </fieldset>
              <Field label="Stop reminding me on" optional hint="Leave empty for long-term medicines."><Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} /></Field>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date and time" required><Input type="datetime-local" value={appointmentAt} onChange={(e) => setAppointmentAt(e.target.value)} /></Field>
              <Field label="Remind me">
                <Select value={beforeHours} onChange={(e) => setBeforeHours(e.target.value)}>
                  <option value="2">2 hours before</option><option value="24">1 day before</option><option value="48">2 days before</option><option value="168">1 week before</option>
                </Select>
              </Field>
            </div>
          )}
          <Field label="Send by">
            <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="sms" disabled={!hasPhone}>Text message (SMS){hasPhone ? "" : " — add a phone number first"}</option><option value="email">Email</option>
            </Select>
          </Field>
          <CheckboxCard id="details" checked={details} onCheckedChange={setDetails} label={kind === "medication" ? "Include the medicine name in the message" : "Include what the appointment is for"}
            description="Off by default, so anyone who sees your phone can't learn about your health." />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={pending} icon="alarm">Save reminder</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SmsToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <button type="button" role="switch" aria-checked={enabled} disabled={pending} onClick={() => start(async () => {
      const res = await setSmsRemindersAction(!enabled); if (res.ok) { toast.success(res.message!); router.refresh(); } })}
      className="inline-flex items-center gap-3 rounded-full border border-line-strong bg-surface py-1.5 pl-1.5 pr-4 text-sm font-semibold text-ink transition-colors hover:border-brand-300">
      <span aria-hidden className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", enabled ? "bg-accent-600" : "bg-line-strong")}>
        <span className={cn("absolute left-0 top-0.5 size-5 rounded-full bg-white shadow transition-transform", enabled ? "translate-x-[22px]" : "translate-x-0.5")} />
      </span>
      SMS reminders {enabled ? "on" : "paused"}
    </button>
  );
}
