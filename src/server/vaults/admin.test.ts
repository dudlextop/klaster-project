import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSession } from "@/server/auth/session";
import type { AppError } from "@/server/http/errors";

type MockResult = {
  data: unknown;
  error: { message: string } | null;
};

type MockOperationKey = "insert" | "select-maybeSingle" | "update-single";

type RecordedOperation = {
  filters?: Array<{ column: string; value: unknown }>;
  operation: MockOperationKey;
  payload?: unknown;
  table: string;
};

const operationQueues = new Map<string, MockResult[]>();
const recordedOperations: RecordedOperation[] = [];
const {
  mockCreateDefaultClient,
  mockFetchVault,
  mockPublishVaultPublicMetadata,
  mockResolveVaultTransactionAccounts,
} = vi.hoisted(() => ({
  mockCreateDefaultClient: vi.fn(),
  mockFetchVault: vi.fn(),
  mockPublishVaultPublicMetadata: vi.fn(),
  mockResolveVaultTransactionAccounts: vi.fn(),
}));

function queueResult(
  table: string,
  operation: MockOperationKey,
  result: MockResult,
) {
  const key = `${table}:${operation}`;
  const queue = operationQueues.get(key) ?? [];

  queue.push(result);
  operationQueues.set(key, queue);
}

function ok(data: unknown): MockResult {
  return {
    data,
    error: null,
  };
}

function takeResult(table: string, operation: MockOperationKey) {
  const key = `${table}:${operation}`;
  const queue = operationQueues.get(key);

  if (!queue?.length) {
    throw new Error(`No queued Supabase mock result for ${key}.`);
  }

  const result = queue.shift();

  if (!result) {
    throw new Error(`Supabase mock queue underflow for ${key}.`);
  }

  return result;
}

function createMockQuery(table: string) {
  const filters: Array<{ column: string; value: unknown }> = [];
  let pendingPayload: unknown;
  let pendingOperation: "select" | "update" | null = null;

  const query = {
    eq(column: string, value: unknown) {
      filters.push({ column, value });

      return query;
    },
    insert(payload: unknown) {
      recordedOperations.push({
        operation: "insert",
        payload,
        table,
      });

      return Promise.resolve(takeResult(table, "insert"));
    },
    maybeSingle() {
      recordedOperations.push({
        filters: [...filters],
        operation: "select-maybeSingle",
        table,
      });

      return Promise.resolve(takeResult(table, "select-maybeSingle"));
    },
    select() {
      if (!pendingOperation) {
        pendingOperation = "select";
      }

      return query;
    },
    single() {
      if (pendingOperation !== "update") {
        throw new Error(`Unsupported single() call for ${table}.`);
      }

      recordedOperations.push({
        filters: [...filters],
        operation: "update-single",
        payload: pendingPayload,
        table,
      });

      return Promise.resolve(takeResult(table, "update-single"));
    },
    update(payload: unknown) {
      pendingOperation = "update";
      pendingPayload = payload;

      return query;
    },
  };

  return query;
}

vi.mock("@/server/metadata/public-metadata", () => ({
  publishVaultPublicMetadata: mockPublishVaultPublicMetadata,
}));

vi.mock("@/server/supabase/service-role", () => ({
  createSupabaseServiceRoleClient: () => ({
    from: (table: string) => createMockQuery(table),
  }),
}));

vi.mock("@solana/client", () => ({
  TOKEN_2022_PROGRAM_ADDRESS: "token-2022-program",
  TOKEN_PROGRAM_ADDRESS: "token-program",
  WRAPPED_SOL_MINT: "So11111111111111111111111111111111111111112",
  createDefaultClient: mockCreateDefaultClient,
}));

vi.mock("@/programs/klaster-vault/generated/accounts/vault", () => ({
  fetchVault: mockFetchVault,
}));

vi.mock("@/lib/solana/vault-transaction-accounts", () => ({
  resolveVaultTransactionAccounts: mockResolveVaultTransactionAccounts,
}));

import {
  finalizeVaultApproval,
  prepareVaultApproval,
} from "@/server/vaults/admin";

const adminSession: AppSession = {
  profileId: "admin-profile",
  regionCode: "KZ",
  role: "admin",
  walletAddress: "admin-wallet",
};

