import type { Metadata } from "next";
import { requirePatientContext } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { ProgressRing, Reveal } from "@/components/ui/motion";
import { MultiLine } from "@/components/domain/report-charts";
import { formatDate } from "@/lib/format";
import { daysBetween, ANC_CONTACTS } from "@/lib/maternal";
import { cn } from "@/lib/cn";
import { endPregnancyAction } from "../actions";
import { AddVisitDialog, StartPregnancyForm } from "./forms";

export const metadata: Metadata = { title: "Pregnancy" };

type Preg = { id: string; lmp: string; edd: string; gravida: number | null; parity: number | null; booking_facility: string | null; risk_notes: string | null };
type Visit = { id: string; visit_date: string; bp_systolic: number | null; bp_diastolic: number | null; weight_kg: string | null; haemoglobin: string | null; notes: string | null; next_visit_date: string | null };

const SIGNS = ["Bleeding from the vagina", "Severe headache or blurred vision", "Swelling of the face or hands", "Fever or chills",
  "Baby moving less than usual", "Water breaking early", "Severe abdominal pain", "Fits (convulsions)"];

export default async function MaternityPage() {
  const { actor, patientId } = await requirePatientContext("/maternity");
  const d = await withActor(actor.userId, async (tx) => {
    const [p] = await tx<Preg[]>`select * from pregnancies where patient_id = ${patientId} and status = 'active'`;
    const visits = p ? await tx<Visit[]>`select * from antenatal_visits where pregnancy_id = ${p.id} order by visit_date` : [];
    const [prof] = await tx<{ sex: string }[]>`select sex from patient_profiles where patient_id = ${patientId}`;
    return { p, visits, sex: prof?.sex };
  });

  if (!d.p) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Pregnancy" description="Track your pregnancy, antenatal visits and danger signs. We'll text you before each clinic appointment." />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card><CardHeader><CardTitle>Start tracking a pregnancy</CardTitle></CardHeader><CardBody><StartPregnancyForm /></CardBody></Card>
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-accent-700 to-accent-500 p-8 text-white shadow-lg">
            <Icon name="pregnant_woman" size={44} />
            <p className="mt-5 text-2xl font-bold">Eight contacts. One healthy start.</p>
            <p className="mt-2 leading-7 text-white/90">WHO recommends at least eight antenatal contacts. Regular visits catch high blood pressure, anaemia and infections early, which keeps you and your baby safe.</p>
          </div>
        </div>
      </div>
    );
  }

  const p = d.p;
  const gaDays = daysBetween(p.lmp);
  const weeks = Math.floor(gaDays / 7);
  const progress = Math.min(100, (gaDays / 280) * 100);
  const daysLeft = Math.max(0, 280 - gaDays);
  const trimester = weeks < 13 ? 1 : weeks < 28 ? 2 : 3;
  const last = d.visits.at(-1);
  const highBp = d.visits.some((v) => (v.bp_systolic ?? 0) >= 140 || (v.bp_diastolic ?? 0) >= 90);
  const lowHb = d.visits.some((v) => v.haemoglobin && Number(v.haemoglobin) < 11);
  const nextContact = ANC_CONTACTS.find((w) => w > weeks);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Your pregnancy" description={`Due ${formatDate(p.edd)}${p.booking_facility ? ` · booked at ${p.booking_facility}` : ""}`}
        actions={<><AddVisitDialog pregnancyId={p.id} />
          <ConfirmDialog trigger={<Button variant="secondary" icon="child_friendly">Baby has arrived</Button>} title="Record the birth?" confirmLabel="Yes, baby is here"
            description="We'll stop pregnancy reminders. Add your baby as someone you manage to start their immunisation tracker." onConfirm={endPregnancyAction.bind(null, p.id, "delivered")} /></>} />

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <Reveal><div className="card flex flex-col items-center p-6 text-center">
          <ProgressRing value={progress} size={170} stroke={14} color="var(--color-accent-600)">
            <span><span className="block text-4xl font-extrabold text-ink">{weeks}</span><span className="text-sm text-ink-3">weeks {gaDays % 7} days</span></span>
          </ProgressRing>
          <p className="mt-4 font-bold text-ink">Trimester {trimester}</p>
          <p className="text-sm text-ink-3">{daysLeft} days to go</p>
        </div></Reveal>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: "event_available", label: "Clinic visits recorded", value: String(d.visits.length), sub: "8 contacts recommended", tone: "bg-accent-50 text-accent-600" },
            { icon: "calendar_today", label: "Next appointment", value: last?.next_visit_date ? formatDate(last.next_visit_date) : "Not set", sub: nextContact ? `Next routine contact around week ${nextContact}` : "Near term: follow your midwife's plan", tone: "bg-brand-50 text-brand-600" },
            { icon: "monitor_heart", label: "Latest blood pressure", value: last?.bp_systolic ? `${last.bp_systolic}/${last.bp_diastolic}` : "—", sub: last ? `On ${formatDate(last.visit_date)}` : "Add a visit", tone: highBp ? "bg-danger-bg text-danger-fg" : "bg-success-bg text-success-fg" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80}><div className="card h-full p-5">
              <span className={cn("grid size-11 place-items-center rounded-full", s.tone)}><Icon name={s.icon as never} size={22} /></span>
              <p className="mt-4 text-[13px] text-ink-3">{s.label}</p><p className="text-xl font-bold text-ink">{s.value}</p><p className="mt-1 text-xs text-ink-3">{s.sub}</p>
            </div></Reveal>
          ))}
        </div>
      </div>

      {(highBp || lowHb) && <Callout tone="danger" icon="warning" title="Talk to your midwife or doctor">
        {highBp && "One of your blood pressure readings was 140/90 or higher, which can be a sign of pre-eclampsia. "}
        {lowHb && "Your haemoglobin was below 11 g/dL, which suggests anaemia. "}Bring this to your next visit, or go sooner if you feel unwell.</Callout>}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><div><CardTitle>Antenatal contacts</CardTitle><CardDescription>WHO's recommended schedule, against your visits</CardDescription></div></CardHeader>
          <CardBody>
            <ol className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {ANC_CONTACTS.map((w, i) => {
                const done = d.visits.some((v) => { const vw = Math.floor(daysBetween(p.lmp, v.visit_date) / 7); return Math.abs(vw - w) <= 3; });
                const past = weeks > w + 3;
                return (
                  <li key={w} className="text-center">
                    <span className={cn("mx-auto grid size-11 place-items-center rounded-full text-sm font-bold transition-transform hover:scale-110",
                      done ? "bg-accent-600 text-white" : past ? "bg-danger-bg text-danger-fg ring-1 ring-danger-line" : weeks >= w - 2 ? "bg-warning-bg text-warning-fg ring-2 ring-warning-line" : "bg-sunken text-ink-3")}>
                      {done ? <Icon name="check" size={18} /> : i + 1}</span>
                    <span className="mt-1 block text-xs text-ink-3">wk {w}</span>
                  </li>
                );
              })}
            </ol>
            {d.visits.length > 1 && <div className="mt-6"><MultiLine title="Blood pressure at each visit" xKey="visit_date" xFormat="day" height={220}
              data={d.visits.map((v) => ({ visit_date: v.visit_date, systolic: v.bp_systolic ?? 0, diastolic: v.bp_diastolic ?? 0 }))}
              series={[{ key: "systolic", label: "Top (systolic)", color: "#0b4cb4" }, { key: "diastolic", label: "Bottom (diastolic)", color: "#146f3b" }]} /></div>}
          </CardBody>
        </Card>
        <Card className="border-danger-line">
          <CardHeader className="bg-danger-bg/60"><CardTitle className="flex items-center gap-2 text-danger-fg"><Icon name="emergency" size={20} />Go to hospital now if you have</CardTitle></CardHeader>
          <CardBody><ul className="space-y-2.5">{SIGNS.map((s) => <li key={s} className="flex gap-2.5 text-[15px] text-ink-2"><Icon name="warning" size={18} className="mt-0.5 shrink-0 text-danger-fg" />{s}</li>)}</ul></CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Your visits</CardTitle></CardHeader>
        {d.visits.length === 0 ? <CardBody><p className="text-sm text-ink-3">No visits yet. Add your first antenatal visit from your clinic card.</p></CardBody> : (
          <ul className="divide-y divide-line/80">{[...d.visits].reverse().map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5 text-sm sm:px-6">
              <span className="grid size-10 place-items-center rounded-full bg-accent-50 text-accent-600"><Icon name="event_available" size={18} /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold text-ink">{formatDate(v.visit_date)} · week {Math.floor(daysBetween(p.lmp, v.visit_date) / 7)}</span>
                <span className="text-ink-3">{[v.bp_systolic && `BP ${v.bp_systolic}/${v.bp_diastolic}`, v.weight_kg && `${v.weight_kg} kg`, v.haemoglobin && `Hb ${v.haemoglobin}`, v.notes].filter(Boolean).join(" · ") || "No measurements"}</span></span>
              {v.next_visit_date && <Badge tone="brand" icon="event">Next {formatDate(v.next_visit_date)}</Badge>}
            </li>
          ))}</ul>
        )}
      </Card>
      <p className="text-[13px] text-ink-3">Entered by you from your antenatal card. This page supports, and doesn't replace, care from your midwife or doctor.</p>
    </div>
  );
}
