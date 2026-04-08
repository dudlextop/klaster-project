export type MarketplaceStateFilter = "all" | "live" | "paused" | "sold_out";
export type VaultAvailability = Exclude<MarketplaceStateFilter, "all">;
export type VaultAssetOrigin = "klaster_managed" | "operator_listed";
export type ClusterStatus =
  | "idle"
  | "routing"
  | "renting"
  | "training"
  | "degraded";

export type PublicVaultHealthPoint = {
  clusterStatus: ClusterStatus;
  healthScore: number;
  sampledAt: string;
  source: "mock" | "node_logs";
  uptimePct: number;
  utilizationPct: number;
};

export type YieldSourceSummary = {
  allocationPct: number;
  label: string;
  providerSlug: string;
  status: "active" | "inactive" | "standby";
};

export type TaskStreamEvent = {
  id: string;
  loggedAt: string;
  message: string;
  rewardDeltaUsdc: number | null;
  source: "provider_ingest" | "seeded_demo";
  status: ClusterStatus;
};

export type RoutingSummary = {
  activeProvider: string | null;
  explanation: string;
  mode: "manual_lane" | "smart_auto_routing";
  status: "live_ready" | "paused" | "seeded_demo";
};

export type FeeSummary = {
  grossRevenueUsdc: number;
  investorNetRevenueUsdc: number;
  platformFeeBps: number;
  platformFeesCollectedUsdc: number;
};

export type PurchasePanelConfig =
  | {
      estimatedAvailableShares: number;
      mode: "demo";
      reason: string;
      sharePriceUsdc: number;
    }
  | {
      estimatedAvailableShares: number;
      mode: "live";
      operatorWalletAddress: string;
      operatorSettlementTokenAccount: string;
      programAddress: string;
      shareMint: string;
      sharePriceUsdc: number;
      shareTokenProgram: string;
      usdcMint: string;
      usdcTokenProgram: string;
      vaultAddress: string;
    };

export type PublicVaultListing = {
  availability: VaultAvailability;
  assetOrigin: VaultAssetOrigin;
  campaignRaisedUsdc: number;
  campaignTargetUsdc: number;
  dataSource: "live" | "seeded";
  feeSummary: FeeSummary;
  hardwareSummary: Record<string, unknown>;
  healthSeries: PublicVaultHealthPoint[];
  id: string;
  latestHealth: PublicVaultHealthPoint | null;
  nodeCategory: string;
  nodeLabel: string;
  pricePerShareUsdc: number;
  publicShareSupply: number;
  remainingShares: number;
  routingSummary: RoutingSummary;
  sharesSold: number;
  slug: string;
  status: "paused" | "verified";
  valuationUsdc: number;
  verificationSummary: {
    notes: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
  };
  verifiedAt: string | null;
  yieldSources: YieldSourceSummary[];
};

export type PublicVaultDetail = PublicVaultListing & {
  averageHealthScore: number | null;
  averageUptimePct: number | null;
  description: string;
  healthSummary: string;
  latestDepositAt: string | null;
  lowHealthScore: number | null;
  metadataHash: string | null;
  onchainVaultAddress: string | null;
  ownershipGrid: {
    activeCells: number;
    totalCells: number;
  };
  priceFloorDisclosure: string;
  proofBundleHash: string;
  purchaseConfig: PurchasePanelConfig;
  taskStream: TaskStreamEvent[];
  totalShares: number;
};

export type PublicVaultDataState =
  | "seeded_demo"
  | "live_ready"
  | "live_empty"
  | "live_error";

export type PublicVaultDataResult = {
  errorMessage: string | null;
  source: "live" | "seeded";
  state: PublicVaultDataState;
  vaults: PublicVaultDetail[];
};

export type MarketplacePageData = {
  errorMessage: string | null;
  filters: {
    query: string;
    state: MarketplaceStateFilter;
  };
  listings: PublicVaultListing[];
  source: "live" | "seeded";
  state: PublicVaultDataState;
  summary: {
    averageHealthScore: number | null;
    capitalOpenUsdc: number;
    investorNetRevenueUsdc: number;
    platformFeesCollectedUsdc: number;
    publicRemainingShares: number;
    totalListings: number;
  };
};

export type PublicVaultDetailPageData = PublicVaultDataResult & {
  vault: PublicVaultDetail | null;
};
