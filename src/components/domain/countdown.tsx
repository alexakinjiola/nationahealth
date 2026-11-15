"use client";
import * as React from "react";
import { useRouter } from "next/navigation";

/** Live mm:ss countdown to `until`; refreshes the page when time runs out. */
export function Countdown({ until, className }: { until: string; className?: string }) {
  const router = useRouter();
  const end = React.useMemo(() => new Date(until).getTime(), [until]);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, end - now);
  React.useEffect(() => { if (left === 0) router.refresh(); }, [left, router]);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className={className} role="timer" aria-live="off">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}
