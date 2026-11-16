import type { Metadata } from "next";
import { requirePlatformRole } from "@/lib/auth/actor";
import { PageHeader } from "@/components/ui/page-header";
import { SecuritySettings } from "@/components/domain/security-settings";

export const metadata: Metadata = { title: "My account" };

const ROLE_NAMES: Record<string, string> = {
  super_admin: "Super administrator", platform_admin: "Platform administrator", security_officer: "Security officer",
  support_agent: "Support agent", analyst: "Health data analyst",
};
const roleName = (key: string) => ROLE_NAMES[key] ?? (key.startsWith("custom_") ? "Custom role" : key.replace(/_/g, " "));

export default async function AdminAccount() {
  const actor = await requirePlatformRole();
  return <div className="max-w-3xl animate-fade-in"><PageHeader title="My account & security" description={`Your roles: ${actor.platformRoles.map(roleName).join(", ")}`} /><SecuritySettings actor={actor} /></div>;
}
