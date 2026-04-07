import Link from "next/link";
import { SystemStateFrame } from "@/components/klaster/system-state-frame";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <SystemStateFrame
      description="The requested route is not mapped inside the current verified marketplace shell. Return to a known product surface and continue from there."
      eyebrow="404 / route missing"
      meta="Marketplace, vault detail, portfolio, and review surfaces are linked from the shared shell."
      title="That screen does not exist in the current KlasterAI platform."
    >
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/marketplace">Open marketplace</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </SystemStateFrame>
  );
}
