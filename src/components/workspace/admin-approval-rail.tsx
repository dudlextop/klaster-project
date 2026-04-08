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
import type { PreparedAdminApproval } from "@/lib/solana/admin-approval";
import { buildAdminApprovalTransactionPlan } from "@/lib/solana/admin-approval-transaction";
import {
  createPreferredWalletTransactionSigner,
  resolveDirectWalletPreparedTransaction,
} from "@/lib/solana/wallet-transaction-signer";
import type { AdminReviewDetailPageData } from "@/server/vaults/authenticated";

type AdminApprovalRailProps = {
  actionMode: AdminReviewDetailPageData["actionMode"];
  review: NonNullable<AdminReviewDetailPageData["review"]>;
};

type ApprovalResult = {
  shareMintAddress: string;
  signature: string;
  vaultAddress: string;
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

export function AdminApprovalRail({
  actionMode,
  review,
}: AdminApprovalRailProps) {
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
  const [approvalResult, setApprovalResult] = useState<ApprovalResult | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [notes, setNotes] = useState(() => review.verificationNotes.trim());
  const [isRefreshing, startRefresh] = useTransition();
  const walletReady = status === "connected" && wallet;
  const notesReady = notes.trim().length >= 3;
  const isApprovable =
    actionMode === "live" && review.status === "pending_review";
  const isBusy = isPreparing || isSending || isFinalizing || isRefreshing;

  async function handleApprove() {
    if (!walletReady || !notesReady || !wallet) {
      return;
    }

    setApprovalResult(null);
    setErrorMessage(null);
    setIsPreparing(true);
    reset();

    try {
      const prepareResponse = await fetch(
        `/api/admin/verifications/${review.id}/approve/prepare`,
        {
          body: JSON.stringify({
            notes: notes.trim(),
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

      const preparedApproval =
        (await prepareResponse.json()) as PreparedAdminApproval;
      const walletAddress = wallet.account.address.toString();

      if (preparedApproval.bundle.adminWalletAddress !== walletAddress) {
        throw new Error(
          "The connected browser wallet must match the signed-in session before approval can be sent.",
        );
      }

      const wrappedSigner = createPreferredWalletTransactionSigner(wallet, {
        commitment: "confirmed",
      });
      const plan = await buildAdminApprovalTransactionPlan({
        adminSigner: wrappedSigner.signer,
        bundle: preparedApproval.bundle,
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
      const submittedSignature = await sendPrepared(directPrepared, {
        commitment: "confirmed",
      });

      setIsPreparing(false);
      setIsFinalizing(true);

      const finalizeResponse = await fetch(
        `/api/admin/verifications/${review.id}/approve/finalize`,
        {
          body: JSON.stringify({
            approvalToken: preparedApproval.approvalToken,
            shareMintAddress: plan.shareMintAddress.toString(),
            signature: submittedSignature.toString(),
            vaultAddress: plan.vaultAddress.toString(),
          }),
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        },
      );

      if (!finalizeResponse.ok) {
        throw new Error(await readErrorMessage(finalizeResponse));
      }

      setApprovalResult({
        shareMintAddress: plan.shareMintAddress.toString(),
        signature: submittedSignature.toString(),
        vaultAddress: plan.vaultAddress.toString(),
      });
      startRefresh(() => {
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Vault approval failed.",
      );
    } finally {
      setIsFinalizing(false);
      setIsPreparing(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="admin-approval-rail">
      <div className="rounded-lg border border-border-subtle bg-surface-2/70 p-4 text-sm leading-6 text-muted-foreground">
        Approval publishes the public metadata snapshot, bootstraps the
        Token-2022 share mint when needed, and finalizes the verified off-chain
        review state only after the onchain vault is readable.
      </div>

      <label className="block space-y-2" htmlFor="admin-approval-notes">
        <span className="terminal-label block text-foreground">
          Approval notes
        </span>
        <textarea
          className="terminal-textarea"
          id="admin-approval-notes"
          onChange={(event) => setNotes(event.currentTarget.value)}
          placeholder="Document the evidence that justifies verification."
          value={notes}
        />
      </label>
      <p className="text-xs leading-5 text-muted-foreground">
        These notes are published into the approval metadata snapshot and reused
        for the final review record.
      </p>

      {actionMode === "demo" ? (
        <div className="rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm leading-6 text-muted-foreground">
          Demo mode keeps the approval rail visible for inspection, but the
          wallet-signed bootstrap sequence stays disabled until the live session
          and runtime are configured.
        </div>
      ) : walletReady ? (
        <div className="rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Connected wallet</span>
            <span className="font-mono text-xs text-foreground">
              {truncateAddress(wallet.account.address.toString())}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            This wallet must match the signed-in session before the approval
            bundle can be sent.
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm">
          <p className="text-muted-foreground">
            Connect a Wallet Standard wallet in-browser to send the onchain
            bootstrap and approval transaction.
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

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isApprovable ? "verified" : "secondary"}>
          {isApprovable
            ? "Approvable"
            : `State: ${review.status.replace(/_/g, " ")}`}
        </Badge>
        <Badge variant="secondary">Wallet-signed review</Badge>
      </div>

      {!isApprovable ? (
        <p className="font-mono text-[10px] leading-6 text-muted-foreground">
          This vault is no longer in the pending-review state, so the live
          approval rail remains visible but disabled.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          className="flex-1"
          data-testid="admin-approval-submit"
          disabled={!walletReady || !notesReady || !isApprovable || isBusy}
          onClick={() => void handleApprove()}
          type="button"
        >
          {isPreparing
            ? "Preparing approval..."
            : isSending
              ? "Submitting approval..."
              : isFinalizing
                ? "Finalizing review..."
                : "Approve vault"}
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
        <Button disabled type="button" variant="secondary">
          Request more info
        </Button>
        <Button disabled type="button" variant="destructive">
          Reject submission
        </Button>
      </div>

      {!notesReady ? (
        <p className="font-mono text-[10px] leading-5 text-warning">
          Approval notes must be at least three characters long before the
          bundle can be prepared.
        </p>
      ) : null}

      {sendStatus === "error" && sendError ? (
        <p className="font-mono text-[10px] leading-6 text-destructive">
          Transaction send failed: {String(sendError)}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="font-mono text-[10px] leading-6 text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {approvalResult ? (
        <div
          className="rounded-md border border-badge-verified-bg bg-badge-verified-bg p-4 text-sm"
          data-testid="admin-approval-status"
        >
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-badge-verified-fg">
            Approval finalized
          </p>
          <div className="mt-3 space-y-1 font-mono text-xs text-badge-verified-fg">
            <p>Signature: {truncateAddress(approvalResult.signature, 6)}</p>
            <p>Vault: {truncateAddress(approvalResult.vaultAddress, 6)}</p>
            <p>Mint: {truncateAddress(approvalResult.shareMintAddress, 6)}</p>
          </div>
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
