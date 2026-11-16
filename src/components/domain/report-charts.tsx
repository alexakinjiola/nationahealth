"use client";
import * as React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis,
  RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useReducedMotion } from "@/components/ui/motion";

/** Brand-led categorical palette, distinguishable and readable on white. */
import { PALETTE } from "@/lib/chart-palette";
export { PALETTE };
const axis = { fontSize: 12, fill: "#5a6479" };
const grid = "#e2e8f2";
const tip = { contentStyle: { borderRadius: 12, border: "1px solid #e2e8f2", boxShadow: "0 12px 28px -12px rgb(11 52 122 / .25)", fontSize: 13 } };
const shortDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const monthName = (d: string) => new Date(d).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
const num = (v: unknown) => (v === -1 ? "<5" : typeof v === "number" ? v.toLocaleString("en-NG") : String(v ?? "—"));
/** Suppressed counts (-1) are drawn as 0 and labelled "<5" in tooltips and tables. */
const plot = <T extends Record<string, unknown>>(rows: T[], keys: string[]) =>
  rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, keys.includes(k) && v === -1 ? 0 : v])) as T);

function Figure({ title, summary, height = 260, children, table }: {
  title: string; summary: string; height?: number; children: React.ReactNode; table?: { head: string[]; rows: (string | number)[][] };
}) {
  return (
    <figure>
      <div style={{ height }} aria-hidden inert>{children}</div>
      <figcaption className="sr-only">{title}. {summary}</figcaption>
      {table && (
        <details className="group mt-3 text-sm">
          <summary className="cursor-pointer select-none text-[13px] font-semibold text-brand-600 hover:underline">View as table</summary>
          <div className="mt-2 max-h-64 overflow-auto rounded-md border border-line/80">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-canvas"><tr>{table.head.map((h) => <th key={h} className="px-3 py-2 font-semibold text-ink-2">{h}</th>)}</tr></thead>
              <tbody>{table.rows.map((r, i) => <tr key={i} className="border-t border-line/70">{r.map((c, j) => <td key={j} className="px-3 py-1.5 text-ink-2">{num(c)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}

export function TrendArea({ data, series, title, dateKey = "week" }: {
  data: Record<string, unknown>[]; series: { key: string; label: string }[]; title: string; dateKey?: string;
}) {
  const anim = !useReducedMotion();
  return (
    <Figure title={title} summary={series.map((s) => `${s.label}: ${data.reduce((t, d) => t + (Number(d[s.key]) || 0), 0)} in total`).join("; ")}
      table={{ head: ["Week", ...series.map((s) => s.label)], rows: data.map((d) => [shortDate(String(d[dateKey])), ...series.map((s) => Number(d[s.key]) || 0)]) }}>
      <ResponsiveContainer>
        <AreaChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>{series.map((s, i) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PALETTE[i]} stopOpacity={0.35} /><stop offset="100%" stopColor={PALETTE[i]} stopOpacity={0.02} />
            </linearGradient>
          ))}</defs>
          <CartesianGrid vertical={false} stroke={grid} />
          <XAxis dataKey={dateKey} tickFormatter={shortDate} tick={axis} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
          <Tooltip {...tip} labelFormatter={(l) => `Week of ${shortDate(String(l))}`} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => <Area key={s.key} isAnimationActive={anim} animationDuration={1100} type="monotone" dataKey={s.key} name={s.label}
            stroke={PALETTE[i]} strokeWidth={2.5} fill={`url(#g-${s.key})`} />)}
        </AreaChart>
      </ResponsiveContainer>
    </Figure>
  );
}

export function StackedBars({ data, series, title, xKey, xFormat = "week", horizontal, height }: {
  data: Record<string, unknown>[]; series: { key: string; label: string; color?: string }[]; title: string; xKey: string;
  xFormat?: "week" | "month" | "text"; horizontal?: boolean; height?: number;
}) {
  const anim = !useReducedMotion();
  const fx = (v: unknown) => (xFormat === "week" ? shortDate(String(v)) : xFormat === "month" ? monthName(String(v)) : String(v));
  const rows = plot(data, series.map((s) => s.key));
  return (
    <Figure title={title} height={height} summary={`${data.length} groups across ${series.length} series.`}
      table={{ head: [xFormat === "text" ? "Group" : "Period", ...series.map((s) => s.label)], rows: data.map((d) => [fx(d[xKey]), ...series.map((s) => (d[s.key] as number) ?? 0)]) }}>
      <ResponsiveContainer>
        <BarChart accessibilityLayer={false} data={rows} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 12, bottom: 0, left: horizontal ? 8 : -18 }}>
          <CartesianGrid vertical={!!horizontal} horizontal={!horizontal} stroke={grid} />
          {horizontal ? <>
            <XAxis type="number" allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey={xKey} tickFormatter={fx} tick={axis} axisLine={false} tickLine={false} width={120} />
          </> : <>
            <XAxis dataKey={xKey} tickFormatter={fx} tick={axis} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
          </>}
          <Tooltip {...tip} labelFormatter={(l) => fx(l)} cursor={{ fill: "#edf2f9" }} />
          {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => <Bar key={s.key} isAnimationActive={anim} animationDuration={900} dataKey={s.key} name={s.label} stackId="a"
            fill={s.color ?? PALETTE[i % PALETTE.length]} radius={i === series.length - 1 ? (horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]) : 0} maxBarSize={horizontal ? 22 : 34} />)}
        </BarChart>
      </ResponsiveContainer>
    </Figure>
  );
}

