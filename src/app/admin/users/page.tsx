import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformCapability, hasRecentReauth } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { InviteUserDialog, RolePickerDialog, type RoleOption } from "@/components/domain/role-forms";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { invitePlatformUserAction, setUserRolesAction } from "../manage-actions";

export const metadata: Metadata = { title: "Users & access" };

export default async function UsersPage() {
  const actor = await requirePlatformCapability("users:manage");
  const d = await withActor(actor.userId, async (tx) => ({
    users: await tx<{ user_id: string; display_name: string; email: string; status: string; mfa_enabled: boolean; last_sign_in: string | null; role_ids: string[]; role_names: string[] }[]>`select * from app.admin_platform_users()`,
    roles: await tx<RoleOption[]>`select id, key, name, description, capabilities, is_system from app.admin_platform_roles()`,
    invites: await tx<{ id: string; email: string; full_name: string; role_ids: string[]; expires_at: string; created_at: string }[]>`
      select id, email, full_name, role_ids, expires_at, created_at from platform_invitations where status = 'pending' and expires_at > now() order by created_at desc`,
  }));
  const needsCode = !hasRecentReauth(actor);
  const roleName = (id: string) => d.roles.find((r) => r.id === id)?.name ?? "Role";
  const withoutMfa = d.users.filter((u) => !u.mfa_enabled).length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Users & access" description="Everyone who works on the platform itself, and what they're allowed to do. Institutions manage their own staff."
        actions={<>
          <Button asChild variant="secondary" icon="admin_panel_settings"><Link href="/admin/roles">Roles & permissions</Link></Button>
          <InviteUserDialog roles={d.roles} onInvite={invitePlatformUserAction} needsCode={needsCode} label="Invite platform user"
            title="Invite someone to the platform team" description="They'll get an email link. They sign in with that address, set up two-factor sign-in, and get the roles you choose." />
        </>} />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: "groups", label: "Platform users", value: d.users.length, tone: "bg-brand-50 text-brand-600" },
          { icon: "mark_email_read", label: "Pending invitations", value: d.invites.length, tone: "bg-accent-50 text-accent-600" },
          { icon: "shield_lock", label: "Without two-factor yet", value: withoutMfa, tone: withoutMfa ? "bg-warning-bg text-warning-fg" : "bg-success-bg text-success-fg" },
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-4 p-5">
            <span className={`grid size-12 place-items-center rounded-full ${s.tone}`}><Icon name={s.icon as never} size={24} /></span>
            <div><p className="text-[13px] text-ink-3">{s.label}</p><p className="text-2xl font-bold text-ink">{s.value}</p></div>
          </div>
        ))}
      </div>

      {d.invites.length > 0 && (
        <Card><CardHeader><CardTitle>Pending invitations</CardTitle></CardHeader>
          <ul className="divide-y divide-line/80">{d.invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm sm:px-6">
              <span className="grid size-9 place-items-center rounded-full bg-accent-50 text-accent-600"><Icon name="mail" size={18} /></span>
              <span className="min-w-0 flex-1"><span className="font-semibold text-ink">{i.full_name}</span> <span className="text-ink-3">· {i.email}</span></span>
              <span className="flex flex-wrap gap-1">{i.role_ids.map((r) => <Badge key={r} tone="brand">{roleName(r)}</Badge>)}</span>
              <span className="text-xs text-ink-3">Expires {formatDate(i.expires_at)}</span>
            </li>
          ))}</ul>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Platform team</CardTitle></CardHeader>
        {d.users.length === 0 ? <EmptyState icon="groups" title="No platform users" /> : (
          <Table caption="Platform users">
            <THead><tr><Th>Person</Th><Th>Roles</Th><Th>Security</Th><Th>Last sign-in</Th><Th><span className="sr-only">Actions</span></Th></tr></THead>
            <TBody>{d.users.map((u) => (
              <Tr key={u.user_id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{u.display_name.slice(0, 1).toUpperCase()}</span>
                    <div><p className="font-semibold text-ink">{u.display_name}{u.user_id === actor.userId && <span className="font-normal text-ink-3"> (you)</span>}</p><p className="text-xs text-ink-3">{u.email}</p></div>
                  </div>
                </Td>
                <Td><div className="flex max-w-xs flex-wrap gap-1">{u.role_names.map((r) => <Badge key={r} tone={r === "Super administrator" ? "warning" : "brand"}>{r}</Badge>)}</div></Td>
                <Td>{u.mfa_enabled ? <Badge tone="success" icon="verified_user">Two-factor on</Badge> : <Badge tone="warning" icon="warning">Not set up</Badge>}
                  {u.status !== "active" && <Badge tone="danger" className="ml-1">{u.status}</Badge>}</Td>
                <Td className="text-ink-3">{u.last_sign_in ? <span title={formatDateTime(u.last_sign_in)}>{relativeTime(u.last_sign_in)}</span> : "Never"}</Td>
                <Td className="text-right">
                  {u.user_id !== actor.userId && (
                    <RolePickerDialog roles={d.roles} selected={u.role_ids} needsCode={needsCode}
                      title={`Change ${u.display_name}'s access`} description="Tick every role they need. Removing all roles takes away platform access."
                      trigger={<Button size="sm" variant="secondary" icon="edit">Change access</Button>}
                      onSave={setUserRolesAction.bind(null, u.user_id)} />
                  )}
                </Td>
              </Tr>
            ))}</TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
