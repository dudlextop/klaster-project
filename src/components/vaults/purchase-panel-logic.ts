export type PurchaseQuantityValidation =
  | {
      estimatedCostUsdc: number;
      kind: "valid";
      shares: number;
    }
  | {
      kind: "invalid";
      message: string;
      reason: "empty" | "not_integer" | "too_high" | "too_low";
    };

export function getInitialShareAmount(estimatedAvailableShares: number) {
  if (estimatedAvailableShares <= 0) {
    return "";
  }

  return String(Math.min(1, estimatedAvailableShares));
}

export function validatePurchaseQuantity(
  rawValue: string,
  estimatedAvailableShares: number,
  pricePerShareUsdc: number,
): PurchaseQuantityValidation {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return {
      kind: "invalid",
      message: "Enter a share quantity before submitting a purchase.",
      reason: "empty",
    };
  }

  if (!/^\d+$/.test(trimmedValue)) {
    return {
      kind: "invalid",
      message: "Share quantity must be a whole number.",
      reason: "not_integer",
    };
  }

  const shares = Number(trimmedValue);

  if (!Number.isSafeInteger(shares)) {
    return {
      kind: "invalid",
      message: "Share quantity is too large to process safely.",
      reason: "too_high",
    };
  }

  if (shares < 1) {
    return {
      kind: "invalid",
      message: "Share quantity must be at least 1.",
      reason: "too_low",
    };
  }

  if (shares > estimatedAvailableShares) {
    return {
      kind: "invalid",
      message: `Only ${estimatedAvailableShares.toLocaleString()} shares are currently available.`,
      reason: "too_high",
    };
  }

  return {
    estimatedCostUsdc: shares * pricePerShareUsdc,
    kind: "valid",
    shares,
  };
}
