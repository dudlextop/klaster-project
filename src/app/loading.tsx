import { SystemStateFrame } from "@/components/klaster/system-state-frame";

export default function Loading() {
  return (
    <SystemStateFrame
      description="The server is assembling the current vault, platform, or marketplace snapshot. Wallet-bound actions stay blocked until the shell hydrates."
      eyebrow="Loading"
      meta="Server-rendered data is being prepared for the active route."
      title="Preparing the next product surface."
    >
      <div className="flex items-center gap-3">
        <div className="size-3 animate-pulse rounded-sm bg-primary" />
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Fetching current route data
        </p>
      </div>
    </SystemStateFrame>
  );
}
