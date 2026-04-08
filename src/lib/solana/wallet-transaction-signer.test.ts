import { describe, expect, it, vi } from "vitest";
import {
  createPreferredWalletTransactionSigner,
  resolveDirectWalletPreparedTransaction,
} from "@/lib/solana/wallet-transaction-signer";

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

    expect(signer.mode).toBe("partial");
    expect("signTransactions" in signer.signer).toBe(true);
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

  it("removes the transaction executor plan for partial wallet signers", () => {
    const signer = {
      mode: "partial" as const,
      signer: {
        address: accountAddress,
        signTransactions: vi.fn(),
      },
    };
    const prepared = {
      commitment: "confirmed" as const,
      feePayer: accountAddress,
      instructions: [],
      lifetime: {
        blockhash: "blockhash" as never,
        lastValidBlockHeight: BigInt(1),
      },
      message: {} as never,
      mode: "partial" as const,
      plan: {} as never,
      version: "legacy" as const,
    };

    const resolved = resolveDirectWalletPreparedTransaction(prepared, signer);

    expect(resolved.plan).toBeUndefined();
    expect(resolved.mode).toBe("partial");
  });
});
