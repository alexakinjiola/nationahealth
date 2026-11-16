/** WHO 2016 antenatal care model: eight contacts, by week of pregnancy. */
export const ANC_CONTACTS = [12, 20, 26, 30, 34, 36, 38, 40];

/** Whole days from `from` to `to` (default now). */
export function daysBetween(from: string, to?: string) {
  const end = to ? new Date(to).getTime() : Date.now();
  return Math.floor((end - new Date(from).getTime()) / 86_400_000);
}
