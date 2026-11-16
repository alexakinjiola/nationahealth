import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Wide tables keep a readable minimum width and scroll sideways on phones,
 * with soft edge shadows that show there's more to see.
 */
export function Table({ className, caption, children, minWidth = "min-w-[40rem]" }: { className?: string; caption: string; children: React.ReactNode; minWidth?: string }) {
  return (
    // Keyboard users can scroll wide tables: the region is focusable and named.
    <div role="region" aria-label={caption} tabIndex={0} className={cn("scroll-shadow overflow-x-auto focus-visible:outline-offset-[-2px]", className)}>
      <table className={cn("w-full border-collapse text-left text-sm", minWidth)}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
export const THead = ({ children }: { children: React.ReactNode }) => (
  <thead className="border-b border-line bg-canvas/60 text-xs font-medium text-ink-3">{children}</thead>
);
export const Th = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <th scope="col" className={cn("whitespace-nowrap px-4 py-2.5 font-medium first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6", className)}>{children}</th>
);
export const TBody = ({ children }: { children: React.ReactNode }) => <tbody className="divide-y divide-line">{children}</tbody>;
export const Tr = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <tr className={cn("align-top transition-colors hover:bg-canvas/50", className)}>{children}</tr>
);
export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <td className={cn("px-4 py-3.5 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6", className)}>{children}</td>
);
