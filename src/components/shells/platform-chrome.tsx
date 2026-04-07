"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { WalletAuthControl } from "@/components/auth/wallet-auth-control";
import { KlasterLogoMark } from "@/components/klaster/logo-mark";
import { Badge } from "@/components/ui/badge";
import { formatClusterLabel } from "@/lib/format";
import { platformNavigation } from "@/lib/navigation";
import { getSolanaProviderConfig } from "@/lib/solana/provider-config";
import type { WalletAuthMode } from "@/server/auth/runtime";
import type { AppSession } from "@/server/auth/session";

type PlatformChromeProps = {
  authMode: WalletAuthMode;
  children: ReactNode;
  session: AppSession | null;
};

export function PlatformChrome({
  authMode,
  children,
  session,
}: PlatformChromeProps) {
  const solana = getSolanaProviderConfig();
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/vaults/demo-vault") {
      return pathname.startsWith("/vaults/");
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1680px] flex-col md:flex-row">
        <aside className="w-full shrink-0 border-b border-[color:var(--sidebar-border)] bg-sidebar md:sticky md:top-0 md:min-h-dvh md:w-72 md:self-start md:border-b-0 md:border-r">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 md:px-5 md:py-5">
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Platform
              </p>
              <Link className="group flex items-center gap-2" href="/">
                <KlasterLogoMark className="h-8 w-10 text-foreground" />
                <span className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-foreground transition-colors group-hover:text-teal">
                  KlasterAI
                </span>
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {formatClusterLabel(solana.cluster)}
                </Badge>
                <Badge variant="verified">Wallet-supported</Badge>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Public market and role workspaces.
              </p>
            </div>

            <WalletAuthControl authMode={authMode} session={session} />

            <nav aria-label="Platform routes" className="flex flex-col gap-1">
              {platformNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors ${
                    isActive(item.href)
                      ? "border-teal-glow bg-teal-dim text-teal"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
                    {item.label}
                  </span>
                  <span
                    className={`rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${
                      isActive(item.href)
                        ? "border-secondary/20 bg-secondary/12 text-secondary"
                        : "border-border bg-surface-3 text-muted-foreground"
                    }`}
                  >
                    {item.group}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8 xl:px-10 xl:py-8 2xl:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}
