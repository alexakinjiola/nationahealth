import type { Metadata } from "next";
import Link from "next/link";
import { getActor } from "@/lib/auth/actor";
import { withService } from "@/lib/db";
import { sha256Hex } from "@/lib/crypto";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AcceptPlatformInvite } from "./accept";

export const metadata: Metadata = { title: "Join the platform team" };

export default async function PlatformInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv] = /^[A-Za-z0-9_-]{30,64}$/.test(token) ? await withService((tx) => tx<{ email: string; full_name: string; status: string; live: boolean; roles: string[] }[]>`
    select i.email, i.full_name, i.status, i.expires_at > now() as live,
           (select array_agg(r.name order by r.name) from roles r where r.id = any(i.role_ids)) as roles
    from platform_invitations i where i.token_hash = ${sha256Hex(token)}`) : [];
  const actor = await getActor();
  if (!inv || inv.status !== "pending" || !inv.live) {
    return <div><h1 className="text-[1.75rem] font-bold tracking-[-0.02em] text-ink">Invitation unavailable</h1>
      <p className="mt-2 text-ink-3">This invitation has expired or was already used. Ask a platform administrator to send a new one.</p></div>;
  }
  const next = encodeURIComponent(`/invite/platform/${token}`);
  return (
    <div className="animate-slide-up">
      <p className="eyebrow">Platform team invitation</p>
      <h1 className="mt-2 text-[2rem] font-bold leading-[1.15] tracking-[-0.025em] text-ink">Welcome, {inv.full_name.split(" ")[0]}</h1>
      <p className="mt-2 text-[15px] text-ink-3">You've been invited to help run the platform with these roles:</p>
      <div className="mt-3 flex flex-wrap gap-1.5">{inv.roles.map((r) => <Badge key={r} tone="brand">{r}</Badge>)}</div>
      <div className="mt-8">
        {!actor ? (
          <div className="space-y-4">
            <Callout tone="info">Sign in or create an account using <strong>{inv.email}</strong> to accept.</Callout>
            <div className="flex gap-2"><Button asChild><Link href={`/sign-in?next=${next}`}>Sign in</Link></Button>
              <Button asChild variant="secondary"><Link href="/register">Create account</Link></Button></div>
            <p className="text-sm text-ink-3">After creating your account and confirming your email, open this invitation link again.</p>
          </div>
        ) : actor.email !== inv.email ? (
          <Callout tone="danger" title="Wrong account">You're signed in as {actor.email}. This invitation is for {inv.email}.</Callout>
        ) : !actor.emailVerified ? (
          <Callout tone="warning" title="Confirm your email first"><Link href="/verify-email" className="underline">Confirm your email address</Link>, then return to this link.</Callout>
        ) : <AcceptPlatformInvite token={token} />}
      </div>
    </div>
  );
}
