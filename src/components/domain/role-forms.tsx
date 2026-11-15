"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button, type ButtonProps } from "@/components/ui/button";
import { CheckboxCard } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/form-error";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import type { ClientActionResult } from "@/lib/client-action";

export type Capability = { key: string; label: string; description: string; is_clinical: boolean };
export type RoleOption = { id: string; key: string; name: string; description: string; capabilities: string[]; is_system: boolean };

/** Create or edit a role by choosing permissions from the catalogue. */
export function RoleEditorDialog({
  capabilities, role, onSave, trigger, needsCode, title,
}: {
  capabilities: Capability[];
  role?: RoleOption;
  onSave: (v: { id: string | null; name: string; description: string; capabilities: string[]; credential: string }) => Promise<ClientActionResult>;
  trigger: React.ReactElement;
  needsCode?: boolean;
  title?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(role?.name ?? "");
  const [description, setDescription] = React.useState(role?.description ?? "");
  const [caps, setCaps] = React.useState<string[]>(role?.capabilities ?? []);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const clinical = caps.some((c) => capabilities.find((k) => k.key === c)?.is_clinical);
  const toggle = (k: string, v: boolean) => setCaps((s) => (v ? [...new Set([...s, k])] : s.filter((x) => x !== k)));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setName(role?.name ?? ""); setDescription(role?.description ?? ""); setCaps(role?.capabilities ?? []); setError(null); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title ?? (role ? `Edit ${role.name}` : "Create a role")} description="Choose exactly what people with this role can do. Give the fewest permissions that let them do their job.">
        <form noValidate className="space-y-5" onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError(null);
            const res = await onSave({ id: role?.id ?? null, name, description, capabilities: caps, credential: code });
            if (res.ok) { toast.success(res.message ?? "Saved."); setOpen(false); router.refresh(); } else setError(res.error);
          });
        }}>
          <FormError message={error} />
          <Field label="Role name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ward nurse, Data clerk" /></Field>
          <Field label="What is this role for?" optional><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <fieldset>
            <legend className="mb-2 flex items-center justify-between gap-2 text-sm font-medium text-ink">
              Permissions <span className="text-xs font-normal text-ink-3">{caps.length} selected</span>
            </legend>
            <div className="grid max-h-[42vh] gap-2 overflow-y-auto pr-1">
              {capabilities.map((c) => (
                <CheckboxCard key={c.key} id={`cap-${c.key}`} checked={caps.includes(c.key)} onCheckedChange={(v) => toggle(c.key, v)}
                  label={<span className="flex flex-wrap items-center gap-2">{c.label}{c.is_clinical && <Badge tone="warning" icon="medical_services">Clinical data</Badge>}</span>}
                  description={c.description} />
              ))}
            </div>
          </fieldset>
          {clinical && <p className="flex gap-2 rounded-md bg-warning-bg px-3 py-2.5 text-[13px] text-warning-fg"><Icon name="warning" size={18} className="shrink-0" />This role can see or change clinical data. Every access is logged and visible to the patient.</p>}
          {needsCode && <Field label="Authenticator code" hint="Needed if you haven't confirmed it's you in the last 10 minutes."><Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} /></Field>}
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={pending}>{role ? "Save changes" : "Create role"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Pick one or more roles, give a reason and confirm. */
export function RolePickerDialog({
  roles, selected, onSave, trigger, title, description, multiple = true, withReason = true, needsCode,
}: {
  roles: RoleOption[];
  selected: string[];
  onSave: (v: { roleIds: string[]; reason: string; credential: string }) => Promise<ClientActionResult>;
  trigger: React.ReactElement;
  title: string;
  description?: string;
  multiple?: boolean;
  withReason?: boolean;
  needsCode?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [ids, setIds] = React.useState<string[]>(selected);
  const [reason, setReason] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setIds(selected); setReason(""); setError(null); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description}>
        <form noValidate className="space-y-5" onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError(null);
            const res = await onSave({ roleIds: ids, reason, credential: code });
            if (res.ok) { toast.success(res.message ?? "Saved."); setOpen(false); router.refresh(); } else setError(res.error);
          });
        }}>
          <FormError message={error} />
          <div className="grid max-h-[46vh] gap-2 overflow-y-auto pr-1">
            {roles.map((r) => (
              <CheckboxCard key={r.id} id={`role-${r.id}`} checked={ids.includes(r.id)}
                onCheckedChange={(v) => setIds((s) => (multiple ? (v ? [...s, r.id] : s.filter((x) => x !== r.id)) : v ? [r.id] : []))}
                label={<span className="flex flex-wrap items-center gap-2">{r.name}{!r.is_system && <Badge tone="accent">Custom</Badge>}</span>}
                description={r.description} meta={<span className="text-xs text-ink-3">{r.capabilities.length} permissions</span>} />
            ))}
          </div>
          {withReason && <Field label="Reason (recorded in the audit trail)" required><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
          {needsCode && <Field label="Authenticator code" hint="Needed if you haven't confirmed it's you in the last 10 minutes."><Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} /></Field>}
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={pending}>Save</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Invite someone by email and give them one or more roles. */
export function InviteUserDialog({
  roles, onInvite, label = "Invite user", title = "Invite a user", description, needsCode, multiple = true, variant,
}: {
  roles: RoleOption[];
  onInvite: (v: { fullName: string; email: string; roleIds: string[]; roleKey: string; credential: string }) => Promise<ClientActionResult>;
  label?: string; title?: string; description?: string; needsCode?: boolean; multiple?: boolean; variant?: ButtonProps["variant"];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [ids, setIds] = React.useState<string[]>([]);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setFullName(""); setEmail(""); setIds([]); setError(null); setFieldErrors({}); } }}>
      <DialogTrigger asChild><Button icon="person_add" variant={variant}>{label}</Button></DialogTrigger>
      <DialogContent title={title} description={description}>
        <form noValidate className="space-y-5" onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError(null); setFieldErrors({});
            const roleKey = roles.find((r) => r.id === ids[0])?.key ?? "";
            const res = await onInvite({ fullName, email, roleIds: ids, roleKey, credential: code });
            if (res.ok) { toast.success(res.message ?? "Invitation sent."); setOpen(false); router.refresh(); }
            else { setError(res.error); if ("fieldErrors" in res && res.fieldErrors) setFieldErrors(res.fieldErrors); }
          });
        }}>
          <FormError message={error} />
          <Field label="Full name" required error={fieldErrors.fullName}><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
          <Field label="Email" required error={fieldErrors.email}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">{multiple ? "Roles" : "Role"}</legend>
            <div className="grid max-h-[36vh] gap-2 overflow-y-auto pr-1">
              {roles.map((r) => (
                <CheckboxCard key={r.id} id={`inv-${r.id}`} checked={ids.includes(r.id)}
                  onCheckedChange={(v) => setIds((s) => (multiple ? (v ? [...s, r.id] : s.filter((x) => x !== r.id)) : v ? [r.id] : []))}
                  label={<span className="flex flex-wrap items-center gap-2">{r.name}{!r.is_system && <Badge tone="accent">Custom</Badge>}</span>} description={r.description} />
              ))}
            </div>
            {fieldErrors.roleIds && <p className="mt-1 text-[13px] font-medium text-danger-600">{fieldErrors.roleIds}</p>}
          </fieldset>
          {needsCode && <Field label="Authenticator code" hint="Needed if you haven't confirmed it's you in the last 10 minutes."><Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} /></Field>}
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={pending}>Send invitation</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
