import Link from "next/link";
import { SystemStateFrame } from "@/components/klaster/system-state-frame";
import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <SystemStateFrame
      description="A signed session is required before this action or route can proceed. Public vault browsing stays open while wallet-signed actions stay protected."
      eyebrow="401 / sign-in required"
      meta="Wallet Standard connection and SIWS remain the existing authentication path."
      title="Sign in with a wallet session before continuing."
    >
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/marketplace">Browse marketplace</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </SystemStateFrame>
  );
}
