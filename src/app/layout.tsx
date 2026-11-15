import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/newsreader";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { getLang } from "@/lib/i18n/server";

const name = process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "Continuum";

export const metadata: Metadata = {
  title: { default: `${name} — Personal health records`, template: `%s · ${name}` },
  description: "Your health records, wherever you receive care. You decide who sees them.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f5f8fd", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  // Reading the nonce makes every page dynamic, which per-request CSP nonces require.
  await headers();
  return (
    <html lang={lang === "en" ? "en-NG" : lang}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
