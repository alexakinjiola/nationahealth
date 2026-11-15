"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

const axis = { fontSize: 12, fill: "#5a6479" };
const short = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function SubmissionsChart({ data }: { data: { week: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <figure>
      <div className="h-48" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart accessibilityLayer={false} data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f2" />
            <XAxis dataKey="week" tickFormatter={short} tick={axis} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={(l) => `Week of ${short(String(l))}`} cursor={{ fill: "#edf2f9" }} />
            <Bar isAnimationActive={false} dataKey="count" name="Records" fill="#0b4cb4" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{total} records submitted over the last 8 weeks: {data.map((d) => `week of ${short(d.week)}: ${d.count}`).join("; ")}.</figcaption>
    </figure>
  );
}

export function AccessChart({ data }: { data: { day: string; allowed: number; denied: number }[] }) {
  return (
    <figure>
      <div className="h-56" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart accessibilityLayer={false} data={data} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f2" />
            <XAxis dataKey="day" tickFormatter={short} tick={axis} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={(l) => short(String(l))} />
            <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="allowed" name="Allowed" stroke="#0b4cb4" strokeWidth={2} dot={false} />
            <Line isAnimationActive={false} type="monotone" dataKey="denied" name="Denied" stroke="#a1291d" strokeWidth={2} strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">Protected-data access attempts per day over 14 days: {data.map((d) => `${short(d.day)}: ${d.allowed} allowed, ${d.denied} denied`).join("; ")}.</figcaption>
    </figure>
  );
}
