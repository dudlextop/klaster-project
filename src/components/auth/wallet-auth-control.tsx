"use client";

import { useWalletConnection, useWalletSession } from "@solana/react-hooks";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { encodeBase58 } from "@/lib/base58";
import { truncateAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WalletAuthMode } from "@/server/auth/runtime";
import type { AppSession } from "@/server/auth/session";

type WalletAuthControlProps = {
  authMode: WalletAuthMode;
  className?: string;
  session: AppSession | null;
};

const textEncoder = new TextEncoder();

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { error?: { message?: string } };

    if (body.error?.message) {
      return body.error.message;
    }
  } catch {}

  return `${response.status} ${response.statusText}`.trim();
}

export function WalletAuthControl({
  authMode,
  className,
  session: currentSession,
}: WalletAuthControlProps) {
  const router = useRouter();
  const wallet = useWalletSession();
  const { connect, connectors, disconnect, isReady, status } =
    useWalletConnection();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  const walletReady = status === "connected" && wallet;
  const isBusy = isSigningIn || isLoggingOut || isRefreshing;
  const walletAddress = wallet?.account.address.toString();
  const sessionWalletMismatch =
    Boolean(currentSession && walletAddress) &&
    currentSession?.walletAddress !== walletAddress;

  function refreshRoute() {
    startRefresh(() => {
      router.refresh();
    });
  }

  async function handleSignIn() {
    if (!wallet || !walletAddress || !wallet.signMessage) {
      return;
    }

    setIsSigningIn(true);
    setErrorMessage(null);

    try {
      const challengeResponse = await fetch("/api/auth/siws/challenge", {
        body: JSON.stringify({
          walletAddress,
        }),
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!challengeResponse.ok) {
        throw new Error(await readErrorMessage(challengeResponse));
      }

      const challenge = (await challengeResponse.json()) as {
        message: string;
      };
      const signatureBytes = await wallet.signMessage(
        textEncoder.encode(challenge.message),
      );
      const verifyResponse = await fetch("/api/auth/siws/verify", {
        body: JSON.stringify({
          message: challenge.message,
          signature: encodeBase58(signatureBytes),
          walletAddress,
        }),
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!verifyResponse.ok) {
        throw new Error(await readErrorMessage(verifyResponse));
      }

      refreshRoute();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Wallet sign-in failed.",
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/siws/logout", {
        credentials: "same-origin",
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      refreshRoute();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Wallet logout failed.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded border border-border bg-surface-2 p-3 text-sm",
        className,
      )}
      data-testid="wallet-auth-control"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={
            authMode === "live"
              ? currentSession
                ? "verified"
                : "secondary"
              : "pending"
          }
        >
          {authMode === "live"
            ? currentSession
              ? "Signed in"
              : "Wallet auth"
            : "Demo fallback"}
        </Badge>
        {currentSession ? <Badge variant="secondary">MVP access</Badge> : null}
      </div>

      {authMode === "demo" ? (
        <div className="space-y-2" data-testid="wallet-auth-demo">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Seeded demo sessions active. Configure `SESSION_SECRET`,
            `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` to
            enable live auth.
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Wallet connection for public investment still works independently,
            while the rest of the platform stays visible through the MVP preview
            layer.
          </p>
        </div>
      ) : currentSession ? (
        <div className="space-y-3" data-testid="wallet-auth-signed-in">
          <div className="space-y-1">
            <p className="font-mono text-[11px] font-semibold text-foreground">
              {truncateAddress(currentSession.walletAddress)}
            </p>
            <p className="font-mono text-[10px] leading-5 text-muted-foreground">
              Shared MVP access is enabled for this signed-in session.
            </p>
          </div>

          {walletReady ? (
            <p className="font-mono text-[10px] leading-5 text-muted-foreground">
              Connected browser wallet: {truncateAddress(walletAddress ?? "")}
            </p>
          ) : (
            <p className="font-mono text-[10px] leading-5 text-muted-foreground">
              Connect the same wallet in-browser when you want to sign live
              transactions from this shell.
            </p>
          )}

          {sessionWalletMismatch ? (
            <p className="font-mono text-[10px] leading-5 text-warning">
              The browser wallet differs from the active app session. Switch the
              wallet or sign out before sending live actions.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!walletReady && isReady
              ? connectors.map((connector) => (
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
                ))
              : null}

            {walletReady ? (
              <Button
                onClick={() => void disconnect()}
                size="sm"
                type="button"
                variant="ghost"
              >
                Disconnect wallet
              </Button>
            ) : null}

            <Button
              data-testid="wallet-auth-logout"
              disabled={isBusy}
              onClick={() => void handleLogout()}
              size="sm"
              type="button"
              variant="secondary"
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3" data-testid="wallet-auth-signed-out">
          <p className="text-sm leading-6 text-muted-foreground">
            Connect a Wallet Standard wallet, then sign the KlasterAI challenge
            to unlock shared MVP access and wallet-signed actions.
          </p>

          {walletReady ? (
            <div className="space-y-3 rounded border border-border bg-surface-3 p-3">
              <div className="space-y-1">
                <p className="font-mono text-[11px] font-semibold text-foreground">
                  {truncateAddress(walletAddress ?? "")}
                </p>
                <p className="font-mono text-[10px] leading-5 text-muted-foreground">
                  {wallet.signMessage
                    ? "This wallet can sign the SIWS challenge."
                    : "This wallet does not expose message signing in the current browser session."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  data-testid="wallet-auth-sign-in"
                  disabled={!wallet.signMessage || isBusy}
                  onClick={() => void handleSignIn()}
                  size="sm"
                  type="button"
                >
                  {isSigningIn ? "Signing in..." : "Sign in"}
                </Button>
                <Button
                  onClick={() => void disconnect()}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : isReady ? (
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
              <p className="font-mono text-[10px] leading-5 text-muted-foreground">
                No Wallet Standard connectors were discovered in this browser.
              </p>
            )
          ) : (
            <p className="font-mono text-[10px] leading-5 text-muted-foreground">
              Wallet connectors will appear after client hydration completes.
            </p>
          )}
        </div>
      )}

      {errorMessage ? (
        <p className="font-mono text-[10px] leading-5 text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
