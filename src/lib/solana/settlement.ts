import type { TransactionInstructionInput } from "@solana/client";
import { WRAPPED_SOL_MINT } from "@solana/client";
import type { Address, TransactionSigner } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  getCloseAccountInstruction,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getSyncNativeInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";

export const DEFAULT_SETTLEMENT_MINT = WRAPPED_SOL_MINT;
export const SETTLEMENT_DECIMALS = 9;
export const SETTLEMENT_ATOMIC_UNITS = BigInt(10 ** SETTLEMENT_DECIMALS);
export const SOL_WRAP_BUFFER_LAMPORTS = BigInt(10_000_000);

export function isWrappedSolMint(mintAddress: string) {
  return mintAddress === WRAPPED_SOL_MINT;
}

export async function buildWrappedSolWrapInstructions(input: {
  amountLamports: bigint;
  ownerSigner: TransactionSigner<string>;
  tokenAccount: Address<string>;
}): Promise<TransactionInstructionInput[]> {
  return [
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      mint: WRAPPED_SOL_MINT,
      owner: input.ownerSigner.address,
      payer: input.ownerSigner,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    }),
    getTransferSolInstruction({
      amount: input.amountLamports,
      destination: input.tokenAccount,
      source: input.ownerSigner,
    }),
    getSyncNativeInstruction({
      account: input.tokenAccount,
    }),
  ];
}

export function buildWrappedSolUnwrapInstruction(input: {
  ownerSigner: TransactionSigner<string>;
  tokenAccount: Address<string>;
}): TransactionInstructionInput {
  return getCloseAccountInstruction({
    account: input.tokenAccount,
    destination: input.ownerSigner.address,
    owner: input.ownerSigner,
  });
}