export function Donut({ data, title, centerLabel }: { data: { label: string; value: number }[]; title: string; centerLabel?: string }) {
  const anim = !useReducedMotion();
  const clean = data.map((d) => ({ ...d, plotted: d.value === -1 ? 0 : d.value })).filter((d) => d.plotted > 0);
  const total = clean.reduce((t, d) => t + d.plotted, 0);
  return (
    <Figure title={title} height={240} summary={data.map((d) => `${d.label}: ${num(d.value)}`).join("; ")}
      table={{ head: ["Group", "Count"], rows: data.map((d) => [d.label, d.value]) }}>
      <div className="grid h-full grid-cols-[1fr_1fr] items-center gap-2">
        <div className="relative h-full">
          <ResponsiveContainer>
            <PieChart accessibilityLayer={false}>
              <Pie isAnimationActive={anim} animationDuration={1000} data={clean} dataKey="plotted" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                {clean.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip {...tip} formatter={(v) => num(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div><p className="text-2xl font-bold text-ink">{total.toLocaleString("en-NG")}</p><p className="text-[11px] text-ink-3">{centerLabel ?? "total"}</p></div>
          </div>
        </div>
        <ul className="space-y-1.5 text-[13px]">
          {clean.slice(0, 8).map((d, i) => (
            <li key={d.label} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="min-w-0 flex-1 truncate text-ink-2">{d.label}</span>
              <span className="font-semibold text-ink">{total ? Math.round((d.plotted / total) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Figure>
  );
}

export function MultiLine({ data, series, title, xKey = "day", xFormat = "day", height }: {
  data: Record<string, unknown>[]; series: { key: string; label: string; color?: string; dashed?: boolean }[]; title: string; xKey?: string;
  xFormat?: "day" | "month"; height?: number;
}) {
  const anim = !useReducedMotion();
  const fx = (v: unknown) => (xFormat === "month" ? monthName(String(v)) : shortDate(String(v)));
  const rows = plot(data, series.map((s) => s.key));
  return (
    <Figure title={title} height={height} summary={`${series.map((s) => s.label).join(", ")} over ${data.length} periods.`}
      table={{ head: ["Period", ...series.map((s) => s.label)], rows: data.map((d) => [fx(d[xKey]), ...series.map((s) => (d[s.key] as number) ?? 0)]) }}>
      <ResponsiveContainer>
        <LineChart accessibilityLayer={false} data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke={grid} />
          <XAxis dataKey={xKey} tickFormatter={fx} tick={axis} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
          <Tooltip {...tip} labelFormatter={(l) => fx(l)} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => <Line key={s.key} isAnimationActive={anim} animationDuration={1200} type="monotone" dataKey={s.key} name={s.label}
            stroke={s.color ?? PALETTE[i % PALETTE.length]} strokeWidth={2.4} strokeDasharray={s.dashed ? "5 4" : undefined} dot={false} activeDot={{ r: 5 }} />)}
        </LineChart>
      </ResponsiveContainer>
    </Figure>
  );
}

export function Pyramid({ data, title }: { data: { band: string; female: number; male: number }[]; title: string }) {
  const anim = !useReducedMotion();
  const rows = data.map((d) => ({ band: d.band, female: d.female === -1 ? 0 : d.female, male: -(d.male === -1 ? 0 : d.male), rf: d.female, rm: d.male }));
  return (
    <Figure title={title} height={280} summary={data.map((d) => `${d.band}: ${num(d.female)} female, ${num(d.male)} male`).join("; ")}
      table={{ head: ["Age", "Female", "Male"], rows: data.map((d) => [d.band, d.female, d.male]) }}>
      <ResponsiveContainer>
        <BarChart accessibilityLayer={false} data={rows} layout="vertical" stackOffset="sign" margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={grid} />
          <XAxis type="number" tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => String(Math.abs(v))} />
          <YAxis type="category" dataKey="band" tick={axis} axisLine={false} tickLine={false} width={48} />
          <Tooltip {...tip} formatter={(v, n, p) => [num(n === "Male" ? p.payload.rm : p.payload.rf), n]} cursor={{ fill: "#edf2f9" }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar isAnimationActive={anim} dataKey="male" name="Male" stackId="s" fill="#0b4cb4" radius={[6, 0, 0, 6]} maxBarSize={22} />
          <Bar isAnimationActive={anim} dataKey="female" name="Female" stackId="s" fill="#146f3b" radius={[0, 6, 6, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </Figure>
  );
}

export function Gauge({ value, label, color = "#146f3b" }: { value: number; label: string; color?: string }) {
  const anim = !useReducedMotion();
  return (
    <figure className="relative h-44">
      <ResponsiveContainer>
        <RadialBarChart accessibilityLayer={false} innerRadius="72%" outerRadius="100%" data={[{ v: value }]} startAngle={210} endAngle={-30}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar isAnimationActive={anim} animationDuration={1300} dataKey="v" cornerRadius={12} fill={color} background={{ fill: "#edf2f9" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <figcaption className="absolute inset-0 grid place-items-center text-center">
        <span><span className="block text-3xl font-bold text-ink">{Math.round(value)}%</span><span className="text-xs text-ink-3">{label}</span></span>
      </figcaption>
    </figure>
  );
}

/** Funnel drawn as tapering bars with drop-off between stages. */
export function Funnel({ data }: { data: { stage: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ol className="space-y-2.5">
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 100);
        return (
          <li key={d.stage}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold text-ink">{d.stage}</span>
              <span className="text-ink-3"><strong className="text-ink">{d.value.toLocaleString("en-NG")}</strong>{i > 0 ? ` · ${Math.min(100, Math.round((d.value / Math.max(data[0].value, 1)) * 100))}% of ${data[0].stage.toLowerCase()}` : ""}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-sunken">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-accent-500 transition-[width] duration-1000 ease-out" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
