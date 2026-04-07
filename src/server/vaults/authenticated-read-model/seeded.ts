import type {
  AdminQueueRow,
  AdminReviewDetailPageData,
  AdminReviewQueuePageData,
  OperatorDraftPageData,
  OperatorVaultCard,
  OperatorVaultDetailPageData,
  OperatorWorkspacePageData,
  PortfolioActivity,
  PortfolioHolding,
  PortfolioPageData,
} from "@/server/vaults/authenticated-read-model/types";

const seedPortfolioHoldings: PortfolioHolding[] = [
  {
    assetOrigin: "klaster_managed",
    averageEntryUsdc: 98,
    claimActionAvailability: "demo",
    claimDisabledReason:
      "Demo mode keeps the claim rail visible but disabled until live wallet runtime is configured.",
    claimableUsdc: 1420.54,
    grossRevenueUsdc: 206_650,
    id: "seed-demo-vault",
    investedUsdc: 80_360,
    investorNetRevenueUsdc: 186_400,
    lastClaimAt: "2026-04-01T15:45:00.000Z",
    lastDepositAt: "2026-04-04T10:30:00.000Z",
    nodeCategory: "Inference cluster",
    nodeLabel: "H200 Inference Rack / Frankfurt",
    platformFeePaidUsdc: 20_250,
    sharesOwned: 820,
    slug: "demo-vault",
    status: "verified",
    tokenMintAddress: null,
    totalClaimedUsdc: 680.12,
    vaultAddress: null,
  },
  {
    assetOrigin: "operator_listed",
    averageEntryUsdc: 142,
    claimActionAvailability: "demo",
    claimDisabledReason:
      "Demo mode keeps the claim rail visible but disabled until live wallet runtime is configured.",
    claimableUsdc: 0,
    grossRevenueUsdc: 90_700,
    id: "seed-atlas-train-cell",
    investedUsdc: 58_220,
    investorNetRevenueUsdc: 82_300,
    lastClaimAt: null,
    lastDepositAt: "2026-03-25T14:00:00.000Z",
    nodeCategory: "Training pod",
    nodeLabel: "Atlas Train Cell / Warsaw",
    platformFeePaidUsdc: 8_400,
    sharesOwned: 410,
    slug: "atlas-train-cell",
    status: "paused",
    tokenMintAddress: null,
    totalClaimedUsdc: 0,
    vaultAddress: null,
  },
  {
    assetOrigin: "operator_listed",
    averageEntryUsdc: 54,
    claimActionAvailability: "demo",
    claimDisabledReason:
      "Demo mode keeps the claim rail visible but disabled until live wallet runtime is configured.",
    claimableUsdc: 388.2,
    grossRevenueUsdc: 136_420,
    id: "seed-render-lattice",
    investedUsdc: 20_520,
    investorNetRevenueUsdc: 124_050,
    lastClaimAt: "2026-03-29T08:15:00.000Z",
    lastDepositAt: "2026-04-03T08:10:00.000Z",
    nodeCategory: "Render cluster",
    nodeLabel: "Render Lattice / Amsterdam",
    platformFeePaidUsdc: 12_370,
    sharesOwned: 380,
    slug: "render-lattice",
    status: "verified",
    tokenMintAddress: null,
    totalClaimedUsdc: 210.8,
    vaultAddress: null,
  },
];

const seedPortfolioActivities: PortfolioActivity[] = [
  {
    amountUsdc: 186_400,
    id: "activity-deposit-1",
    occurredAt: "2026-04-04T10:30:00.000Z",
    shares: null,
    type: "deposit",
    vaultLabel: "H200 Inference Rack / Frankfurt",
  },
  {
    amountUsdc: 1420.54,
    id: "activity-claim-1",
    occurredAt: "2026-04-01T15:45:00.000Z",
    shares: null,
    type: "claim",
    vaultLabel: "H200 Inference Rack / Frankfurt",
  },
  {
    amountUsdc: 39_200,
    id: "activity-purchase-1",
    occurredAt: "2026-03-28T09:10:00.000Z",
    shares: 400,
    type: "purchase",
    vaultLabel: "H200 Inference Rack / Frankfurt",
  },
  {
    amountUsdc: 20_520,
    id: "activity-purchase-2",
    occurredAt: "2026-03-21T11:05:00.000Z",
    shares: 380,
    type: "purchase",
    vaultLabel: "Render Lattice / Amsterdam",
  },
];

