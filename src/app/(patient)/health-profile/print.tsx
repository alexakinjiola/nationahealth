"use client";
import { Button } from "@/components/ui/button";
export function PrintButton() {
  return <Button type="button" variant="secondary" icon="print" onClick={() => window.print()}>Print card</Button>;
}
