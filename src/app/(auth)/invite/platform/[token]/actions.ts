"use server";
import { handle } from "@/lib/action";
import { withActor } from "@/lib/db";
import { requestMeta } from "@/lib/request";
import { getActor } from "@/lib/auth/actor";
import { AppError } from "@/lib/errors";
import { sha256Hex } from "@/lib/crypto";

export async function acceptPlatformInviteAction(token: string) {
  return handle("accept_platform_invite", async () => {
    const actor = await getActor();
    if (!actor) throw new AppError(401, "Sign in first.");
    if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) throw new AppError(404, "Invitation not found.");
    await withActor(actor.userId, (tx) => tx`select app.accept_platform_invitation(${sha256Hex(token)})`, await requestMeta());
  }, "Welcome to the platform team.");
}