const seedOperatorVaults: OperatorVaultCard[] = [
  {
    assetOrigin: "operator_listed",
    campaignRaisedUsdc: 0,
    campaignTargetUsdc: 696_000,
    documentCount: 0,
    id: "draft-nebula-rack",
    latestDepositAt: null,
    latestReviewNote: null,
    nodeCategory: "Inference cluster",
    nodeLabel: "Nebula Rack / Prague",
    platformFeeBps: 950,
    publicShareSupply: 5_000,
    sharePriceUsdc: 87,
    slug: "draft-nebula-rack",
    status: "draft",
    totalShares: 8_000,
  },
  {
    assetOrigin: "operator_listed",
    campaignRaisedUsdc: 0,
    campaignTargetUsdc: 567_000,
    documentCount: 2,
    id: "needs-info-sigma-cell",
    latestDepositAt: null,
    latestReviewNote:
      "Benchmark evidence needs a clearer sustained-load screenshot before resubmission.",
    nodeCategory: "Training pod",
    nodeLabel: "Sigma Cell / Helsinki",
    platformFeeBps: 925,
    publicShareSupply: 2_800,
    sharePriceUsdc: 126,
    slug: "needs-info-sigma-cell",
    status: "needs_info",
    totalShares: 4_500,
  },
  {
    assetOrigin: "operator_listed",
    campaignRaisedUsdc: 0,
    campaignTargetUsdc: 305_000,
    documentCount: 3,
    id: "pending-orbit-lattice",
    latestDepositAt: null,
    latestReviewNote:
      "Submission snapshot is locked while the review queue is pending.",
    nodeCategory: "Render cluster",
    nodeLabel: "Orbit Lattice / Rotterdam",
    platformFeeBps: 900,
    publicShareSupply: 3_400,
    sharePriceUsdc: 61,
    slug: "pending-orbit-lattice",
    status: "pending_review",
    totalShares: 5_000,
  },
  {
    assetOrigin: "klaster_managed",
    campaignRaisedUsdc: 627_200,
    campaignTargetUsdc: 980_000,
    documentCount: 3,
    id: "verified-demo-vault",
    latestDepositAt: "2026-04-04T10:30:00.000Z",
    latestReviewNote:
      "Verification complete. Public tranche open and revenue deposits visible to investors.",
    nodeCategory: "Inference cluster",
    nodeLabel: "H200 Inference Rack / Frankfurt",
    platformFeeBps: 980,
    publicShareSupply: 6_500,
    sharePriceUsdc: 98,
    slug: "demo-vault",
    status: "verified",
    totalShares: 10_000,
  },
  {
    assetOrigin: "operator_listed",
    campaignRaisedUsdc: 107_920,
    campaignTargetUsdc: 852_000,
    documentCount: 3,
    id: "paused-atlas-train-cell",
    latestDepositAt: "2026-03-25T14:00:00.000Z",
    latestReviewNote:
      "Public participation paused pending health remediation and admin re-clearance.",
    nodeCategory: "Training pod",
    nodeLabel: "Atlas Train Cell / Warsaw",
    platformFeeBps: 925,
    publicShareSupply: 3_200,
    sharePriceUsdc: 142,
    slug: "atlas-train-cell",
    status: "paused",
    totalShares: 6_000,
  },
];

const seedAdminRows: AdminQueueRow[] = [
  {
    assetOrigin: "operator_listed",
    documentCount: 3,
    id: "pending-orbit-lattice",
    nodeCategory: "Render cluster",
    nodeLabel: "Orbit Lattice / Rotterdam",
    operatorLabel: "demo-operator-wallet",
    reviewDecision: "pending",
    slug: "pending-orbit-lattice",
    status: "pending_review",
    submittedAt: "2026-04-05T09:12:00.000Z",
    updatedAt: "2026-04-05T09:12:00.000Z",
  },
  {
    assetOrigin: "operator_listed",
    documentCount: 2,
    id: "needs-info-sigma-cell",
    nodeCategory: "Training pod",
    nodeLabel: "Sigma Cell / Helsinki",
    operatorLabel: "demo-operator-wallet",
    reviewDecision: "needs_info",
    slug: "needs-info-sigma-cell",
    status: "needs_info",
    submittedAt: "2026-04-03T11:05:00.000Z",
    updatedAt: "2026-04-04T14:20:00.000Z",
  },
  {
    assetOrigin: "operator_listed",
    documentCount: 3,
    id: "paused-atlas-train-cell",
    nodeCategory: "Training pod",
    nodeLabel: "Atlas Train Cell / Warsaw",
    operatorLabel: "demo-operator-wallet",
    reviewDecision: "approved",
    slug: "atlas-train-cell",
    status: "paused",
    submittedAt: "2026-03-20T10:30:00.000Z",
    updatedAt: "2026-03-22T09:45:00.000Z",
  },
];

