import { TOKEN_PROGRAM_ADDRESS } from "@solana/client";
import { z } from "zod";
import type {
  OperatorDepositBundle,
  PortfolioClaimBundle,
} from "@/lib/solana/vault-live-actions";
import { parseUsdcAtomicAmount } from "@/lib/solana/vault-transaction-accounts";
import type { AppSession } from "@/server/auth/session";
import { AppError } from "@/server/http/errors";
import { getLiveOperatorVaultDetail } from "@/server/vaults/authenticated-read-model/operator";
import { getLivePortfolioPageData } from "@/server/vaults/authenticated-read-model/portfolio";
import { readLiveVaultActionConfig } from "@/server/vaults/live-action-config";

export const operatorDepositPrepareSchema = z.object({
  amountUsdc: z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d{1,9})?$/),
});

export const portfolioClaimPrepareSchema = z.object({});

function getAdminMultisig() {
  const adminMultisig = process.env.SOLANA_ADMIN_MULTISIG?.trim();

  if (!adminMultisig) {
    throw new AppError(
      503,
      "Live deposit runtime is incomplete because the treasury wallet is not configured.",
    );
  }

  return adminMultisig;
}

export async function prepareOperatorDeposit(
  vaultId: string,
  rawInput: z.infer<typeof operatorDepositPrepareSchema>,
  session: AppSession,
): Promise<OperatorDepositBundle> {
  const input = operatorDepositPrepareSchema.parse(rawInput);
  const amountAtomic = parseUsdcAtomicAmount(input.amountUsdc);

  if (amountAtomic <= BigInt(0)) {
    throw new AppError(400, "Deposit amount must be greater than zero.");
  }

  const detail = await getLiveOperatorVaultDetail(session, vaultId);
  const vault = detail.vault;

  if (!vault) {
    throw new AppError(404, "Vault not found.");
  }

  if (
    vault.depositActionAvailability !== "live_enabled" ||
    !vault.vaultAddress
  ) {
    throw new AppError(
      409,
      vault.depositDisabledReason ??
        "Live revenue deposit is unavailable for this vault.",
    );
  }

  const liveActionConfig = await readLiveVaultActionConfig(vault.vaultAddress);

  if (!liveActionConfig) {
    throw new AppError(
      409,
      "Live revenue deposit is unavailable because the onchain vault configuration could not be resolved.",
    );
  }

  return {
    amountUsdc: input.amountUsdc,
    operatorWalletAddress: session.walletAddress,
    platformTreasuryOwnerAddress: getAdminMultisig(),
    programAddress: liveActionConfig.programAddress,
    usdcMint: liveActionConfig.usdcMint,
    usdcTokenProgram: liveActionConfig.usdcTokenProgram,
    vaultAddress: liveActionConfig.vaultAddress,
    vaultId: vault.id,
  };
}

export async function preparePortfolioClaim(
  vaultId: string,
  session: AppSession,
): Promise<PortfolioClaimBundle> {
  const portfolio = await getLivePortfolioPageData(session);
  const holding = portfolio.holdings.find(
    (candidate) => candidate.id === vaultId,
  );

  if (!holding) {
    throw new AppError(404, "Holding not found for this wallet.");
  }

  if (
    holding.claimActionAvailability !== "live_enabled" ||
    !holding.vaultAddress
  ) {
    throw new AppError(
      409,
      holding.claimDisabledReason ??
        "Live claim execution is unavailable for this vault.",
    );
  }

  const liveActionConfig = await readLiveVaultActionConfig(
    holding.vaultAddress,
  );

  if (!liveActionConfig) {
    throw new AppError(
      409,
      "Live claim execution is unavailable because the vault's onchain configuration could not be resolved.",
    );
  }

  return {
    holderWalletAddress: session.walletAddress,
    programAddress: liveActionConfig.programAddress,
    usdcMint: liveActionConfig.usdcMint,
    usdcTokenProgram:
      liveActionConfig.usdcTokenProgram ?? TOKEN_PROGRAM_ADDRESS,
    vaultAddress: liveActionConfig.vaultAddress,
    vaultId: holding.id,
  };
}
