import type { Metadata } from "next";
import { requirePlatformCapability, hasRecentReauth } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RoleEditorDialog, type Capability, type RoleOption } from "@/components/domain/role-forms";
import { deletePlatformRoleAction, savePlatformRoleAction } from "../manage-actions";

export const metadata: Metadata = { title: "Roles & permissions" };

export default async function RolesPage() {
  const actor = await requirePlatformCapability("roles:manage");
  const d = await withActor(actor.userId, async (tx) => ({
    roles: await tx<(RoleOption & { members: number })[]>`select * from app.admin_platform_roles()`,
    caps: await tx<Capability[]>`select key, label, description, is_clinical from capabilities where scope = 'platform' order by sort_order`,
  }));
  const needsCode = !hasRecentReauth(actor);
  const capLabel = (k: string) => d.caps.find((c) => c.key === k);
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Roles & permissions" description="Built-in roles cover the usual jobs. Create custom roles when someone needs a different mix of permissions."
        actions={<RoleEditorDialog capabilities={d.caps} onSave={savePlatformRoleAction} needsCode={needsCode} trigger={<Button icon="add">Create role</Button>} />} />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {d.roles.map((r) => (
          <article key={r.id} className="card group flex flex-col p-6 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <span className={`grid size-12 place-items-center rounded-full ${r.key === "super_admin" ? "bg-warning-bg text-warning-fg" : r.is_system ? "bg-brand-50 text-brand-600" : "bg-accent-50 text-accent-600"}`}>
                <Icon name={r.key === "super_admin" ? "workspace_premium" : r.is_system ? "admin_panel_settings" : "tune"} size={24} />
              </span>
              <Badge tone={r.is_system ? "neutral" : "accent"}>{r.is_system ? "Built-in" : "Custom"}</Badge>
            </div>
            <h2 className="mt-4 text-lg font-bold text-ink">{r.name}</h2>
            <p className="mt-1 text-sm leading-6 text-ink-3">{r.description}</p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {r.capabilities.map((c) => (
                <li key={c}><Badge tone={capLabel(c)?.is_clinical ? "warning" : "brand"}>{capLabel(c)?.label ?? c}</Badge></li>
              ))}
            </ul>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/80 pt-4 mt-6">
              <span className="flex items-center gap-1.5 text-sm text-ink-3"><Icon name="groups" size={18} />{r.members} {r.members === 1 ? "person" : "people"}</span>
              {!r.is_system && (
                <span className="flex gap-1">
                  <RoleEditorDialog capabilities={d.caps} role={r} onSave={savePlatformRoleAction} needsCode={needsCode} trigger={<Button size="sm" variant="secondary" icon="edit">Edit</Button>} />
                  <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-danger-fg">Delete</Button>} title={`Delete ${r.name}?`} tone="danger"
                    confirmLabel="Delete role" reauth={needsCode} reason={{ label: "Reason", required: true, minLength: 5 }}
                    description="You can only delete a role nobody holds." onConfirm={deletePlatformRoleAction.bind(null, r.id)} />
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
