import { describe, expect, it } from "vitest";
import {
  formatClusterLabel,
  formatCompactNumber,
  formatDateLabel,
  formatPercent,
  formatSolAmount,
  formatUsdcAmount,
  truncateAddress,
} from "@/lib/format";

describe("format helpers", () => {
  it("formats SOL amounts with the Solana marker", () => {
    expect(formatSolAmount(1234.5)).toBe("◎1,234.50");
  });

  it("keeps the legacy settlement formatter mapped to SOL output", () => {
    expect(formatUsdcAmount(0.125)).toBe("◎0.125");
  });

  it("formats the mainnet cluster label cleanly", () => {
    expect(formatClusterLabel("mainnet-beta")).toBe("Mainnet Beta");
  });

  it("formats compact numbers for dense product surfaces", () => {
    expect(formatCompactNumber(12500)).toBe("12.5K");
  });

  it("formats percentages with a percent sign", () => {
    expect(formatPercent(94.6)).toBe("94.6%");
  });

  it("formats short dates for chart labels", () => {
    expect(formatDateLabel("2026-04-04T10:30:00.000Z")).toBe("Apr 4");
  });

  it("truncates long wallet addresses", () => {
    expect(truncateAddress("8xV3c6z7k1T4m9Y2d8F1p5Q7r4S2w9Z6", 4)).toBe(
      "8xV3...w9Z6",
    );
  });
});
