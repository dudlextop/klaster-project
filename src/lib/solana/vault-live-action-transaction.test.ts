import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  OperatorDepositBundle,
  PortfolioClaimBundle,
} from "@/lib/solana/vault-live-actions";

const {
  mockBuildWrappedSolUnwrapInstruction,
  mockBuildWrappedSolWrapInstructions,
  mockGetClaimYieldInstructionAsync,
  mockGetCreateAssociatedTokenIdempotentInstructionAsync,
  mockGetDepositRevenueInstruction,
  mockIsWrappedSolMint,
  mockParseSettlementAtomicAmount,
  mockResolveVaultTransactionAccounts,
} = vi.hoisted(() => ({
  mockBuildWrappedSolUnwrapInstruction: vi.fn(),
  mockBuildWrappedSolWrapInstructions: vi.fn(),
  mockGetClaimYieldInstructionAsync: vi.fn(),
  mockGetCreateAssociatedTokenIdempotentInstructionAsync: vi.fn(),
  mockGetDepositRevenueInstruction: vi.fn(),
  mockIsWrappedSolMint: vi.fn(),
  mockParseSettlementAtomicAmount: vi.fn((value: string) =>
    BigInt(value.replace(".", "")),
  ),
  mockResolveVaultTransactionAccounts: vi.fn(),
}));

vi.mock("@solana-program/token", () => ({
  getCreateAssociatedTokenIdempotentInstructionAsync:
    mockGetCreateAssociatedTokenIdempotentInstructionAsync,
}));

vi.mock("@/programs/klaster-vault/generated/instructions", () => ({
  getClaimYieldInstructionAsync: mockGetClaimYieldInstructionAsync,
  getDepositRevenueInstruction: mockGetDepositRevenueInstruction,
}));

vi.mock("@/lib/solana/vault-transaction-accounts", () => ({
  parseSettlementAtomicAmount: mockParseSettlementAtomicAmount,
  resolveVaultTransactionAccounts: mockResolveVaultTransactionAccounts,
}));

vi.mock("@/lib/solana/settlement", () => ({
  buildWrappedSolUnwrapInstruction: mockBuildWrappedSolUnwrapInstruction,
  buildWrappedSolWrapInstructions: mockBuildWrappedSolWrapInstructions,
  isWrappedSolMint: mockIsWrappedSolMint,
}));

import {
  buildOperatorDepositTransactionPlan,
  buildPortfolioClaimTransactionPlan,
} from "@/lib/solana/vault-live-action-transaction";

const mockDepositSigner = { address: "operator-wallet" };
const mockClaimSigner = { address: "holder-wallet" };
const mockSolana = {
  runtime: {
    rpc: {},
  },
  splToken: vi.fn(),
};

function createOperatorBundle(
  overrides: Partial<OperatorDepositBundle> = {},
): OperatorDepositBundle {
  return {
    amountUsdc: "125.50",
    operatorWalletAddress: "operator-wallet",
    platformTreasuryOwnerAddress: "treasury-wallet",
    programAddress: "program-address",
    usdcMint: "usdc-mint",
    usdcTokenProgram: "token-program",
    vaultAddress: "vault-address",
    vaultId: "vault-id",
    ...overrides,
  };
}

function createClaimBundle(
  overrides: Partial<PortfolioClaimBundle> = {},
): PortfolioClaimBundle {
  return {
    holderWalletAddress: "holder-wallet",
    programAddress: "program-address",
    usdcMint: "usdc-mint",
    usdcTokenProgram: "token-program",
    vaultAddress: "vault-address",
    vaultId: "vault-id",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveVaultTransactionAccounts.mockResolvedValue({
    holderUsdcTokenAccount: "holder-usdc-ata",
    operatorUsdcTokenAccount: "operator-usdc-ata",
    platformTreasuryTokenAccount: "treasury-usdc-ata",
    revenuePoolTokenAccount: "revenue-pool-ata",
    vaultAuthority: "vault-authority",
  });
  mockBuildWrappedSolWrapInstructions.mockResolvedValue([
    "ix-wrap-sol-1",
    "ix-wrap-sol-2",
    "ix-wrap-sol-3",
  ]);
  mockBuildWrappedSolUnwrapInstruction.mockReturnValue("ix-unwrap-sol");
  mockIsWrappedSolMint.mockReturnValue(false);
  mockGetCreateAssociatedTokenIdempotentInstructionAsync
    .mockResolvedValueOnce("ix-create-operator-usdc")
    .mockResolvedValueOnce("ix-create-revenue-pool")
    .mockResolvedValueOnce("ix-create-treasury-usdc")
    .mockResolvedValueOnce("ix-create-holder-usdc");
  mockGetDepositRevenueInstruction.mockReturnValue("ix-deposit-revenue");
  mockGetClaimYieldInstructionAsync.mockResolvedValue("ix-claim-yield");
});