export function getSeededPortfolioData(): PortfolioPageData {
  return {
    activities: seedPortfolioActivities,
    errorMessage: null,
    holdings: seedPortfolioHoldings,
    source: "seeded",
    state: "seeded_demo",
    summary: {
      grossRevenueUsdc: 433_770,
      investorNetRevenueUsdc: 392_750,
      latestClaimAt: "2026-04-01T15:45:00.000Z",
      pausedExposureUsdc: 58_220,
      totalPlatformFeesUsdc: 41_020,
      totalClaimableUsdc: 1_808.74,
      totalInvestedUsdc: 159_100,
      vaultCount: seedPortfolioHoldings.length,
    },
  };
}

export function getSeededOperatorWorkspaceData(): OperatorWorkspacePageData {
  return {
    errorMessage: null,
    lanes: {
      draft: seedOperatorVaults.filter((vault) => vault.status === "draft"),
      needs_info: seedOperatorVaults.filter(
        (vault) => vault.status === "needs_info",
      ),
      paused: seedOperatorVaults.filter((vault) => vault.status === "paused"),
      pending_review: seedOperatorVaults.filter(
        (vault) => vault.status === "pending_review",
      ),
      verified: seedOperatorVaults.filter(
        (vault) => vault.status === "verified",
      ),
    },
    source: "seeded",
    state: "seeded_demo",
    summary: {
      draftCount: 1,
      needsInfoCount: 1,
      pendingReviewCount: 1,
      verifiedCount: 1,
    },
  };
}

export function getSeededOperatorDraftData(): OperatorDraftPageData {
  return {
    defaults: {
      nodeCategory: "Inference cluster",
      nodeLabel: "Nebula Rack / Prague",
      publicShareSupply: 5_000,
      sharePriceUsdc: 87,
      totalShares: 8_000,
      valuationUsdc: 696_000,
    },
    guidance: [
      "Group public asset fields by identity, economics, and sale configuration before exposing proof-upload tasks.",
      "Keep proof documents private and show only checklist completeness until secure uploads are confirmed.",
      "Reserve submit-for-review until all required public fields and proof documents are present.",
    ],
    requiredDocuments: [
      {
        description:
          "Purchase or lease evidence confirming ownership of the compute asset.",
        id: "invoice",
        label: "Invoice or purchase record",
      },
      {
        description:
          "Photo or image evidence that connects the hardware identifier to the public listing.",
        id: "serial_photo",
        label: "Serial image",
      },
      {
        description:
          "Benchmark evidence that reflects sustained load, not a one-line synthetic result.",
        id: "benchmark_evidence",
        label: "Benchmark evidence",
      },
    ],
    source: "seeded",
    state: "seeded_demo",
  };
}

export function getSeededOperatorVaultDetail(
  idOrSlug: string,
): OperatorVaultDetailPageData {
  const vault =
    seedOperatorVaults.find(
      (item) => item.id === idOrSlug || item.slug === idOrSlug,
    ) ?? null;

  if (!vault) {
    return {
      actionMode: "demo",
      errorMessage: null,
      source: "seeded",
      state: "seeded_demo",
      vault: null,
    };
  }

  return {
    actionMode: "demo",
    errorMessage: null,
    source: "seeded",
    state: "seeded_demo",
    vault: {
      ...vault,
      depositActionAvailability: "demo",
      depositDisabledReason:
        "Demo mode keeps the revenue deposit rail visible but disabled until live wallet runtime is configured.",
      healthSummary:
        vault.status === "paused"
          ? "Recent health variance keeps this vault paused until the operator addresses the remediation notes."
          : "The latest indexed health snapshot remains stable enough to support public review and operator follow-up.",
      latestHealthScore: vault.status === "paused" ? 81.4 : 94.7,
      mintedShares:
        vault.status === "verified" || vault.status === "paused" ? 1_820 : 0,
      proofDocuments: [
        {
          id: `${vault.id}-invoice`,
          kind: "invoice",
          label: "Invoice or purchase record",
          sha256:
            "5f1c5b3c846c80d4d0f87f3a1cefd20859e10ea7db52d8046dfd5a7c95d2a871",
          uploadedAt: "2026-04-02T09:20:00.000Z",
        },
        {
          id: `${vault.id}-serial-photo`,
          kind: "serial_photo",
          label: "Serial image",
          sha256:
            "0edba9c6f73598a9af6ea6bd78fa76731944b7e2d2f33917874640b124ab0d67",
          uploadedAt: "2026-04-02T09:36:00.000Z",
        },
        {
          id: `${vault.id}-benchmark`,
          kind: "benchmark_evidence",
          label: "Benchmark evidence",
          sha256:
            "61d53d632c8aa208a17d042379e3ddf7d77a76bbf7fd72ef3e521f3180dd0c4f",
          uploadedAt: "2026-04-02T09:55:00.000Z",
        },
      ],
      recentDeposits:
        vault.status === "verified" || vault.status === "paused"
          ? [
              {
                amountUsdc: 62_400,
                createdAt: "2026-04-04T10:30:00.000Z",
                id: `${vault.id}-deposit-1`,
              },
              {
                amountUsdc: 38_000,
                createdAt: "2026-03-20T08:00:00.000Z",
                id: `${vault.id}-deposit-2`,
              },
            ]
          : [],
      reviewHistory: [
        {
          createdAt: "2026-04-04T14:20:00.000Z",
          decision: vault.status === "needs_info" ? "needs_info" : "pending",
          id: `${vault.id}-review-current`,
          notes:
            vault.latestReviewNote ??
            "Submission is waiting for reviewer action in the queue.",
          reviewerLabel: "klasterai-admin-1",
        },
      ],
      tokenMintAddress: null,
      vaultAddress: null,
    },
  };
}

