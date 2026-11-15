"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(reducedQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** True when the user asked the OS for less motion. */
export function useReducedMotion() {
  return React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);
}

const noop = () => () => {};
/** False during server render and hydration, true afterwards. */
function useHydrated() {
  return React.useSyncExternalStore(noop, () => true, () => false);
}

function useInView<T extends Element>(once = true) {
  const ref = React.useRef<T>(null);
  const [seen, setSeen] = React.useState(() => typeof window !== "undefined" && typeof IntersectionObserver === "undefined");
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); if (once) io.disconnect(); }
      else if (!once) setSeen(false);
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return [ref, seen] as const;
}

/** Fades and lifts children in when they scroll into view. Content is visible without JS. */
export function Reveal({ children, delay = 0, className, as: As = "div", from = "up" }: {
  children: React.ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" | "article"; from?: "up" | "left" | "right" | "scale";
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const mounted = useHydrated();
  // Content renders visible on the server and without JS; it only hides once we know we can animate it in.
  const hidden = mounted && !seen && !reduced;
  const offset = from === "left" ? "-translate-x-6" : from === "right" ? "translate-x-6" : from === "scale" ? "scale-[0.96]" : "translate-y-6";
  return (
    <As ref={ref as never} style={{ transitionDelay: `${delay}ms` }}
      className={cn("transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        hidden ? `opacity-0 ${offset}` : "opacity-100 translate-x-0 translate-y-0 scale-100", className)}>
      {children}
    </As>
  );
}

/** Counts up to `value` when it scrolls into view. Screen readers get the final number only. */
export function CountUp({ value, duration = 1200, format, className }: {
  value: number; duration?: number; format?: (n: number) => string; className?: string;
}) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const reduced = useReducedMotion();
  const [n, setN] = React.useState<number | null>(null);
  const fmt = format ?? ((x: number) => Math.round(x).toLocaleString("en-NG"));
  React.useEffect(() => {
    if (!seen || reduced || !Number.isFinite(value)) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, reduced, value, duration]);
  const shown = !seen || reduced || n === null ? value : n;
  return (
    <span ref={ref} className={className}>
      <span aria-hidden>{fmt(shown)}</span>
      <span className="sr-only">{fmt(value)}</span>
    </span>
  );
}

/** A circular progress ring that animates to `value` (0–100). */
export function ProgressRing({ value, size = 88, stroke = 9, className, children, color = "var(--color-brand-600)" }: {
  value: number; size?: number; stroke?: number; className?: string; children?: React.ReactNode; color?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div ref={ref} className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-sunken" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={seen ? c * (1 - v / 100) : c}
          className="transition-[stroke-dashoffset] duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
