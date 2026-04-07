import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Coins,
  Cpu,
  FileCheck2,
  ShieldCheck,
  Wallet,
  Waypoints,
} from "lucide-react";

export type HeroSignal = {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  metric: string;
  detail: string;
};

export type ProblemColumn = {
  title: string;
  description: string;
};

export type ProcessStep = {
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type TrustPillar = {
  title: string;
  description: string;
};

export const heroSignals: readonly HeroSignal[] = [
  {
    title: "Verification gate",
    eyebrow: "Verified by KlasterAI",
    description:
      "Invoice evidence, serial proof, and benchmark data are reviewed before a vault becomes public.",
    icon: ShieldCheck,
    metric: "3-source proof bundle",
    detail: "Only approved vaults become visible.",
  },
  {
    title: "Ownership and fee rules",
    eyebrow: "Constrained issuance",
    description:
      "Investor shares mint at purchase, while revenue and platform fees stay separated in the ledger.",
    icon: Coins,
    metric: "Net yield tracked onchain",
    detail: "No open secondary market in v1.",
  },
] as const;

export const problemColumns: readonly ProblemColumn[] = [
  {
    title: "Compute ownership is opaque",
    description:
      "Most AI infrastructure exposure hides the hardware, proof trail, and operator posture.",
  },
  {
    title: "Routing logic stays hidden",
    description:
      "Users are usually asked to trust routing decisions without seeing where demand goes or why.",
  },
  {
    title: "Originators lack a productized path",
    description:
      "Serious node owners still rely on spreadsheets, private diligence, and off-platform trust.",
  },
] as const;

export const processSteps: readonly ProcessStep[] = [
  {
    step: "01",
    title: "Open a vault",
    description:
      "An operator or KlasterAI originator prepares the asset, pricing, and proof package.",
    icon: Cpu,
  },
  {
    step: "02",
    title: "Review the proof bundle",
    description:
      "KlasterAI verifies the private evidence package before the vault becomes public.",
    icon: FileCheck2,
  },
  {
    step: "03",
    title: "Mint ownership at purchase",
    description:
      "Approved vaults open a public tranche, and non-transferable shares mint to the buyer wallet.",
    icon: Wallet,
  },
  {
    step: "04",
    title: "Route demand and split revenue with rules",
    description:
      "Revenue flows through a fee-aware accounting path while routing posture stays visible.",
    icon: Waypoints,
  },
] as const;

export const trustPillars: readonly TrustPillar[] = [
  {
    title: "Real asset, readable proof",
    description:
      "Approved metadata stays public while sensitive proof stays private.",
  },
  {
    title: "Constrained v1 economics",
    description:
      "KlasterAI does not ship transferability, a secondary market, or live provider automation before the model is ready.",
  },
  {
    title: "Marketplace-first orientation",
    description:
      "The landing page exists to explain the model quickly and move serious users into the marketplace.",
  },
] as const;

export const disclosureItems = [
  "Devnet-first launch with mainnet blocked pending audit work.",
  "Vault shares are non-transferable in v1.",
  "Primary sale proceeds are separate from revenue deposits.",
  "Routing telemetry remains seeded until live provider signals are ready.",
  "Sensitive proof documents stay private; only approved summaries become public.",
] as const;

export const heroHighlights = [
  "Verified AI compute pools.",
  "Readable routing and fee posture.",
  "Marketplace first.",
] as const;

export const evidenceStats = [
  { label: "Approved vaults only", value: "100%" },
  { label: "Public sale rail", value: "SOL" },
  { label: "Routing posture", value: "Seeded" },
] as const;

export const heroBadge = {
  icon: BadgeCheck,
  label: "Hybrid compute pools",
} as const;
