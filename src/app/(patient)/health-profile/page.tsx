import type { Metadata } from "next";
import QRCode from "qrcode";
import { requirePatientContext } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ProgressRing } from "@/components/ui/motion";
import { formatHealthId } from "@/lib/validation/common";
import { HealthProfileForm, type HealthProfile } from "./form";
import { PrintButton } from "./print";

export const metadata: Metadata = { title: "Emergency profile" };

export default async function HealthProfilePage() {
  const { actor, patientId, actingAs } = await requirePatientContext("/health-profile");
  const d = await withActor(actor.userId, async (tx) => {
    const [p] = await tx<{ full_name: string; date_of_birth: string; sex: string; health_id: string | null; emergency_contact_name: string | null;
      emergency_contact_phone: string | null; emergency_contact_relationship: string | null }[]>`
      select pp.full_name, pp.date_of_birth, pp.sex, pp.emergency_contact_name, pp.emergency_contact_phone, pp.emergency_contact_relationship,
             (select value from health_identifiers h where h.patient_id = pp.patient_id and h.identifier_type = 'platform_hid') as health_id
      from patient_profiles pp where pp.patient_id = ${patientId}`;
    const [hp] = await tx<HealthProfile[]>`select * from patient_health_profiles where patient_id = ${patientId}`;
    return { p, hp: hp ?? null };
  });
  const { p, hp } = d;
  const filled = [hp?.blood_group && hp.blood_group !== "unknown", hp?.genotype && hp.genotype !== "unknown", !!hp?.allergies,
    (hp?.chronic_conditions.length ?? 0) > 0, !!hp?.current_medications, !!hp?.nhia_number, !!p.emergency_contact_name].filter(Boolean).length;
  const completeness = Math.round((filled / 7) * 100);
  const show = hp?.share_in_emergency ?? true;
  const qrText = [
    "EMERGENCY HEALTH CARD", p.full_name, p.health_id ? `Health ID ${formatHealthId(p.health_id)}` : null,
    `Born ${p.date_of_birth}`, `Blood ${hp?.blood_group ?? "unknown"} · Genotype ${hp?.genotype ?? "unknown"}`,
    `Allergies: ${hp?.allergies ?? "none recorded"}`, `Conditions: ${hp?.chronic_conditions.join(", ") || "none recorded"}`,
    hp?.current_medications ? `Medicines: ${hp.current_medications}` : null,
    p.emergency_contact_name ? `Contact: ${p.emergency_contact_name} ${p.emergency_contact_phone ?? ""}` : null,
  ].filter(Boolean).join("\n");
  const qr = show ? await QRCode.toDataURL(qrText, { margin: 1, width: 240, errorCorrectionLevel: "M", color: { dark: "#0B347A", light: "#FFFFFF" } }) : null;

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader title={actingAs ? `${p.full_name.split(" ")[0]}'s emergency profile` : "Emergency profile"}
        description="The essentials a doctor needs in the first minutes of an emergency, ready to show from your phone or a printed card."
        actions={show ? <PrintButton /> : undefined} />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card><CardBody className="p-6 sm:p-8"><HealthProfileForm initial={hp} sex={p.sex} /></CardBody></Card>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <div className="card flex items-center gap-5 p-5">
            <ProgressRing value={completeness} color="var(--color-accent-600)"><span className="text-lg font-bold text-ink">{completeness}%</span></ProgressRing>
            <div><p className="font-bold text-ink">Profile {completeness === 100 ? "complete" : "in progress"}</p>
              <p className="text-sm text-ink-3">{completeness === 100 ? "Doctors will have everything they need." : "Add the missing details so emergency teams aren't guessing."}</p></div>
          </div>

          {show ? (
            <div className="emergency-card relative overflow-hidden rounded-xl bg-gradient-to-br from-danger-600 via-[#b42318] to-[#7a1810] p-6 text-white shadow-lg print:shadow-none">
              <div aria-hidden className="absolute -right-12 -top-12 size-44 rounded-full bg-white/10" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/85"><Icon name="emergency" size={16} />Emergency health card</p>
                  <p className="mt-3 text-xl font-bold">{p.full_name}</p>
                  {p.health_id && <p className="font-mono text-sm text-white/85">{formatHealthId(p.health_id)}</p>}
                </div>
                {qr && <img src={qr} alt="QR code with the details on this card" className="size-24 rounded-lg bg-white p-1.5" />}
              </div>
              <dl className="relative mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/15 p-3 backdrop-blur"><dt className="text-[11px] uppercase tracking-wider text-white/75">Blood group</dt><dd className="text-2xl font-extrabold">{hp?.blood_group && hp.blood_group !== "unknown" ? hp.blood_group : "?"}</dd></div>
                <div className="rounded-lg bg-white/15 p-3 backdrop-blur"><dt className="text-[11px] uppercase tracking-wider text-white/75">Genotype</dt><dd className="text-2xl font-extrabold">{hp?.genotype && hp.genotype !== "unknown" ? hp.genotype : "?"}</dd></div>
              </dl>
              <dl className="relative mt-4 space-y-2 text-sm">
                <div><dt className="inline font-semibold">Allergies: </dt><dd className="inline text-white/90">{hp?.allergies ?? "None recorded"}</dd></div>
                <div><dt className="inline font-semibold">Conditions: </dt><dd className="inline text-white/90">{hp?.chronic_conditions.join(", ") || "None recorded"}</dd></div>
                {hp?.current_medications && <div><dt className="inline font-semibold">Medicines: </dt><dd className="inline text-white/90">{hp.current_medications}</dd></div>}
                <div><dt className="inline font-semibold">Emergency contact: </dt><dd className="inline text-white/90">{p.emergency_contact_name ? `${p.emergency_contact_name}${p.emergency_contact_relationship ? ` (${p.emergency_contact_relationship})` : ""} · ${p.emergency_contact_phone ?? ""}` : "Add one in Profile & settings"}</dd></div>
                {hp?.organ_donor && <div className="flex items-center gap-1.5 pt-1 font-semibold"><dt className="flex items-center gap-1.5"><Icon name="volunteer_activism" size={18} />Organ donor</dt><dd className="font-normal text-white/90">Registered</dd></div>}
              </dl>
            </div>
          ) : (
            <div className="card p-6 text-sm text-ink-3"><Icon name="visibility_off" size={22} className="text-ink-3" /><p className="mt-2">Your emergency card is turned off. Tick “Show this on my emergency card” to create it.</p></div>
          )}
          <p className="flex gap-2 text-[13px] text-ink-3"><Icon name="info" size={16} className="mt-0.5 shrink-0" />The QR code contains only what's printed on the card, so it can be read offline in any hospital. Show or share it only when you choose to.</p>
        </aside>
      </div>
    </div>
  );
}
