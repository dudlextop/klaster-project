import type { ReactNode } from "react";
import { KlasterLogoMark } from "@/components/klaster/logo-mark";
import { Badge } from "@/components/ui/badge";

type SystemStateFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
  children?: ReactNode;
};

export function SystemStateFrame({
  eyebrow,
  title,
  description,
  meta,
  children,
}: SystemStateFrameProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="container-shell flex min-h-dvh items-center justify-center py-12">
        <section className="w-full max-w-3xl space-y-6">
          <div className="rounded-lg border border-border bg-surface p-5 md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <KlasterLogoMark className="h-8 w-10 text-foreground" />
              <span className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-foreground">
                KlasterAI
              </span>
              <Badge variant="secondary">System state</Badge>
            </div>

            <div className="space-y-3">
              <Badge variant="verified">{eyebrow}</Badge>
              <h1 className="max-w-2xl text-balance font-display text-[var(--text-h2)] leading-[var(--leading-heading)] tracking-[var(--tracking-heading)] text-foreground">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                {description}
              </p>
              {meta ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {meta}
                </p>
              ) : null}
            </div>
          </div>

          {children ? (
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              {children}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
