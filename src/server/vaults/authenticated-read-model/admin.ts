import { formatUsdcAmount } from "@/lib/format";
import { createSupabaseServiceRoleClient } from "@/server/supabase/service-role";
import { formatReviewLabel } from "@/server/vaults/authenticated-read-model/shared";
import type {
  AdminQueueRow,
  AdminReviewDetailPageData,
  AdminReviewQueuePageData,
} from "@/server/vaults/authenticated-read-model/types";
import { toNumber } from "@/server/vaults/read-model-helpers";

export async function getLiveAdminQueueData(): Promise<AdminReviewQueuePageData> {
  const client = createSupabaseServiceRoleClient();
  const vaultsResult = await client
    .from("vaults")
    .select(
      "asset_origin, created_at, id, node_category, node_label, operator_profile_id, slug, status, verified_at",
    )
    .in("status", [
      "pending_review",
      "needs_info",
      "paused",
      "rejected",
      "verified",
    ])
    .order("created_at", { ascending: false });

  if (vaultsResult.error) {
    throw new Error(vaultsResult.error.message);
  }

  const vaultRows = vaultsResult.data ?? [];

  if (!vaultRows.length) {
    return {
      errorMessage: null,
      rows: [],
      source: "live",
      state: "live_empty",
      summary: {
        needsInfoCount: 0,
        pendingCount: 0,
        pausedCount: 0,
        reviewedCount: 0,
      },
    };
  }

  const vaultIds = vaultRows.map((vault) => vault.id);
  const operatorIds = [
    ...new Set(vaultRows.map((vault) => vault.operator_profile_id)),
  ];
  const [documentsResult, reviewsResult, profilesResult] = await Promise.all([
    client
      .from("vault_documents")
      .select("id, vault_id")
      .in("vault_id", vaultIds),
    client
      .from("verification_reviews")
      .select("created_at, decision, vault_id")
      .in("vault_id", vaultIds)
      .order("created_at", { ascending: false }),
    client
      .from("profiles")
      .select("display_name, id, wallet_address")
      .in("id", operatorIds),
  ]);

  if (documentsResult.error) {
    throw new Error(documentsResult.error.message);
  }
  if (reviewsResult.error) {
    throw new Error(reviewsResult.error.message);
  }
  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const documentCountByVault = new Map<string, number>();
  for (const row of documentsResult.data ?? []) {
    documentCountByVault.set(
      row.vault_id,
      (documentCountByVault.get(row.vault_id) ?? 0) + 1,
    );
  }

  const latestReviewByVault = new Map<
    string,
    { createdAt: string; decision: string }
  >();
  for (const row of reviewsResult.data ?? []) {
    if (!latestReviewByVault.has(row.vault_id)) {
      latestReviewByVault.set(row.vault_id, {
        createdAt: row.created_at,
        decision: row.decision,
      });
    }
  }

  const operatorById = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id,
      profile.display_name || profile.wallet_address,
    ]),
  );

  const rows = vaultRows.map((vault) => {
    const latestReview = latestReviewByVault.get(vault.id);

    return {
      assetOrigin:
        vault.asset_origin === "klaster_managed"
          ? "klaster_managed"
          : "operator_listed",
      documentCount: documentCountByVault.get(vault.id) ?? 0,
      id: vault.id,
      nodeCategory: vault.node_category,
      nodeLabel: vault.node_label,
      operatorLabel:
        operatorById.get(vault.operator_profile_id) ?? "Unknown operator",
      reviewDecision:
        (latestReview?.decision as
          | "approved"
          | "needs_info"
          | "pending"
          | "rejected"
          | null) ?? null,
      slug: vault.slug,
      status: vault.status as AdminQueueRow["status"],
      submittedAt: vault.created_at,
      updatedAt:
        latestReview?.createdAt ?? vault.verified_at ?? vault.created_at,
    } satisfies AdminQueueRow;
  });

  return {
    errorMessage: null,
    rows,
    source: "live",
    state: "live_ready",
    summary: {
      needsInfoCount: rows.filter((row) => row.status === "needs_info").length,
      pendingCount: rows.filter((row) => row.status === "pending_review")
        .length,
      pausedCount: rows.filter((row) => row.status === "paused").length,
      reviewedCount: rows.filter((row) => row.reviewDecision !== null).length,
    },
  };
}

