import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  createDefaultClient,
  fetchBalance,
  requestAirdrop,
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  WRAPPED_SOL_MINT,
} from "@solana/client";
import type { Address } from "@solana/kit";
import { createKeyPairSignerFromBytes } from "@solana/signers";
import { buildAdminApprovalTransactionPlan } from "@/lib/solana/admin-approval-transaction";
import { buildPurchaseTransactionPlan } from "@/lib/solana/purchase-transaction";
import { buildOperatorDepositTransactionPlan } from "@/lib/solana/vault-live-action-transaction";
import { parseSettlementAtomicAmount } from "@/lib/solana/vault-transaction-accounts";
import { fetchVault } from "@/programs/klaster-vault/generated/accounts/vault";
import type { AppSession } from "@/server/auth/session";
import { ingestHeliusWebhook } from "@/server/helius/webhooks";
import { createSupabaseServiceRoleClient } from "@/server/supabase/service-role";
import {
  finalizeVaultApproval,
  prepareVaultApproval,
} from "@/server/vaults/admin";

const CANONICAL_SLUG = "demo-vault";
const PURCHASE_SHARES = 4;
const SHARE_PRICE_SOL = 0.15;
const CAMPAIGN_TARGET_SOL = 18;
const VAULT_VALUATION_SOL = 60;
const DEPOSIT_AMOUNT_SOL = "0.75";
const MIN_BOOTSTRAP_SOL_BALANCE = BigInt(1_500_000_000);
const MVP_PROOF_HASH = createHash("sha256")
  .update("klasterai-demo-vault-proof-v1")
  .digest("hex");
const SOLANA_BIN = `${process.env.HOME ?? ""}/.local/share/solana/install/active_release/bin/solana`;
const SOLANA_KEYPAIR_PATH = `${process.env.HOME ?? ""}/.config/solana/id.json`;

type ProfileRow = {
  display_name: string | null;
  id: string;
  region_code: string | null;
  role: "admin" | "investor" | "operator";
  wallet_address: string;
};

type VaultRow = {
  campaign_raised_usdc: number | string;
  id: string;
  onchain_vault_address: string | null;
  share_price_usdc: number | string;
  slug: string;
  status:
    | "draft"
    | "needs_info"
    | "paused"
    | "pending_review"
    | "rejected"
    | "verified";
  token_mint_address: string | null;
};

