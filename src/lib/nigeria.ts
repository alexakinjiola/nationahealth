/** The 36 states and the Federal Capital Territory. */
export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"] as const;
export const GENOTYPES = ["AA", "AS", "AC", "SS", "SC", "CC", "unknown"] as const;

export const COMMON_CONDITIONS = [
  "Hypertension", "Diabetes", "Asthma", "Sickle cell disease", "HIV", "Hepatitis B", "Epilepsy", "Chronic kidney disease",
  "Heart disease", "Tuberculosis (on treatment)", "Glaucoma", "Mental health condition",
];

/**
 * Nigeria's National Programme on Immunisation routine schedule (children),
 * plus HPV for girls 9–14. `match` finds a dose in vaccination record titles.
 * Confirm against the current NPHCDA schedule before clinical use.
 */
export type Dose = { key: string; vaccine: string; dose: string; ageWeeks: number; match: RegExp; prevents: string; sex?: "female" };
export const NPI_SCHEDULE: Dose[] = [
  { key: "bcg", vaccine: "BCG", dose: "At birth", ageWeeks: 0, match: /\bbcg\b/i, prevents: "Tuberculosis" },
  { key: "opv0", vaccine: "OPV", dose: "Birth dose (OPV 0)", ageWeeks: 0, match: /opv\s*0|oral polio.*birth/i, prevents: "Polio" },
  { key: "hepb0", vaccine: "Hepatitis B", dose: "Birth dose", ageWeeks: 0, match: /hep(atitis)?\s*b.*(birth|0)/i, prevents: "Hepatitis B" },
  { key: "penta1", vaccine: "Pentavalent", dose: "Dose 1", ageWeeks: 6, match: /penta\w*\s*1/i, prevents: "Diphtheria, tetanus, whooping cough, Hep B, Hib" },
  { key: "opv1", vaccine: "OPV", dose: "Dose 1", ageWeeks: 6, match: /opv\s*1/i, prevents: "Polio" },
  { key: "pcv1", vaccine: "PCV", dose: "Dose 1", ageWeeks: 6, match: /pcv\s*1/i, prevents: "Pneumonia, meningitis" },
  { key: "rota1", vaccine: "Rotavirus", dose: "Dose 1", ageWeeks: 6, match: /rota\w*\s*1/i, prevents: "Severe diarrhoea" },
  { key: "penta2", vaccine: "Pentavalent", dose: "Dose 2", ageWeeks: 10, match: /penta\w*\s*2/i, prevents: "Diphtheria, tetanus, whooping cough, Hep B, Hib" },
  { key: "opv2", vaccine: "OPV", dose: "Dose 2", ageWeeks: 10, match: /opv\s*2/i, prevents: "Polio" },
  { key: "pcv2", vaccine: "PCV", dose: "Dose 2", ageWeeks: 10, match: /pcv\s*2/i, prevents: "Pneumonia, meningitis" },
  { key: "rota2", vaccine: "Rotavirus", dose: "Dose 2", ageWeeks: 10, match: /rota\w*\s*2/i, prevents: "Severe diarrhoea" },
  { key: "penta3", vaccine: "Pentavalent", dose: "Dose 3", ageWeeks: 14, match: /penta\w*\s*3/i, prevents: "Diphtheria, tetanus, whooping cough, Hep B, Hib" },
  { key: "opv3", vaccine: "OPV", dose: "Dose 3", ageWeeks: 14, match: /opv\s*3/i, prevents: "Polio" },
  { key: "pcv3", vaccine: "PCV", dose: "Dose 3", ageWeeks: 14, match: /pcv\s*3/i, prevents: "Pneumonia, meningitis" },
  { key: "ipv", vaccine: "IPV", dose: "Single dose", ageWeeks: 14, match: /\bipv\b/i, prevents: "Polio" },
  { key: "measles1", vaccine: "Measles", dose: "Dose 1", ageWeeks: 39, match: /measles\s*1|measles(?!\s*2)/i, prevents: "Measles" },
  { key: "yf", vaccine: "Yellow fever", dose: "Single dose", ageWeeks: 39, match: /yellow\s*fever/i, prevents: "Yellow fever" },
  { key: "mena", vaccine: "Meningitis A", dose: "Single dose", ageWeeks: 39, match: /men\s*a|meningitis\s*a/i, prevents: "Meningitis" },
  { key: "measles2", vaccine: "Measles", dose: "Dose 2", ageWeeks: 65, match: /measles\s*2/i, prevents: "Measles" },
  { key: "hpv", vaccine: "HPV", dose: "Single dose (girls 9–14)", ageWeeks: 468, match: /\bhpv\b/i, prevents: "Cervical cancer", sex: "female" },
];

/** Whole weeks between a date of birth and now. */
export function weeksSince(isoDate: string) {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (7 * 86_400_000));
}