export async function getLiveAdminReviewDetail(
  idOrSlug: string,
): Promise<AdminReviewDetailPageData> {
  const queue = await getLiveAdminQueueData();

  if (queue.state !== "live_ready") {
    return {
      actionMode: "live",
      errorMessage: queue.errorMessage,
      review: null,
      source: queue.source,
      state: queue.state,
    };
  }

  const row = queue.rows.find(
    (item) => item.id === idOrSlug || item.slug === idOrSlug,
  );

  if (!row) {
    return {
      actionMode: "live",
      errorMessage: null,
      review: null,
      source: "live",
      state: "live_empty",
    };
  }

  const client = createSupabaseServiceRoleClient();
  const [vaultResult, documentsResult, reviewsResult] = await Promise.all([
    client
      .from("vaults")
      .select(
        "asset_origin, campaign_raised_usdc, campaign_target_usdc, platform_fee_bps, proof_bundle_hash, public_share_supply, share_price_usdc, total_shares, valuation_usdc, verification_summary",
      )
      .eq("id", row.id)
      .single(),
    client
      .from("vault_documents")
      .select("created_at, document_type, id, sha256")
      .eq("vault_id", row.id)
      .order("created_at", { ascending: false }),
    client
      .from("verification_reviews")
      .select("created_at, decision, id, notes, reviewer_profile_id")
      .eq("vault_id", row.id)
      .order("created_at", { ascending: false }),
  ]);

  if (vaultResult.error) {
    throw new Error(vaultResult.error.message);
  }
  if (documentsResult.error) {
    throw new Error(documentsResult.error.message);
  }
  if (reviewsResult.error) {
    throw new Error(reviewsResult.error.message);
  }

  const verificationSummary =
    vaultResult.data.verification_summary &&
    typeof vaultResult.data.verification_summary === "object" &&
    !Array.isArray(vaultResult.data.verification_summary)
      ? (vaultResult.data.verification_summary as Record<string, unknown>)
      : {};

  return {
    actionMode: "live",
    errorMessage: null,
    review: {
      auditTrail: (reviewsResult.data ?? []).map((review) => ({
        createdAt: review.created_at,
        id: review.id,
        notes: review.notes,
        type: formatReviewLabel(review.decision) ?? "Review",
        who: review.reviewer_profile_id,
      })),
      documents: (documentsResult.data ?? []).map((document) => ({
        id: document.id,
        kind: document.document_type,
        label: document.document_type.replace(/_/g, " "),
        sha256: document.sha256,
        uploadedAt: document.created_at,
      })),
      id: row.id,
      nodeCategory: row.nodeCategory,
      nodeLabel: row.nodeLabel,
      operatorLabel: row.operatorLabel,
      proofBundleHash: vaultResult.data.proof_bundle_hash,
      publicSummary: [
        {
          label: "Asset origin",
          value:
            vaultResult.data.asset_origin === "klaster_managed"
              ? "Klaster-managed pool"
              : "Operator-listed asset",
        },
        {
          label: "Public share supply",
          value: `${toNumber(vaultResult.data.public_share_supply).toLocaleString()} shares`,
        },
        {
          label: "Share price",
          value: formatUsdcAmount(toNumber(vaultResult.data.share_price_usdc)),
        },
        {
          label: "Total shares",
          value: `${toNumber(vaultResult.data.total_shares).toLocaleString()} shares`,
        },
        {
          label: "Valuation",
          value: formatUsdcAmount(toNumber(vaultResult.data.valuation_usdc)),
        },
        {
          label: "Campaign progress",
          value: `${formatUsdcAmount(toNumber(vaultResult.data.campaign_raised_usdc))} / ${formatUsdcAmount(toNumber(vaultResult.data.campaign_target_usdc))}`,
        },
        {
          label: "Performance fee",
          value: `${(toNumber(vaultResult.data.platform_fee_bps) / 100).toFixed(2)}%`,
        },
      ],
      slug: row.slug,
      status: row.status as
        | "needs_info"
        | "pending_review"
        | "paused"
        | "rejected"
        | "verified",
      verificationNotes:
        typeof verificationSummary.notes === "string"
          ? verificationSummary.notes
          : "Reviewer notes will appear here after the first state transition is recorded.",
    },
    source: "live",
    state: "live_ready",
  };
}
