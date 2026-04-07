import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppProviders } from "@/components/providers/app-providers";
import { getPublicEnv } from "@/lib/env";
import "./globals.css";

const body = localFont({
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  src: "./fonts/manrope-latin-var.woff2",
  variable: "--font-manrope",
  weight: "200 800",
});

const display = localFont({
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  src: "./fonts/space-grotesk-latin-var.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
});

const mono = localFont({
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
  src: "./fonts/jetbrains-mono-latin-var.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
});

export const metadata: Metadata = {
  title: {
    default: "KlasterAI — Verified Compute Vaults",
    template: "%s | KlasterAI",
  },
  description:
    "KlasterAI is a devnet-first marketplace for verified compute vaults with constrained issuance, wallet-signed actions, and readable revenue posture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtime = getPublicEnv();

  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${mono.variable}`}
    >
      <body
        data-solana-cluster={runtime.solanaCluster}
        className="bg-background font-body text-foreground antialiased"
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
