"use client";

import {
  useBalance,
  useSendTransaction,
  useSolanaClient,
  useSplToken,
  useWalletConnection,
  useWalletSession,
} from "@solana/react-hooks";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getInitialShareAmount,
  validatePurchaseQuantity,
} from "@/components/vaults/purchase-panel-logic";
import {
  formatSolAmount,
  formatUsdcAmount,
  truncateAddress,
} from "@/lib/format";
import { buildPurchaseTransactionPlan } from "@/lib/solana/purchase-transaction";
import {
  isWrappedSolMint,
  SOL_WRAP_BUFFER_LAMPORTS,
} from "@/lib/solana/settlement";
import { toSettlementAtomicAmount } from "@/lib/solana/vault-transaction-accounts";
import { createPreferredWalletTransactionSigner } from "@/lib/solana/wallet-transaction-signer";
import type { PurchasePanelConfig } from "@/server/vaults/public";

type PurchasePanelProps = {
  availability: "live" | "paused" | "sold_out";
  nodeLabel: string;
  pricePerShareUsdc: number;
  purchaseConfig: PurchasePanelConfig;
};

function DisabledPurchasePanel({
  availability,
  nodeLabel,
  purchaseConfig,
}: PurchasePanelProps) {
  const disableReason =
    purchaseConfig.mode === "demo"
      ? purchaseConfig.reason
      : availability === "paused"
        ? "This vault is paused and must remain non-purchasable until verified status is restored."
        : "The full public tranche has already minted to buyers, so this purchase rail stays visible but disabled.";
  const statusLabel =
    availability === "paused"
      ? "Paused"
      : availability === "sold_out"
        ? "Sold out"
        : "Runtime unavailable";

  return (
    <Card
      className="overflow-hidden bg-surface/92"
      data-testid="vault-purchase-panel"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--warning)),hsl(var(--primary)),transparent)]" />
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={availability === "paused" ? "destructive" : "secondary"}
          >
            {statusLabel}
          </Badge>
          <Badge variant="secondary">Investment rail</Badge>
        </div>
        <div className="space-y-2">
          <CardTitle>Invest in pool</CardTitle>
          <CardDescription>
            {nodeLabel} keeps its purchase surface visible, but the action is
            currently disabled for this state.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border-subtle bg-surface-2/80 p-4 text-sm leading-6 text-muted-foreground">
          {disableReason}
        </div>
        <div className="grid gap-3 rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Share price</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatUsdcAmount(purchaseConfig.sharePriceUsdc)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Estimated available</span>
            <span className="font-semibold tabular-nums text-foreground">
              {purchaseConfig.estimatedAvailableShares.toLocaleString()} shares
            </span>
          </div>
        </div>
        <Button
          className="w-full"
          data-testid="vault-purchase-submit"
          disabled
          variant="secondary"
        >
          Invest unavailable
        </Button>
      </CardContent>
    </Card>
  );
}

