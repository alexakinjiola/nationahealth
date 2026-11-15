import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/actor";
import { withActor } from "@/lib/db";
import { requestMeta } from "@/lib/request";

/** Flattened CSV of the national report: one row per (section, label, series, value). */
export async function GET(req: Request) {
  const actor = await getActor();
  if (!actor || !actor.mfaVerified || !actor.platformCapabilities.includes("reports:view")) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }
  const days = Math.min(365, Math.max(7, Number(new URL(req.url).searchParams.get("days")) || 90));
  const from = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const [{ r }] = await withActor(actor.userId, (tx) => tx<{ r: Record<string, unknown> }[]>`select app.admin_report(${from}::date, current_date) as r`, await requestMeta());

  const rows: string[][] = [["section", "label", "series", "value"]];
  const put = (section: string, label: unknown, series: string, value: unknown) =>
    rows.push([section, String(label ?? ""), series, value === -1 ? "<5" : String(value ?? "")]);
  for (const [section, val] of Object.entries(r)) {
    if (Array.isArray(val)) {
      for (const item of val as Record<string, unknown>[]) {
        const entries = Object.entries(item);
        const [labelKey, label] = entries.find(([, v]) => typeof v === "string") ?? ["", ""];
        for (const [k, v] of entries) if (k !== labelKey && typeof v !== "object") put(section, label, k, v);
      }
    } else if (val && typeof val === "object") {
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) put(section, "", k, v);
    }
  }
  const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="national-report-${from}-to-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
