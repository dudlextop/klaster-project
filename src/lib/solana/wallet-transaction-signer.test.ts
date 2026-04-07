import { describe, expect, it, vi } from "vitest";
import { createPreferredWalletTransactionSigner } from "@/lib/solana/wallet-transaction-signer";

type WalletSession = Parameters<
  typeof createPreferredWalletTransactionSigner
>[0];

const accountAddress =
  "buyer-wallet-address" as WalletSession["account"]["address"];
const connector = {
  id: "phantom",
  name: "Phantom",
} satisfies WalletSession["connector"];

describe("createPreferredWalletTransactionSigner", () => {
  it("prefers the wallet send path when sendTransaction is available", () => {
    const session: WalletSession = {
      account: {
        address: accountAddress,
        publicKey: new Uint8Array(),
      },
      connector,
      disconnect: vi.fn(),
      sendTransaction: vi.fn(),
      signTransaction: vi.fn(),
    };

    const signer = createPreferredWalletTransactionSigner(session, {
      commitment: "confirmed",
    });

    expect(signer.mode).toBe("send");
    expect("signAndSendTransactions" in signer.signer).toBe(true);
  });

  it("falls back to the client wallet signer wrapper when sendTransaction is absent", () => {
    const session: WalletSession = {
      account: {
        address: accountAddress,
        publicKey: new Uint8Array(),
      },
      connector,
      disconnect: vi.fn(),
      signTransaction: vi.fn(async (transaction) => transaction),
    };

    const signer = createPreferredWalletTransactionSigner(session, {
      commitment: "confirmed",
    });

    expect(signer.mode).toBe("partial");
    expect("signTransactions" in signer.signer).toBe(true);
  });
});