export function getSeededAdminQueueData(): AdminReviewQueuePageData {
  return {
    errorMessage: null,
    rows: seedAdminRows,
    source: "seeded",
    state: "seeded_demo",
    summary: {
      needsInfoCount: 1,
      pendingCount: 1,
      pausedCount: 1,
      reviewedCount: 2,
    },
  };
}

export function getSeededAdminReviewDetail(
  idOrSlug: string,
): AdminReviewDetailPageData {
  const row =
    seedAdminRows.find(
      (item) => item.id === idOrSlug || item.slug === idOrSlug,
    ) ?? null;

  if (!row) {
    return {
      actionMode: "demo",
      errorMessage: null,
      review: null,
      source: "seeded",
      state: "seeded_demo",
    };
  }

  return {
    actionMode: "demo",
    errorMessage: null,
    review: {
      auditTrail: [
        {
          createdAt: row.submittedAt,
          id: `${row.id}-submitted`,
          notes: "Vault submission snapshot created and locked for review.",
          type: "submitted",
          who: row.operatorLabel,
        },
        {
          createdAt: row.updatedAt,
          id: `${row.id}-review`,
          notes:
            row.reviewDecision === "needs_info"
              ? "Reviewer requested clearer benchmark evidence before approval."
              : row.status === "paused"
                ? "Reviewer paused the vault after verification due to health variance."
                : "Reviewer is actively triaging the case.",
          type:
            row.reviewDecision === "needs_info"
              ? "needs_info"
              : row.status === "paused"
                ? "paused"
                : "pending",
          who: "klasterai-admin-1",
        },
      ],
      documents: [
        {
          id: `${row.id}-invoice`,
          kind: "invoice",
          label: "Invoice or purchase record",
          sha256:
            "7d03d2ea9c378988317cfdf2bd395e836b77f5af6f28672dfe715d5c7e5d7dfb",
          uploadedAt: row.submittedAt,
        },
        {
          id: `${row.id}-serial`,
          kind: "serial_photo",
          label: "Serial image",
          sha256:
            "f31b4d53b31ae2fcb6112364d16a6be4906b02eb9d3ec0dc01f8d531cb8bb2fc",
          uploadedAt: row.submittedAt,
        },
        {
          id: `${row.id}-benchmark`,
          kind: "benchmark_evidence",
          label: "Benchmark evidence",
          sha256:
            "851b53b45383af810725d31a0710acddaf4809d39f975d8f75a33562a448726d",
          uploadedAt: row.submittedAt,
        },
      ],
      id: row.id,
      nodeCategory: row.nodeCategory,
      nodeLabel: row.nodeLabel,
      operatorLabel: row.operatorLabel,
      proofBundleHash: "proof-demo-review-bundle-8d4c20",
      publicSummary: [
        { label: "Public share supply", value: "3,400 shares" },
        { label: "Share price", value: "◎61.00" },
        { label: "Sale posture", value: "Direct buyer minting after approval" },
        {
          label: "Visibility",
          value: "Private proof docs, public summary only",
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
        row.reviewDecision === "needs_info"
          ? "Benchmark evidence needs a clearer sustained-load capture before the reviewer can approve the public listing."
          : row.status === "paused"
            ? "Vault remains visible but non-purchasable while remediation is in progress."
            : "Review queue is waiting on the admin decision path.",
    },
    source: "seeded",
    state: "seeded_demo",
  };
}
