import {
  createWalletTransactionSigner,
  type WalletTransactionSigner,
} from "@solana/client";
import {
  getBase58Encoder,
  signatureBytes,
  type TransactionSendingSigner,
} from "@solana/kit";

type WalletSession = Parameters<typeof createWalletTransactionSigner>[0];
type WalletTransactionSignerConfig = Parameters<
  typeof createWalletTransactionSigner
>[1];
type WalletSendableTransaction = Parameters<
  NonNullable<WalletSession["sendTransaction"]>
>[0];
type SignAndSendTransactions = Parameters<
  TransactionSendingSigner["signAndSendTransactions"]
>[0];
type SignAndSendTransactionsConfig = Parameters<
  TransactionSendingSigner["signAndSendTransactions"]
>[1];

export function createPreferredWalletTransactionSigner(
  session: WalletSession,
  config: WalletTransactionSignerConfig = {},
): WalletTransactionSigner {
  const sendTransaction = session.sendTransaction;

  if (sendTransaction) {
    const base58Encoder = getBase58Encoder();

    return {
      mode: "send" as const,
      signer: Object.freeze({
        address: session.account.address,
        async signAndSendTransactions(
          transactions: SignAndSendTransactions,
          _sendConfig?: SignAndSendTransactionsConfig,
        ) {
          const signatures = [];

          for (const transaction of transactions) {
            const signature = await sendTransaction(
              transaction as WalletSendableTransaction,
              config.commitment
                ? {
                    commitment: config.commitment,
                  }
                : undefined,
            );

            signatures.push(signatureBytes(base58Encoder.encode(signature)));
          }

          return Object.freeze(signatures);
        },
      }),
    };
  }

  return createWalletTransactionSigner(session, config);
}