beforeEach(() => {
  operationQueues.clear();
  recordedOperations.length = 0;
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL = "https://rpc.helius.dev";
  process.env.NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT = "program-address";
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER = "devnet";
  process.env.PINATA_JWT = "pinata-jwt";
  process.env.SESSION_SECRET =
    "local-session-secret-that-is-long-enough-for-approval-tests";
  process.env.SOLANA_ADMIN_MULTISIG = "treasury-wallet";
  process.env.SETTLEMENT_MINT_ADDRESS =
    "So11111111111111111111111111111111111111112";
  process.env.USDC_MINT_ADDRESS = "usdc-mint";
  mockPublishVaultPublicMetadata.mockResolvedValue({
    cid: "metadata-cid",
    metadataHash: "metadata-hash",
    uri: "ipfs://metadata-cid",
  });
  mockCreateDefaultClient.mockReturnValue({
    runtime: {
      rpc: {},
    },
  });
  mockResolveVaultTransactionAccounts.mockResolvedValue({
    operatorSettlementTokenAccount: "operator-usdc-ata",
    platformTreasuryTokenAccount: "treasury-usdc-ata",
    revenuePoolTokenAccount: "revenue-pool-ata",
    vaultAuthority: "vault-authority",
  });
  mockFetchVault.mockResolvedValue({
    address: "vault-pda",
    data: {
      admin: "admin-wallet",
      operator: "operator-wallet",
      operatorSettlementTokenAccount: "operator-usdc-ata",
      platformTreasuryTokenAccount: "treasury-usdc-ata",
      proofBundleHash: "proof-hash",
      publicMetadataUri: "ipfs://metadata-cid",
      revenuePoolTokenAccount: "revenue-pool-ata",
      shareMint: "ShareMintAddress123456789ABCDEFGHJKLM",
      status: 1,
    },
  });
});

