import { AppShell } from "@/components/shell/app-shell";
import { UserMenu } from "@/components/shell/user-menu";
import { NotificationBell } from "@/components/shell/notification-bell";
import type { NavItem } from "@/components/shell/nav";
import { requirePatientContext } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { signOutAction } from "../(auth)/actions";
import { ActingForSwitcher } from "./acting-for";
import { getT } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/shell/language-switcher";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const { actor, patientId, actingAs } = await requirePatientContext();
  const [c] = await withActor(actor.userId, (tx) => tx`
    select (select count(*)::int from access_requests where patient_id = ${patientId} and status = 'pending' and respond_by > now()) as pending,
           (select count(*)::int from notifications where user_id = ${actor.userId} and read_at is null) as unread`);

  const t = await getT();
  const nav: NavItem[] = [
    { href: "/dashboard", label: t("patient.overview"), icon: "home" },
    { href: "/records", label: t("patient.records"), icon: "folder_open" },
    { href: "/timeline", label: t("patient.timeline"), icon: "timeline" },
    { href: "/health-profile", label: t("patient.emergency"), icon: "emergency_home" },
    { href: "/immunisations", label: t("patient.immunisations"), icon: "vaccines" },
    { href: "/access", label: t("patient.access"), icon: "shield_person", badge: c.pending },
    { href: "/referrals", label: t("patient.referrals"), icon: "send" },
    { href: "/maternity", label: t("patient.pregnancy"), icon: "pregnant_woman" },
    { href: "/reminders", label: t("patient.reminders"), icon: "alarm" },
    { href: "/activity", label: t("patient.activity"), icon: "history" },
    { href: "/notifications", label: t("patient.notifications"), icon: "notifications", badge: c.unread },
    { href: "/settings", label: t("patient.settings"), icon: "settings" },
    { href: "/support", label: t("patient.help"), icon: "support_agent" },
  ];
  const bottom: NavItem[] = [
    { href: "/dashboard", label: t("bottom.home"), icon: "home" },
    { href: "/records", label: t("bottom.records"), icon: "folder_open" },
    { href: "/access", label: t("bottom.access"), icon: "shield_person", badge: c.pending },
    { href: "/activity", label: t("bottom.activity"), icon: "history" },
    { href: "/settings", label: t("bottom.settings"), icon: "settings" },
  ];
  const others = [
    ...(actor.professional || actor.ownedInstitutionDrafts.length ? [{ href: "/provider", label: "Provider workspace", icon: "local_hospital" as const }] : []),
    ...(actor.platformRoles.length ? [{ href: "/admin", label: "Administration", icon: "admin_panel_settings" as const }] : []),
  ];
  const switcher = actor.representations.length > 0 ? (
    <ActingForSwitcher
      current={patientId}
      options={[...(actor.patient ? [{ id: actor.patient.id, name: "My own record" }] : []), ...actor.representations.map((r) => ({ id: r.patientId, name: r.fullName }))]}
    />
  ) : null;

  return (
    <AppShell
      variant="patient"
      nav={nav}
      bottomNav={bottom}
      synthetic={actor.isSynthetic}
      sidebarTop={switcher}
      banner={actingAs ? (
        <div className="border-b border-info-line bg-info-bg px-4 py-2 text-center text-sm text-info-fg">
          You're acting as the verified representative for <strong>{actingAs.fullName}</strong>. Everything you do is recorded under your own name.
        </div>
      ) : null}
      topRight={<>
        <LanguageSwitcher current={t.lang} label={t("nav.language")} className="hidden sm:inline-flex" />
        <NotificationBell count={c.unread} href="/notifications" />
        <UserMenu name={actor.displayName} email={actor.email} signOut={signOutAction}
          links={[{ href: "/settings", label: "Profile & settings", icon: "person" }, { href: "/settings/security", label: "Security", icon: "lock" }, ...others]} />
      </>}
    >
      {children}
    </AppShell>
  );
}
