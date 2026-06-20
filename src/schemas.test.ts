import { describe, expect, it } from "vitest";
import { z } from "zod";
import { calcInputShape } from "./schemas.js";

const obj = z.object(calcInputShape);

const validFba = {
  region: "us",
  mode: "fba",
  L: 17,
  W: 13,
  H: 4,
  weight: 1.4,
  fob: 3.2,
  headShip: 1.1,
  duty: 0.96,
  inboundOption: "single",
  storageMonths: 1.5,
  storageSeason: "janSep",
  price: 24.99,
  ppcAcos: 0.18,
  returnRate: 0.05,
  monthlyVolume: 300,
  referralPct: 0.15,
  isApparel: false,
};

describe("calcInputShape", () => {
  it("accepts a valid FBA payload and defaults platform to amazon", () => {
    const parsed = obj.parse(validFba);
    expect(parsed.platform).toBe("amazon");
    expect(parsed.mode).toBe("fba");
  });

  it("rejects an out-of-range rate", () => {
    expect(() => obj.parse({ ...validFba, ppcAcos: 1.5 })).toThrow();
  });

  it("rejects a non-positive price", () => {
    expect(() => obj.parse({ ...validFba, price: 0 })).toThrow();
  });

  it("allows mode-specific fields to be omitted (API enforces per-mode)", () => {
    const { inboundOption, storageMonths, storageSeason, ...rest } = validFba;
    expect(() => obj.parse({ ...rest, mode: "fbt", storageMonthsPastFree: 0 })).not.toThrow();
  });

  it("every field carries a description (LLM affordance)", () => {
    for (const [, schema] of Object.entries(calcInputShape)) {
      expect((schema as z.ZodTypeAny).description, "missing .describe()").toBeTruthy();
    }
  });
});
