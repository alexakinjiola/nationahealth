import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { PublicShell } from "@/components/shell/public-shell";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import heroDoctor from "../../public/images/hero-doctor.webp";
import patientPhone from "../../public/images/patient-phone.webp";
import surgeon from "../../public/images/surgeon.webp";
import labScientist from "../../public/images/lab-scientist.webp";
import doctorChild from "../../public/images/doctor-child.webp";
import doctorSmile from "../../public/images/doctor-smile.webp";
import doctorPhone from "../../public/images/doctor-phone.webp";
import theatreNurse from "../../public/images/theatre-nurse.webp";
import researcher from "../../public/images/researcher.webp";

const QUICK: { icon: IconName; title: string; body: string; href: string }[] = [
  { icon: "person_add", title: "Create your record", body: "Free for patients", href: "/register" },
  { icon: "shield_person", title: "Share with a doctor", body: "You choose what and for how long", href: "/#how" },
  { icon: "history", title: "See every view", body: "Named and time-stamped", href: "/#how" },
];

const PROMISES: { icon: IconName; title: string; body: string; tone: "blue" | "green" }[] = [
  { icon: "verified", title: "Verified institutions", body: "Licences are checked before a hospital or lab can ask for anything.", tone: "blue" },
  { icon: "shield_person", title: "You decide access", body: "Choose the records, the purpose and how long. Say no any time.", tone: "green" },
  { icon: "lock", title: "Encrypted documents", body: "Files are encrypted at rest and never reachable by a public link.", tone: "blue" },
  { icon: "emergency", title: "Emergencies reviewed", body: "Break-glass access is time-boxed and checked by a person afterwards.", tone: "green" },
];

const WHO: { tag: string; title: string; body: string; img: StaticImageData; alt: string; href: string }[] = [
  { tag: "For you", title: "Patients", body: "Your history in one place", img: patientPhone, alt: "A smiling woman holding her phone", href: "/register" },
  { tag: "Verified", title: "Hospitals", body: "Request with consent", img: surgeon, alt: "A smiling surgeon in blue scrubs in an operating theatre", href: "/register/provider" },
  { tag: "Verified", title: "Laboratories", body: "Results that reach patients", img: labScientist, alt: "A laboratory scientist using a pipette", href: "/register/provider" },
  { tag: "Families", title: "Parents & carers", body: "Manage a child's record", img: doctorChild, alt: "A doctor at her desk with a young patient", href: "/register" },
];

const WHY: { icon: IconName; title: string; body: string }[] = [
  { icon: "folder_open", title: "Everything in one place", body: "Diagnoses, results, prescriptions and vaccinations from every hospital you visit." },
  { icon: "mobile", title: "Works on any phone", body: "No app to install. Sign in from any browser, even on a slow connection." },
  { icon: "do_not_disturb_on", title: "Revoke in one tap", body: "Access ends immediately, even if their screen is still open." },
  { icon: "family_restroom", title: "Care for your family", body: "Manage records for children and relatives you look after, with their consent where needed." },
];

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: "how_to_reg", title: "Create and verify", body: "Sign up with your email and confirm your identity. You get a Health ID to share at reception." },
  { icon: "upload_file", title: "Records arrive", body: "Verified hospitals and labs add records directly. You can upload older results yourself." },
  { icon: "task_alt", title: "Share on your terms", body: "When a new doctor asks, you choose what they see and for how long — or say no." },
];

const SERVICES: { icon: IconName; title: string; body: string; img: StaticImageData; alt: string }[] = [
  { icon: "person_search", title: "Request access", body: "Find a patient by Health ID and ask for exactly what you need, with a stated purpose.", img: doctorPhone, alt: "A doctor checking a phone" },
  { icon: "upload_file", title: "Submit records", body: "Add results, prescriptions and summaries with full provenance from your existing systems.", img: theatreNurse, alt: "A nurse preparing instruments in an operating theatre" },
  { icon: "lab_profile", title: "Connect your systems", body: "FHIR R4 integration with hashed API keys, rotation and a full audit trail.", img: researcher, alt: "Two researchers at a microscope" },
];

function SectionHeading({ eyebrow, title, accent, children, center }: { eyebrow: string; title: string; accent?: string; children?: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-[2rem] font-bold leading-[1.15] tracking-[-0.025em] text-ink sm:text-[2.5rem]">
        {title} {accent && <span className="accent-word">{accent}</span>}
      </h2>
      {children && <p className="mt-4 text-[17px] leading-7 text-ink-3">{children}</p>}
    </div>
  );
}

