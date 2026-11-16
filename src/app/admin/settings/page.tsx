import * as React from "react";
import type { Metadata } from "next";
import { requirePlatformRole } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { AdminAction } from "../confirm";
import { updateSettingAction } from "../actions";

export const metadata: Metadata = { title: "System settings" };

export default async function SettingsAdmin() {
  const actor = await requirePlatformRole(["platform_admin"]);
  const rows = await withActor(actor.userId, (tx) => tx`select key, value, description, updated_at from platform_settings order by key`);
  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader title="System settings" description="Configurable policy values. Every change is audited with its before and after value." />
      <Callout tone="warning" icon="gavel">Retention periods and emergency-access limits must be confirmed by qualified Nigerian counsel before production use.</Callout>
      <Card><ul className="divide-y divide-line">{rows.map((s) => (
        <li key={s.key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="min-w-0 flex-1"><p className="font-mono text-sm text-ink">{s.key.split(/(?<=[._])/).map((part: string, i: number) => <React.Fragment key={i}>{part}<wbr /></React.Fragment>)}</p><p className="text-sm text-ink-3">{s.description}</p>
            <p className="mt-1 text-xs text-ink-3">Updated {formatDateTime(s.updated_at)}</p></div>
          {Array.isArray(s.value) ? (
            <ul className="flex max-w-xs flex-wrap gap-1.5 sm:justify-end" aria-label={`Current value of ${s.key}`}>
              {s.value.map((v: unknown) => <li key={String(v)}><Badge tone="brand" className="font-mono">{String(v)}</Badge></li>)}
            </ul>
          ) : <Badge tone="brand" className="self-start font-mono sm:self-auto">{String(s.value)}</Badge>}
          <AdminAction label="Change" variant="secondary" title={`Change ${s.key}`} description={`Current value: ${JSON.stringify(s.value)}. Enter the new value below (a number, or a JSON list).`}
            reasonLabel="New value" reasonRequired={false} action={updateSettingAction.bind(null, s.key)} />
        </li>
      ))}</ul></Card>
    </div>
  );
}
