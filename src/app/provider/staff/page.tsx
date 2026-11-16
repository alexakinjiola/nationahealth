import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProviderContext } from "@/lib/auth/provider-context";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { PRO_STATUS, PROFESSION } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { deleteInstitutionRoleAction, inviteStaffAction, saveInstitutionRoleAction, setStaffRoleAction, setStaffStatusAction } from "../actions";
import { Icon } from "@/components/ui/icon";
import { InviteUserDialog, RoleEditorDialog, RolePickerDialog, type Capability, type RoleOption } from "@/components/domain/role-forms";

export const metadata: Metadata = { title: "Staff management" };
const AFF: Record<string, "success" | "warning" | "neutral" | "danger"> = { active: "success", suspended: "warning", ended: "neutral", revoked: "danger" };

export default async function StaffPage() {
  const { actor, current, can } = await requireProviderContext("/provider/staff");
  if (!current || !can("staff:manage")) redirect("/provider");
  const { staff, invites, roles, caps } = await withActor(actor.userId, async (tx) => ({
    roles: await tx<(RoleOption & { members: number })[]>`select * from app.institution_roles(${current.institutionId})`,
    caps: await tx<Capability[]>`select key, label, description, is_clinical from capabilities where scope = 'institution' order by sort_order`,
    staff: await tx`select * from app.institution_staff(${current.institutionId})`,
    invites: await tx`select i.id, i.email, i.full_name, i.status, i.expires_at, r.name as role from staff_invitations i join roles r on r.id = i.role_id
      where i.institution_id = ${current.institutionId} and i.status = 'pending' and i.expires_at > now() order by i.created_at desc`,
  }));
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Staff management" description="Invite professionals, assign roles and remove access the moment someone leaves."
        actions={<InviteUserDialog roles={roles} multiple={false} onInvite={inviteStaffAction} label="Invite staff" title="Invite a staff member"
          description="They'll get an email link, sign in with that address, and submit their licence for platform verification. Clinical roles need a verified licence before they work." />} />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: "groups", label: "Active staff", value: staff.filter((x) => x.status === "active").length, tone: "bg-brand-50 text-brand-600" },
          { icon: "mail", label: "Pending invitations", value: invites.length, tone: "bg-accent-50 text-accent-600" },
          { icon: "badge", label: "Licences awaiting verification", value: staff.filter((x) => x.verification === "pending").length, tone: "bg-warning-bg text-warning-fg" },
        ].map((x) => (
          <div key={x.label} className="card flex items-center gap-4 p-5">
            <span className={`grid size-12 place-items-center rounded-full ${x.tone}`}><Icon name={x.icon as never} size={24} /></span>
            <div><p className="text-[13px] text-ink-3">{x.label}</p><p className="text-2xl font-bold text-ink">{x.value}</p></div>
          </div>
        ))}
      </div>
      {invites.length > 0 && (
        <Card><CardHeader><CardTitle>Pending invitations</CardTitle></CardHeader>
          <ul className="divide-y divide-line">{invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm sm:px-6"><span className="flex-1"><span className="font-medium text-ink">{i.full_name}</span> <span className="text-ink-3">· {i.email}</span></span>
              <Badge tone="info">{i.role}</Badge><span className="text-xs text-ink-3">Expires {formatDate(i.expires_at)}</span></li>
          ))}</ul></Card>
      )}
      <Card>
        {staff.length === 0 ? <EmptyState icon="group" title="No staff yet" /> : (
          <Table caption="Institution staff">
            <THead><tr><Th>Name</Th><Th>Role</Th><Th>Licence</Th><Th>Access</Th><Th><span className="sr-only">Actions</span></Th></tr></THead>
            <TBody>{staff.map((s) => (
              <Tr key={s.affiliation_id}>
                <Td><p className="font-medium text-ink">{s.full_name}{s.is_me && <span className="text-ink-3"> (you)</span>}</p><p className="text-xs text-ink-3">{s.email} · {PROFESSION[s.profession]}</p></Td>
                <Td className="text-ink-2">
                  <p>{s.role_name}</p>
                  {!s.is_me && s.status === "active" && (
                    <RolePickerDialog roles={roles} selected={roles.filter((r) => r.key === s.role_key).map((r) => r.id)} multiple={false} withReason={false}
                      title={`Change ${s.full_name}'s role`} description="Their access changes immediately. Clinical roles still need a verified licence."
                      trigger={<button type="button" className="-ml-2 mt-0.5 inline-flex min-h-6 items-center rounded-md px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 hover:underline">Change role</button>}
                      onSave={setStaffRoleAction.bind(null, s.affiliation_id)} />
                  )}
                </Td>
                <Td><Badge tone={PRO_STATUS[s.verification]?.tone}>{PRO_STATUS[s.verification]?.label}</Badge>{s.license_number && <p className="mt-1 font-mono text-xs text-ink-3">{s.license_body} {s.license_number}</p>}</Td>
                <Td><Badge tone={AFF[s.status]}>{s.status}</Badge><p className="mt-1 text-xs text-ink-3">since {formatDate(s.started_at)}</p></Td>
                <Td className="text-right whitespace-nowrap">
                  {!s.is_me && s.status === "active" && <>
                    <ConfirmDialog trigger={<Button size="sm" variant="ghost">Suspend</Button>} title={`Suspend ${s.full_name}?`} confirmLabel="Suspend"
                      description="They lose access immediately and can be reinstated later." reason={{ label: "Reason", required: true, minLength: 5 }}
                      onConfirm={setStaffStatusAction.bind(null, s.affiliation_id, "suspended")} />
                    <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-danger-fg">Remove</Button>} title={`Remove ${s.full_name}?`} tone="danger" confirmLabel="Remove access"
                      description="Use this when someone leaves. Their access ends now, and permissions patients granted to them personally are revoked." reason={{ label: "Reason", required: true, minLength: 5 }}
                      onConfirm={setStaffStatusAction.bind(null, s.affiliation_id, "ended")} />
                  </>}
                  {!s.is_me && s.status === "suspended" && (
                    <ConfirmDialog trigger={<Button size="sm" variant="secondary">Reinstate</Button>} title={`Reinstate ${s.full_name}?`} confirmLabel="Reinstate"
                      reason={{ label: "Reason" }} onConfirm={setStaffStatusAction.bind(null, s.affiliation_id, "active")} />
                  )}
                </Td>
              </Tr>
            ))}</TBody>
          </Table>
        )}
      </Card>

      <section aria-labelledby="roles-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="roles-title" className="text-xl font-bold text-ink">Roles & permissions</h2>
            <p className="text-sm text-ink-3">Use the built-in roles, or create your own for jobs like ward nurse, pharmacist or data clerk.</p></div>
          <RoleEditorDialog capabilities={caps} onSave={saveInstitutionRoleAction} trigger={<Button icon="add" variant="secondary">Create role</Button>} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => (
            <article key={r.id} className="card flex flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-ink">{r.name}</h3>
                <Badge tone={r.is_system ? "neutral" : "accent"}>{r.is_system ? "Built-in" : "Custom"}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-3">{r.description}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">{r.capabilities.map((c) => {
                const k = caps.find((x) => x.key === c);
                return <li key={c}><Badge tone={k?.is_clinical ? "warning" : "brand"}>{k?.label ?? c}</Badge></li>;
              })}</ul>
              <div className="mt-auto flex items-center justify-between border-t border-line/80 pt-3 mt-4 text-sm text-ink-3">
                <span className="flex items-center gap-1.5"><Icon name="groups" size={18} />{r.members} active</span>
                {!r.is_system && <span className="flex gap-1">
                  <RoleEditorDialog capabilities={caps} role={r} onSave={saveInstitutionRoleAction} trigger={<Button size="sm" variant="secondary" icon="edit">Edit</Button>} />
                  <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-danger-fg">Delete</Button>} title={`Delete ${r.name}?`} tone="danger" confirmLabel="Delete role"
                    description="You can only delete a role nobody holds or has been invited to." onConfirm={deleteInstitutionRoleAction.bind(null, r.id)} />
                </span>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