function LivePurchasePanel({
  nodeLabel,
  pricePerShareUsdc,
  purchaseConfig,
}: PurchasePanelProps & {
  purchaseConfig: Extract<PurchasePanelConfig, { mode: "live" }>;
}) {
  const inputId = useId();
  const inputHintId = `${inputId}-hint`;
  const solana = useSolanaClient();
  const session = useWalletSession();
  const { connect, connectors, disconnect, isReady, status } =
    useWalletConnection();
  const {
    error: sendError,
    isSending,
    reset,
    send,
    signature,
    status: sendStatus,
  } = useSendTransaction();
  const [shareAmount, setShareAmount] = useState(() =>
    getInitialShareAmount(purchaseConfig.estimatedAvailableShares),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const usesNativeSolSettlement = isWrappedSolMint(purchaseConfig.usdcMint);
  const solBalance = useBalance(session?.account.address, {
    watch: true,
  });
  const usdcBalance = useSplToken(purchaseConfig.usdcMint, {
    config: {
      tokenProgram: purchaseConfig.usdcTokenProgram,
    },
    owner: session?.account.address,
    revalidateOnFocus: false,
  });
  const quantityState = validatePurchaseQuantity(
    shareAmount,
    purchaseConfig.estimatedAvailableShares,
    pricePerShareUsdc,
  );
  const estimatedCost =
    quantityState.kind === "valid" ? quantityState.estimatedCostUsdc : 0;
  const estimatedCostAtomic =
    quantityState.kind === "valid"
      ? toSettlementAtomicAmount(estimatedCost)
      : BigInt(0);
  const walletReady = status === "connected" && session;
  const hasBalanceData = usesNativeSolSettlement
    ? solBalance.lamports !== null
    : usdcBalance.balance?.amount !== undefined;
  const hasSufficientBalance =
    quantityState.kind !== "valid" || !hasBalanceData
      ? true
      : usesNativeSolSettlement
        ? (solBalance.lamports ?? BigInt(0)) >=
          estimatedCostAtomic + SOL_WRAP_BUFFER_LAMPORTS
        : (usdcBalance.balance?.amount ?? BigInt(0)) >= estimatedCostAtomic;
  const formattedSettlementBalance = usesNativeSolSettlement
    ? solBalance.lamports !== null
      ? formatSolAmount(Number(solBalance.lamports) / 1_000_000_000)
      : "Loading"
    : usdcBalance.balance?.uiAmount !== undefined
      ? `${usdcBalance.balance.uiAmount} settlement`
      : "Loading";

  async function handlePurchase() {
    if (!session || quantityState.kind !== "valid") {
      return;
    }

    setErrorMessage(null);
    reset();
    try {
      const wrappedSigner = createPreferredWalletTransactionSigner(session, {
        commitment: "confirmed",
      });
      const plan = await buildPurchaseTransactionPlan({
        buyerSigner: wrappedSigner.signer,
        purchaseConfig,
        shares: quantityState.shares,
        solana,
      });

      await send({
        authority: wrappedSigner.signer,
        feePayer: wrappedSigner.signer,
        instructions: plan.instructions,
        prepareTransaction: false,
        version: "legacy",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Investment failed.",
      );
    }
  }

  return (
    <Card
      className="overflow-hidden bg-surface/92"
      data-testid="vault-purchase-panel"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--secondary)),hsl(var(--primary)),transparent)]" />
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="verified">Live investment path</Badge>
          <Badge variant="secondary">Wallet Standard-first</Badge>
        </div>
        <div className="space-y-2">
          <CardTitle>Invest in pool</CardTitle>
          <CardDescription>
            The action rail stays stable while you inspect verification, health,
            and economics for {nodeLabel}.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Share price</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatUsdcAmount(pricePerShareUsdc)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Estimated available</span>
            <span className="font-semibold tabular-nums text-foreground">
              {purchaseConfig.estimatedAvailableShares.toLocaleString()} shares
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Program</span>
            <span className="font-mono text-xs text-foreground">
              {truncateAddress(purchaseConfig.programAddress)}
            </span>
          </div>
        </div>

        <label className="block space-y-2" htmlFor={inputId}>
          <span className="terminal-label block text-foreground">
            Share quantity
          </span>
          <input
            aria-describedby={inputHintId}
            aria-invalid={quantityState.kind === "invalid"}
            className="terminal-input"
            id={inputId}
            inputMode="numeric"
            max={purchaseConfig.estimatedAvailableShares}
            min={1}
            onChange={(event) => setShareAmount(event.currentTarget.value)}
            value={shareAmount}
          />
        </label>
        <p className="text-xs leading-5 text-muted-foreground" id={inputHintId}>
          {quantityState.kind === "valid"
            ? `Enter between 1 and ${purchaseConfig.estimatedAvailableShares.toLocaleString()} shares.`
            : quantityState.message}
        </p>

        <div className="rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Estimated cost</span>
            <span className="font-semibold tabular-nums text-foreground">
              {quantityState.kind === "valid"
                ? formatUsdcAmount(estimatedCost)
                : "Enter a valid quantity"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Buyer shares mint directly to the connected wallet. Primary sale
            proceeds do not enter the claimable revenue pool, and net yield is
            tracked separately from the platform performance fee.
          </p>
        </div>

        {walletReady ? (
          <div className="rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Connected wallet</span>
              <span className="font-mono text-xs text-foreground">
                {truncateAddress(session.account.address.toString())}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {usesNativeSolSettlement ? "SOL balance" : "Settlement balance"}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {formattedSettlementBalance}
              </span>
            </div>
            {usesNativeSolSettlement ? (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                A small SOL buffer stays reserved for ATA rent and transaction
                fees while the wallet wraps settlement SOL inside the purchase
                transaction.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 rounded-md border border-border-subtle bg-surface-2/70 p-4 text-sm">
            <p className="text-muted-foreground">
              Connect a Wallet Standard wallet to build and send the investment
              transaction from this rail.
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

        {walletReady ? (
          <div className="flex gap-3">
            <Button
              className="flex-1"
              data-testid="vault-purchase-submit"
              disabled={
                isSending ||
                quantityState.kind !== "valid" ||
                !hasSufficientBalance
              }
              onClick={() => void handlePurchase()}
              type="button"
            >
              {isSending ? "Submitting investment..." : "Invest in pool"}
            </Button>
            <Button
              onClick={() => void disconnect()}
              type="button"
              variant="ghost"
            >
              Disconnect
            </Button>
          </div>
        ) : null}

        {!hasSufficientBalance && walletReady ? (
          <p className="font-mono text-[10px] text-warning">
            Connected SOL balance looks lower than the estimated cost plus the
            temporary account buffer for this quantity.
          </p>
        ) : null}

        {errorMessage ? (
          <p className="font-mono text-[10px] leading-6 text-destructive">
            Investment failed: {errorMessage}
          </p>
        ) : sendStatus === "error" && sendError ? (
          <p className="font-mono text-[10px] leading-6 text-destructive">
            Investment failed:{" "}
            {sendError instanceof Error
              ? sendError.message
              : "The browser wallet rejected or aborted the transaction."}
          </p>
        ) : null}

        {signature ? (
          <div className="rounded-md border border-badge-verified-bg bg-badge-verified-bg p-4 text-sm">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-badge-verified-fg">
              Purchase submitted
            </p>
            <p className="mt-1 font-mono text-xs text-badge-verified-fg">
              {truncateAddress(signature.toString(), 6)}
            </p>
          </div>
        ) : null}

        <p className="font-mono text-[10px] leading-5 text-muted-foreground">
          The chart remains paired with plain-language health interpretation so
          the purchase rail never becomes the only decision surface.
        </p>
      </CardContent>
    </Card>
  );
}

export function PurchasePanel(props: PurchasePanelProps) {
  if (props.availability !== "live" || props.purchaseConfig.mode === "demo") {
    return <DisabledPurchasePanel {...props} />;
  }

  return <LivePurchasePanel {...props} purchaseConfig={props.purchaseConfig} />;
}
