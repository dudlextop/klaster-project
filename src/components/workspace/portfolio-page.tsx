import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  ErrorCard,
  MetricTile,
  PageHeader,
} from "@/components/klaster/ui-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PortfolioClaimAction } from "@/components/workspace/portfolio-claim-action";
import { formatDateTimeLabel, formatUsdcAmount } from "@/lib/format";
import type { PortfolioPageData } from "@/server/vaults/authenticated";

function getSourceCopy(state: PortfolioPageData["state"]) {
  if (state === "seeded_demo") {
    return "Seeded portfolio mirror.";
  }

  if (state === "live_error") {
    return "Live investor read failed.";
  }

  return "Live indexed mirror.";
}

function getHoldingBadge(status: "paused" | "verified") {
  if (status === "paused") {
    return {
      label: "Paused",
      variant: "destructive" as const,
    };
  }

  return {
    label: "Verified",
    variant: "verified" as const,
  };
}

export function PortfolioPageView({ data }: { data: PortfolioPageData }) {
  if (data.state === "live_error") {
    return (
      <section className="space-y-6">
        <ErrorCard
          action={
            <Button asChild variant="secondary">
              <Link href="/portfolio">Retry portfolio read</Link>
            </Button>
          }
          description="The investor route is implemented, but the live portfolio read failed for this request."
          detail={data.errorMessage ?? undefined}
          title="Portfolio is temporarily unavailable"
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        description="Review current positions, paused exposure, and indexed claimable balances through one disciplined ledger. Gross revenue, platform fees, and investor-distributable yield stay explicit."
        eyebrow="Portfolio"
        source={getSourceCopy(data.state)}
        title="Net claimable yield stays visible before vault-by-vault history."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricTile
          label="Total invested"
          value={formatUsdcAmount(data.summary.totalInvestedUsdc)}
        />
        <MetricTile
          accent
          label="Claimable yield"
          value={formatUsdcAmount(data.summary.totalClaimableUsdc)}
        />
        <MetricTile
          label="Platform fees"
          value={formatUsdcAmount(data.summary.totalPlatformFeesUsdc)}
        />
        <MetricTile
          label="Tracked vaults"
          value={`${data.summary.vaultCount} positions`}
        />
        <MetricTile
          label="Paused exposure"
          value={formatUsdcAmount(data.summary.pausedExposureUsdc)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card className="bg-surface/92">
            <CardHeader>
              <CardTitle>Claim posture</CardTitle>
              <CardDescription>
                The primary action stays in one elevated module before the full
                holdings table.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="space-y-3 rounded-lg border border-border-subtle bg-surface-2/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Current indexed claimable
                </p>
                <p className="text-3xl font-semibold tabular-nums text-foreground">
                  {formatUsdcAmount(data.summary.totalClaimableUsdc)}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Claim execution is reserved for the wallet-action leaf. This
                  page keeps the action visible while separating gross revenue,
                  platform fees, and net investor yield.
                </p>
              </div>
              <div className="space-y-4 rounded-lg border border-border-subtle bg-surface-2/70 p-5">
                <div className="grid gap-2 rounded-md border border-border-subtle bg-background/35 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Gross revenue</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatUsdcAmount(data.summary.grossRevenueUsdc)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Platform fees</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatUsdcAmount(data.summary.totalPlatformFeesUsdc)}
                    </span>
                  </div>
                </div>
                <div className="text-sm leading-6 text-muted-foreground">
                  {data.state === "seeded_demo"
                    ? "Demo mode keeps the claim rail visible for review, but execution remains disabled until live wallet runtime is available."
                    : "Claim execution now lives per vault so paused positions and zero-balance holdings never hide behind an aggregate action."}
                </div>
                <div className="rounded-md border border-border-subtle bg-background/35 p-4 text-sm leading-6 text-muted-foreground">
                  Use the per-vault action lane below to claim from eligible
                  holdings individually. The summary card stays informational
                  only in this checkpoint.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface/92">
            <CardHeader>
              <CardTitle>Per-vault holdings</CardTitle>
              <CardDescription>
                Each position keeps status, shares, last deposit, and claim
                posture in one scan lane.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.holdings.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <tr className="border-b border-border-subtle">
                        <th className="px-3 py-3 font-semibold">Vault</th>
                        <th className="px-3 py-3 font-semibold">Origin</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-3 py-3 font-semibold">Shares</th>
                        <th className="px-3 py-3 font-semibold">Invested</th>
                        <th className="px-3 py-3 font-semibold">
                          Platform fee
                        </th>
                        <th className="px-3 py-3 font-semibold">Claimable</th>
                        <th className="px-3 py-3 font-semibold">
                          Last deposit
                        </th>
                        <th className="px-3 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.holdings.map((holding) => {
                        const statusBadge = getHoldingBadge(holding.status);

                        return (
                          <tr
                            key={holding.id}
                            className="border-b border-border-subtle/60 last:border-0"
                          >
                            <td className="px-3 py-4 align-top">
                              <div className="space-y-1">
                                <p className="font-semibold text-foreground">
                                  {holding.nodeLabel}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {holding.nodeCategory}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-4 align-top text-muted-foreground">
                              {holding.assetOrigin === "klaster_managed"
                                ? "Klaster-managed"
                                : "Operator-listed"}
                            </td>
                            <td className="px-3 py-4 align-top">
                              <Badge variant={statusBadge.variant}>
                                {statusBadge.label}
                              </Badge>
                            </td>
                            <td className="px-3 py-4 align-top font-semibold tabular-nums text-foreground">
                              {holding.sharesOwned.toLocaleString()}
                            </td>
                            <td className="px-3 py-4 align-top font-semibold tabular-nums text-foreground">
                              {formatUsdcAmount(holding.investedUsdc)}
                            </td>
                            <td className="px-3 py-4 align-top font-semibold tabular-nums text-foreground">
                              {formatUsdcAmount(holding.platformFeePaidUsdc)}
                            </td>
                            <td className="px-3 py-4 align-top">
                              <div className="space-y-1">
                                <p className="font-semibold tabular-nums text-foreground">
                                  {formatUsdcAmount(holding.claimableUsdc)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Claimed:{" "}
                                  {formatUsdcAmount(holding.totalClaimedUsdc)}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-4 align-top text-muted-foreground">
                              {holding.lastDepositAt
                                ? formatDateTimeLabel(holding.lastDepositAt)
                                : "No deposits yet"}
                            </td>
                            <td className="px-3 py-4 align-top">
                              <div className="flex flex-col gap-2">
                                <PortfolioClaimAction
                                  actionMode={
                                    data.state === "seeded_demo"
                                      ? "demo"
                                      : "live"
                                  }
                                  holding={holding}
                                />
                                <Button asChild size="sm" variant="ghost">
                                  <Link href={`/vaults/${holding.slug}`}>
                                    Open vault
                                    <ArrowRight className="size-4" />
                                  </Link>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-6 text-sm leading-6 text-muted-foreground">
                  No purchases or claims are currently indexed for this wallet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-surface/92">
          <CardHeader>
            <CardTitle>Activity ledger</CardTitle>
            <CardDescription>
              Purchases, deposits, and claims stay subordinate to the claim
              posture but remain visible in one chronological lane.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.activities.length ? (
              data.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-lg border border-border-subtle bg-surface-2/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {activity.vaultLabel}
                      </p>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {activity.type}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeLabel(activity.occurredAt)}
                    </p>
                  </div>
                  <div className="mt-3 text-sm text-foreground">
                    {activity.type === "purchase"
                      ? `${activity.shares?.toLocaleString() ?? 0} shares purchased for ${formatUsdcAmount(activity.amountUsdc ?? 0)}.`
                      : activity.type === "claim"
                        ? `${formatUsdcAmount(activity.amountUsdc ?? 0)} claimed to the wallet session.`
                        : `${formatUsdcAmount(activity.amountUsdc ?? 0)} deposited into the revenue pool.`}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-6 text-sm leading-6 text-muted-foreground">
                No indexed activity has landed for this wallet yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
