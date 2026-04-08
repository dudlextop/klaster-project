"use client";

import {
  useSendTransaction,
  useSolanaClient,
  useWalletConnection,
  useWalletSession,
} from "@solana/react-hooks";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/format";
import { buildOperatorDepositTransactionPlan } from "@/lib/solana/vault-live-action-transaction";
import type { OperatorDepositBundle } from "@/lib/solana/vault-live-actions";
import {
  createPreferredWalletTransactionSigner,
  resolveDirectWalletPreparedTransaction,
} from "@/lib/solana/wallet-transaction-signer";
import type { OperatorVaultDetailPageData } from "@/server/vaults/authenticated";

type OperatorDepositRailProps = {
  actionMode: OperatorVaultDetailPageData["actionMode"];
  vault: NonNullable<OperatorVaultDetailPageData["vault"]>;
};

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: { message?: string } | string;
    };

    if (typeof body.error === "string") {
      return body.error;
    }

    if (body.error?.message) {
      return body.error.message;
    }
  } catch {}

  return `${response.status} ${response.statusText}`.trim();
}

export function OperatorDepositRail({
  actionMode,
  vault,
}: OperatorDepositRailProps) {
  const amountId = useId();
  const router = useRouter();
  const solana = useSolanaClient();
  const wallet = useWalletSession();
  const { connect, connectors, disconnect, isReady, status } =
    useWalletConnection();
  const {
    error: sendError,
    isSending,
    reset,
    sendPrepared,
    signature,
    status: sendStatus,
  } = useSendTransaction();
  const [amountUsdc, setAmountUsdc] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [submittedSignature, setSubmittedSignature] = useState<string | null>(
    null,
  );
  const [isRefreshing, startRefresh] = useTransition();
  const walletReady = status === "connected" && wallet;
  const amountReady = amountUsdc.trim().length > 0;
  const isBusy = isPreparing || isSending || isRefreshing;

  async function handleDeposit() {
    if (!walletReady || !amountReady || actionMode !== "live") {
      return;
    }

    setErrorMessage(null);
    setSubmittedSignature(null);
    setIsPreparing(true);
    reset();

    try {
      const prepareResponse = await fetch(
        `/api/operator/vaults/${vault.id}/deposit/prepare`,
        {
          body: JSON.stringify({
            amountUsdc: amountUsdc.trim(),
          }),
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        },
      );

      if (!prepareResponse.ok) {
        throw new Error(await readErrorMessage(prepareResponse));
      }

      const bundle = (await prepareResponse.json()) as OperatorDepositBundle;
      const walletAddress = wallet.account.address.toString();

      if (bundle.operatorWalletAddress !== walletAddress) {
        throw new Error(
          "The connected browser wallet must match the signed-in operator session before revenue can be deposited.",
        );
      }

      const wrappedSigner = createPreferredWalletTransactionSigner(wallet, {
        commitment: "confirmed",
      });
      const plan = await buildOperatorDepositTransactionPlan({
        bundle,
        operatorSigner: wrappedSigner.signer,
        solana,
      });
      const prepared = await solana.transaction.prepare({
        authority: wrappedSigner.signer,
        feePayer: wrappedSigner.signer,
        instructions: plan.instructions,
        version: "legacy",
      });
      const directPrepared = resolveDirectWalletPreparedTransaction(
        prepared,
        wrappedSigner,
      );
      const nextSignature = await sendPrepared(directPrepared, {
        commitment: "confirmed",
      });

      setSubmittedSignature(nextSignature.toString());
      startRefresh(() => {
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Revenue deposit failed.",
      );
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="operator-deposit-rail">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={
            vault.depositActionAvailability === "live_enabled"
              ? "verified"
              : "secondary"
          }
        >
          {vault.depositActionAvailability === "live_enabled"
            ? "Deposit enabled"
            : actionMode === "demo"
              ? "Demo fallback"
              : "Deposit unavailable"}
        </Badge>
        {vault.mintedShares !== null ? (
          <Badge variant="secondary">
            Minted shares: {vault.mintedShares.toLocaleString()}
          </Badge>
        ) : null}
      </div>

      <label className="block space-y-2" htmlFor={amountId}>
        <span className="terminal-label block text-foreground">
          Deposit amount (SOL)
        </span>
        <input
          className="terminal-input"
          id={amountId}
          inputMode="decimal"
          onChange={(event) => setAmountUsdc(event.currentTarget.value)}
          placeholder="1.8"
          value={amountUsdc}
        />
      </label>

      {actionMode === "demo" ||
      vault.depositActionAvailability !== "live_enabled" ? (
        <p className="font-mono text-[10px] leading-6 text-muted-foreground">
          {vault.depositDisabledReason ??
            "Live revenue deposit is disabled in the current shell."}
        </p>
      ) : walletReady ? (
        <div className="rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Connected wallet</span>
            <span className="font-mono text-xs text-foreground">
              {truncateAddress(wallet.account.address.toString())}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Revenue deposits must be signed by the same wallet that owns the
            current operator session. The transaction wraps the entered SOL
            amount inside the live settlement rail automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm">
          <p className="text-muted-foreground">
            Connect the operator wallet in-browser to sign the revenue deposit
            transaction.
          </p>
          {isReady ? (
            connectors.length ? (
              <div className="flex flex-wrap gap-2">
                {connectors.map((connector) => (
                  <Button
                    key={connector.id}
                    onClick={() =>
                      void connect(connector.id, {
                        allowInteractiveFallback: true,
                        autoConnect: true,
                      })
                    }
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {connector.name}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="font-mono text-[10px] text-muted-foreground">
                No Wallet Standard connectors were discovered in this browser.
              </p>
            )
          ) : (
            <p className="font-mono text-[10px] text-muted-foreground">
              Wallet connectors will appear after client hydration completes.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          className="flex-1"
          data-testid="operator-deposit-submit"
          disabled={
            !walletReady ||
            !amountReady ||
            actionMode !== "live" ||
            vault.depositActionAvailability !== "live_enabled" ||
            isBusy
          }
          onClick={() => void handleDeposit()}
          type="button"
        >
          {isPreparing
            ? "Preparing deposit..."
            : isSending
              ? "Submitting deposit..."
              : "Deposit revenue"}
        </Button>
        {walletReady ? (
          <Button
            onClick={() => void disconnect()}
            type="button"
            variant="ghost"
          >
            Disconnect
          </Button>
        ) : null}
      </div>

      {sendStatus === "error" && sendError ? (
        <p className="font-mono text-[10px] leading-6 text-destructive">
          Deposit send failed: {String(sendError)}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="font-mono text-[10px] leading-6 text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {submittedSignature ? (
        <div className="rounded-md border border-badge-verified-bg bg-badge-verified-bg p-4 text-sm">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-badge-verified-fg">
            Deposit submitted
          </p>
          <p className="mt-1 font-mono text-xs text-badge-verified-fg">
            {truncateAddress(submittedSignature, 6)}
          </p>
        </div>
      ) : signature ? (
        <div className="rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
            Transaction submitted
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {truncateAddress(signature.toString(), 6)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