export default function Landing() {
  return (
    <PublicShell current="/">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-[#f4f8ff] to-surface pt-20">
        <div aria-hidden className="pointer-events-none absolute -left-40 top-10 size-[520px] rounded-full bg-brand-100/60 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-36 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-44 lg:pt-14">
          <div className="animate-slide-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-700 shadow-card ring-1 ring-line/70">
              <Icon name="health_and_safety" size={16} className="text-accent-600" />Your records · Your say
            </p>
            <h1 className="mt-7 text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[4rem]">
              Your health records,
              <span className="mt-1 block font-display text-[3.1rem] font-normal italic leading-[1.05] tracking-[-0.02em] text-accent-600 sm:text-[4.5rem]">wherever life takes you.</span>
            </h1>
            <p className="mt-6 max-w-[33rem] text-lg leading-8 text-ink-2">
              Diagnoses, results and prescriptions from every hospital you visit, kept together in one secure place. Nobody sees them unless you say so.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="pr-2"><Link href="/register">Create your free record<span className="ml-1 grid size-9 place-items-center rounded-full bg-white/20"><Icon name="arrow_forward" size={20} /></span></Link></Button>
              <Button asChild size="lg" variant="secondary"><Link href="/register/provider">For hospitals & labs</Link></Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[48px] rounded-bl-[160px] shadow-lg ring-8 ring-surface">
              <Image src={heroDoctor} alt="A smiling young doctor in a white coat with a stethoscope" fill priority placeholder="blur" sizes="(min-width: 1024px) 520px, 90vw" className="object-cover object-top" />
            </div>
            <div className="absolute -left-4 top-14 hidden w-60 rounded-lg bg-surface p-4 shadow-lg ring-1 ring-line/70 sm:block lg:-left-14">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-accent-50 text-accent-600"><Icon name="verified_user" size={22} filled /></span>
                <div><p className="text-sm font-bold text-ink">Access approved</p><p className="text-xs text-ink-3">by the patient · 30 days</p></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">Lab results</span>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">Prescriptions</span>
              </div>
            </div>
            <div className="absolute -right-2 bottom-20 hidden items-center gap-3 rounded-full bg-surface py-2.5 pl-2.5 pr-5 shadow-lg ring-1 ring-line/70 sm:flex lg:-right-8">
              <span className="grid size-10 place-items-center rounded-full bg-brand-600 text-white"><Icon name="visibility" size={20} /></span>
              <div><p className="text-sm font-bold text-ink">Every view logged</p><p className="text-xs text-ink-3">with a name and a reason</p></div>
            </div>
            <p className="sr-only">Illustration uses synthetic details.</p>
          </div>
        </div>
      </section>

      {/* Floating quick-start bar */}
      <section aria-label="Get started" className="relative z-10 mx-auto -mt-24 max-w-[1100px] px-5 sm:px-8">
        <div className="grid gap-2 rounded-xl bg-surface p-3 shadow-lg ring-1 ring-line/70 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
          {QUICK.map((q, i) => (
            <Link key={q.title} href={q.href} className={`group flex items-center gap-4 rounded-lg px-4 py-3.5 transition-colors hover:bg-brand-50/70 ${i > 0 ? "md:border-l md:border-line md:rounded-l-none" : ""}`}>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white"><Icon name={q.icon} size={22} /></span>
              <span><span className="block text-[15px] font-bold text-ink">{q.title}</span><span className="block text-[13px] text-ink-3">{q.body}</span></span>
            </Link>
          ))}
          <Button asChild size="lg" className="m-1"><Link href="/register">Get started<Icon name="arrow_forward" size={20} /></Link></Button>
        </div>
      </section>

      {/* Promises */}
      <section aria-label="Our promises" className="mx-auto max-w-[1240px] px-5 pt-16 sm:px-8">
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((p) => (
            <li key={p.title} className="flex gap-4">
              <span className={`grid size-14 shrink-0 place-items-center rounded-full ${p.tone === "blue" ? "bg-brand-50 text-brand-600" : "bg-accent-50 text-accent-600"}`}><Icon name={p.icon} size={26} /></span>
              <div><h3 className="text-[15px] font-bold text-ink">{p.title}</h3><p className="mt-1 text-sm leading-6 text-ink-3">{p.body}</p></div>
            </li>
          ))}
        </ul>
      </section>

      {/* Who it's for */}
      <section id="who" aria-labelledby="who-title" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-24 sm:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow">Built for everyone in your care</p>
            <h2 id="who-title" className="mt-3 text-[2rem] font-bold leading-[1.15] tracking-[-0.025em] text-ink sm:text-[2.5rem]">One record, <span className="accent-word">many hands.</span></h2>
          </div>
          <Button asChild variant="secondary" className="self-start sm:self-auto"><Link href="/register">Get started<Icon name="arrow_forward" size={18} /></Link></Button>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHO.map((w) => (
            <li key={w.title}>
              <Link href={w.href} className="group relative block aspect-[4/5] overflow-hidden rounded-lg shadow-card">
                <Image src={w.img} alt={w.alt} fill placeholder="blur" sizes="(min-width: 1024px) 290px, (min-width: 640px) 45vw, 90vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/10 to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-surface/95 px-3 py-1 text-xs font-bold text-brand-700">{w.tag}</span>
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
                  <span><span className="block text-xl font-bold">{w.title}</span><span className="mt-0.5 block text-sm text-white/85">{w.body}</span></span>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur transition-colors group-hover:bg-white group-hover:text-brand-700"><Icon name="arrow_forward" size={20} /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Why choose */}
      <section aria-labelledby="why-title" className="mx-auto grid max-w-[1240px] gap-12 px-5 pt-24 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="eyebrow">Why Continuum</p>
          <h2 id="why-title" className="mt-3 text-[2rem] font-bold leading-[1.15] tracking-[-0.025em] text-ink sm:text-[2.5rem]">Care that <span className="accent-word">remembers you.</span></h2>
          <span aria-hidden className="mt-4 block h-1 w-14 rounded-full bg-accent-500" />
          <ul className="mt-10 grid gap-8 sm:grid-cols-2">
            {WHY.map((w) => (
              <li key={w.title} className="flex gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon name={w.icon} size={24} /></span>
                <div><h3 className="text-[15px] font-bold text-ink">{w.title}</h3><p className="mt-1 text-sm leading-6 text-ink-3">{w.body}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative min-h-[440px] overflow-hidden rounded-xl shadow-lg">
          <Image src={doctorSmile} alt="A smiling doctor holding a stethoscope" fill placeholder="blur" sizes="(min-width: 1024px) 600px, 90vw" className="object-cover object-[50%_25%]" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-brand-900/90 via-brand-900/50 to-transparent" />
          <div className="relative flex h-full min-h-[440px] max-w-sm flex-col justify-center p-8 text-white sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-200">Before your next appointment</p>
            <p className="mt-4 text-[2rem] font-bold leading-[1.15] tracking-[-0.02em]">Walk in with your whole history.</p>
            <p className="mt-3 text-[15px] leading-7 text-white/85">Your doctor sees what you choose to share — so you can spend the visit on your care, not on paperwork.</p>
            <Button asChild variant="secondary" className="mt-7 self-start border-transparent"><Link href="/register">Create your record<Icon name="arrow_forward" size={18} /></Link></Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" aria-labelledby="how-title" className="mt-24 scroll-mt-24 bg-canvas py-24">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <SectionHeading center eyebrow="How it works" title="Three steps to" accent="a record that's yours.">
            Set up once. From then on, your history follows you — and you stay in charge of who sees it.
          </SectionHeading>
          <ol className="relative mt-16 grid gap-10 md:grid-cols-3">
            <span aria-hidden className="absolute left-[16%] right-[16%] top-8 hidden border-t-2 border-dashed border-brand-200 md:block" />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative text-center">
                <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-surface text-brand-600 shadow-card ring-1 ring-line/70">
                  <Icon name={s.icon} size={28} />
                  <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-accent-600 text-xs font-bold text-white">{i + 1}</span>
                </span>
                <h3 className="mt-6 text-lg font-bold text-ink">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs leading-7 text-ink-3">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Institutions */}
      <section id="institutions" aria-labelledby="inst-title" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-24 sm:px-8">
        <SectionHeading center eyebrow="For hospitals, clinics and laboratories" title="We've got your" accent="clinical team covered.">
          Keep your existing systems. Bring a patient's history into the consulting room — with their permission.
        </SectionHeading>
        <ul className="mt-14 grid gap-6 md:grid-cols-3">
          {SERVICES.map((s) => (
            <li key={s.title} className="card overflow-hidden">
              <div className="relative aspect-[16/10]">
                <Image src={s.img} alt={s.alt} fill placeholder="blur" sizes="(min-width: 768px) 380px, 90vw" className="object-cover" />
              </div>
              <div className="relative px-6 pb-6 pt-9">
                <span className="absolute -top-7 left-6 grid size-14 place-items-center rounded-full bg-accent-600 text-white ring-4 ring-surface"><Icon name={s.icon} size={26} /></span>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-bold text-ink">{s.title}</h3>
                  <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-600"><Icon name="arrow_forward" size={18} /></span>
                </div>
                <p className="mt-2 text-[15px] leading-7 text-ink-3">{s.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA band */}
      <section aria-labelledby="cta-title" className="mx-auto max-w-[1240px] px-5 py-24 sm:px-8">
        <div className="relative overflow-hidden rounded-xl bg-brand-600 px-6 py-10 text-white sm:px-12 sm:py-12">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-white/10" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 right-40 size-72 rounded-full bg-accent-500/30" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-5">
              <span className="hidden size-14 shrink-0 place-items-center rounded-full bg-white/15 sm:grid"><Icon name="domain" size={28} /></span>
              <div>
                <h2 id="cta-title" className="text-[1.75rem] font-bold leading-tight tracking-[-0.02em]">Bring your institution on board</h2>
                <p className="mt-2 max-w-xl text-white/85">Register your hospital, clinic or laboratory. We verify your licence, then your staff can request and add records with patient consent.</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="border-transparent"><Link href="/register/provider">Register your institution</Link></Button>
              <Button asChild size="lg" variant="accent"><Link href="/register">I'm a patient</Link></Button>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
