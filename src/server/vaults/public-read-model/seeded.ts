import { SHARED_DISCLOSURE } from "@/server/vaults/public-read-model/shared";
import type {
  ClusterStatus,
  PublicVaultDetail,
  PublicVaultHealthPoint,
  TaskStreamEvent,
  YieldSourceSummary,
} from "@/server/vaults/public-read-model/types";

function makeHealthSeries(
  scores: number[],
  options: {
    baseDate: string;
    statuses: ClusterStatus[];
    source: "mock" | "node_logs";
    uptimeBase: number;
    utilizationBase: number;
  },
) {
  return scores.map((healthScore, index) => {
    const sampledAt = new Date(
      Date.parse(options.baseDate) + index * 24 * 60 * 60 * 1000,
    ).toISOString();

    return {
      clusterStatus:
        options.statuses[index] ?? options.statuses.at(-1) ?? "idle",
      healthScore,
      sampledAt,
      source: options.source,
      uptimePct: Number((options.uptimeBase + index * 0.18).toFixed(2)),
      utilizationPct: Number(
        (options.utilizationBase + ((index % 4) - 1.5) * 1.9).toFixed(2),
      ),
    } satisfies PublicVaultHealthPoint;
  });
}

function createYieldSources(
  sources: Array<{
    allocationPct: number;
    label: string;
    providerSlug: string;
    status: "active" | "inactive" | "standby";
  }>,
) {
  return sources satisfies YieldSourceSummary[];
}

function createTaskStream(
  vaultId: string,
  baseDate: string,
  events: Array<{
    message: string;
    minutesAfterStart: number;
    rewardDeltaUsdc: number | null;
    status: ClusterStatus;
  }>,
) {
  return events.map((event, index) => ({
    id: `${vaultId}-task-${index + 1}`,
    loggedAt: new Date(
      Date.parse(baseDate) + event.minutesAfterStart * 60 * 1000,
    ).toISOString(),
    message: event.message,
    rewardDeltaUsdc: event.rewardDeltaUsdc,
    source: "seeded_demo" as const,
    status: event.status,
  })) satisfies TaskStreamEvent[];
}

