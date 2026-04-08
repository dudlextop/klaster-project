import { describe, expect, it } from "vitest";
import { getUserFacingInvestmentErrorMessage } from "@/lib/solana/user-facing-errors";

describe("getUserFacingInvestmentErrorMessage", () => {
  it("explains insufficient lamports with readable SOL amounts", () => {
    const message = getUserFacingInvestmentErrorMessage({
      context: {
        logs: ["Transfer: insufficient lamports 1997955720, need 15000000000"],
      },
    });

    expect(message).toContain("◎1.998");
    expect(message).toContain("◎15.00");
  });

  it("falls back to a generic preflight message for -32002", () => {
    const message = getUserFacingInvestmentErrorMessage({
      context: {
        __code: -32002,
      },
    });

    expect(message).toContain(
      "Transaction simulation failed before submission",
    );
  });
});
