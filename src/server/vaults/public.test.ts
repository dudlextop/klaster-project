import { describe, expect, it } from "vitest";
import {
  getAllVaultDetails,
  getPublicVaultDetailPageData,
} from "@/server/vaults/public";

describe("public vault read model state handling", () => {
  it("uses seeded demo data only when the live read runtime is unavailable", async () => {
    const result = await getAllVaultDetails({
      hasSupabaseReadRuntime: false,
    });

    expect(result.source).toBe("seeded");
    expect(result.state).toBe("seeded_demo");
    const demoVault = result.vaults.find(
      (vault) => vault.slug === "demo-vault",
    );

    expect(demoVault).toBeDefined();
    expect(demoVault?.assetOrigin).toBe("klaster_managed");
    expect(demoVault?.routingSummary.mode).toBe("smart_auto_routing");
    expect(demoVault?.taskStream.length).toBeGreaterThan(0);
    expect(demoVault?.feeSummary.platformFeesCollectedUsdc).toBeGreaterThan(0);
  });

  it("falls back to seeded continuity data when the live marketplace is empty", async () => {
    const result = await getAllVaultDetails({
      hasSupabaseReadRuntime: true,
      loadLiveListings: async () => [],
    });

    expect(result.source).toBe("seeded");
    expect(result.state).toBe("seeded_demo");
    expect(result.vaults.some((vault) => vault.slug === "demo-vault")).toBe(
      true,
    );
  });

  it("falls back to seeded demo data when the live read fails", async () => {
    const result = await getAllVaultDetails({
      hasSupabaseReadRuntime: true,
      loadLiveListings: async () => {
        throw new Error("temporary outage");
      },
    });

    expect(result.source).toBe("seeded");
    expect(result.state).toBe("seeded_demo");
    expect(result.errorMessage).toContain("temporary outage");
    expect(result.vaults.some((vault) => vault.slug === "demo-vault")).toBe(
      true,
    );
  });

  it("resolves the seeded canonical vault when the live market is empty", async () => {
    const result = await getPublicVaultDetailPageData("demo-vault", {
      hasSupabaseReadRuntime: true,
      loadLiveListings: async () => [],
    });

    expect(result.state).toBe("seeded_demo");
    expect(result.vault?.slug).toBe("demo-vault");
  });

  it("preserves seeded continuity when a live dataset does not contain the requested slug", async () => {
    const result = await getPublicVaultDetailPageData("demo-vault", {
      hasSupabaseReadRuntime: true,
      loadLiveListings: async () => [
        {
          ...createMockLiveVault("live-vault"),
        },
      ],
    });

    expect(result.source).toBe("live");
    expect(result.state).toBe("live_ready");
    expect(result.vault?.slug).toBe("demo-vault");
  });
});

function createMockLiveVault(slug: string) {
  return {
    ...{
      assetOrigin: "klaster_managed" as const,
      availability: "live" as const,
      averageHealthScore: 91,
      averageUptimePct: 98,
      campaignRaisedUsdc: 120_000,
      campaignTargetUsdc: 240_000,
      dataSource: "live" as const,
      description: "Live vault",
      feeSummary: {
        grossRevenueUsdc: 1000,
        investorNetRevenueUsdc: 900,
        platformFeeBps: 1000,
        platformFeesCollectedUsdc: 100,
      },
      hardwareSummary: {},
      healthSeries: [],
      healthSummary: "Live health summary",
      id: "live-vault-id",
      latestDepositAt: null,
      latestHealth: null,
      lowHealthScore: null,
      metadataHash: null,
      nodeCategory: "Inference cluster",
      nodeLabel: "Live Vault",
      onchainVaultAddress: null,
      ownershipGrid: {
        activeCells: 1,
        totalCells: 20,
      },
      priceFloorDisclosure: "Disclosure",
      pricePerShareUsdc: 10,
      proofBundleHash: "proof",
      publicShareSupply: 100,
      purchaseConfig: {
        estimatedAvailableShares: 50,
        mode: "demo" as const,
        reason: "No runtime",
        sharePriceUsdc: 10,
      },
      remainingShares: 50,
      routingSummary: {
        activeProvider: null,
        explanation: "Live routing summary",
        mode: "smart_auto_routing" as const,
        status: "live_ready" as const,
      },
      sharesSold: 50,
      slug,
      status: "verified" as const,
      taskStream: [],
      totalShares: 200,
      valuationUsdc: 2000,
      verificationSummary: {
        notes: "Reviewed",
        reviewedAt: null,
        reviewedBy: null,
      },
      verifiedAt: null,
      yieldSources: [],
    },
  };
}
