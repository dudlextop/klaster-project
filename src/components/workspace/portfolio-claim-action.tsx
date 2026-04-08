"use client";

import {
  useSendTransaction,
  useSolanaClient,
  useWalletConnection,
  useWalletSession,
} from "@solana/react-hooks";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/format";
import { buildPortfolioClaimTransactionPlan } from "@/lib/solana/vault-live-action-transaction";
import type { PortfolioClaimBundle } from "@/lib/solana/vault-live-actions";
import { createPreferredWalletTransactionSigner } from "@/lib/solana/wallet-transaction-signer";
import type { PortfolioHolding } from "@/server/vaults/authenticated-read-model/types";

type PortfolioClaimActionProps = {
  actionMode: "demo" | "live";
  holding: PortfolioHolding;
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

export function PortfolioClaimAction({
  actionMode,
  holding,
}: PortfolioClaimActionProps) {
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedSignature, setSubmittedSignature] = useState<string | null>(
    null,
  );
  const [isPreparing, setIsPreparing] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const walletReady = status === "connected" && wallet;
  const isBusy = isPreparing || isSending || isRefreshing;

  async function handleClaim() {
    if (!walletReady || actionMode !== "live") {
      return;
    }

    setErrorMessage(null);
    setSubmittedSignature(null);
    setIsPreparing(true);
    reset();

    try {
      const prepareResponse = await fetch(
        `/api/portfolio/vaults/${holding.id}/claim/prepare`,
        {
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

      const bundle = (await prepareResponse.json()) as PortfolioClaimBundle;
      const walletAddress = wallet.account.address.toString();

      if (bundle.holderWalletAddress !== walletAddress) {
        throw new Error(
          "The connected browser wallet must match the signed-in investor session before yield can be claimed.",
        );
      }

      const wrappedSigner = createPreferredWalletTransactionSigner(wallet, {
        commitment: "confirmed",
      });
      const plan = await buildPortfolioClaimTransactionPlan({
        bundle,
        holderSigner: wrappedSigner.signer,
        solana,
      });
      const prepared = await solana.transaction.prepare({
        authority: wrappedSigner.signer,
        feePayer: wrappedSigner.signer,
        instructions: plan.instructions,
        version: "legacy",
      });
      const nextSignature = await sendPrepared(prepared, {
        commitment: "confirmed",
      });

      setSubmittedSignature(nextSignature.toString());
      startRefresh(() => {
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Yield claim failed.",
      );
    } finally {
      setIsPreparing(false);
    }
  }

  const buttonLabel =
    actionMode !== "live"
      ? "Claim unavailable"
      : holding.claimActionAvailability === "live_enabled"
        ? isPreparing
          ? "Preparing claim..."
          : isSending
            ? "Submitting claim..."
            : "Claim from vault"
        : holding.status === "paused"
          ? "Claim paused"
          : holding.claimableUsdc > 0
            ? "Claim unavailable"
            : "Nothing to claim";

  return (
    <div className="space-y-2" data-testid={`portfolio-claim-${holding.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={
            holding.claimActionAvailability === "live_enabled"
              ? "verified"
              : "secondary"
          }
        >
          {holding.claimActionAvailability === "live_enabled"
            ? "Claim enabled"
            : holding.status === "paused"
              ? "Claim paused"
              : "Claim blocked"}
        </Badge>
      </div>

      {!walletReady && actionMode === "live" ? (
        isReady && connectors.length ? (
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
                variant="ghost"
              >
                {connector.name}
              </Button>
            ))}
          </div>
        ) : (
          <p className="font-mono text-[10px] leading-5 text-muted-foreground">
            Connect the investor wallet to send the claim transaction.
          </p>
        )
      ) : null}

      <Button
        data-testid={`portfolio-claim-submit-${holding.id}`}
        disabled={
          !walletReady ||
          actionMode !== "live" ||
          holding.claimActionAvailability !== "live_enabled" ||
          isBusy
        }
        onClick={() => void handleClaim()}
        size="sm"
        type="button"
        variant="secondary"
      >
        {buttonLabel}
      </Button>

      {walletReady ? (
        <Button
          onClick={() => void disconnect()}
          size="sm"
          type="button"
          variant="ghost"
        >
          Disconnect
        </Button>
      ) : null}

      {holding.claimDisabledReason ? (
        <p className="font-mono text-[10px] leading-5 text-muted-foreground">
          {holding.claimDisabledReason}
        </p>
      ) : null}

      {sendStatus === "error" && sendError ? (
        <p className="font-mono text-[10px] leading-5 text-destructive">
          Claim send failed: {String(sendError)}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="font-mono text-[10px] leading-5 text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {submittedSignature ? (
        <p className="font-mono text-[10px] leading-5 text-badge-verified-fg">
          Submitted: {truncateAddress(submittedSignature, 6)}
        </p>
      ) : signature ? (
        <p className="font-mono text-[10px] leading-5 text-muted-foreground">
          Pending: {truncateAddress(signature.toString(), 6)}
        </p>
      ) : null}
    </div>
  );
}
