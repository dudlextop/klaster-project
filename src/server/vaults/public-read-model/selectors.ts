import { getLiveListings } from "@/server/vaults/public-read-model/live";
import { createSeedVaults } from "@/server/vaults/public-read-model/seeded";
import {
  average,
  matchesQuery,
  parseFilterState,
} from "@/server/vaults/public-read-model/shared";
import type {
  MarketplacePageData,
  PublicVaultDataResult,
  PublicVaultDetail,
  PublicVaultDetailPageData,
} from "@/server/vaults/public-read-model/types";
import { getReadModelRuntimeAvailability } from "@/server/vaults/read-model-runtime";

export type GetAllVaultDetailsOptions = {
  hasSupabaseReadRuntime?: boolean;
  loadLiveListings?: () => Promise<PublicVaultDetail[] | null>;
};

function mergeLiveAndSeededVaults(liveVaults: PublicVaultDetail[]) {
  const mergedVaults = [...liveVaults];
  const seenSlugs = new Set(
    liveVaults.map((vault) => vault.slug.toLowerCase()),
  );

  for (const seededVault of createSeedVaults()) {
    if (seenSlugs.has(seededVault.slug.toLowerCase())) {
      continue;
    }

    mergedVaults.push(seededVault);
  }

  return mergedVaults;
}

function getCanonicalVault(vaults: PublicVaultDetail[]) {
  return (
    vaults.find((vault) => vault.availability === "live") ??
    vaults.find((vault) => vault.status === "verified") ??
    vaults[0] ??
    null
  );
}

export async function getAllVaultDetails(
  options: GetAllVaultDetailsOptions = {},
): Promise<PublicVaultDataResult> {
  const hasSupabaseReadRuntime =
    options.hasSupabaseReadRuntime ??
    getReadModelRuntimeAvailability().hasSupabaseReadRuntime;

  if (!hasSupabaseReadRuntime) {
    return {
      errorMessage: null,
      source: "seeded" as const,
      state: "seeded_demo" as const,
      vaults: createSeedVaults(),
    };
  }

  try {
    const liveDetails = await (options.loadLiveListings ?? getLiveListings)();
    const vaults = liveDetails ?? [];

    if (!vaults.length) {
      return {
        errorMessage: null,
        source: "seeded" as const,
        state: "seeded_demo" as const,
        vaults: createSeedVaults(),
      };
    }

    return {
      errorMessage: null,
      source: "live" as const,
      state: "live_ready" as const,
      vaults: mergeLiveAndSeededVaults(vaults),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Live marketplace data could not be loaded.";

    return {
      errorMessage,
      source: "seeded" as const,
      state: "seeded_demo" as const,
      vaults: createSeedVaults(),
    };
  }
}

export async function getMarketplacePageData(input?: {
  query?: string;
  state?: string;
}): Promise<MarketplacePageData> {
  const query = input?.query?.trim() ?? "";
  const state = parseFilterState(input?.state);
  const {
    errorMessage,
    source,
    state: dataState,
    vaults,
  } = await getAllVaultDetails();
  const listings = vaults
    .filter((vault) => matchesQuery(vault, query))
    .filter((vault) => (state === "all" ? true : vault.availability === state))
    .sort((left, right) => {
      const leftPriority =
        left.availability === "live"
          ? 0
          : left.availability === "paused"
            ? 1
            : 2;
      const rightPriority =
        right.availability === "live"
          ? 0
          : right.availability === "paused"
            ? 1
            : 2;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.nodeLabel.localeCompare(right.nodeLabel);
    });

  return {
    errorMessage,
    filters: {
      query,
      state,
    },
    listings,
    source,
    state: dataState,
    summary: {
      averageHealthScore: average(
        listings
          .map((listing) => listing.latestHealth?.healthScore ?? null)
          .filter((value): value is number => value !== null),
      ),
      capitalOpenUsdc: listings.reduce(
        (total, listing) =>
          total + listing.remainingShares * listing.pricePerShareUsdc,
        0,
      ),
      investorNetRevenueUsdc: listings.reduce(
        (total, listing) => total + listing.feeSummary.investorNetRevenueUsdc,
        0,
      ),
      platformFeesCollectedUsdc: listings.reduce(
        (total, listing) =>
          total + listing.feeSummary.platformFeesCollectedUsdc,
        0,
      ),
      publicRemainingShares: listings.reduce(
        (total, listing) => total + listing.remainingShares,
        0,
      ),
      totalListings: listings.length,
    },
  };
}

export async function getPublicVaultDetailPageData(
  slug: string,
  options?: GetAllVaultDetailsOptions,
): Promise<PublicVaultDetailPageData> {
  const normalizedSlug = slug.trim().toLowerCase();
  const dataset = await getAllVaultDetails(options);

  return {
    ...dataset,
    vault:
      dataset.vaults.find(
        (vault) => vault.slug.toLowerCase() === normalizedSlug,
      ) ?? null,
  };
}

export async function getPublicVaultDetail(slug: string) {
  const { vault } = await getPublicVaultDetailPageData(slug);

  return vault;
}

export async function getCanonicalPublicVaultHref(
  options?: GetAllVaultDetailsOptions,
) {
  const dataset = await getAllVaultDetails(options);
  const vault = getCanonicalVault(dataset.vaults);

  return vault ? `/vaults/${vault.slug}` : "/marketplace";
}
