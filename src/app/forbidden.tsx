import Link from "next/link";
import { SystemStateFrame } from "@/components/klaster/system-state-frame";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <SystemStateFrame
      description="This route is currently unavailable for the active platform session."
      eyebrow="403 / forbidden"
      meta="Access boundaries are enforced by the current auth and guard settings."
      title="This screen is not available right now."
    >
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/portfolio">Open portfolio</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/marketplace">Open marketplace</Link>
        </Button>
      </div>
    </SystemStateFrame>
  );
}
