import { formatSolAmount } from "@/lib/format";

type UnknownRecord = Record<string, unknown>;

function collectStrings(value: unknown, seen = new Set<unknown>()): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (seen.has(value)) {
    return [];
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStrings(item, seen));
  }

  return Object.values(value).flatMap((item) => collectStrings(item, seen));
}

function findNumericCode(
  value: unknown,
  targetCode: number,
  seen = new Set<unknown>(),
): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (seen.has(value)) {
    return false;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.some((item) => findNumericCode(item, targetCode, seen));
  }

  if ("__code" in value && (value as UnknownRecord).__code === targetCode) {
    return true;
  }

  return Object.values(value).some((item) =>
    findNumericCode(item, targetCode, seen),
  );
}

function parseInsufficientLamportsFromStrings(strings: readonly string[]) {
  for (const value of strings) {
    const match = value.match(/insufficient lamports (\d+), need (\d+)/i);

    if (!match) {
      continue;
    }

    return {
      availableLamports: BigInt(match[1]),
      requiredLamports: BigInt(match[2]),
    };
  }

  return null;
}

function formatLamports(lamports: bigint) {
  return formatSolAmount(Number(lamports) / 1_000_000_000);
}

export function getUserFacingInvestmentErrorMessage(error: unknown) {
  const strings = collectStrings(error);
  const insufficientLamports = parseInsufficientLamportsFromStrings(strings);

  if (insufficientLamports) {
    return `Connected wallet has ${formatLamports(insufficientLamports.availableLamports)}, but this purchase needs about ${formatLamports(insufficientLamports.requiredLamports)}. Lower the share quantity or top up the wallet and try again.`;
  }

  if (findNumericCode(error, -32002) || findNumericCode(error, 7618003)) {
    return "Transaction simulation failed before submission. Check the connected SOL balance, then try a smaller share quantity.";
  }

  return null;
}
