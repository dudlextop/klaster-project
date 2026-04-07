import Link from "next/link";
import type { ReactNode } from "react";
import { KlasterLogoMark } from "@/components/klaster/logo-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type MarketingChromeProps = {
  children: ReactNode;
};

const navigation = [
  { href: "/", label: "Home" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#trust", label: "Trust model" },
  { href: "/marketplace", label: "Marketplace" },
] as const;

const footerLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/operator/vaults", label: "Operator" },
  { href: "/admin/verifications", label: "Admin" },
] as const;

export function MarketingChrome({ children }: MarketingChromeProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container-shell flex h-12 items-center justify-between gap-3 md:h-14 md:gap-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex min-w-0 items-center gap-2">
              <KlasterLogoMark className="h-7 w-9 text-foreground" />
              <span className="hidden font-mono text-sm font-bold uppercase tracking-[0.18em] text-foreground transition-colors group-hover:text-teal sm:inline">
                KlasterAI
              </span>
              <Badge className="hidden sm:inline-flex" variant="secondary">
                Devnet first
              </Badge>
            </Link>
          </div>
          <nav
            aria-label="Primary"
            className="hidden items-center gap-6 lg:flex"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="secondary">
              <Link href="/marketplace">Marketplace</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container-shell flex-1 py-6 md:py-8">{children}</main>

      <footer className="border-t border-border py-10">
        <div className="container-shell">
          <Separator className="mb-5 border-border" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium text-foreground">
                Verified compute exposure with explicit limits.
              </p>
              <p className="text-[12px] leading-6 text-muted-foreground">
                KlasterAI is devnet-first, keeps proof documents private, and
                does not ship an open secondary market in v1.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
              {footerLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