describe("admin approval flow", () => {
  it("prepares a full approval bundle for pending-review vaults", async () => {
    queueResult(
      "vaults",
      "select-maybeSingle",
      ok({
        hardware_summary: { gpuCount: 8 },
        id: "vault-1",
        node_category: "GPU Cluster",
        node_label: "Atlas Node",
        onchain_vault_address: null,
        operator_profile_id: "operator-profile",
        platform_fee_bps: 1000,
        proof_bundle_hash: "proof-hash",
        public_metadata_hash: null,
        public_metadata_uri: null,
        public_share_supply: 120,
        share_price_usdc: "15.250000",
        slug: "atlas-node",
        status: "pending_review",
        token_mint_address: null,
        total_shares: 240,
        valuation_usdc: "3660.000000",
        verification_summary: null,
      }),
    );
    queueResult(
      "profiles",
      "select-maybeSingle",
      ok({
        wallet_address: "operator-wallet",
      }),
    );

    const prepared = await prepareVaultApproval(
      "vault-1",
      {
        notes: "Benchmark evidence and invoices were verified.",
      },
      adminSession,
    );

    expect(prepared.bundle).toMatchObject({
      adminWalletAddress: "admin-wallet",
      bootstrapMode: "full",
      operatorWalletAddress: "operator-wallet",
      platformTreasuryOwnerAddress: "treasury-wallet",
      programAddress: "program-address",
      publicMetadataHash: "metadata-hash",
      publicMetadataUri: "ipfs://metadata-cid",
      sharePriceUsdc: "15.250000",
      shareTokenProgram: "token-2022-program",
      usdcMint: "So11111111111111111111111111111111111111112",
      usdcTokenProgram: "token-program",
      vaultId: "vault-1",
    });
    expect(prepared.approvalToken).toEqual(expect.any(String));
    expect(mockPublishVaultPublicMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeLabel: "Atlas Node",
        proofBundleHash: "proof-hash",
        vaultId: "vault-1",
      }),
    );
  });

  it("rejects approval preparation when the vault has mixed bootstrap state", async () => {
    queueResult(
      "vaults",
      "select-maybeSingle",
      ok({
        hardware_summary: {},
        id: "vault-1",
        node_category: "GPU Cluster",
        node_label: "Atlas Node",
        onchain_vault_address: "vault-pda",
        operator_profile_id: "operator-profile",
        platform_fee_bps: 1000,
        proof_bundle_hash: "proof-hash",
        public_metadata_hash: null,
        public_metadata_uri: null,
        public_share_supply: 120,
        share_price_usdc: "15.250000",
        slug: "atlas-node",
        status: "pending_review",
        token_mint_address: null,
        total_shares: 240,
        valuation_usdc: "3660.000000",
        verification_summary: null,
      }),
    );

    await expect(
      prepareVaultApproval(
        "vault-1",
        {
          notes: "Ready",
        },
        adminSession,
      ),
    ).rejects.toMatchObject({
      message:
        "The vault has a partial onchain bootstrap state and must be reconciled before approval.",
    } satisfies Partial<AppError>);
  });

  it("finalizes verified review state after the onchain vault becomes readable", async () => {
    const finalizedShareMintAddress = "ShareMintAddress123456789ABCDEFGHJKLM";
    const finalizedVaultAddress = "VaultAddress123456789ABCDEFGHJKLMN";
    const finalizedSignature = "ApprovalSignature123456789ABCDEFGHJKLMN";

    queueResult(
      "vaults",
      "select-maybeSingle",
      ok({
        hardware_summary: { gpuCount: 8 },
        id: "vault-1",
        node_category: "GPU Cluster",
        node_label: "Atlas Node",
        onchain_vault_address: null,
        operator_profile_id: "operator-profile",
        platform_fee_bps: 1000,
        proof_bundle_hash: "proof-hash",
        public_metadata_hash: null,
        public_metadata_uri: null,
        public_share_supply: 120,
        share_price_usdc: "15.250000",
        slug: "atlas-node",
        status: "pending_review",
        token_mint_address: null,
        total_shares: 240,
        valuation_usdc: "3660.000000",
        verification_summary: null,
      }),
    );
    queueResult(
      "profiles",
      "select-maybeSingle",
      ok({
        wallet_address: "operator-wallet",
      }),
    );

    const prepared = await prepareVaultApproval(
      "vault-1",
      {
        notes: "Benchmark evidence and invoices were verified.",
      },
      adminSession,
    );

    queueResult(
      "vaults",
      "select-maybeSingle",
      ok({
        hardware_summary: { gpuCount: 8 },
        id: "vault-1",
        node_category: "GPU Cluster",
        node_label: "Atlas Node",
        onchain_vault_address: null,
        operator_profile_id: "operator-profile",
        platform_fee_bps: 1000,
        proof_bundle_hash: "proof-hash",
        public_metadata_hash: null,
        public_metadata_uri: null,
        public_share_supply: 120,
        share_price_usdc: "15.250000",
        slug: "atlas-node",
        status: "pending_review",
        token_mint_address: null,
        total_shares: 240,
        valuation_usdc: "3660.000000",
        verification_summary: null,
      }),
    );
    queueResult("verification_reviews", "insert", ok(null));
    queueResult(
      "vaults",
      "update-single",
      ok({
        id: "vault-1",
        onchain_vault_address: finalizedVaultAddress,
        public_metadata_uri: "ipfs://metadata-cid",
        status: "verified",
        token_mint_address: finalizedShareMintAddress,
        verified_at: "2026-04-07T10:00:00.000Z",
      }),
    );

    const finalized = await finalizeVaultApproval(
      "vault-1",
      {
        approvalToken: prepared.approvalToken,
        shareMintAddress: finalizedShareMintAddress,
        signature: finalizedSignature,
        vaultAddress: finalizedVaultAddress,
      },
      adminSession,
    );

    expect(finalized).toMatchObject({
      id: "vault-1",
      onchain_vault_address: finalizedVaultAddress,
      public_metadata_uri: "ipfs://metadata-cid",
      status: "verified",
      token_mint_address: finalizedShareMintAddress,
    });
    expect(
      recordedOperations.find(
        (operation) =>
          operation.table === "verification_reviews" &&
          operation.operation === "insert",
      ),
    ).toMatchObject({
      payload: {
        decision: "approved",
        notes: "Benchmark evidence and invoices were verified.",
        reviewer_profile_id: "admin-profile",
        vault_id: "vault-1",
      },
    });
    expect(
      recordedOperations.find(
        (operation) =>
          operation.table === "vaults" &&
          operation.operation === "update-single",
      ),
    ).toMatchObject({
      payload: expect.objectContaining({
        onchain_vault_address: finalizedVaultAddress,
        public_metadata_hash: "metadata-hash",
        public_metadata_uri: "ipfs://metadata-cid",
        status: "verified",
        token_mint_address: finalizedShareMintAddress,
      }),
    });
  });
});
