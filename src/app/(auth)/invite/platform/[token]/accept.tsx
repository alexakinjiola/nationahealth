"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { acceptPlatformInviteAction } from "./actions";

export function AcceptPlatformInvite({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <FormError message={error} />
      <p className="text-sm text-ink-3">Platform roles need two-factor sign-in. You'll be asked to set it up next.</p>
      <Button size="lg" block loading={pending} onClick={() => start(async () => {
        const res = await acceptPlatformInviteAction(token);
        if (res.ok) router.push("/admin"); else setError(res.error);
      })}>Accept and continue</Button>
    </div>
  );
}
