import type { Metadata } from "next";
import Link from "next/link";
import { requirePatientContext } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Icon } from "@/components/ui/icon";
import { ProgressRing, Reveal } from "@/components/ui/motion";
import { NPI_SCHEDULE, weeksSince, type Dose } from "@/lib/nigeria";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ReminderDialog } from "../reminders/form";

export const metadata: Metadata = { title: "Immunisations" };

const WEEK = 7 * 86_400_000;
const ageLabel = (w: number) => (w === 0 ? "At birth" : w < 52 ? `${w} weeks` : w < 104 ? `${Math.round(w / 4.345)} months` : `${Math.floor(w / 52)} years`);

export default async function ImmunisationsPage() {
  const { actor, patientId, actingAs } = await requirePatientContext("/immunisations");
  const d = await withActor(actor.userId, async (tx) => ({
    p: (await tx<{ full_name: string; date_of_birth: string; sex: string; phone: string | null }[]>`select full_name, date_of_birth, sex, phone from patient_profiles where patient_id = ${patientId}`)[0],
    vax: await tx<{ id: string; title: string; clinical_date: string | null; institution: string | null }[]>`
      select r.id, r.title, r.clinical_date, i.name as institution from medical_records r left join healthcare_institutions i on i.id = r.institution_id
      where r.patient_id = ${patientId} and r.category_key = 'vaccination' and r.status <> 'entered_in_error' order by r.clinical_date nulls last`,
  }));
  const dob = new Date(d.p.date_of_birth).getTime();
  const ageWeeks = weeksSince(d.p.date_of_birth);
  const first = d.p.full_name.split(" ")[0];
  const schedule = NPI_SCHEDULE.filter((x) => !x.sex || x.sex === d.p.sex);
  const rows = schedule.map((dose: Dose) => {
    const rec = d.vax.find((v) => dose.match.test(v.title));
    const due = new Date(dob + dose.ageWeeks * WEEK);
    const status = rec ? "done" : ageWeeks < dose.ageWeeks ? "upcoming" : ageWeeks - dose.ageWeeks <= 4 ? "due" : "overdue";
    return { dose, rec, due, status };
  });
  const relevant = rows.filter((r) => r.dose.key !== "hpv" || ageWeeks >= 400);
  const done = relevant.filter((r) => r.status === "done").length;
  const overdue = relevant.filter((r) => r.status === "overdue");
  const next = relevant.find((r) => r.status === "due" || r.status === "upcoming");
  const isChild = ageWeeks < 15 * 52;
  const groups = [...new Set(relevant.map((r) => r.dose.ageWeeks))];

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader title={actingAs ? `${first}'s immunisations` : "Immunisations"}
        description="Nigeria's routine childhood schedule (NPI), checked against the vaccination records in this account."
        actions={<Button asChild variant="secondary" icon="upload_file"><Link href="/records/upload">Add a vaccination card</Link></Button>} />

      {!isChild && (
        <Callout tone="info" icon="info" title="This schedule is for children">
          {actingAs ? `${first} is` : "You're"} over 15, so the childhood schedule is shown for reference. If you look after a child, add them as someone you manage in Profile & settings and switch to their record.
        </Callout>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <Reveal><div className="card flex items-center gap-5 p-6">
          <ProgressRing value={relevant.length ? (done / relevant.length) * 100 : 0} size={96} color="var(--color-accent-600)">
            <span className="text-center"><span className="block text-xl font-bold text-ink">{done}/{relevant.length}</span><span className="text-[11px] text-ink-3">doses</span></span>
          </ProgressRing>
          <div><p className="font-bold text-ink">Recorded doses</p><p className="text-sm text-ink-3">Age {ageLabel(ageWeeks)}</p></div>
        </div></Reveal>
        <Reveal delay={80}><div className={cn("card flex h-full items-center gap-4 p-6", overdue.length && isChild && "border-danger-line")}>
          <span className={cn("grid size-14 place-items-center rounded-full", overdue.length && isChild ? "bg-danger-bg text-danger-fg" : "bg-success-bg text-success-fg")}>
            <Icon name={overdue.length && isChild ? "event_busy" : "event_available"} size={28} /></span>
          <div><p className="text-3xl font-bold text-ink">{isChild ? overdue.length : "—"}</p><p className="text-sm text-ink-3">{isChild ? "doses overdue or not recorded" : "Not applicable"}</p></div>
        </div></Reveal>
        <Reveal delay={160}><div className="card flex h-full items-center gap-4 p-6">
          <span className="grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon name="calendar_today" size={28} /></span>
          <div>{next ? <><p className="font-bold text-ink">Next: {next.dose.vaccine} · {next.dose.dose}</p><p className="text-sm text-ink-3">{next.status === "due" ? "Due now" : `From ${formatDate(next.due)}`}</p></>
            : <p className="font-bold text-ink">{isChild ? "All routine doses recorded" : "No routine doses due"}</p>}</div>
        </div></Reveal>
      </div>

      <Card>
        <CardHeader><div><CardTitle>Schedule</CardTitle><CardDescription>Ticked doses are matched to records from verified facilities or your uploads.</CardDescription></div></CardHeader>
        <CardBody>
          <ol className="relative space-y-8 border-l-2 border-dashed border-brand-200 pl-8">
            {groups.map((w, gi) => (
              <Reveal as="li" key={w} delay={gi * 60} className="relative">
                <span className="absolute -left-[45px] grid size-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white ring-4 ring-surface">{gi + 1}</span>
                <p className="text-sm font-bold text-ink">{ageLabel(w)} <span className="font-normal text-ink-3">· from {formatDate(new Date(dob + w * WEEK))}</span></p>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {relevant.filter((r) => r.dose.ageWeeks === w).map((r) => (
                    <li key={r.dose.key} className={cn("flex items-start gap-3 rounded-lg border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
                      r.status === "done" ? "border-success-line bg-success-bg/60" : r.status === "overdue" && isChild ? "border-danger-line bg-danger-bg/50" : "border-line/80 bg-surface")}>
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full",
                        r.status === "done" ? "bg-success-fg text-white" : r.status === "overdue" && isChild ? "bg-danger-600 text-white" : r.status === "due" ? "bg-warning-fg text-white" : "bg-sunken text-ink-3")}>
                        <Icon name={r.status === "done" ? "check" : "vaccines"} size={20} /></span>
                      <div className="min-w-0">
                        <p className="font-bold text-ink">{r.dose.vaccine} <span className="font-normal text-ink-3">· {r.dose.dose}</span></p>
                        <p className="text-[13px] text-ink-3">Protects against {r.dose.prevents.toLowerCase()}</p>
                        <div className="mt-2">{r.rec
                          ? <Badge tone="success" icon="check_circle">Given {formatDate(r.rec.clinical_date)}{r.rec.institution ? ` · ${r.rec.institution}` : ""}</Badge>
                          : r.status === "upcoming" ? <span className="flex flex-wrap items-center gap-2"><Badge tone="neutral">Upcoming</Badge>{isChild && <ReminderDialog hasPhone={!!d.p.phone}
                            preset={{ kind: "immunisation", title: `${first}: ${r.dose.vaccine} ${r.dose.dose}`, appointmentAt: `${r.due.toISOString().slice(0, 10)}T09:00` }} />}</span>
                          : r.status === "due" ? <Badge tone="warning">Due now</Badge>
                          : <Badge tone={isChild ? "danger" : "neutral"}>{isChild ? "Not recorded" : "No record"}</Badge>}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </ol>
        </CardBody>
      </Card>
      <p className="text-[13px] text-ink-3">Doses given at a primary health centre may not appear until the facility adds them. If you have the paper card, upload a photo so it's kept with the record. Always follow the advice of the health worker.</p>
    </div>
  );
}