type ClusterMoniker =
  | "devnet"
  | "localhost"
  | "localnet"
  | "mainnet-beta"
  | "testnet";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function getNowIso(offsetMinutes = 0) {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function getClusterMoniker() {
  return requireEnv("NEXT_PUBLIC_SOLANA_CLUSTER") as ClusterMoniker;
}

function getSettlementMintAddress() {
  return (
    process.env.SETTLEMENT_MINT_ADDRESS?.trim() ||
    process.env.USDC_MINT_ADDRESS?.trim() ||
    WRAPPED_SOL_MINT
  );
}

function runSolana(args: string[]) {
  if (!existsSync(SOLANA_BIN)) {
    throw new Error(`solana binary was not found at ${SOLANA_BIN}`);
  }

  const result = spawnSync(SOLANA_BIN, args, {
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        result.stdout?.trim() ||
        "solana command failed.",
    );
  }

  return result.stdout.trim();
}

async function resetCanonicalVaultForSettlementMint(vaultId: string) {
  const client = createSupabaseServiceRoleClient();
  const [claims, deposits, purchases, taskStream, vault] = await Promise.all([
    client.from("claims").delete().eq("vault_id", vaultId),
    client.from("revenue_deposits").delete().eq("vault_id", vaultId),
    client.from("purchases").delete().eq("vault_id", vaultId),
    client.from("vault_task_stream_events").delete().eq("vault_id", vaultId),
    client
      .from("vaults")
      .update({
        campaign_raised_usdc: 0,
        onchain_vault_address: null,
        status: "pending_review",
        token_mint_address: null,
        verified_at: null,
      })
      .eq("id", vaultId),
  ]);

  for (const result of [claims, deposits, purchases, taskStream, vault]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}

async function shouldResetCanonicalVaultForSettlementMint(vault: VaultRow) {
  if (
    vault.status !== "verified" ||
    !vault.onchain_vault_address ||
    !vault.token_mint_address
  ) {
    return false;
  }

  try {
    const solana = createDefaultClient({
      cluster: getClusterMoniker(),
      rpc: requireEnv("NEXT_PUBLIC_HELIUS_RPC_URL"),
    });
    const onchainVault = await fetchVault(
      solana.runtime.rpc,
      vault.onchain_vault_address as Address<string>,
    );

    if (
      onchainVault.data.usdcMint === getSettlementMintAddress() &&
      onchainVault.data.sharePriceUsdc ===
        parseSettlementAtomicAmount(SHARE_PRICE_SOL)
    ) {
      return false;
    }

    await resetCanonicalVaultForSettlementMint(vault.id);

    return true;
  } catch {
    await resetCanonicalVaultForSettlementMint(vault.id);

    return true;
  }
}

async function loadAdminSigner() {
  const secretKey = JSON.parse(
    readFileSync(SOLANA_KEYPAIR_PATH, "utf8"),
  ) as number[];

  return await createKeyPairSignerFromBytes(Uint8Array.from(secretKey));
}

async function ensureProfile(walletAddress: string) {
  const client = createSupabaseServiceRoleClient();
  const existing = await client
    .from("profiles")
    .select("id, role, wallet_address, display_name, region_code")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) {
    return existing.data as ProfileRow;
  }

  const inserted = await client
    .from("profiles")
    .insert({
      display_name: "KlasterAI MVP",
      region_code: "KZ",
      role: "admin",
      wallet_address: walletAddress,
    })
    .select("id, role, wallet_address, display_name, region_code")
    .single();

  if (inserted.error) {
    throw new Error(inserted.error.message);
  }

  return inserted.data as ProfileRow;
}

async function ensureCanonicalVault(profileId: string) {
  const client = createSupabaseServiceRoleClient();
  const existing = await client
    .from("vaults")
    .select(
      "id, slug, status, onchain_vault_address, token_mint_address, campaign_raised_usdc, share_price_usdc",
    )
    .eq("slug", CANONICAL_SLUG)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }
  const existingVault = (existing.data as VaultRow | null) ?? null;

  let preserveExistingLiveState = false;

  if (existingVault?.status === "verified") {
    preserveExistingLiveState =
      !(await shouldResetCanonicalVaultForSettlementMint(existingVault));
  }

  const basePayload = {
    asset_origin: "klaster_managed",
    campaign_raised_usdc: preserveExistingLiveState
      ? existingVault?.campaign_raised_usdc
      : 0,
    campaign_target_usdc: CAMPAIGN_TARGET_SOL,
    hardware_summary: {
      cpu: "2x AMD EPYC 9654",
      gpu: "8x NVIDIA H100 SXM",
      memory: "1.5 TB DDR5",
      network: "2x 100 GbE",
      region: "Frankfurt",
      uptimePosture: "24/7 dedicated cluster",
    },
    node_category: "Hybrid Compute Pool",
    node_label: "Atlas Hybrid Compute Pool",
    operator_profile_id: profileId,
    platform_fee_bps: 1000,
    proof_bundle_hash: MVP_PROOF_HASH,
    public_share_supply: 120,
    routing_summary: {
      activeProvider: "Render + private enterprise lanes",
      explanation:
        "KlasterAI routes the public tranche into the cheapest verified lane while latency-sensitive demand stays manually curated.",
      mode: "smart_auto_routing",
      status: "live_ready",
    },
    share_price_usdc: SHARE_PRICE_SOL,
    slug: CANONICAL_SLUG,
    total_shares: 400,
    valuation_usdc: VAULT_VALUATION_SOL,
    yield_source_summary: [
      {
        allocationPct: 55,
        label: "Inference routing",
        providerSlug: "render",
        status: "active",
      },
      {
        allocationPct: 30,
        label: "Batch fine-tuning",
        providerSlug: "akash",
        status: "active",
      },
      {
        allocationPct: 15,
        label: "Reserved failover",
        providerSlug: "private-fleet",
        status: "standby",
      },
    ],
  };

  if (existingVault) {
    const updated = await client
      .from("vaults")
      .update({
        ...basePayload,
        onchain_vault_address: preserveExistingLiveState
          ? existingVault.onchain_vault_address
          : null,
        status: preserveExistingLiveState ? "verified" : "pending_review",
        token_mint_address: preserveExistingLiveState
          ? existingVault.token_mint_address
          : null,
      })
      .eq("id", existingVault.id)
      .select(
        "id, slug, status, onchain_vault_address, token_mint_address, campaign_raised_usdc, share_price_usdc",
      )
      .single();

    if (updated.error) {
      throw new Error(updated.error.message);
    }

    return updated.data as VaultRow;
  }

  const inserted = await client
    .from("vaults")
    .insert({
      ...basePayload,
      status: "pending_review",
    })
    .select(
      "id, slug, status, onchain_vault_address, token_mint_address, campaign_raised_usdc, share_price_usdc",
    )
    .single();

  if (inserted.error) {
    throw new Error(inserted.error.message);
  }

  return inserted.data as VaultRow;
}

