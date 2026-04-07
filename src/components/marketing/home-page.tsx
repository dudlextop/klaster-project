import { ArrowRight, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import {
  disclosureItems,
  evidenceStats,
  heroBadge,
  heroHighlights,
  heroSignals,
  problemColumns,
  processSteps,
  trustPillars,
} from "@/components/marketing/home-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function HeroSection() {
  const HeroBadgeIcon = heroBadge.icon;

  return (
    <section className="grid gap-10 pb-6 md:gap-12 md:pb-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(24rem,40%)] xl:items-start xl:gap-16">
      <div>
        <div className="mb-6 flex flex-wrap items-center gap-2.5">
          <Badge className="gap-2" variant="verified">
            <HeroBadgeIcon className="size-3" />
            {heroBadge.label}
          </Badge>
          <Badge variant="secondary">Devnet-first vault issuance</Badge>
        </div>

        <h1 className="max-w-4xl text-balance font-display text-[var(--text-h1)] leading-[var(--leading-display)] tracking-[var(--tracking-display)] text-foreground">
          Finance real compute nodes through verified onchain vaults.
        </h1>
        <p className="mt-5 max-w-2xl text-[length:var(--text-body-lg)] leading-[var(--leading-body)] text-muted-foreground">
          KlasterAI gives operators a disciplined path to tokenize real compute
          infrastructure and gives investors a cleaner way to inspect the proof,
          rules, and revenue posture.
        </p>
        <p className="mt-5 max-w-2xl border-l-2 border-secondary/40 pl-5 text-sm leading-7 text-teal">
          One verified asset. One constrained issuance model. One marketplace
          path that explains the limits before it asks for trust.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/marketplace">
              Open marketplace
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/#how-it-works">How verification works</Link>
          </Button>
        </div>

        <div className="mt-7 flex flex-wrap gap-2.5">
          {heroHighlights.map((highlight) => (
            <span
              key={highlight}
              className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground"
            >
              # {highlight}
            </span>
          ))}
        </div>
      </div>

      <aside className="rounded-lg border border-border bg-surface p-5 md:p-6 xl:p-7">
        <div className="mb-5 flex flex-wrap gap-2.5">
          {["Trust rail", "Signal tower", "Review path"].map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          {evidenceStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-surface-2 px-3 py-4 text-center"
            >
              <p className="font-mono text-base font-bold text-teal">
                {stat.value}
              </p>
              <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {heroSignals.map(
            ({ eyebrow, title, description, metric, detail }) => (
              <article
                key={title}
                className="rounded-lg border border-border bg-surface-2 p-5"
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-teal">
                  {eyebrow}
                </p>
                <p className="mt-1 font-mono text-xs font-bold text-foreground">
                  {title}
                </p>
                <p className="mt-2.5 text-[11px] leading-6 text-muted-foreground">
                  {description}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="rounded-md border border-secondary/20 bg-secondary/12 px-1.5 py-0.5 font-mono text-[10px] text-secondary">
                    {metric}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {detail}
                  </span>
                </div>
              </article>
            ),
          )}
        </div>
      </aside>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="border-t border-border py-8 md:py-12">
      <div className="rounded-[1.25rem] border border-border bg-surface-2 px-5 py-8 md:px-7 md:py-10 xl:px-8 xl:py-12">
        <div className="space-y-7">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Why the market breaks
          </p>
          <div className="grid gap-5 md:grid-cols-3 xl:gap-6">
            {problemColumns.map((column) => (
              <article
                key={column.title}
                className="rounded-lg border border-border bg-surface p-6 md:p-7"
              >
                <div className="mb-4 size-1.5 rounded-full bg-primary" />
                <p className="font-mono text-xs font-bold text-foreground">
                  {column.title}
                </p>
                <p className="mt-4 text-[12px] leading-7 text-muted-foreground">
                  {column.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="py-10 md:py-16" id="how-it-works">
      <div className="mb-10 max-w-3xl space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-teal">
          How a compute vault works
        </p>
        <h2 className="max-w-3xl text-balance font-display text-[var(--text-h2)] leading-[var(--leading-heading)] tracking-[var(--tracking-heading)] text-foreground">
          The bridge from hardware proof to onchain ownership stays short and
          readable.
        </h2>
        <p className="text-sm leading-7 text-muted-foreground">
          The product path stays narrow: verify the node, open the vault, mint
          shares at purchase, and account for revenue separately.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:gap-6 2xl:grid-cols-4">
        {processSteps.map((step, index) => (
          <article key={step.step} className="relative">
            {index < processSteps.length - 1 ? (
              <div className="absolute top-7 left-full hidden h-px w-[calc(100%-2rem)] bg-border xl:block" />
            ) : null}
            <div className="relative h-full rounded-lg border border-border bg-surface p-5 md:p-6">
              <p className="font-mono text-2xl font-bold text-teal">
                {step.step}
              </p>
              <p className="mt-4 font-mono text-[11px] font-bold text-foreground">
                {step.title}
              </p>
              <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
                {step.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="border-t border-border py-8 md:py-14" id="trust">
      <div className="rounded-[1.25rem] border border-border bg-surface-2 px-5 py-8 md:px-7 md:py-10 xl:px-8 xl:py-12">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_23rem] xl:gap-8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-teal">
              Trust and disclosure
            </p>
            <h2 className="mt-3 max-w-3xl text-balance font-display text-[var(--text-h2)] leading-[var(--leading-heading)] tracking-[var(--tracking-heading)] text-foreground">
              Constrained v1 design is part of the product, not a footnote.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Credibility comes from readable constraints as much as from a bold
              thesis.
            </p>

            <div className="mt-8 space-y-5">
              {trustPillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="flex gap-4 rounded-lg border border-border bg-surface p-5 md:p-6"
                >
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-secondary" />
                  <div>
                    <p className="font-mono text-[11px] font-bold text-foreground">
                      {pillar.title}
                    </p>
                    <p className="mt-2.5 text-[12px] leading-7 text-muted-foreground">
                      {pillar.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-border bg-surface p-6 md:p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              V1 limits
            </p>
            <ul className="mt-5 space-y-4">
              {disclosureItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                  <span className="text-[12px] leading-7 text-muted-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}

function FinalCallToAction() {
  return (
    <section className="py-10 md:py-16">
      <div className="rounded-[1.25rem] border border-secondary/30 bg-teal-dim px-6 py-9 text-center md:px-8 md:py-11">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-teal">
          Marketplace entry
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl text-balance font-display text-[var(--text-h2)] leading-[var(--leading-heading)] tracking-[var(--tracking-heading)] text-foreground">
          Enter through verified listings, not a generic token promise.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
          Browse approved vaults, sale posture, and disclosure language before
          any wallet action begins.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/marketplace">Open marketplace</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="#trust">Review trust model</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <div className="space-y-0">
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <TrustSection />
      <FinalCallToAction />
    </div>
  );
}
