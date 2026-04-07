import type { SolanaClient } from "@solana/client";
import type { Address } from "@solana/kit";
import { SETTLEMENT_DECIMALS } from "@/lib/solana/settlement";
import { findVaultAuthorityPda } from "@/programs/klaster-vault/generated/pdas";

type SplTokenCapableClient = Pick<SolanaClient, "splToken">;

type ResolveVaultTransactionAccountsInput = {
  adminMultisig?: Address<string>;
  operatorAddress?: Address<string>;
  holderAddress?: Address<string>;
  shareMint?: Address<string>;
  shareTokenProgram?: Address<string>;
  solana: SplTokenCapableClient;
  usdcMint: Address<string>;
  usdcTokenProgram: Address<string>;
  vaultAddress: Address<string>;
};

export async function resolveVaultTransactionAccounts(
  input: ResolveVaultTransactionAccountsInput,
) {
  const [vaultAuthority] = await findVaultAuthorityPda({
    vault: input.vaultAddress,
  });
  const usdcHelper = input.solana.splToken({
    mint: input.usdcMint,
    tokenProgram: input.usdcTokenProgram,
  });
  const shareHelper =
    input.shareMint && input.shareTokenProgram
      ? input.solana.splToken({
          mint: input.shareMint,
          tokenProgram: input.shareTokenProgram,
        })
      : null;

  const [
    revenuePoolTokenAccount,
    platformTreasuryTokenAccount,
    operatorSettlementTokenAccount,
    operatorUsdcTokenAccount,
    holderUsdcTokenAccount,
    holderShareTokenAccount,
    operatorShareTokenAccount,
  ] = await Promise.all([
    usdcHelper.deriveAssociatedTokenAddress(vaultAuthority),
    input.adminMultisig
      ? usdcHelper.deriveAssociatedTokenAddress(input.adminMultisig)
      : Promise.resolve(undefined),
    input.operatorAddress
      ? usdcHelper.deriveAssociatedTokenAddress(input.operatorAddress)
      : Promise.resolve(undefined),
    input.operatorAddress
      ? usdcHelper.deriveAssociatedTokenAddress(input.operatorAddress)
      : Promise.resolve(undefined),
    input.holderAddress
      ? usdcHelper.deriveAssociatedTokenAddress(input.holderAddress)
      : Promise.resolve(undefined),
    shareHelper && input.holderAddress
      ? shareHelper.deriveAssociatedTokenAddress(input.holderAddress)
      : Promise.resolve(undefined),
    shareHelper && input.operatorAddress
      ? shareHelper.deriveAssociatedTokenAddress(input.operatorAddress)
      : Promise.resolve(undefined),
  ]);

  return {
    holderShareTokenAccount,
    holderUsdcTokenAccount,
    operatorSettlementTokenAccount,
    operatorShareTokenAccount,
    operatorUsdcTokenAccount,
    platformTreasuryTokenAccount,
    revenuePoolTokenAccount,
    vaultAuthority,
  };
}

export function toSettlementAtomicAmount(value: number) {
  return BigInt(Math.round(value * 10 ** SETTLEMENT_DECIMALS));
}

export function parseSettlementAtomicAmount(value: number | string) {
  const normalizedValue =
    typeof value === "number"
      ? value.toFixed(SETTLEMENT_DECIMALS)
      : value.trim();
  const match = normalizedValue.match(/^([0-9]+)(?:\.([0-9]+))?$/);

  if (!match) {
    throw new Error(`Invalid SOL amount: ${value}`);
  }

  const [, wholePart, fractionalPart = ""] = match;
  const normalizedFraction = fractionalPart
    .padEnd(SETTLEMENT_DECIMALS, "0")
    .slice(0, SETTLEMENT_DECIMALS);

  return BigInt(`${wholePart}${normalizedFraction}`);
}

export const USDC_DECIMALS = SETTLEMENT_DECIMALS;
export const toUsdcAtomicAmount = toSettlementAtomicAmount;
export const parseUsdcAtomicAmount = parseSettlementAtomicAmount;
