import type { SolanaCluster } from "@/lib/env";

const solFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
  minimumFractionDigits: 2,
});
const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});
const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});
const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
});

export function formatSolAmount(value: number) {
  return `◎${solFormatter.format(value)}`;
}

export function formatUsdcAmount(value: number) {
  return formatSolAmount(value);
}

export function formatCompactNumber(value: number) {
  return compactNumberFormatter.format(value);
}

export function formatClusterLabel(cluster: SolanaCluster) {
  if (cluster === "mainnet-beta") {
    return "Mainnet Beta";
  }

  return cluster.charAt(0).toUpperCase() + cluster.slice(1);
}

export function truncateAddress(address: string, visibleChars = 4) {
  if (address.length <= visibleChars * 2 + 3) {
    return address;
  }

  return `${address.slice(0, visibleChars)}...${address.slice(-visibleChars)}`;
}

export function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

export function formatDateLabel(value: string) {
  return shortDateFormatter.format(new Date(value));
}

export function formatDateTimeLabel(value: string) {
  return longDateFormatter.format(new Date(value));
}
