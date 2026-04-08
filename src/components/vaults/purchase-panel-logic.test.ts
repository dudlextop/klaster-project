import { describe, expect, it } from "vitest";
import {
  getInitialShareAmount,
  validatePurchaseQuantity,
} from "@/components/vaults/purchase-panel-logic";

describe("purchase panel quantity validation", () => {
  it("prefills live purchases with one share so devnet buyers stay within a realistic SOL budget", () => {
    expect(getInitialShareAmount(113)).toBe("1");
    expect(getInitialShareAmount(12)).toBe("1");
    expect(getInitialShareAmount(0)).toBe("");
  });

  it("accepts valid whole-number quantities", () => {
    expect(validatePurchaseQuantity("5", 100, 0.15)).toEqual({
      estimatedCostUsdc: 0.75,
      kind: "valid",
      shares: 5,
    });
  });

  it("rejects empty, zero, fractional, and oversized quantities", () => {
    expect(validatePurchaseQuantity("", 100, 98)).toMatchObject({
      kind: "invalid",
      reason: "empty",
    });
    expect(validatePurchaseQuantity("0", 100, 98)).toMatchObject({
      kind: "invalid",
      reason: "too_low",
    });
    expect(validatePurchaseQuantity("3.5", 100, 98)).toMatchObject({
      kind: "invalid",
      reason: "not_integer",
    });
    expect(validatePurchaseQuantity("101", 100, 98)).toMatchObject({
      kind: "invalid",
      reason: "too_high",
    });
  });
});
