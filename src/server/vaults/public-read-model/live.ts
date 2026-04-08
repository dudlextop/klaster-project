import {
  createDefaultClient,
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana/client";
import type { Address } from "@solana/kit";
import { fetchVault } from "@/programs/klaster-vault/generated/accounts/vault";
import { createSupabaseServiceRoleClient } from "@/server/supabase/service-role";
import {
  average,
  getAvailability,
  parseClusterStatus,
  readObjectArray,
  readStringRecord,
  SHARED_DISCLOSURE,
  toNumber,
} from "@/server/vaults/public-read-model/shared";
import type {
  PublicVaultDetail,
  PublicVaultHealthPoint,
  TaskStreamEvent,
  YieldSourceSummary,
} from "@/server/vaults/public-read-model/types";
import { getReadModelRuntimeAvailability } from "@/server/vaults/read-model-runtime";

async function readOnchainPurchaseConfig(onchainVaultAddress: string | null) {
  const { hasProgramRuntime, publicEnv } = getReadModelRuntimeAvailability();

  if (!hasProgramRuntime || !onchainVaultAddress) {
    return null;
  }

  try {
    const client = createDefaultClient({
      cluster: publicEnv.solanaCluster,
      rpc: publicEnv.heliusRpcUrl as `http${string}`,
    });
    const onchainVault = await fetchVault(
      client.runtime.rpc,
      onchainVaultAddress as Address<string>,
    );

    return {
      operatorWalletAddress: onchainVault.data.operator,
      operatorSettlementTokenAccount:
        onchainVault.data.operatorSettlementTokenAccount,
      programAddress: publicEnv.programId,
      remainingPublicShares: Number(onchainVault.data.remainingPublicShares),
      shareMint: onchainVault.data.shareMint,
      shareTokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
      usdcMint: onchainVault.data.usdcMint,
      usdcTokenProgram: TOKEN_PROGRAM_ADDRESS,
      vaultAddress: onchainVault.address,
    };
  } catch {
    return null;
  }
}

export async function getLiveListings() {
  const { hasSupabaseReadRuntime } = getReadModelRuntimeAvailability();

  if (!hasSupabaseReadRuntime) {
    return null;
  }

  const client = createSupabaseServiceRoleClient();
  const vaultsResult = await client
    .from("vaults")
    .select(
      "asset_origin, campaign_raised_usdc, campaign_target_usdc, hardware_summary, id, node_category, node_label, onchain_vault_address, platform_fee_bps, proof_bundle_hash, public_metadata_hash, public_share_supply, routing_summary, share_price_usdc, slug, status, total_shares, valuation_usdc, verification_summary, verified_at, yield_source_summary",
    )
    .in("status", ["verified", "paused"])
    .order("verified_at", { ascending: false });

  if (vaultsResult.error) {
    throw new Error(vaultsResult.error.message);
  }

  const vaultRows = vaultsResult.data ?? [];

  if (!vaultRows.length) {
    return [];
  }

  const vaultIds = vaultRows.map((vault) => vault.id);
  const [healthResult, purchasesResult, depositsResult, taskStreamResult] =
    await Promise.all([
      client
        .from("health_snapshots")
        .select(
          "cluster_status, health_score, sampled_at, source, uptime_pct, utilization_pct, vault_id",
        )
        .in("vault_id", vaultIds)
        .order("sampled_at", { ascending: true }),
      client
        .from("purchases")
        .select("shares, vault_id")
        .in("vault_id", vaultIds),
      client
        .from("revenue_deposits")
        .select(
          "created_at, gross_amount_usdc, net_amount_usdc, platform_fee_amount_usdc, vault_id",
        )
        .in("vault_id", vaultIds)
        .order("created_at", { ascending: false }),
      client
        .from("vault_task_stream_events")
        .select(
          "id, logged_at, message, reward_delta_usdc, source, status, vault_id",
        )
        .in("vault_id", vaultIds)
        .order("logged_at", { ascending: false }),
    ]);

  if (healthResult.error) {
    throw new Error(healthResult.error.message);
  }

  if (purchasesResult.error) {
    throw new Error(purchasesResult.error.message);
  }

  if (depositsResult.error) {
    throw new Error(depositsResult.error.message);
  }

  if (taskStreamResult.error) {
    throw new Error(taskStreamResult.error.message);
  }

  const healthByVault = new Map<string, PublicVaultHealthPoint[]>();
  for (const row of healthResult.data ?? []) {
    const current = healthByVault.get(row.vault_id) ?? [];

    current.push({
      clusterStatus: parseClusterStatus(row.cluster_status),
      healthScore: toNumber(row.health_score),
      sampledAt: row.sampled_at,
      source: row.source === "node_logs" ? "node_logs" : "mock",
      uptimePct: toNumber(row.uptime_pct),
      utilizationPct: toNumber(row.utilization_pct),
    });
    healthByVault.set(row.vault_id, current.slice(-30));
  }

  const purchasedSharesByVault = new Map<string, number>();
  for (const row of purchasesResult.data ?? []) {
    purchasedSharesByVault.set(
      row.vault_id,
      (purchasedSharesByVault.get(row.vault_id) ?? 0) + toNumber(row.shares),
    );
  }

  const depositsByVault = new Map<
    string,
    {
      grossUsdc: number;
      latestAt: string | null;
      netUsdc: number;
      platformFeeUsdc: number;
    }
  >();
  for (const row of depositsResult.data ?? []) {
    const current = depositsByVault.get(row.vault_id) ?? {
      grossUsdc: 0,
      latestAt: null,
      netUsdc: 0,
      platformFeeUsdc: 0,
    };

    depositsByVault.set(row.vault_id, {
      grossUsdc: current.grossUsdc + toNumber(row.gross_amount_usdc),
      latestAt: current.latestAt ?? row.created_at,
      netUsdc: current.netUsdc + toNumber(row.net_amount_usdc),
      platformFeeUsdc:
        current.platformFeeUsdc + toNumber(row.platform_fee_amount_usdc),
    });
  }

  const taskStreamByVault = new Map<string, TaskStreamEvent[]>();
  for (const row of taskStreamResult.data ?? []) {
    const current = taskStreamByVault.get(row.vault_id) ?? [];

    current.push({
      id: row.id,
      loggedAt: row.logged_at,
      message: row.message,
      rewardDeltaUsdc:
        row.reward_delta_usdc === null ? null : toNumber(row.reward_delta_usdc),
      source:
        row.source === "provider_ingest" ? "provider_ingest" : "seeded_demo",
      status: parseClusterStatus(row.status),
    });
    taskStreamByVault.set(row.vault_id, current.slice(0, 12));
  }

  return await Promise.all(
    vaultRows.map(async (vaultRow) => {
      const healthSeries = healthByVault.get(vaultRow.id) ?? [];
      const sharesSold = purchasedSharesByVault.get(vaultRow.id) ?? 0;
      const deposits = depositsByVault.get(vaultRow.id) ?? {
        grossUsdc: 0,
        latestAt: null,
        netUsdc: 0,
        platformFeeUsdc: 0,
      };
      const taskStream = taskStreamByVault.get(vaultRow.id) ?? [];
      const latestHealth = healthSeries.at(-1) ?? null;
      const estimatedRemainingShares = Math.max(
        toNumber(vaultRow.public_share_supply) - sharesSold,
        0,
      );
      const onchainConfig = await readOnchainPurchaseConfig(
        vaultRow.onchain_vault_address,
      );
      const verificationSummary = readStringRecord(
        vaultRow.verification_summary,
      );
      const routingSummary = readStringRecord(vaultRow.routing_summary);
      const yieldSources = readObjectArray(vaultRow.yield_source_summary).map(
        (entry) => ({
          allocationPct: toNumber(entry.allocationPct),
          label: String(entry.label ?? "Unknown source"),
          providerSlug: String(entry.providerSlug ?? "seeded"),
          status:
            entry.status === "inactive" || entry.status === "standby"
              ? entry.status
              : "active",
        }),
      ) satisfies YieldSourceSummary[];
      const notes = String(verificationSummary.notes ?? "").trim();

      return {
        assetOrigin:
          vaultRow.asset_origin === "klaster_managed"
            ? "klaster_managed"
            : "operator_listed",
        availability: getAvailability(
          vaultRow.status as "paused" | "verified",
          onchainConfig?.remainingPublicShares ?? estimatedRemainingShares,
        ),
        averageHealthScore: average(
          healthSeries.map((point) => point.healthScore),
        ),
        averageUptimePct: average(healthSeries.map((point) => point.uptimePct)),
        campaignRaisedUsdc: toNumber(vaultRow.campaign_raised_usdc),
        campaignTargetUsdc: toNumber(vaultRow.campaign_target_usdc),
        dataSource: "live" as const,
        description: `${vaultRow.node_label} is a verified ${vaultRow.node_category.toLowerCase()} with public tranche visibility, explicit health framing, and seeded routing disclosure.`,
        feeSummary: {
          grossRevenueUsdc: deposits.grossUsdc,
          investorNetRevenueUsdc: deposits.netUsdc,
          platformFeeBps: toNumber(vaultRow.platform_fee_bps),
          platformFeesCollectedUsdc: deposits.platformFeeUsdc,
        },
        hardwareSummary: readStringRecord(vaultRow.hardware_summary),
        healthSeries,
        healthSummary: latestHealth
          ? `Latest health score is ${latestHealth.healthScore.toFixed(1)} with ${latestHealth.uptimePct.toFixed(1)}% uptime in the most recent sample.`
          : "Health data has not been indexed yet for this vault.",
        id: vaultRow.id,
        latestDepositAt: deposits.latestAt,
        latestHealth,
        lowHealthScore: healthSeries.length
          ? Math.min(...healthSeries.map((point) => point.healthScore))
          : null,
        metadataHash:
          typeof vaultRow.public_metadata_hash === "string"
            ? vaultRow.public_metadata_hash
            : null,
        nodeCategory: vaultRow.node_category,
        nodeLabel: vaultRow.node_label,
        onchainVaultAddress:
          typeof vaultRow.onchain_vault_address === "string"
            ? vaultRow.onchain_vault_address
            : null,
        ownershipGrid: {
          activeCells: Math.min(
            20,
            Math.round(
              (Math.max(sharesSold, 0) /
                Math.max(toNumber(vaultRow.public_share_supply), 1)) *
                20,
            ),
          ),
          totalCells: 20,
        },
        priceFloorDisclosure: SHARED_DISCLOSURE,
        pricePerShareUsdc: toNumber(vaultRow.share_price_usdc),
        proofBundleHash: vaultRow.proof_bundle_hash,
        publicShareSupply: toNumber(vaultRow.public_share_supply),
        purchaseConfig:
          onchainConfig && vaultRow.status === "verified"
            ? {
                estimatedAvailableShares: onchainConfig.remainingPublicShares,
                mode: "live",
                operatorWalletAddress: onchainConfig.operatorWalletAddress,
                operatorSettlementTokenAccount:
                  onchainConfig.operatorSettlementTokenAccount,
                programAddress: onchainConfig.programAddress,
                shareMint: onchainConfig.shareMint,
                sharePriceUsdc: toNumber(vaultRow.share_price_usdc),
                shareTokenProgram: onchainConfig.shareTokenProgram,
                usdcMint: onchainConfig.usdcMint,
                usdcTokenProgram: onchainConfig.usdcTokenProgram,
                vaultAddress: onchainConfig.vaultAddress,
              }
            : {
                estimatedAvailableShares: estimatedRemainingShares,
                mode: "demo",
                reason:
                  vaultRow.status === "paused"
                    ? "This vault is paused and must remain non-purchasable until the operator is re-cleared."
                    : "Live purchase wiring is unavailable because the runtime could not resolve every required onchain purchase account.",
                sharePriceUsdc: toNumber(vaultRow.share_price_usdc),
              },
        remainingShares:
          onchainConfig?.remainingPublicShares ?? estimatedRemainingShares,
        routingSummary: {
          activeProvider:
            typeof routingSummary.activeProvider === "string"
              ? routingSummary.activeProvider
              : null,
          explanation:
            typeof routingSummary.explanation === "string"
              ? routingSummary.explanation
              : "Routing summary is not yet indexed for this live vault.",
          mode:
            routingSummary.mode === "manual_lane"
              ? "manual_lane"
              : "smart_auto_routing",
          status:
            routingSummary.status === "live_ready" ||
            routingSummary.status === "paused"
              ? routingSummary.status
              : "seeded_demo",
        },
        sharesSold,
        slug: vaultRow.slug,
        status: vaultRow.status as "paused" | "verified",
        taskStream,
        totalShares: toNumber(vaultRow.total_shares),
        valuationUsdc: toNumber(vaultRow.valuation_usdc),
        verificationSummary: {
          notes:
            notes ||
            "Verification summary is live, but reviewer notes were not stored in the current read model.",
          reviewedAt:
            typeof verificationSummary.reviewedAt === "string"
              ? verificationSummary.reviewedAt
              : vaultRow.verified_at,
          reviewedBy:
            typeof verificationSummary.reviewedBy === "string"
              ? verificationSummary.reviewedBy
              : null,
        },
        verifiedAt: vaultRow.verified_at,
        yieldSources,
      } satisfies PublicVaultDetail;
    }),
  );
}