describe("vault live action transaction helpers", () => {
  it("builds the operator deposit transaction with ATA guards first", async () => {
    const plan = await buildOperatorDepositTransactionPlan({
      bundle: createOperatorBundle(),
      operatorSigner: mockDepositSigner as never,
      solana: mockSolana as never,
    });

    expect(plan.instructions).toEqual([
      "ix-create-operator-usdc",
      "ix-create-revenue-pool",
      "ix-create-treasury-usdc",
      "ix-deposit-revenue",
    ]);
    expect(mockGetDepositRevenueInstruction).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: BigInt(12550),
        operator: mockDepositSigner,
        operatorUsdcTokenAccount: "operator-usdc-ata",
        platformTreasuryTokenAccount: "treasury-usdc-ata",
        revenuePoolTokenAccount: "revenue-pool-ata",
      }),
      {
        programAddress: "program-address",
      },
    );
  });

  it("builds the per-vault claim transaction with an idempotent holder ATA create", async () => {
    mockGetCreateAssociatedTokenIdempotentInstructionAsync.mockReset();
    mockGetCreateAssociatedTokenIdempotentInstructionAsync.mockResolvedValue(
      "ix-create-holder-usdc",
    );

    const plan = await buildPortfolioClaimTransactionPlan({
      bundle: createClaimBundle(),
      holderSigner: mockClaimSigner as never,
      solana: mockSolana as never,
    });

    expect(plan.instructions).toEqual([
      "ix-create-holder-usdc",
      "ix-claim-yield",
    ]);
    expect(mockGetClaimYieldInstructionAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        holder: mockClaimSigner,
        holderUsdcTokenAccount: "holder-usdc-ata",
        revenuePoolTokenAccount: "revenue-pool-ata",
        vault: "vault-address",
      }),
      {
        programAddress: "program-address",
      },
    );
  });

  it("wraps and unwraps SOL settlement accounts when the vault uses wrapped SOL", async () => {
    mockIsWrappedSolMint.mockReturnValue(true);
    mockGetCreateAssociatedTokenIdempotentInstructionAsync.mockReset();
    mockGetCreateAssociatedTokenIdempotentInstructionAsync
      .mockResolvedValueOnce("ix-create-revenue-pool")
      .mockResolvedValueOnce("ix-create-treasury-usdc");

    const plan = await buildOperatorDepositTransactionPlan({
      bundle: createOperatorBundle({
        amountUsdc: "1.8",
        usdcMint: "So11111111111111111111111111111111111111112",
      }),
      operatorSigner: mockDepositSigner as never,
      solana: mockSolana as never,
    });

    expect(plan.instructions).toEqual([
      "ix-wrap-sol-1",
      "ix-wrap-sol-2",
      "ix-wrap-sol-3",
      "ix-create-revenue-pool",
      "ix-create-treasury-usdc",
      "ix-deposit-revenue",
      "ix-unwrap-sol",
    ]);
    expect(mockBuildWrappedSolWrapInstructions).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerSigner: mockDepositSigner,
        tokenAccount: "operator-usdc-ata",
      }),
    );
    expect(mockBuildWrappedSolUnwrapInstruction).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerSigner: mockDepositSigner,
        tokenAccount: "operator-usdc-ata",
      }),
    );
  });
});
