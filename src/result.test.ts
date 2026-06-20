import { describe, expect, it } from "vitest";
import { ProfitleeError } from "./client.js";
import { toToolResult } from "./result.js";

describe("toToolResult", () => {
  it("serializes a successful value to pretty JSON text content", async () => {
    const r = await toToolResult(async () => ({ mode: "fba", net: 1.7 }));
    expect(r.isError).toBeFalsy();
    expect(r.content[0].type).toBe("text");
    expect(r.content[0].text).toContain('"mode": "fba"');
  });

  it("maps a ProfitleeError to an error result with its message", async () => {
    const r = await toToolResult(async () => {
      throw new ProfitleeError("Saved scenarios require a Profitlee Pro plan.");
    });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("Pro plan");
  });

  it("maps an unexpected error generically", async () => {
    const r = await toToolResult(async () => {
      throw new Error("boom");
    });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("boom");
  });
});
