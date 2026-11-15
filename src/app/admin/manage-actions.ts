"use server";
import { z } from "zod";
import { handle, parse } from "@/lib/action";
import { withActor, withService } from "@/lib/db";
import { requestMeta } from "@/lib/request";
import { getActor, hasRecentReauth } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { queueMessage } from "@/lib/mailer";
import { env } from "@/lib/env";
import { stepUp } from "@/server/auth";
import { emailSchema, nameSchema, uuid } from "@/lib/validation/common";

type Input = { reason: string; credential: string };

/** Platform staff, MFA-verified, holding `cap`, with a step-up in the last 10 minutes. */
async function staff(cap: string, input?: Partial<Input>) {
  const actor = await getActor();
  if (!actor || !actor.platformRoles.length || !actor.mfaEnabled || !actor.mfaVerified) throw new AppError(403, "Platform staff only.");
  if (!actor.platformCapabilities.includes(cap)) throw new AppError(403, "You don't have permission to do that.");
  if (!hasRecentReauth(actor)) {
    if (!input?.credential) throw new AppError(401, "Confirm it's you with your authenticator code.");
    await stepUp(actor, input.credential);
  }
  return { actor, meta: await requestMeta() };
}

// ── Oversight access ────────────────────────────────────────────────────────
export async function openOversightAction(patientId: string, input: Input) {
  return handle("oversight_open", async () => {
    const { actor, meta } = await staff("records:oversight", input);
    if ((input.reason ?? "").trim().length < 15) throw new AppError(422, "Explain why you need to see this record (at least 15 characters).");
    await withActor(actor.userId, (tx) => tx`select app.oversight_open(${uuid.parse(patientId)}, ${input.reason})`, meta);
  }, "Oversight session opened for 30 minutes. The patient has been notified.");
}

export async function closeOversightAction(patientId: string) {
  return handle("oversight_close", async () => {
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in again.");
    await withActor(actor.userId, (tx) => tx`select app.oversight_close(${uuid.parse(patientId)})`, await requestMeta());
  }, "Oversight session closed.");
}

// ── Platform users ──────────────────────────────────────────────────────────
const inviteSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  roleIds: z.array(z.string().uuid()).min(1, "Choose at least one role."),
  credential: z.string().optional().default(""),
});

export async function invitePlatformUserAction(input: unknown) {
  return handle("platform_invite", async () => {
    const v = parse(inviteSchema, input);
    const { actor, meta } = await staff("users:manage", { credential: v.credential });
    const token = randomToken();
    await withActor(actor.userId, (tx) => tx`select app.admin_invite_platform_user(${v.email}, ${v.fullName}, ${v.roleIds}, ${sha256Hex(token)})`, meta);
    await withService((tx) => queueMessage(tx, {
      to: v.email, template: "platform_invitation", subject: "You've been invited to the platform team",
      body: `${actor.displayName} invited you to join the ${process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "Continuum"} platform team.\n\nAccept the invitation here (expires in 7 days):\n${env().APP_URL}/invite/platform/${token}\n\nCreate an account or sign in with this email address first. You'll be asked to set up two-factor sign-in.`,
    }));
  }, "Invitation sent.");
}

export async function setUserRolesAction(userId: string, v: { roleIds: string[]; reason: string; credential: string }) {
  return handle("platform_user_roles", async () => {
    const { actor, meta } = await staff("users:manage", v);
    const ids = z.array(z.string().uuid()).parse(v.roleIds);
    await withActor(actor.userId, (tx) => tx`select app.admin_set_user_platform_roles(${uuid.parse(userId)}, ${ids}, ${v.reason})`, meta);
  }, "Access updated. The user has been notified.");
}

// ── Roles ───────────────────────────────────────────────────────────────────
const roleSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(3, "Give the role a name of at least 3 characters.").max(80),
  description: z.string().trim().max(300).optional().default(""),
  capabilities: z.array(z.string().regex(/^[a-z_]+:[a-z_]+$/)).min(1, "Choose at least one permission."),
  credential: z.string().optional().default(""),
});

export async function savePlatformRoleAction(input: unknown) {
  return handle("platform_role_save", async () => {
    const v = parse(roleSchema, input);
    const { actor, meta } = await staff("roles:manage", { credential: v.credential });
    await withActor(actor.userId, (tx) => tx`select app.admin_upsert_platform_role(${v.id ?? null}, ${v.name}, ${v.description}, ${v.capabilities})`, meta);
  }, "Role saved.");
}

export async function deletePlatformRoleAction(roleId: string, input: Input) {
  return handle("platform_role_delete", async () => {
    const { actor, meta } = await staff("roles:manage", input);
    await withActor(actor.userId, (tx) => tx`select app.admin_delete_platform_role(${uuid.parse(roleId)})`, meta);
  }, "Role deleted.");
}
