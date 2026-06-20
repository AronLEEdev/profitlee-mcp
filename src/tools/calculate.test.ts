import { afterEach, describe, expect, it, vi } from "vitest";
import { runCalculate } from "./calculate.js";

const config = { baseUrl: "https://profitlee.com", apiToken: undefined };
const validFba = {
  platform: "amazon",
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

afterEach(() => vi.restoreAllMocks());

describe("runCalculate", () => {
  it("POSTs to /api/v1/calculate with NO auth header and returns result", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ result: { mode: "fba", netProfitAfterPPC: 1.7 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const out = (await runCalculate(config, validFba)) as { mode: string };
    expect(out.mode).toBe("fba");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://profitlee.com/api/v1/calculate");
    expect((init as RequestInit).method).toBe("POST");
    expect(((init as RequestInit).headers as Record<string, string>).authorization).toBeUndefined();
  });
});