export function createSeedVaults(): PublicVaultDetail[] {
  const demoHealth = makeHealthSeries(
    [90.8, 91.4, 92.2, 93.1, 92.6, 93.8, 94.1, 94.4, 94.7, 95.2],
    {
      baseDate: "2026-03-28T00:00:00.000Z",
      source: "mock",
      statuses: [
        "routing",
        "renting",
        "training",
        "training",
        "routing",
        "renting",
        "training",
        "training",
        "routing",
        "renting",
      ],
      uptimeBase: 97.6,
      utilizationBase: 71.2,
    },
  );
  const pausedHealth = makeHealthSeries(
    [88.6, 87.9, 88.1, 86.7, 85.9, 84.4, 83.7, 82.9, 82.1, 81.4],
    {
      baseDate: "2026-03-28T00:00:00.000Z",
      source: "mock",
      statuses: [
        "renting",
        "training",
        "routing",
        "routing",
        "degraded",
        "degraded",
        "degraded",
        "idle",
        "idle",
        "degraded",
      ],
      uptimeBase: 95.2,
      utilizationBase: 68.4,
    },
  );
  const soldOutHealth = makeHealthSeries(
    [93.9, 94.0, 94.3, 94.2, 94.6, 94.8, 95.0, 94.9, 95.1, 95.4],
    {
      baseDate: "2026-03-28T00:00:00.000Z",
      source: "mock",
      statuses: [
        "renting",
        "renting",
        "training",
        "training",
        "routing",
        "renting",
        "training",
        "routing",
        "renting",
        "training",
      ],
      uptimeBase: 98.4,
      utilizationBase: 76.1,
    },
  );
  const demoYieldSources = createYieldSources([
    {
      allocationPct: 54,
      label: "io.net prompt execution",
      providerSlug: "io.net",
      status: "active",
    },
    {
      allocationPct: 28,
      label: "Akash burst workloads",
      providerSlug: "akash",
      status: "standby",
    },
    {
      allocationPct: 18,
      label: "Gensyn training queue",
      providerSlug: "gensyn",
      status: "standby",
    },
  ]);
  const pausedYieldSources = createYieldSources([
    {
      allocationPct: 100,
      label: "Routing paused for remediation",
      providerSlug: "klaster",
      status: "inactive",
    },
  ]);
  const soldOutYieldSources = createYieldSources([
    {
      allocationPct: 65,
      label: "Akash render jobs",
      providerSlug: "akash",
      status: "active",
    },
    {
      allocationPct: 35,
      label: "io.net overflow lane",
      providerSlug: "io.net",
      status: "active",
    },
  ]);
  const demoTaskStream = createTaskStream(
    "seed-demo-vault",
    "2026-04-05T18:00:00.000Z",
    [
      {
        message: "Routing inference jobs to io.net price band A.",
        minutesAfterStart: 0,
        rewardDeltaUsdc: null,
        status: "routing",
      },
      {
        message: "Processing LLM prompt batch on Frankfurt H200 cluster.",
        minutesAfterStart: 2,
        rewardDeltaUsdc: null,
        status: "training",
      },
      {
        message:
          "Reward generated and reconciled into seeded net-yield mirror.",
        minutesAfterStart: 5,
        rewardDeltaUsdc: 12.48,
        status: "renting",
      },
    ],
  );
  const pausedTaskStream = createTaskStream(
    "seed-atlas-train-cell",
    "2026-04-05T14:00:00.000Z",
    [
      {
        message:
          "Health variance triggered routing safeguard and paused new workload assignment.",
        minutesAfterStart: 0,
        rewardDeltaUsdc: null,
        status: "degraded",
      },
      {
        message:
          "Operator remediation window is active while the pool remains visible to investors.",
        minutesAfterStart: 4,
        rewardDeltaUsdc: null,
        status: "idle",
      },
    ],
  );
  const soldOutTaskStream = createTaskStream(
    "seed-render-lattice",
    "2026-04-05T09:00:00.000Z",
    [
      {
        message: "Render queue assigned to active Akash batch lane.",
        minutesAfterStart: 0,
        rewardDeltaUsdc: null,
        status: "routing",
      },
      {
        message:
          "Frame pack completed and settlement mirrored into the pool ledger.",
        minutesAfterStart: 3,
        rewardDeltaUsdc: 6.2,
        status: "renting",
      },
    ],
  );

  return [
    {
      assetOrigin: "klaster_managed",
      availability: "live",
      averageHealthScore: 93.23,
      averageUptimePct: 98.41,
      campaignRaisedUsdc: 627_200,
      campaignTargetUsdc: 980_000,
      dataSource: "seeded",
      description:
        "Eight H200 GPUs packaged as a KlasterAI-managed inference pool with seeded smart-routing posture, ownership visualization, and fee-aware revenue accounting.",
      feeSummary: {
        grossRevenueUsdc: 206_650,
        investorNetRevenueUsdc: 186_400,
        platformFeeBps: 980,
        platformFeesCollectedUsdc: 20_250,
      },
      hardwareSummary: {
        GPUs: "8x NVIDIA H200",
        Power: "6.4 kW sustained draw",
        Region: "Frankfurt, DE",
        Runtime: "Kubernetes + Slurm",
      },
      healthSeries: demoHealth,
      healthSummary:
        "Health has climbed steadily over the latest ten samples while uptime remained above 97.6%.",
      id: "seed-demo-vault",
      latestDepositAt: "2026-04-04T10:30:00.000Z",
      latestHealth: demoHealth.at(-1) ?? null,
      lowHealthScore: 90.8,
      metadataHash: "bafybeifmqt6vjv1ns2n16demoassethash",
      nodeCategory: "Inference cluster",
      nodeLabel: "H200 Inference Rack / Frankfurt",
      onchainVaultAddress: null,
      ownershipGrid: {
        activeCells: 13,
        totalCells: 20,
      },
      priceFloorDisclosure: SHARED_DISCLOSURE,
      pricePerShareUsdc: 98,
      proofBundleHash: "proof-demo-h200-asset-bundle-7d2a14",
      publicShareSupply: 6_500,
      purchaseConfig: {
        estimatedAvailableShares: 3_700,
        mode: "demo",
        reason:
          "This surface is currently rendering seeded MVP data because live Solana and Supabase runtime variables are not available in the active shell.",
        sharePriceUsdc: 98,
      },
      remainingShares: 3_700,
      routingSummary: {
        activeProvider: "io.net",
        explanation:
          "Seeded smart auto-routing illustrates how KlasterAI moves workloads toward the highest-paying lane without claiming live provider connectivity in this checkpoint.",
        mode: "smart_auto_routing",
        status: "seeded_demo",
      },
      sharesSold: 2_800,
      slug: "demo-vault",
      status: "verified",
      taskStream: demoTaskStream,
      totalShares: 10_000,
      valuationUsdc: 980_000,
      verificationSummary: {
        notes:
          "Invoice, serial image, and benchmark package reviewed. Public metadata hash published after approval.",
        reviewedAt: "2026-03-30T12:20:00.000Z",
        reviewedBy: "klasterai-admin-1",
      },
      verifiedAt: "2026-03-30T12:20:00.000Z",
      yieldSources: demoYieldSources,
    },
    {
      assetOrigin: "operator_listed",
      availability: "paused",
      averageHealthScore: 85.17,
      averageUptimePct: 96.01,
      campaignRaisedUsdc: 107_920,
      campaignTargetUsdc: 852_000,
      dataSource: "seeded",
      description:
        "A training-oriented H100 pod with verification complete, but public participation paused while the operator resolves health variance.",
      feeSummary: {
        grossRevenueUsdc: 90_700,
        investorNetRevenueUsdc: 82_300,
        platformFeeBps: 925,
        platformFeesCollectedUsdc: 8_400,
      },
      hardwareSummary: {
        Cooling: "Liquid loop revision pending",
        GPUs: "4x NVIDIA H100 SXM",
        Region: "Warsaw, PL",
        Runtime: "Bare metal + Nomad",
      },
      healthSeries: pausedHealth,
      healthSummary:
        "Recent health slipped into the low eighties, so the vault remains visible but not purchasable until review clears it.",
      id: "seed-atlas-train-cell",
      latestDepositAt: "2026-03-25T14:00:00.000Z",
      latestHealth: pausedHealth.at(-1) ?? null,
      lowHealthScore: 81.4,
      metadataHash: "bafybeibngf3atlaspausedhash",
      nodeCategory: "Training pod",
      nodeLabel: "Atlas Train Cell / Warsaw",
      onchainVaultAddress: null,
      ownershipGrid: {
        activeCells: 6,
        totalCells: 20,
      },
      priceFloorDisclosure: SHARED_DISCLOSURE,
      pricePerShareUsdc: 142,
      proofBundleHash: "proof-atlas-h100-bundle-83ca25",
      publicShareSupply: 3_200,
      purchaseConfig: {
        estimatedAvailableShares: 2_440,
        mode: "demo",
        reason:
          "Paused vaults remain publicly visible but the purchase rail must stay disabled until verified status is restored.",
        sharePriceUsdc: 142,
      },
      remainingShares: 2_440,
      routingSummary: {
        activeProvider: null,
        explanation:
          "Smart routing is paused because the latest seeded health posture fell below the current public threshold.",
        mode: "smart_auto_routing",
        status: "paused",
      },
      sharesSold: 760,
      slug: "atlas-train-cell",
      status: "paused",
      taskStream: pausedTaskStream,
      totalShares: 6_000,
      valuationUsdc: 852_000,
      verificationSummary: {
        notes:
          "Vault was previously approved. Public participation is paused pending remediation of health variance.",
        reviewedAt: "2026-03-22T09:45:00.000Z",
        reviewedBy: "klasterai-admin-2",
      },
      verifiedAt: "2026-03-22T09:45:00.000Z",
      yieldSources: pausedYieldSources,
    },
    {
      assetOrigin: "operator_listed",
      availability: "sold_out",
      averageHealthScore: 94.62,
      averageUptimePct: 99.21,
      campaignRaisedUsdc: 216_000,
      campaignTargetUsdc: 259_200,
      dataSource: "seeded",
      description:
        "A compact rendering node with stable high-nineties uptime and no remaining public tranche capacity.",
      feeSummary: {
        grossRevenueUsdc: 136_420,
        investorNetRevenueUsdc: 124_050,
        platformFeeBps: 907,
        platformFeesCollectedUsdc: 12_370,
      },
      hardwareSummary: {
        GPUs: "6x RTX 6000 Ada",
        Network: "2x 100 GbE uplink",
        Region: "Amsterdam, NL",
        Runtime: "Containerized render queue",
      },
      healthSeries: soldOutHealth,
      healthSummary:
        "Operational health remains stable, but the full public tranche has already minted to buyers.",
      id: "seed-render-lattice",
      latestDepositAt: "2026-04-03T08:10:00.000Z",
      latestHealth: soldOutHealth.at(-1) ?? null,
      lowHealthScore: 93.9,
      metadataHash: "bafybeidc2rendersoldouthash",
      nodeCategory: "Render cluster",
      nodeLabel: "Render Lattice / Amsterdam",
      onchainVaultAddress: null,
      ownershipGrid: {
        activeCells: 20,
        totalCells: 20,
      },
      priceFloorDisclosure: SHARED_DISCLOSURE,
      pricePerShareUsdc: 54,
      proofBundleHash: "proof-render-ada-bundle-11fe91",
      publicShareSupply: 4_000,
      purchaseConfig: {
        estimatedAvailableShares: 0,
        mode: "demo",
        reason:
          "The public tranche is fully sold. The panel should explain the state rather than disappear.",
        sharePriceUsdc: 54,
      },
      remainingShares: 0,
      routingSummary: {
        activeProvider: "akash",
        explanation:
          "Seeded routing favors Akash render capacity while keeping io.net as overflow demand. The vault is sold out, so the routing narrative remains informational only.",
        mode: "smart_auto_routing",
        status: "seeded_demo",
      },
      sharesSold: 4_000,
      slug: "render-lattice",
      status: "verified",
      taskStream: soldOutTaskStream,
      totalShares: 4_800,
      valuationUsdc: 259_200,
      verificationSummary: {
        notes:
          "Verification complete. Public tranche sold out through direct buyer minting.",
        reviewedAt: "2026-03-18T16:15:00.000Z",
        reviewedBy: "klasterai-admin-1",
      },
      verifiedAt: "2026-03-18T16:15:00.000Z",
      yieldSources: soldOutYieldSources,
    },
  ];
}
