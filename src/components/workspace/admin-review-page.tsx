import {
  AlertTriangle,
  FileCheck2,
  ShieldAlert,
  ShieldCheck,
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
import { AdminApprovalRail } from "@/components/workspace/admin-approval-rail";
import { formatDateTimeLabel } from "@/lib/format";
import type {
  AdminReviewDetailPageData,
  AdminReviewQueuePageData,
} from "@/server/vaults/authenticated";

function getStatusBadge(
  status:
    | "draft"
    | "needs_info"
    | "pending_review"
    | "paused"
    | "rejected"
    | "verified",
) {
  if (status === "verified") {
    return { label: "Verified", variant: "verified" as const };
  }

  if (status === "paused" || status === "rejected") {
    return {
      label: status === "paused" ? "Paused" : "Rejected",
      variant: "destructive" as const,
    };
  }

  if (status === "pending_review" || status === "needs_info") {
    return {
      label: status === "pending_review" ? "Pending review" : "Needs info",
      variant: "pending" as const,
    };
  }

  return { label: "Draft", variant: "secondary" as const };
}

function getQueueSourceCopy(state: AdminReviewQueuePageData["state"]) {
  if (state === "seeded_demo") {
    return "Seeded review mirror.";
  }

  if (state === "live_error") {
    return "Live admin read failed.";
  }

  return "Live review mirror.";
}

export function AdminReviewQueuePageView({
  data,
}: {
  data: AdminReviewQueuePageData;
}) {
  if (data.state === "live_error") {
    return (
      <section className="space-y-6">
        <ErrorCard
          description="The admin queue route is implemented, but the live read failed for this request."
          detail={data.errorMessage ?? undefined}
          title="Review queue is temporarily unavailable"
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        description="Queue rows stay semantic and dense so high-risk review decisions remain grounded in stable scan lanes instead of floating cards."
        eyebrow="Admin verification"
        source={getQueueSourceCopy(data.state)}
        title="Triage the review queue before opening a case."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          accent
          label="Pending review"
          value={data.summary.pendingCount.toString()}
        />
        <MetricTile
          label="Needs info"
          value={data.summary.needsInfoCount.toString()}
        />
        <MetricTile
          label="Paused"
          value={data.summary.pausedCount.toString()}
        />
        <MetricTile
          label="Reviewed"
          value={data.summary.reviewedCount.toString()}
        />
      </div>

      <Card className="bg-surface/92">
        <CardHeader>
          <CardTitle>Review queue</CardTitle>
          <CardDescription>
            The default surface uses a semantic table so status, operator, and
            next review target stay in one disciplined lane.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.rows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  <tr className="border-b border-border-subtle">
                    <th className="px-3 py-3 font-semibold">Vault</th>
                    <th className="px-3 py-3 font-semibold">Origin</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Operator</th>
                    <th className="px-3 py-3 font-semibold">Docs</th>
                    <th className="px-3 py-3 font-semibold">Updated</th>
                    <th className="px-3 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => {
                    const badge = getStatusBadge(row.status);

                    return (
                      <tr
                        key={row.id}
                        className="border-b border-border-subtle/60 last:border-0"
                      >
                        <td className="px-3 py-4 align-top">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {row.nodeLabel}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.nodeCategory}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top text-muted-foreground">
                          {row.assetOrigin === "klaster_managed"
                            ? "Klaster-managed"
                            : "Operator-listed"}
                        </td>
                        <td className="px-3 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                            {row.reviewDecision ? (
                              <span className="text-xs text-muted-foreground">
                                Latest decision:{" "}
                                {row.reviewDecision.replace(/_/g, " ")}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top text-muted-foreground">
                          {row.operatorLabel}
                        </td>
                        <td className="px-3 py-4 align-top font-semibold tabular-nums text-foreground">
                          {row.documentCount}
                        </td>
                        <td className="px-3 py-4 align-top text-muted-foreground">
                          {formatDateTimeLabel(row.updatedAt)}
                        </td>
                        <td className="px-3 py-4 align-top">
                          <Button asChild size="sm" variant="secondary">
                            <Link href={`/admin/verifications/${row.slug}`}>
                              Open review
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-6 text-sm leading-6 text-muted-foreground">
              No review cases are currently queued.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export function AdminReviewDetailPageView({
  data,
}: {
  data: AdminReviewDetailPageData;
}) {
  if (data.state === "live_error") {
    return (
      <section className="space-y-6">
        <Card className="bg-surface/92">
          <CardHeader>
            <CardTitle>Review detail is temporarily unavailable</CardTitle>
            <CardDescription>
              The admin detail route is implemented, but the current case could
              not be loaded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.errorMessage ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Read failure: {data.errorMessage}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!data.review) {
    return (
      <section className="space-y-6">
        <Card className="bg-surface/92">
          <CardHeader>
            <CardTitle>Review case not found</CardTitle>
            <CardDescription>
              The requested vault is not present in the current admin queue
              dataset.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  const badge = getStatusBadge(data.review.status);

  return (
    <section className="space-y-6">
      <DetailHeader
        badges={
          <>
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <Badge variant="secondary">{data.review.nodeCategory}</Badge>
          </>
        }
        description="Private proof review, public listing summary, and state transition controls stay visible together in one decision surface."
        sourceText={
          data.actionMode === "demo"
            ? "Demo mode keeps decision controls visible without mutations."
            : "Live review approval now runs through an explicit wallet-signed prepare and finalize path."
        }
        title={data.review.nodeLabel}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          <Card className="bg-surface/92">
            <CardHeader>
              <div className="flex items-center gap-3 text-secondary">
                <FileCheck2 className="size-5" />
                <CardTitle>Private proof review</CardTitle>
              </div>
              <CardDescription>
                Proof documents remain private and are represented here as typed
                checklist items with hashes and timestamps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.review.documents.map((document) => (
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

          <Card className="bg-surface/92">
            <CardHeader>
              <CardTitle>Public listing summary</CardTitle>
              <CardDescription>
                Public-facing facts stay adjacent to the private evidence review
                so approval never loses its publication context.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {data.review.publicSummary.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-border-subtle bg-surface-2/70 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {item.value}
                  </p>
                </div>
              ))}
              <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Proof bundle hash
                </p>
                <p className="mt-2 text-sm font-mono text-foreground">
                  {data.review.proofBundleHash}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface/92">
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
              <CardDescription>
                Reviewer notes and state changes remain visible below the
                evidence and decision surfaces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.review.auditTrail.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border-subtle bg-surface-2/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {item.type}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {item.notes}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeLabel(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-surface/92">
          <CardHeader>
            <div className="flex items-center gap-3 text-secondary">
              <ShieldCheck className="size-5" />
              <CardTitle>Decision rail</CardTitle>
            </div>
            <CardDescription>
              High-risk review actions stay in a dedicated rail instead of
              blending into the evidence columns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-4 text-sm leading-6 text-muted-foreground">
              {data.review.verificationNotes}
            </div>
            <AdminApprovalRail
              actionMode={data.actionMode}
              review={data.review}
            />
            <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-4 text-sm leading-6 text-muted-foreground">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                <p>
                  Pause and resume controls belong in the same decision rail and
                  will follow this same wallet-bound pattern when the pause rail
                  is wired live.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-4 text-sm leading-6 text-muted-foreground">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                <p>
                  Request-more-info and rejection decisions stay visible here,
                  but this checkpoint only turns the approval path into a true
                  live onchain workflow.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
