import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteScenario, getScenario, listScenarios, saveScenario, updateScenario } from "./scenarios.js";

const config = { baseUrl: "https://profitlee.com", apiToken: "eck_live_tok" };
const noToken = { baseUrl: "https://profitlee.com", apiToken: undefined };

function ok(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}

function lastInit(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls[0][1] as RequestInit;
}

const inputs = {
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

describe("scenario tools", () => {
  it("listScenarios GETs /api/v1/scenarios with auth", async () => {
    const f = ok({ scenarios: [{ id: "a" }] });
    vi.stubGlobal("fetch", f);
    const out = (await listScenarios(config)) as { scenarios: unknown[] };
    expect(out.scenarios).toHaveLength(1);
    expect(f.mock.calls[0][0]).toBe("https://profitlee.com/api/v1/scenarios");
    expect((lastInit(f).headers as Record<string, string>).authorization).toBe("Bearer eck_live_tok");
  });

  it("getScenario GETs /api/v1/scenarios/:id", async () => {
    const f = ok({ scenario: { id: "abc" } });
    vi.stubGlobal("fetch", f);
    await getScenario(config, { id: "abc" });
    expect(f.mock.calls[0][0]).toBe("https://profitlee.com/api/v1/scenarios/abc");
  });

  it("saveScenario POSTs name + inputs", async () => {
    const f = ok({ scenario: { id: "new" } }, 201);
    vi.stubGlobal("fetch", f);
    await saveScenario(config, { name: "Test", inputs });
    const init = lastInit(f);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Test", inputs });
  });

  it("updateScenario with inputs uses PUT", async () => {
    const f = ok({ scenario: { id: "abc" } });
    vi.stubGlobal("fetch", f);
    await updateScenario(config, { id: "abc", inputs, name: "Renamed" });
    const init = lastInit(f);
    expect(f.mock.calls[0][0]).toBe("https://profitlee.com/api/v1/scenarios/abc");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ inputs, name: "Renamed" });
  });

  it("updateScenario with only name uses PATCH", async () => {
    const f = ok({ scenario: { id: "abc", name: "Renamed" } });
    vi.stubGlobal("fetch", f);
    await updateScenario(config, { id: "abc", name: "Renamed" });
    const init = lastInit(f);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Renamed" });
  });

  it("updateScenario with neither name nor inputs throws (no fetch)", async () => {
    const f = ok({});
    vi.stubGlobal("fetch", f);
    await expect(updateScenario(config, { id: "abc" })).rejects.toThrowError(/name or inputs/i);
    expect(f).not.toHaveBeenCalled();
  });

  it("deleteScenario DELETEs /api/v1/scenarios/:id", async () => {
    const f = ok({ deleted: "abc" });
    vi.stubGlobal("fetch", f);
    await deleteScenario(config, { id: "abc" });
    expect(lastInit(f).method).toBe("DELETE");
  });

  it("scenario tools require a token (preflight, no fetch)", async () => {
    const f = ok({});
    vi.stubGlobal("fetch", f);
    await expect(listScenarios(noToken)).rejects.toThrowError(/PROFITLEE_API_TOKEN/);
    expect(f).not.toHaveBeenCalled();
  });
});