async function ensureActivityFixtures(vaultId: string) {
  const client = createSupabaseServiceRoleClient();
  const [healthCheck, taskCheck, yieldCheck] = await Promise.all([
    client
      .from("health_snapshots")
      .select("id")
      .eq("vault_id", vaultId)
      .limit(1),
    client
      .from("vault_task_stream_events")
      .select("id")
      .eq("vault_id", vaultId)
      .limit(1),
    client
      .from("vault_yield_sources")
      .select("id")
      .eq("vault_id", vaultId)
      .limit(1),
  ]);

  if (healthCheck.error) {
    throw new Error(healthCheck.error.message);
  }
  if (taskCheck.error) {
    throw new Error(taskCheck.error.message);
  }
  if (yieldCheck.error) {
    throw new Error(yieldCheck.error.message);
  }

  if (!(healthCheck.data ?? []).length) {
    const healthRows = [
      {
        cluster_status: "routing",
        health_score: 94.6,
        sampled_at: getNowIso(-240),
        source: "node_logs",
        uptime_pct: 99.2,
        utilization_pct: 61.4,
        vault_id: vaultId,
      },
      {
        cluster_status: "renting",
        health_score: 95.1,
        sampled_at: getNowIso(-180),
        source: "node_logs",
        uptime_pct: 99.3,
        utilization_pct: 68.1,
        vault_id: vaultId,
      },
      {
        cluster_status: "training",
        health_score: 96.4,
        sampled_at: getNowIso(-120),
        source: "node_logs",
        uptime_pct: 99.5,
        utilization_pct: 72.4,
        vault_id: vaultId,
      },
      {
        cluster_status: "routing",
        health_score: 97.2,
        sampled_at: getNowIso(-60),
        source: "node_logs",
        uptime_pct: 99.7,
        utilization_pct: 64.8,
        vault_id: vaultId,
      },
    ];
    const insertHealth = await client
      .from("health_snapshots")
      .insert(healthRows);

    if (insertHealth.error) {
      throw new Error(insertHealth.error.message);
    }
  }

  if (!(taskCheck.data ?? []).length) {
    const taskRows = [
      {
        logged_at: getNowIso(-210),
        message: "Verified invoice bundle linked to the public sale rail.",
        reward_delta_usdc: 0.18,
        source: "provider_ingest",
        status: "routing",
        vault_id: vaultId,
      },
      {
        logged_at: getNowIso(-160),
        message:
          "Inference demand shifted into the lower-latency enterprise lane.",
        reward_delta_usdc: 0.26,
        source: "provider_ingest",
        status: "renting",
        vault_id: vaultId,
      },
      {
        logged_at: getNowIso(-90),
        message:
          "Benchmark refresh completed and health score remained above 96.",
        reward_delta_usdc: 0.14,
        source: "provider_ingest",
        status: "training",
        vault_id: vaultId,
      },
      {
        logged_at: getNowIso(-25),
        message:
          "Buyer routing stayed inside the verified public issuance lane.",
        reward_delta_usdc: 0.09,
        source: "provider_ingest",
        status: "routing",
        vault_id: vaultId,
      },
    ];
    const insertTasks = await client
      .from("vault_task_stream_events")
      .insert(taskRows);

    if (insertTasks.error) {
      throw new Error(insertTasks.error.message);
    }
  }

  if (!(yieldCheck.data ?? []).length) {
    const insertYieldSources = await client.from("vault_yield_sources").insert([
      {
        allocation_pct: 55,
        label: "Inference routing",
        provider_slug: "render",
        status: "active",
        vault_id: vaultId,
      },
      {
        allocation_pct: 30,
        label: "Batch fine-tuning",
        provider_slug: "akash",
        status: "active",
        vault_id: vaultId,
      },
      {
        allocation_pct: 15,
        label: "Reserved failover",
        provider_slug: "private-fleet",
        status: "standby",
        vault_id: vaultId,
      },
    ]);

    if (insertYieldSources.error) {
      throw new Error(insertYieldSources.error.message);
    }
  }
}

async function readVault(vaultId: string) {
  const client = createSupabaseServiceRoleClient();
  const result = await client
    .from("vaults")
    .select(
      "id, slug, status, onchain_vault_address, token_mint_address, campaign_raised_usdc, share_price_usdc",
    )
    .eq("id", vaultId)
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as VaultRow;
}

async function sendInstructions(
  instructions: readonly import("@solana/client").TransactionInstructionInput[],
  feePayer: Awaited<ReturnType<typeof loadAdminSigner>>,
  solana: ReturnType<typeof createDefaultClient>,
) {
  const prepared = await solana.transaction.prepare({
    feePayer,
    instructions,
    version: "legacy",
  });

  return (await solana.transaction.send(prepared)).toString();
}

