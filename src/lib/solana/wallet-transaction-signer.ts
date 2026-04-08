import {
  createWalletTransactionSigner,
  type TransactionPrepared,
  type WalletTransactionSigner,
} from "@solana/client";

type WalletSession = Parameters<typeof createWalletTransactionSigner>[0];
type WalletTransactionSignerConfig = Parameters<
  typeof createWalletTransactionSigner
>[1];

export function createPreferredWalletTransactionSigner(
  session: WalletSession,
  config: WalletTransactionSignerConfig = {},
): WalletTransactionSigner {
  return createWalletTransactionSigner(session, config);
}

export function resolveDirectWalletPreparedTransaction(
  prepared: TransactionPrepared,
  signer: WalletTransactionSigner,
): TransactionPrepared {
  if (signer.mode !== "partial" || !prepared.plan) {
    return prepared;
  }

  return Object.freeze({
    ...prepared,
    plan: undefined,
  });
}
