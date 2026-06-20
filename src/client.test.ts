import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ProfitleeError } from "./client.js";

const config = { baseUrl: "https://profitlee.com", apiToken: "eck_live_tok" };

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(body === undefined ? "" : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("apiRequest", () => {
  it("returns parsed JSON on 200 and hits baseUrl+path", async () => {
    const fetchMock = mockFetch(200, { result: { mode: "fba" } });
    vi.stubGlobal("fetch", fetchMock);
    const out = await apiRequest<{ result: { mode: string } }>(config, {
      method: "POST",
      path: "/api/v1/calculate",
      body: { a: 1 },
    });
    expect(out.result.mode).toBe("fba");
    expect(fetchMock.mock.calls[0][0]).toBe("https://profitlee.com/api/v1/calculate");
  });

  it("attaches Bearer token only when auth:true", async () => {
    const fetchMock = mockFetch(200, { scenarios: [] });
    vi.stubGlobal("fetch", fetchMock);
    await apiRequest(config, { method: "GET", path: "/api/v1/scenarios", auth: true });
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer eck_live_tok");
  });

  it("throws a friendly error (no fetch) when auth:true but no token", async () => {
    const fetchMock = mockFetch(200, {});
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      apiRequest(
        { baseUrl: config.baseUrl, apiToken: undefined },
        { method: "GET", path: "/api/v1/scenarios", auth: true },
      ),
    ).rejects.toThrowError(/PROFITLEE_API_TOKEN/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps known reason codes to readable messages", async () => {
    vi.stubGlobal("fetch", mockFetch(403, { reason: "pro_required" }));
    await expect(apiRequest(config, { method: "GET", path: "/api/v1/scenarios", auth: true })).rejects.toThrowError(
      /Pro plan/,
    );
  });

  it("includes issues for invalid_input", async () => {
    vi.stubGlobal("fetch", mockFetch(400, { reason: "invalid_input", issues: [{ path: ["price"], message: "x" }] }));
    await expect(apiRequest(config, { method: "POST", path: "/api/v1/calculate", body: {} })).rejects.toThrowError(
      /price/,
    );
  });

  it("wraps network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    await expect(apiRequest(config, { method: "GET", path: "/api/v1/scenarios" })).rejects.toThrowError(
      /Could not reach Profitlee/,
    );
  });

  it("ProfitleeError is the thrown type", async () => {
    vi.stubGlobal("fetch", mockFetch(404, { reason: "not_found" }));
    await expect(apiRequest(config, { method: "GET", path: "/api/v1/scenarios/x", auth: true })).rejects.toBeInstanceOf(
      ProfitleeError,
    );
  });
});