async function ensureSolBalance(ownerAddress: string, minimumLamports: bigint) {
  const solana = createDefaultClient({
    cluster: getClusterMoniker(),
    rpc: requireEnv("NEXT_PUBLIC_HELIUS_RPC_URL"),
  });
  const owner = ownerAddress as Address<string>;
  let currentBalance = await fetchBalance(solana, {
    address: owner,
  });

  if (currentBalance >= minimumLamports) {
    return;
  }

  if (getClusterMoniker() !== "devnet") {
    throw new Error(
      "Bootstrap wallet is underfunded for the SOL demo rail and automatic top-ups are only enabled on devnet.",
    );
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await requestAirdrop(solana, {
        address: owner,
        lamports: BigInt(2_000_000_000) as Parameters<
          typeof requestAirdrop
        >[1]["lamports"],
      });
    } catch {
      runSolana([
        "airdrop",
        "2",
        ownerAddress,
        "--url",
        requireEnv("NEXT_PUBLIC_SOLANA_CLUSTER"),
      ]);
    }
    await sleep(1_500);
    currentBalance = await fetchBalance(solana, {
      address: owner,
    });

    if (currentBalance >= minimumLamports) {
      return;
    }
  }

  throw new Error(
    "Bootstrap wallet could not be funded with enough devnet SOL for the live purchase and deposit rails.",
  );
}

async function ensureLiveVault(profile: ProfileRow) {
  const adminSigner = await loadAdminSigner();
  const vault = await ensureCanonicalVault(profile.id);
  await ensureActivityFixtures(vault.id);

  const session: AppSession = {
    profileId: profile.id,
    regionCode: profile.region_code,
    role: profile.role,
    walletAddress: profile.wallet_address,
  };

  if (
    vault.status === "verified" &&
    vault.onchain_vault_address &&
    vault.token_mint_address
  ) {
    return {
      adminSigner,
      vault,
    };
  }

  const approval = await prepareVaultApproval(
    vault.id,
    {
      notes:
        "Atlas pool verified for the MVP issuance rail. Hardware summary, proof bundle, and public sale constraints were reviewed before enabling live devnet purchase.",
    },
    session,
  );
  const solana = createDefaultClient({
    cluster: getClusterMoniker(),
    rpc: requireEnv("NEXT_PUBLIC_HELIUS_RPC_URL"),
  });
  const plan = await buildAdminApprovalTransactionPlan({
    adminSigner,
    bundle: approval.bundle,
    solana,
  });
  const signature = await sendInstructions(
    plan.instructions,
    adminSigner,
    solana,
  );

  await finalizeVaultApproval(
    vault.id,
    {
      approvalToken: approval.approvalToken,
      shareMintAddress: plan.shareMintAddress.toString(),
      signature,
      vaultAddress: plan.vaultAddress.toString(),
    },
    session,
  );

  return {
    adminSigner,
    vault: await readVault(vault.id),
  };
}

async function ensureInitialPurchase(input: {
  adminSigner: Awaited<ReturnType<typeof loadAdminSigner>>;
  profile: ProfileRow;
  vault: VaultRow;
}) {
  const client = createSupabaseServiceRoleClient();
  const existingPurchases = await client
    .from("purchases")
    .select("id")
    .eq("vault_id", input.vault.id)
    .limit(1);

  if (existingPurchases.error) {
    throw new Error(existingPurchases.error.message);
  }

  if ((existingPurchases.data ?? []).length) {
    return null;
  }

  const solana = createDefaultClient({
    cluster: getClusterMoniker(),
    rpc: requireEnv("NEXT_PUBLIC_HELIUS_RPC_URL"),
  });
  const onchainVault = await fetchVault(
    solana.runtime.rpc,
    input.vault.onchain_vault_address as Address<string>,
  );
  const purchaseConfig = {
    estimatedAvailableShares: Number(onchainVault.data.remainingPublicShares),
    mode: "live" as const,
    operatorSettlementTokenAccount:
      onchainVault.data.operatorSettlementTokenAccount,
    programAddress: requireEnv("NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT"),
    shareMint: onchainVault.data.shareMint,
    sharePriceUsdc: toNumber(input.vault.share_price_usdc),
    shareTokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    usdcMint: onchainVault.data.usdcMint,
    usdcTokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultAddress: onchainVault.address,
  };

  await ensureSolBalance(
    input.adminSigner.address.toString(),
    MIN_BOOTSTRAP_SOL_BALANCE,
  );

  const plan = await buildPurchaseTransactionPlan({
    buyerSigner: input.adminSigner,
    purchaseConfig,
    shares: PURCHASE_SHARES,
    solana,
  });
  const signature = await sendInstructions(
    plan.instructions,
    input.adminSigner,
    solana,
  );
  const amountUsdc = Number(
    (purchaseConfig.sharePriceUsdc * PURCHASE_SHARES).toFixed(6),
  );

  await ingestHeliusWebhook([
    {
      events: {
        klasterai: {
          amountUsdc,
          buyerProfileId: input.profile.id,
          kind: "purchase",
          shares: PURCHASE_SHARES,
          vaultId: input.vault.id,
        },
      },
      signature,
      timestamp: Math.floor(Date.now() / 1000),
      type: "transaction",
    },
  ]);

  const updateVault = await client
    .from("vaults")
    .update({
      campaign_raised_usdc: amountUsdc,
    })
    .eq("id", input.vault.id);

  if (updateVault.error) {
    throw new Error(updateVault.error.message);
  }

  return signature;
}

