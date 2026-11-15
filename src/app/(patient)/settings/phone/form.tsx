"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { toast } from "@/components/ui/toast";
import { setPhonePinAction } from "../../actions";

export function PinForm({ hasPin, needsCredential }: { hasPin: boolean; needsCredential: boolean }) {
  const router = useRouter();
  const [v, setV] = React.useState({ pin: "", confirm: "", credential: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [fe, setFe] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => {
      setError(null); setFe({});
      const res = await setPhonePinAction(v);
      if (res.ok) { toast.success(res.message!); setV({ pin: "", confirm: "", credential: "" }); router.refresh(); }
      else { setError(res.error); if ("fieldErrors" in res && res.fieldErrors) setFe(res.fieldErrors); }
    }); }}>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={hasPin ? "New PIN" : "Choose a PIN"} hint="4 to 6 digits" required error={fe.pin}><Input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={v.pin} onChange={set("pin")} /></Field>
        <Field label="Repeat the PIN" required error={fe.confirm}><Input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={v.confirm} onChange={set("confirm")} /></Field>
      </div>
      {needsCredential && <Field label="Your account password" hint="To confirm it's you." required><Input type="password" autoComplete="current-password" value={v.credential} onChange={set("credential")} /></Field>}
      <Button type="submit" loading={pending} icon="dialpad">{hasPin ? "Change PIN" : "Turn on phone access"}</Button>
    </form>
  );
}
