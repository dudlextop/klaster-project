import {
  createDefaultClient,
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana/client";
import type { Address } from "@solana/kit";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import type {
  AdminApprovalBundle,
  PreparedAdminApproval,
} from "@/lib/solana/admin-approval";
import { resolveVaultTransactionAccounts } from "@/lib/solana/vault-transaction-accounts";
import { fetchVault } from "@/programs/klaster-vault/generated/accounts/vault";
import { VaultStatus } from "@/programs/klaster-vault/generated/types";
import type { AppSession } from "@/server/auth/session";
import { AppError } from "@/server/http/errors";
import { publishVaultPublicMetadata } from "@/server/metadata/public-metadata";
import { createSupabaseServiceRoleClient } from "@/server/supabase/service-role";

export const reviewVaultSchema = z.object({
  decision: z.enum(["pending", "needs_info", "approved", "rejected"]),
  notes: z.string().trim().min(3).max(2000),
});

export const prepareVaultApprovalSchema = z.object({
  notes: z.string().trim().min(3).max(2000),
});

export const finalizeVaultApprovalSchema = z.object({
  approvalToken: z.string().trim().min(1),
  shareMintAddress: z.string().trim().min(32).max(80),
  signature: z.string().trim().min(32).max(120),
  vaultAddress: z.string().trim().min(32).max(80),
});

export const pauseVaultSchema = z.object({
  action: z.enum(["pause", "resume"]),
  reason: z.string().trim().min(3).max(500).optional(),
});

type VaultRecord = {
  hardware_summary: Record<string, unknown> | null;
  id: string;
  node_category: string;
  node_label: string;
  onchain_vault_address: string | null;
  operator_profile_id: string;
  platform_fee_bps: number | string;
  proof_bundle_hash: string;
  public_metadata_hash: string | null;
  public_metadata_uri: string | null;
  public_share_supply: number | string;
  share_price_usdc: number | string;
  slug: string;
  status:
    | "draft"
    | "needs_info"
    | "pending_review"
    | "paused"
    | "rejected"
    | "verified";
  token_mint_address: string | null;
  total_shares: number | string;
  valuation_usdc: number | string;
  verification_summary: unknown;
};

type ApprovalTokenPayload = AdminApprovalBundle & {
  kind: "admin-vault-approval";
  notes: string;
  profileId: string;
};

const APPROVAL_TOKEN_EXPIRY = "10m";
const APPROVAL_CONFIRMATION_ATTEMPTS = 8;
const APPROVAL_CONFIRMATION_DELAY_MS = 750;
const textEncoder = new TextEncoder();

function getNumericValue(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function getVerificationSummary(
  decision: "approved" | "needs_info" | "pending" | "rejected",
  notes: string,
  session: AppSession,
  extras?: Record<string, unknown>,
) {
  return {
    ...extras,
    decision,
    notes,
    reviewedAt: new Date().toISOString(),
    reviewedBy: session.walletAddress,
  };
}

function getApprovalTokenSecret() {
  const secret = getServerEnv().sessionSecret;

  if (!secret) {
    throw new AppError(
      503,
      "Wallet approval runtime is not configured with a session secret.",
    );
  }

  return textEncoder.encode(secret);
}

function getLiveApprovalRuntime() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (
    !publicEnv.heliusRpcUrl ||
    !publicEnv.programId ||
    !serverEnv.pinataJwt ||
    !serverEnv.sessionSecret ||
    !serverEnv.solanaAdminMultisig ||
    !serverEnv.settlementMintAddress
  ) {
    throw new AppError(
      503,
      "Live admin approval runtime is incomplete for this environment.",
    );
  }

  return {
    publicEnv,
    serverEnv,
  };
}

async function signApprovalToken(payload: ApprovalTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(APPROVAL_TOKEN_EXPIRY)
    .sign(getApprovalTokenSecret());
}

async function readApprovalToken(token: string) {
  try {
    const verified = await jwtVerify(token, getApprovalTokenSecret());

    return verified.payload as ApprovalTokenPayload;
  } catch {
    throw new AppError(401, "The approval bundle has expired or is invalid.");
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function getVault(vaultId: string): Promise<VaultRecord> {
  const client = createSupabaseServiceRoleClient();
  const vault = await client
    .from("vaults")
    .select(
      "hardware_summary, id, node_category, node_label, onchain_vault_address, operator_profile_id, platform_fee_bps, proof_bundle_hash, public_metadata_hash, public_metadata_uri, public_share_supply, share_price_usdc, slug, status, token_mint_address, total_shares, valuation_usdc, verification_summary",
    )
    .eq("id", vaultId)
    .maybeSingle();

  if (vault.error) {
    throw new Error(vault.error.message);
  }

  if (!vault.data) {
    throw new AppError(404, "Vault not found.");
  }

  return vault.data as VaultRecord;
}

async function getOperatorWalletAddress(operatorProfileId: string) {
  const client = createSupabaseServiceRoleClient();
  const result = await client
    .from("profiles")
    .select("wallet_address")
    .eq("id", operatorProfileId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data?.wallet_address) {
    throw new AppError(
      409,
      "The operator wallet could not be resolved for this vault.",
    );
  }

  return result.data.wallet_address;
}

function assertVaultCanBePreparedForApproval(vault: VaultRecord) {
  if (vault.status !== "pending_review") {
    throw new AppError(
      409,
      "Only pending-review vaults can enter the live approval flow.",
    );
  }

  const hasExistingBootstrap =
    Boolean(vault.onchain_vault_address) && Boolean(vault.token_mint_address);
  const hasMixedBootstrapState =
    Boolean(vault.onchain_vault_address) !== Boolean(vault.token_mint_address);

  if (hasMixedBootstrapState) {
    throw new AppError(
      409,
      "The vault has a partial onchain bootstrap state and must be reconciled before approval.",
    );
  }

  return hasExistingBootstrap ? "approve_only" : "full";
}

async function waitForApprovedOnchainVault(
  bundle: AdminApprovalBundle,
  shareMintAddress: string,
  vaultAddress: string,
) {
  const { publicEnv } = getLiveApprovalRuntime();
  const client = createDefaultClient({
    cluster: publicEnv.solanaCluster,
    rpc: publicEnv.heliusRpcUrl as `http${string}`,
  });
  let lastError: unknown = null;

  for (
    let attempt = 0;
    attempt < APPROVAL_CONFIRMATION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const onchainVault = await fetchVault(
        client.runtime.rpc,
        vaultAddress as Address<string>,
      );
      const expectedAccounts = await resolveVaultTransactionAccounts({
        adminMultisig: bundle.platformTreasuryOwnerAddress as Address<string>,
        operatorAddress: bundle.operatorWalletAddress as Address<string>,
        shareMint: shareMintAddress as Address<string>,
        shareTokenProgram: bundle.shareTokenProgram as Address<string>,
        solana: client,
        usdcMint: bundle.usdcMint as Address<string>,
        usdcTokenProgram: bundle.usdcTokenProgram as Address<string>,
        vaultAddress: onchainVault.address,
      });

      if (onchainVault.data.status !== VaultStatus.Verified) {
        throw new Error("Vault has not reached verified status onchain yet.");
      }

      if (onchainVault.data.shareMint !== shareMintAddress) {
        throw new Error(
          "The onchain share mint does not match the approval bundle.",
        );
      }

      if (onchainVault.data.admin !== bundle.adminWalletAddress) {
        throw new Error(
          "The onchain admin signer does not match the approval bundle.",
        );
      }

      if (onchainVault.data.operator !== bundle.operatorWalletAddress) {
        throw new Error(
          "The onchain operator does not match the approval bundle.",
        );
      }

      if (onchainVault.data.publicMetadataUri !== bundle.publicMetadataUri) {
        throw new Error(
          "The onchain metadata URI does not match the prepared approval bundle.",
        );
      }

      if (onchainVault.data.proofBundleHash !== bundle.proofBundleHash) {
        throw new Error(
          "The onchain proof bundle hash does not match the prepared approval bundle.",
        );
      }

      if (
        onchainVault.data.operatorSettlementTokenAccount !==
          expectedAccounts.operatorSettlementTokenAccount ||
        onchainVault.data.platformTreasuryTokenAccount !==
          expectedAccounts.platformTreasuryTokenAccount ||
        onchainVault.data.revenuePoolTokenAccount !==
          expectedAccounts.revenuePoolTokenAccount
      ) {
        throw new Error(
          "The onchain token account wiring does not match the expected approval defaults.",
        );
      }

      return onchainVault;
    } catch (error) {
      lastError = error;

      if (attempt < APPROVAL_CONFIRMATION_ATTEMPTS - 1) {
        await sleep(APPROVAL_CONFIRMATION_DELAY_MS);
      }
    }
  }

  throw new AppError(
    409,
    lastError instanceof Error
      ? lastError.message
      : "The onchain approval transaction has not reached a readable verified state yet.",
  );
}

export async function reviewVault(
  vaultId: string,
  rawInput: z.infer<typeof reviewVaultSchema>,
  session: AppSession,
) {
  const input = reviewVaultSchema.parse(rawInput);
  const client = createSupabaseServiceRoleClient();
  await getVault(vaultId);

  if (input.decision === "approved") {
    throw new AppError(
      409,
      "Approved decisions must use the live prepare/finalize approval flow.",
    );
  }

  const baseSummary = getVerificationSummary(
    input.decision,
    input.notes,
    session,
  );
  let status: "pending_review" | "needs_info" | "rejected" = "pending_review";

  if (input.decision === "needs_info") {
    status = "needs_info";
  } else if (input.decision === "rejected") {
    status = "rejected";
  }

  const reviewResult = await client.from("verification_reviews").insert({
    decision: input.decision,
    notes: input.notes,
    reviewer_profile_id: session.profileId,
    vault_id: vaultId,
  });

  if (reviewResult.error) {
    throw new Error(reviewResult.error.message);
  }

  const updateResult = await client
    .from("vaults")
    .update({
      status,
      verification_summary: baseSummary,
    })
    .eq("id", vaultId)
    .select("id, status, public_metadata_uri, verified_at")
    .single();

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  return updateResult.data;
}

export async function prepareVaultApproval(
  vaultId: string,
  rawInput: z.infer<typeof prepareVaultApprovalSchema>,
  session: AppSession,
): Promise<PreparedAdminApproval> {
  const input = prepareVaultApprovalSchema.parse(rawInput);
  const { publicEnv, serverEnv } = getLiveApprovalRuntime();
  const vault = await getVault(vaultId);
  const bootstrapMode = assertVaultCanBePreparedForApproval(vault);
  const operatorWalletAddress = await getOperatorWalletAddress(
    vault.operator_profile_id,
  );
  const publishedMetadata = await publishVaultPublicMetadata({
    hardwareSummary: vault.hardware_summary ?? {},
    nodeCategory: vault.node_category,
    nodeLabel: vault.node_label,
    proofBundleHash: vault.proof_bundle_hash,
    publicShareSupply: getNumericValue(vault.public_share_supply),
    sharePriceUsdc: getNumericValue(vault.share_price_usdc),
    slug: vault.slug,
    totalShares: getNumericValue(vault.total_shares),
    valuationUsdc: getNumericValue(vault.valuation_usdc),
    verificationSummary: getVerificationSummary(
      "approved",
      input.notes,
      session,
    ),
    vaultId: vault.id,
  });
  const bundle: AdminApprovalBundle = {
    adminWalletAddress: session.walletAddress,
    bootstrapMode,
    existingShareMintAddress: vault.token_mint_address,
    existingVaultAddress: vault.onchain_vault_address,
    operatorWalletAddress,
    platformFeeBps: getNumericValue(vault.platform_fee_bps),
    platformTreasuryOwnerAddress: serverEnv.solanaAdminMultisig,
    programAddress: publicEnv.programId,
    proofBundleHash: vault.proof_bundle_hash,
    publicMetadataHash: publishedMetadata.metadataHash,
    publicMetadataUri: publishedMetadata.uri,
    publicShareSupply: getNumericValue(vault.public_share_supply),
    sharePriceUsdc: String(vault.share_price_usdc),
    shareTokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
    totalShares: getNumericValue(vault.total_shares),
    usdcMint: serverEnv.settlementMintAddress,
    usdcTokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultId: vault.id,
  };

  return {
    approvalToken: await signApprovalToken({
      ...bundle,
      kind: "admin-vault-approval",
      notes: input.notes,
      profileId: session.profileId,
    }),
    bundle,
  };
}

export async function finalizeVaultApproval(
  vaultId: string,
  rawInput: z.infer<typeof finalizeVaultApprovalSchema>,
  session: AppSession,
) {
  const input = finalizeVaultApprovalSchema.parse(rawInput);
  const approval = await readApprovalToken(input.approvalToken);

  if (approval.kind !== "admin-vault-approval") {
    throw new AppError(401, "The approval bundle is invalid.");
  }

  if (approval.profileId !== session.profileId) {
    throw new AppError(
      403,
      "This approval bundle belongs to a different admin session.",
    );
  }

  if (
    approval.adminWalletAddress !== session.walletAddress ||
    approval.vaultId !== vaultId
  ) {
    throw new AppError(
      403,
      "This approval bundle does not match the current request.",
    );
  }

  if (
    approval.bootstrapMode === "approve_only" &&
    (approval.existingShareMintAddress !== input.shareMintAddress ||
      approval.existingVaultAddress !== input.vaultAddress)
  ) {
    throw new AppError(
      409,
      "Approve-only flows must finalize against the prepared onchain addresses.",
    );
  }

  const client = createSupabaseServiceRoleClient();
  const vault = await getVault(vaultId);

  if (
    vault.status === "verified" &&
    vault.onchain_vault_address === input.vaultAddress &&
    vault.token_mint_address === input.shareMintAddress &&
    vault.public_metadata_uri === approval.publicMetadataUri &&
    vault.public_metadata_hash === approval.publicMetadataHash
  ) {
    return {
      id: vault.id,
      onchain_vault_address: vault.onchain_vault_address,
      public_metadata_uri: vault.public_metadata_uri,
      status: vault.status,
      token_mint_address: vault.token_mint_address,
      verified_at:
        vault.verification_summary &&
        typeof vault.verification_summary === "object" &&
        !Array.isArray(vault.verification_summary) &&
        typeof (vault.verification_summary as Record<string, unknown>)
          .reviewedAt === "string"
          ? ((vault.verification_summary as Record<string, unknown>)
              .reviewedAt as string)
          : null,
    };
  }

  if (vault.status !== "pending_review") {
    throw new AppError(
      409,
      "The vault is no longer in a state that can be finalized for approval.",
    );
  }

  await waitForApprovedOnchainVault(
    approval,
    input.shareMintAddress,
    input.vaultAddress,
  );

  const verifiedAt = new Date().toISOString();
  const verificationSummary = getVerificationSummary(
    "approved",
    approval.notes,
    session,
    {
      approvalSignature: input.signature,
      onchainVaultAddress: input.vaultAddress,
      publicMetadataHash: approval.publicMetadataHash,
      publicMetadataUri: approval.publicMetadataUri,
      tokenMintAddress: input.shareMintAddress,
    },
  );
  const reviewResult = await client.from("verification_reviews").insert({
    decision: "approved",
    notes: approval.notes,
    reviewer_profile_id: session.profileId,
    vault_id: vaultId,
  });

  if (reviewResult.error) {
    throw new Error(reviewResult.error.message);
  }

  const updateResult = await client
    .from("vaults")
    .update({
      onchain_vault_address: input.vaultAddress,
      public_metadata_hash: approval.publicMetadataHash,
      public_metadata_uri: approval.publicMetadataUri,
      status: "verified",
      token_mint_address: input.shareMintAddress,
      verification_summary: verificationSummary,
      verified_at: verifiedAt,
    })
    .eq("id", vaultId)
    .select(
      "id, onchain_vault_address, public_metadata_uri, status, token_mint_address, verified_at",
    )
    .single();

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  return updateResult.data;
}

export async function setVaultPauseState(
  vaultId: string,
  rawInput: z.infer<typeof pauseVaultSchema>,
  session: AppSession,
) {
  const input = pauseVaultSchema.parse(rawInput);
  const client = createSupabaseServiceRoleClient();
  const vault = await getVault(vaultId);
  const existingSummary =
    vault.verification_summary &&
    typeof vault.verification_summary === "object" &&
    !Array.isArray(vault.verification_summary)
      ? (vault.verification_summary as Record<string, unknown>)
      : {};
  const pauseState =
    input.action === "pause"
      ? {
          action: "pause",
          pausedAt: new Date().toISOString(),
          pausedBy: session.walletAddress,
          reason: input.reason ?? null,
        }
      : {
          action: "resume",
          resumedAt: new Date().toISOString(),
          resumedBy: session.walletAddress,
          reason: input.reason ?? null,
        };
  const expectedCurrentStatus =
    input.action === "pause" ? "verified" : "paused";

  if (vault.status !== expectedCurrentStatus) {
    throw new AppError(
      409,
      `Vault must be ${expectedCurrentStatus} before this action can be applied.`,
    );
  }

  const updatedVault = await client
    .from("vaults")
    .update({
      paused_at: input.action === "pause" ? new Date().toISOString() : null,
      status: input.action === "pause" ? "paused" : "verified",
      verification_summary: {
        ...existingSummary,
        pauseState,
      },
    })
    .eq("id", vaultId)
    .select("id, status, paused_at")
    .single();

  if (updatedVault.error) {
    throw new Error(updatedVault.error.message);
  }

  return updatedVault.data;
}