async function ensureInitialDeposit(input: {
  adminSigner: Awaited<ReturnType<typeof loadAdminSigner>>;
  profile: ProfileRow;
  vault: VaultRow;
}) {
  const client = createSupabaseServiceRoleClient();
  const existingDeposits = await client
    .from("revenue_deposits")
    .select("id")
    .eq("vault_id", input.vault.id)
    .limit(1);

  if (existingDeposits.error) {
    throw new Error(existingDeposits.error.message);
  }

  if ((existingDeposits.data ?? []).length) {
    return null;
  }

  const solana = createDefaultClient({
    cluster: getClusterMoniker(),
    rpc: requireEnv("NEXT_PUBLIC_HELIUS_RPC_URL"),
  });
  const bundle = {
    amountUsdc: DEPOSIT_AMOUNT_SOL,
    operatorWalletAddress: input.adminSigner.address.toString(),
    platformTreasuryOwnerAddress: requireEnv("SOLANA_ADMIN_MULTISIG"),
    programAddress: requireEnv("NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT"),
    usdcMint: getSettlementMintAddress(),
    usdcTokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultAddress: input.vault.onchain_vault_address as string,
    vaultId: input.vault.id,
  };

  const plan = await buildOperatorDepositTransactionPlan({
    bundle,
    operatorSigner: input.adminSigner,
    solana,
  });
  const signature = await sendInstructions(
    plan.instructions,
    input.adminSigner,
    solana,
  );
  const grossAmountUsdc = Number(DEPOSIT_AMOUNT_SOL);
  const platformFeeAmountUsdc = Number((grossAmountUsdc * 0.1).toFixed(6));
  const netAmountUsdc = Number(
    (grossAmountUsdc - platformFeeAmountUsdc).toFixed(6),
  );

  await ingestHeliusWebhook([
    {
      events: {
        klasterai: {
          grossAmountUsdc,
          kind: "deposit",
          netAmountUsdc,
          platformFeeAmountUsdc,
          revenueIndexAfter: 1,
          vaultId: input.vault.id,
        },
      },
      signature,
      timestamp: Math.floor(Date.now() / 1000),
      type: "transaction",
    },
  ]);

  return signature;
}

async function main() {
  requireEnv("NEXT_PUBLIC_HELIUS_RPC_URL");
  requireEnv("NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT");
  requireEnv("NEXT_PUBLIC_SOLANA_CLUSTER");
  requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  requireEnv("PINATA_JWT");
  requireEnv("SESSION_SECRET");
  requireEnv("SOLANA_ADMIN_MULTISIG");

  const adminSigner = await loadAdminSigner();
  const profile = await ensureProfile(adminSigner.address.toString());
  const liveVault = await ensureLiveVault(profile);
  const purchaseSignature = await ensureInitialPurchase({
    adminSigner,
    profile,
    vault: liveVault.vault,
  });
  const depositSignature = await ensureInitialDeposit({
    adminSigner,
    profile,
    vault: await readVault(liveVault.vault.id),
  });
  const finalVault = await readVault(liveVault.vault.id);

  console.log(
    JSON.stringify(
      {
        adminWalletAddress: adminSigner.address.toString(),
        depositSignature,
        purchaseSignature,
        settlementMintAddress: getSettlementMintAddress(),
        slug: finalVault.slug,
        status: finalVault.status,
        tokenMintAddress: finalVault.token_mint_address,
        vaultAddress: finalVault.onchain_vault_address,
        vaultId: finalVault.id,
      },
      null,
      2,
    ),
  );
}

await main();
