import {
  CircleDollarSign,
  FileStack,
  Gauge,
  Plus,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import {
  DetailHeader,
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
import { OperatorDepositRail } from "@/components/workspace/operator-deposit-rail";
import { formatDateTimeLabel, formatUsdcAmount } from "@/lib/format";
import type {
  OperatorDraftPageData,
  OperatorVaultCard,
  OperatorVaultDetailPageData,
  OperatorWorkspacePageData,
} from "@/server/vaults/authenticated";

function getStatusBadge(status: OperatorVaultCard["status"]) {
  if (status === "verified") {
    return { label: "Verified", variant: "verified" as const };
  }

  if (status === "paused") {
    return { label: "Paused", variant: "destructive" as const };
  }

  if (status === "needs_info") {
    return { label: "Needs info", variant: "pending" as const };
  }

  if (status === "pending_review") {
    return { label: "Pending review", variant: "pending" as const };
  }

  return { label: "Draft", variant: "secondary" as const };
}

function getWorkspaceSourceCopy(state: OperatorWorkspacePageData["state"]) {
  if (state === "seeded_demo") {
    return "Seeded operations mirror.";
  }

  if (state === "live_error") {
    return "Live operator read failed.";
  }

  return "Live operations mirror.";
}

function Lane({
  description,
  title,
  vaults,
}: {
  description: string;
  title: string;
  vaults: OperatorVaultCard[];
}) {
  return (
    <Card className="bg-surface/92">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {vaults.length ? (
          vaults.map((vault) => {
            const badge = getStatusBadge(vault.status);

            return (
              <div
                key={vault.id}
                className="rounded-lg border border-border-subtle bg-surface-2/70 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <Badge variant="secondary">
                    {vault.assetOrigin === "klaster_managed"
                      ? "Klaster-managed"
                      : "Operator-listed"}
                  </Badge>
                  <Badge variant="secondary">{vault.nodeCategory}</Badge>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="font-semibold text-foreground">
                    {vault.nodeLabel}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {vault.documentCount} proof documents indexed
                    {vault.latestReviewNote
                      ? ` • ${vault.latestReviewNote}`
                      : ""}
                  </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border-subtle bg-background/40 px-3 py-2 text-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Public tranche
                    </p>
                    <p className="mt-1 font-semibold tabular-nums text-foreground">
                      {vault.publicShareSupply.toLocaleString()} shares
                    </p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-background/40 px-3 py-2 text-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Share price
                    </p>
                    <p className="mt-1 font-semibold tabular-nums text-foreground">
                      {formatUsdcAmount(vault.sharePriceUsdc)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-background/40 px-3 py-2 text-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Performance fee
                    </p>
                    <p className="mt-1 font-semibold tabular-nums text-foreground">
                      {(vault.platformFeeBps / 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className="rounded-md border border-border-subtle bg-background/40 px-3 py-2 text-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Campaign raised
                    </p>
                    <p className="mt-1 font-semibold tabular-nums text-foreground">
                      {formatUsdcAmount(vault.campaignRaisedUsdc)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/operator/vaults/${vault.slug}`}>
                      Open vault
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-5 text-sm leading-6 text-muted-foreground">
            No vaults currently sit in this lane.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OperatorWorkspacePageView({
  data,
}: {
  data: OperatorWorkspacePageData;
}) {
  if (data.state === "live_error") {
    return (
      <section className="space-y-6">
        <ErrorCard
          description="The route structure is implemented, but the live operator read failed for this request."
          detail={data.errorMessage ?? undefined}
          title="Operations board is temporarily unavailable"
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        action={
          <Button asChild className="min-w-[11rem]">
            <Link href="/operator/vaults/new">
              Create vault
              <Plus className="size-4" />
            </Link>
          </Button>
        }
        description="Drafts, pending reviews, verified vaults, and paused operations stay in explicit lanes so the operator can move each asset forward without losing status, asset origin, fee posture, or campaign-progress context."
        eyebrow="Vault operations"
        source={getWorkspaceSourceCopy(data.state)}
        title="Review vault stage, blocker, and next action from one board."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Drafts" value={data.summary.draftCount.toString()} />
        <MetricTile
          label="Pending review"
          value={data.summary.pendingReviewCount.toString()}
        />
        <MetricTile
          label="Needs info"
          value={data.summary.needsInfoCount.toString()}
        />
        <MetricTile
          accent
          label="Verified"
          value={data.summary.verifiedCount.toString()}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Lane
          description="Draft vaults are editable and can still change public asset fields."
          title="Draft lane"
          vaults={data.lanes.draft}
        />
        <Lane
          description="Needs-info vaults keep the reviewer note attached to the lane card."
          title="Needs info lane"
          vaults={data.lanes.needs_info}
        />
        <Lane
          description="Pending submissions stay locked while the admin queue is reviewing them."
          title="Pending review lane"
          vaults={data.lanes.pending_review}
        />
        <Lane
          description="Verified and paused vaults keep revenue and remediation posture visible."
          title="Operations lanes"
          vaults={[...data.lanes.verified, ...data.lanes.paused]}
        />
      </div>
    </section>
  );
}

export function OperatorDraftPageView({
  data,
}: {
  data: OperatorDraftPageData;
}) {
  return (
    <section className="space-y-6">
      <PageHeader
        description="The form keeps asset identity, economics, and proof checklist in one structured surface so review blockers stay local to the field group that needs attention."
        eyebrow="Create vault"
        source={
          data.state === "seeded_demo"
            ? "Demo mode keeps draft and checklist structure visible."
            : "Live draft actions are ready on the existing server boundary."
        }
        title="Group public facts and proof requirements before submission."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="bg-surface/92">
          <CardHeader>
            <CardTitle>Draft fields</CardTitle>
            <CardDescription>
              Public facts and sale configuration stay grouped rather than mixed
              with proof-upload tasks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="text-sm font-semibold text-foreground">
                Asset identity
              </legend>
              <label className="space-y-2">
                <span className="terminal-label block text-foreground">
                  Node label
                </span>
                <input
                  className="terminal-input"
                  defaultValue={data.defaults.nodeLabel}
                  disabled
                />
              </label>
              <label className="space-y-2">
                <span className="terminal-label block text-foreground">
                  Node category
                </span>
                <input
                  className="terminal-input"
                  defaultValue={data.defaults.nodeCategory}
                  disabled
                />
              </label>
            </fieldset>

            <fieldset className="grid gap-4 md:grid-cols-3">
              <legend className="text-sm font-semibold text-foreground">
                Sale configuration
              </legend>
              <label className="space-y-2">
                <span className="terminal-label block text-foreground">
                  Valuation (SOL)
                </span>
                <input
                  className="terminal-input"
                  defaultValue={data.defaults.valuationUsdc}
                  disabled
                />
              </label>
              <label className="space-y-2">
                <span className="terminal-label block text-foreground">
                  Total shares
                </span>
                <input
                  className="terminal-input"
                  defaultValue={data.defaults.totalShares}
                  disabled
                />
              </label>
              <label className="space-y-2">
                <span className="terminal-label block text-foreground">
                  Public share supply
                </span>
                <input
                  className="terminal-input"
                  defaultValue={data.defaults.publicShareSupply}
                  disabled
                />
              </label>
            </fieldset>

            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="text-sm font-semibold text-foreground">
                Pricing
              </legend>
              <label className="space-y-2">
                <span className="terminal-label block text-foreground">
                  Share price (SOL)
                </span>
                <input
                  className="terminal-input"
                  defaultValue={data.defaults.sharePriceUsdc}
                  disabled
                />
              </label>
              <label className="space-y-2">
                <span className="terminal-label block text-foreground">
                  Operator guidance
                </span>
                <textarea
                  className="terminal-textarea"
                  defaultValue={data.guidance.join("\n\n")}
                  disabled
                />
              </label>
            </fieldset>

            <div className="flex flex-wrap gap-3">
              <Button disabled variant="secondary">
                Save draft
              </Button>
              <Button disabled>Submit for review</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface/92">
          <CardHeader>
            <div className="flex items-center gap-3 text-secondary">
              <FileStack className="size-5" />
              <CardTitle>Proof checklist</CardTitle>
            </div>
            <CardDescription>
              Required proof stays in a persistent side rail instead of hiding
              behind a separate upload screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.requiredDocuments.map((document) => (
              <div
                key={document.id}
                className="rounded-lg border border-border-subtle bg-surface-2/70 p-4"
              >
                <p className="text-sm font-semibold text-foreground">
                  {document.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {document.description}
                </p>
                <Button className="mt-3" disabled size="sm" variant="secondary">
                  Upload document
                </Button>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-border bg-surface-2/70 p-4">
              <p className="font-mono text-[10px] leading-6 text-muted-foreground">
                Allowed types: PDF, JPEG, PNG, WebP. Max 25 MB per file. Submit
                requires at least one proof document.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function OperatorVaultDetailPageView({
  data,
}: {
  data: OperatorVaultDetailPageData;
}) {
  if (data.state === "live_error") {
    return (
      <section className="space-y-6">
        <ErrorCard
          description="The operator detail route is implemented, but the current vault could not be loaded from the live read path."
          detail={data.errorMessage ?? undefined}
          title="Vault detail is temporarily unavailable"
        />
      </section>
    );
  }

  if (!data.vault) {
    return (
      <section className="space-y-6">
        <Card className="bg-surface/92">
          <CardHeader>
            <CardTitle>Vault not found</CardTitle>
            <CardDescription>
              The requested operator vault could not be found in the current
              dataset.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  const badge = getStatusBadge(data.vault.status);

  return (
    <section className="space-y-6">
      <DetailHeader
        badges={
          <>
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <Badge variant="secondary">{data.vault.nodeCategory}</Badge>
          </>
        }
        description="Review notes, proof posture, and revenue operations stay on one route so the operator does not lose context between submission and post-approval management."
        sourceText={
          data.actionMode === "demo"
            ? "Demo mode keeps deposit and upload surfaces visible."
            : "Live revenue deposits now run through an explicit prepare-and-sign wallet rail."
        }
        title={data.vault.nodeLabel}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          <Card className="bg-surface/92">
            <CardHeader>
              <div className="flex items-center gap-3 text-secondary">
                <ShieldAlert className="size-5" />
                <CardTitle>Review posture</CardTitle>
              </div>
              <CardDescription>
                Admin feedback stays directly above the action area so revision
                work does not drift away from the blocked state.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(data.vault.reviewHistory.length
                ? data.vault.reviewHistory
                : [
                    {
                      createdAt: new Date().toISOString(),
                      decision: "pending" as const,
                      id: "pending",
                      notes: "No review activity has been recorded yet.",
                      reviewerLabel: "System",
                    },
                  ]
              ).map((review) => (
                <div
                  key={review.id}
                  className="rounded-lg border border-border-subtle bg-surface-2/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge
                      variant={
                        review.decision === "needs_info"
                          ? "pending"
                          : "secondary"
                      }
                    >
                      {review.decision.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeLabel(review.createdAt)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground">
                    {review.notes}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-surface/92">
            <CardHeader>
              <div className="flex items-center gap-3 text-secondary">
                <FileStack className="size-5" />
                <CardTitle>Proof documents</CardTitle>
              </div>
              <CardDescription>
                Private proof stays as an indexed checklist with hashes and
                timestamps rather than public file links.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.vault.proofDocuments.map((document) => (
                <div
                  key={document.id}
                  className="rounded-lg border border-border-subtle bg-surface-2/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {document.label}
                      </p>
                      <p className="mt-1 text-xs font-mono text-muted-foreground">
                        {document.sha256}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeLabel(document.uploadedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-surface/92">
            <CardHeader>
              <div className="flex items-center gap-3 text-secondary">
                <CircleDollarSign className="size-5" />
                <CardTitle>Revenue deposit</CardTitle>
              </div>
              <CardDescription>
                Deposit controls keep their own module so revenue operations do
                not collapse into the review lane.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OperatorDepositRail
                actionMode={data.actionMode}
                vault={data.vault}
              />
              {data.vault.recentDeposits.length ? (
                <div className="space-y-3">
                  {data.vault.recentDeposits.map((deposit) => (
                    <div
                      key={deposit.id}
                      className="rounded-lg border border-border-subtle bg-surface-2/70 p-4 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatUsdcAmount(deposit.amountUsdc)}
                        </span>
                        <span className="text-muted-foreground">
                          {formatDateTimeLabel(deposit.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="bg-surface/92">
            <CardHeader>
              <div className="flex items-center gap-3 text-secondary">
                <Gauge className="size-5" />
                <CardTitle>Health posture</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>{data.vault.healthSummary}</p>
              <p className="font-semibold tabular-nums text-foreground">
                Latest indexed score:{" "}
                {data.vault.latestHealthScore
                  ? `${data.vault.latestHealthScore.toFixed(1)}%`
                  : "Pending"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
