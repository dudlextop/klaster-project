import type { AppSession } from "@/server/auth/session";
import {
  getLiveAdminQueueData,
  getLiveAdminReviewDetail,
} from "@/server/vaults/authenticated-read-model/admin";
import {
  getLiveOperatorVaultDetail,
  getLiveOperatorWorkspaceData,
} from "@/server/vaults/authenticated-read-model/operator";
import { getLivePortfolioPageData } from "@/server/vaults/authenticated-read-model/portfolio";
import {
  getSeededAdminQueueData,
  getSeededAdminReviewDetail,
  getSeededOperatorDraftData,
  getSeededOperatorVaultDetail,
  getSeededOperatorWorkspaceData,
  getSeededPortfolioData,
} from "@/server/vaults/authenticated-read-model/seeded";
import { isDemoSession } from "@/server/vaults/authenticated-read-model/shared";
import type {
  AdminReviewDetailPageData,
  AdminReviewQueuePageData,
  OperatorDraftPageData,
  OperatorVaultDetailPageData,
  OperatorWorkspacePageData,
  PortfolioPageData,
} from "@/server/vaults/authenticated-read-model/types";
import { getReadModelRuntimeAvailability } from "@/server/vaults/read-model-runtime";

export async function getPortfolioPageData(
  session: AppSession | null | undefined,
): Promise<PortfolioPageData> {
  if (
    !session ||
    !getReadModelRuntimeAvailability().hasSupabaseReadRuntime ||
    isDemoSession(session)
  ) {
    return getSeededPortfolioData();
  }

  try {
    const liveData = await getLivePortfolioPageData(session);

    return liveData.state === "live_empty"
      ? getSeededPortfolioData()
      : liveData;
  } catch (error) {
    return {
      activities: [],
      errorMessage:
        error instanceof Error
          ? error.message
          : "Portfolio data could not be loaded.",
      holdings: [],
      source: "live",
      state: "live_error",
      summary: {
        grossRevenueUsdc: 0,
        investorNetRevenueUsdc: 0,
        latestClaimAt: null,
        pausedExposureUsdc: 0,
        totalPlatformFeesUsdc: 0,
        totalClaimableUsdc: 0,
        totalInvestedUsdc: 0,
        vaultCount: 0,
      },
    };
  }
}

export async function getOperatorWorkspacePageData(
  session: AppSession | null | undefined,
): Promise<OperatorWorkspacePageData> {
  if (
    !session ||
    !getReadModelRuntimeAvailability().hasSupabaseReadRuntime ||
    isDemoSession(session)
  ) {
    return getSeededOperatorWorkspaceData();
  }

  try {
    const liveData = await getLiveOperatorWorkspaceData(session);

    return liveData.state === "live_empty"
      ? getSeededOperatorWorkspaceData()
      : liveData;
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Operations data could not be loaded.",
      lanes: {
        draft: [],
        needs_info: [],
        paused: [],
        pending_review: [],
        verified: [],
      },
      source: "live",
      state: "live_error",
      summary: {
        draftCount: 0,
        needsInfoCount: 0,
        pendingReviewCount: 0,
        verifiedCount: 0,
      },
    };
  }
}

export async function getOperatorDraftPageData(
  session: AppSession | null | undefined,
): Promise<OperatorDraftPageData> {
  if (
    !session ||
    !getReadModelRuntimeAvailability().hasSupabaseReadRuntime ||
    isDemoSession(session)
  ) {
    return getSeededOperatorDraftData();
  }

  return {
    ...getSeededOperatorDraftData(),
    source: "live",
    state: "live_ready",
  };
}

export async function getOperatorVaultDetailPageData(
  session: AppSession | null | undefined,
  idOrSlug: string,
): Promise<OperatorVaultDetailPageData> {
  if (
    !session ||
    !getReadModelRuntimeAvailability().hasSupabaseReadRuntime ||
    isDemoSession(session)
  ) {
    return getSeededOperatorVaultDetail(idOrSlug);
  }

  try {
    const liveData = await getLiveOperatorVaultDetail(session, idOrSlug);

    return liveData.state === "live_empty" && !liveData.vault
      ? getSeededOperatorVaultDetail(idOrSlug)
      : liveData;
  } catch (error) {
    return {
      actionMode: "live",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Operator vault detail could not be loaded.",
      source: "live",
      state: "live_error",
      vault: null,
    };
  }
}

export async function getAdminReviewQueuePageData(
  session?: AppSession | null,
): Promise<AdminReviewQueuePageData> {
  if (
    !session ||
    !getReadModelRuntimeAvailability().hasSupabaseReadRuntime ||
    isDemoSession(session)
  ) {
    return getSeededAdminQueueData();
  }

  try {
    const liveData = await getLiveAdminQueueData();

    return liveData.state === "live_empty"
      ? getSeededAdminQueueData()
      : liveData;
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Admin queue could not be loaded.",
      rows: [],
      source: "live",
      state: "live_error",
      summary: {
        needsInfoCount: 0,
        pendingCount: 0,
        pausedCount: 0,
        reviewedCount: 0,
      },
    };
  }
}

export async function getAdminReviewDetailPageData(
  idOrSlug: string,
  session?: AppSession | null,
): Promise<AdminReviewDetailPageData> {
  if (
    !session ||
    !getReadModelRuntimeAvailability().hasSupabaseReadRuntime ||
    isDemoSession(session)
  ) {
    return getSeededAdminReviewDetail(idOrSlug);
  }

  try {
    const liveData = await getLiveAdminReviewDetail(idOrSlug);

    return liveData.state === "live_empty" && !liveData.review
      ? getSeededAdminReviewDetail(idOrSlug)
      : liveData;
  } catch (error) {
    return {
      actionMode: "live",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Admin review detail could not be loaded.",
      review: null,
      source: "live",
      state: "live_error",
    };
  }
}
