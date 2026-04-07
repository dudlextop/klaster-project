import type { SolanaClient, TransactionInstructionInput } from "@solana/client";
import type { Address, TransactionSigner } from "@solana/kit";
import { getCreateAssociatedTokenIdempotentInstructionAsync } from "@solana-program/token";
import {
  buildWrappedSolUnwrapInstruction,
  buildWrappedSolWrapInstructions,
  isWrappedSolMint,
} from "@/lib/solana/settlement";
import { parseSettlementAtomicAmount } from "@/lib/solana/vault-transaction-accounts";
import { getPurchaseSharesInstructionAsync } from "@/programs/klaster-vault/generated/instructions/purchaseShares";
import type { PurchasePanelConfig } from "@/server/vaults/public-read-model/types";

type LivePurchaseConfig = Extract<PurchasePanelConfig, { mode: "live" }>;
type PurchaseSolanaClient = Pick<SolanaClient, "splToken">;

type BuildPurchaseTransactionPlanInput = {
  buyerSigner: TransactionSigner<string>;
  purchaseConfig: LivePurchaseConfig;
  shares: number;
  solana: PurchaseSolanaClient;
};

export async function buildPurchaseTransactionPlan({
  buyerSigner,
  purchaseConfig,
  shares,
  solana,
}: BuildPurchaseTransactionPlanInput) {
  const usdcHelper = solana.splToken({
    mint: purchaseConfig.usdcMint,
    tokenProgram: purchaseConfig.usdcTokenProgram,
  });
  const shareHelper = solana.splToken({
    mint: purchaseConfig.shareMint,
    tokenProgram: purchaseConfig.shareTokenProgram,
  });
  const [buyerUsdcTokenAccount, buyerShareTokenAccount] = await Promise.all([
    usdcHelper.deriveAssociatedTokenAddress(buyerSigner.address),
    shareHelper.deriveAssociatedTokenAddress(buyerSigner.address),
  ]);

  const instructions: TransactionInstructionInput[] = [];
  const paymentAmount =
    BigInt(shares) * parseSettlementAtomicAmount(purchaseConfig.sharePriceUsdc);

  if (isWrappedSolMint(purchaseConfig.usdcMint)) {
    instructions.push(
      ...(await buildWrappedSolWrapInstructions({
        amountLamports: paymentAmount,
        ownerSigner: buyerSigner,
        tokenAccount: buyerUsdcTokenAccount,
      })),
    );
  } else {
    instructions.push(
      await getCreateAssociatedTokenIdempotentInstructionAsync({
        mint: purchaseConfig.usdcMint as Address<string>,
        owner: buyerSigner.address as Address<string>,
        payer: buyerSigner,
        tokenProgram: purchaseConfig.usdcTokenProgram as Address<string>,
      }),
    );
  }

  instructions.push(
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      mint: purchaseConfig.shareMint as Address<string>,
      owner: buyerSigner.address as Address<string>,
      payer: buyerSigner,
      tokenProgram: purchaseConfig.shareTokenProgram as Address<string>,
    }),
    await getPurchaseSharesInstructionAsync(
      {
        buyer: buyerSigner,
        buyerShareTokenAccount,
        buyerUsdcTokenAccount,
        operatorSettlementTokenAccount:
          purchaseConfig.operatorSettlementTokenAccount as Address<string>,
        shareMint: purchaseConfig.shareMint as Address<string>,
        shareTokenProgram: purchaseConfig.shareTokenProgram as Address<string>,
        shares: BigInt(shares),
        usdcMint: purchaseConfig.usdcMint as Address<string>,
        usdcTokenProgram: purchaseConfig.usdcTokenProgram as Address<string>,
        vault: purchaseConfig.vaultAddress as Address<string>,
      },
      {
        programAddress: purchaseConfig.programAddress as Address<string>,
      },
    ),
  );

  if (isWrappedSolMint(purchaseConfig.usdcMint)) {
    instructions.push(
      buildWrappedSolUnwrapInstruction({
        ownerSigner: buyerSigner,
        tokenAccount: buyerUsdcTokenAccount,
      }),
    );
  }

  return {
    buyerShareTokenAccount,
    buyerUsdcTokenAccount,
    instructions,
  };
}
