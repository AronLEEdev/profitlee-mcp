# Profitlee MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A stdio MCP server (`npx profitlee-mcp`) that exposes Profitlee's profit calculator and scenario CRUD as MCP tools, wrapping the public Profitlee HTTP API.

**Architecture:** Thin TypeScript server using `@modelcontextprotocol/sdk`. It makes HTTPS calls to the Profitlee API — `POST /api/v1/calculate` (public, no token) for `calculate_profit`, and `/api/v1/scenarios*` (Pro token via `PROFITLEE_API_TOKEN`) for scenario tools. A single `apiRequest` wrapper maps the API's stable `reason` error codes to readable messages. The calculate tool advertises a flat, richly-described Zod shape; the API stays the strict validation authority.

**Tech Stack:** Node 20+ (global `fetch`), TypeScript (ESM, NodeNext), `@modelcontextprotocol/sdk`, `zod`, `vitest`, `tsx`.

**Reference:** Design spec at `docs/superpowers/specs/2026-06-18-profitlee-mcp-design.md`. The Profitlee API contract (input fields, endpoints, error reasons) is documented at https://profitlee.com/docs/api.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json` | Package metadata, `bin`, scripts, deps. |
| `tsconfig.json` | ESM/NodeNext TS config. |
| `vitest.config.ts` | Test config (include `src/**/*.test.ts`). |
| `.gitignore` | Ignore `node_modules`, `dist`. |
| `src/config.ts` | Read + normalize env (`PROFITLEE_BASE_URL`, `PROFITLEE_API_TOKEN`). |
| `src/client.ts` | `apiRequest` fetch wrapper + `ProfitleeError` + reason→message map. |
| `src/schemas.ts` | Shared Zod shapes (`calcInputShape`) + field descriptions. |
| `src/tools/calculate.ts` | `calculate_profit` tool: handler + `registerCalculateTool`. |
| `src/tools/scenarios.ts` | `list/get/save/update/delete` scenario tools. |
| `src/result.ts` | `toToolResult` helper: run a fn, map result/`ProfitleeError` to MCP tool result. |
| `src/index.ts` | Bootstrap: create server, register all tools, connect stdio. |
| `README.md` | Install, config, env vars, client snippet. |

Tests live next to sources: `src/config.test.ts`, `src/client.test.ts`, `src/schemas.test.ts`, `src/tools/calculate.test.ts`, `src/tools/scenarios.test.ts`, `src/result.test.ts`.

**Conventions for every task:** ESM source uses `.js` import suffixes (e.g. `import { loadConfig } from "./config.js"`). Work on the existing `feat/mcp-server` branch. Run commands from the repo root `/Users/aronlee/Documents/Workspace/profitlee-mcp`.

---

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "profitlee-mcp",
  "version": "0.1.0",
  "description": "MCP server for the Profitlee ecommerce profit calculator (Amazon FBA/FBM + TikTok Shop).",
  "license": "MIT",
  "type": "module",
  "bin": { "profitlee-mcp": "dist/index.js" },
  "files": ["dist"],
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/**/*.test.ts"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules
dist
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: lockfile created, `node_modules` populated, no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore
git commit -m "chore: scaffold profitlee-mcp (TS ESM + sdk + vitest)"
```

---

### Task 2: Config loader

**Files:**
- Create: `src/config.ts`, `src/config.test.ts`

- [ ] **Step 1: Write the failing test** — `src/config.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("defaults baseUrl to production and token to undefined", () => {
    const c = loadConfig({});
    expect(c.baseUrl).toBe("https://profitlee.com");
    expect(c.apiToken).toBeUndefined();
  });

  it("reads overrides and strips trailing slashes from baseUrl", () => {
    const c = loadConfig({ PROFITLEE_BASE_URL: "http://localhost:3000/", PROFITLEE_API_TOKEN: "eck_live_x" });
    expect(c.baseUrl).toBe("http://localhost:3000");
    expect(c.apiToken).toBe("eck_live_x");
  });

  it("treats blank/whitespace token as undefined", () => {
    expect(loadConfig({ PROFITLEE_API_TOKEN: "   " }).apiToken).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config.test.ts`
Expected: FAIL — cannot find module `./config.js`.

- [ ] **Step 3: Write `src/config.ts`**

```ts
export interface Config {
  /** Profitlee API origin, no trailing slash. */
  baseUrl: string;
  /** Pro API token (eck_live_…), or undefined when not configured. */
  apiToken: string | undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const baseUrl = (env.PROFITLEE_BASE_URL ?? "https://profitlee.com").replace(/\/+$/, "");
  const token = env.PROFITLEE_API_TOKEN?.trim();
  return { baseUrl, apiToken: token ? token : undefined };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/config.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/config.ts src/config.test.ts
git commit -m "feat: config loader for base URL + API token"
```

---

### Task 3: API client + error mapping

**Files:**
- Create: `src/client.ts`, `src/client.test.ts`

- [ ] **Step 1: Write the failing test** — `src/client.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
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
      method: "POST", path: "/api/v1/calculate", body: { a: 1 },
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
      apiRequest({ baseUrl: config.baseUrl, apiToken: undefined }, { method: "GET", path: "/api/v1/scenarios", auth: true }),
    ).rejects.toThrowError(/PROFITLEE_API_TOKEN/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps known reason codes to readable messages", async () => {
    vi.stubGlobal("fetch", mockFetch(403, { reason: "pro_required" }));
    await expect(apiRequest(config, { method: "GET", path: "/api/v1/scenarios", auth: true }))
      .rejects.toThrowError(/Pro plan/);
  });

  it("includes issues for invalid_input", async () => {
    vi.stubGlobal("fetch", mockFetch(400, { reason: "invalid_input", issues: [{ path: ["price"], message: "x" }] }));
    await expect(apiRequest(config, { method: "POST", path: "/api/v1/calculate", body: {} }))
      .rejects.toThrowError(/price/);
  });

  it("wraps network failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    await expect(apiRequest(config, { method: "GET", path: "/api/v1/scenarios" }))
      .rejects.toThrowError(/Could not reach Profitlee/);
  });

  it("ProfitleeError is the thrown type", async () => {
    vi.stubGlobal("fetch", mockFetch(404, { reason: "not_found" }));
    await expect(apiRequest(config, { method: "GET", path: "/api/v1/scenarios/x", auth: true }))
      .rejects.toBeInstanceOf(ProfitleeError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/client.test.ts`
Expected: FAIL — cannot find module `./client.js`.

- [ ] **Step 3: Write `src/client.ts`**

```ts
import type { Config } from "./config.js";

/** Error type for every failure surfaced to the MCP caller. */
export class ProfitleeError extends Error {}

/** Stable API `reason` codes → human messages. See https://profitlee.com/docs/api. */
const REASON_MESSAGES: Record<string, string> = {
  auth_required: "Set PROFITLEE_API_TOKEN to a valid Pro API token.",
  invalid_token: "PROFITLEE_API_TOKEN is not valid — check it on your Profitlee account page.",
  pro_required: "Saved scenarios require a Profitlee Pro plan.",
  scenario_limit: "You've reached the saved-scenario limit. Delete one before creating another.",
  invalid_input: "The calculator inputs failed validation.",
  invalid_json: "The request body was not valid JSON.",
  not_found: "Scenario not found.",
};

export interface RequestOptions {
  method: string;
  /** Path beginning with a slash, e.g. "/api/v1/calculate". */
  path: string;
  body?: unknown;
  /** When true, require + attach the Pro token. */
  auth?: boolean;
}

export async function apiRequest<T>(config: Config, opts: RequestOptions): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.auth) {
    if (!config.apiToken) {
      throw new ProfitleeError("This action needs a Pro API token. Set PROFITLEE_API_TOKEN.");
    }
    headers.authorization = `Bearer ${config.apiToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}${opts.path}`, {
      method: opts.method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "network error";
    throw new ProfitleeError(`Could not reach Profitlee (${detail}).`);
  }

  const text = await res.text();
  let json: unknown;
  if (text) {
    try { json = JSON.parse(text); } catch { /* leave undefined */ }
  }

  if (!res.ok) {
    const obj = (json ?? {}) as { reason?: string; issues?: unknown; limit?: number };
    const base = (obj.reason && REASON_MESSAGES[obj.reason]) || `Profitlee request failed (HTTP ${res.status}).`;
    const limit = typeof obj.limit === "number" ? ` (limit ${obj.limit})` : "";
    const issues = obj.issues ? ` Issues: ${JSON.stringify(obj.issues)}` : "";
    throw new ProfitleeError(base + limit + issues);
  }

  return json as T;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/client.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/client.ts src/client.test.ts
git commit -m "feat: API client wrapper with reason->message mapping + token preflight"
```

---

### Task 4: Input schema (shared Zod shape)

**Files:**
- Create: `src/schemas.ts`, `src/schemas.test.ts`

- [ ] **Step 1: Write the failing test** — `src/schemas.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { calcInputShape } from "./schemas.js";

const obj = z.object(calcInputShape);

const validFba = {
  region: "us", mode: "fba",
  L: 17, W: 13, H: 4, weight: 1.4,
  fob: 3.2, headShip: 1.1, duty: 0.96,
  inboundOption: "single", storageMonths: 1.5, storageSeason: "janSep",
  price: 24.99, ppcAcos: 0.18, returnRate: 0.05, monthlyVolume: 300,
  referralPct: 0.15, isApparel: false,
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/schemas.test.ts`
Expected: FAIL — cannot find module `./schemas.js`.

- [ ] **Step 3: Write `src/schemas.ts`**

```ts
import { z } from "zod";

/**
 * Flat, richly-described shape for calculator inputs. Advertised to the LLM as
 * the tool input schema. Mode-specific fields are optional here; the Profitlee
 * API is the strict authority and enforces which fields each mode requires
 * (returning reason "invalid_input" with issues otherwise).
 *
 * Units: US uses inches + pounds; DE/JP use cm + kg. All rates are 0–1 decimals.
 */
export const calcInputShape = {
  platform: z.enum(["amazon", "tiktok_shop"]).default("amazon").describe("Sales platform. Default: amazon."),
  region: z.enum(["us", "de", "jp"]).describe("Marketplace. US uses inches+pounds; DE/JP use cm+kg."),
  mode: z.enum(["fba", "fbm", "fbt", "self_fulfilled"]).describe("Fulfillment mode. amazon: fba or fbm. tiktok_shop: fbt or self_fulfilled."),

  L: z.number().positive().describe("Length. US: inches; DE/JP: cm."),
  W: z.number().positive().describe("Width. US: inches; DE/JP: cm."),
  H: z.number().positive().describe("Height. US: inches; DE/JP: cm."),
  weight: z.number().positive().describe("Unit weight. US: pounds; DE/JP: kg."),

  fob: z.number().nonnegative().describe("Unit manufacturing / FOB cost in the marketplace currency."),
  headShip: z.number().nonnegative().describe("Inbound freight cost allocated per unit."),
  duty: z.number().nonnegative().describe("Import duty per unit."),

  price: z.number().min(0.01).describe("Selling price per unit (gross; VAT-inclusive for DE/JP)."),
  ppcAcos: z.number().min(0).max(1).describe("Advertising ACoS as a 0–1 decimal (0.15 = 15%)."),
  adSalesShare: z.number().min(0).max(1).optional().describe("Ad-attributed share of sales, 0–1. Omit to default to 1."),
  returnRate: z.number().min(0).max(1).describe("Return rate as a 0–1 decimal (0.05 = 5%)."),
  unsellableReturnRate: z.number().min(0).max(1).optional().describe("Unsellable share of returned units, 0–1. Omit to default to 1."),
  monthlyVolume: z.number().int().nonnegative().describe("Units sold per month."),

  referralPct: z.number().min(0).max(1).describe("Referral/commission fee as a 0–1 decimal (0.15 = 15%). Preferred."),
  referralCategory: z.string().nullish().describe("Advanced: a category slug that overrides referralPct. Leave unset and use referralPct."),
  isApparel: z.boolean().describe("Whether the product is apparel (affects some fees)."),

  // Mode-specific (optional at this layer; the API requires them per mode):
  inboundOption: z.enum(["optimized", "partial", "single"]).optional().describe("Amazon FBA only: inbound placement option."),
  storageMonths: z.number().positive().optional().describe("Amazon FBA only: number of months in storage."),
  storageSeason: z.enum(["janSep", "octDec"]).optional().describe("Amazon FBA only: storage season (octDec is the Q4 peak)."),
  outboundShipPerUnit: z.number().nonnegative().optional().describe("FBM or TikTok self_fulfilled: outbound shipping per unit."),
  pickPackPerUnit: z.number().nonnegative().optional().describe("FBM or TikTok self_fulfilled: pick & pack per unit."),
  monthly3plStorage: z.number().nonnegative().optional().describe("FBM or TikTok self_fulfilled: total monthly 3PL storage (amortized by volume)."),
  storageMonthsPastFree: z.number().nonnegative().optional().describe("TikTok fbt only: months stored past the 60-day free window (0 if shipped before it ends)."),
} as const;

/** Object form for runtime parsing of calculator inputs. */
export const calcInputObject = z.object(calcInputShape);
export type CalcInput = z.infer<typeof calcInputObject>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/schemas.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/schemas.ts src/schemas.test.ts
git commit -m "feat: shared calculator input schema (flat, described)"
```

---

### Task 5: Tool-result helper

**Files:**
- Create: `src/result.ts`, `src/result.test.ts`

- [ ] **Step 1: Write the failing test** — `src/result.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { toToolResult } from "./result.js";
import { ProfitleeError } from "./client.js";

describe("toToolResult", () => {
  it("serializes a successful value to pretty JSON text content", async () => {
    const r = await toToolResult(async () => ({ mode: "fba", net: 1.7 }));
    expect(r.isError).toBeFalsy();
    expect(r.content[0].type).toBe("text");
    expect(r.content[0].text).toContain('"mode": "fba"');
  });

  it("maps a ProfitleeError to an error result with its message", async () => {
    const r = await toToolResult(async () => { throw new ProfitleeError("Saved scenarios require a Profitlee Pro plan."); });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("Pro plan");
  });

  it("maps an unexpected error generically", async () => {
    const r = await toToolResult(async () => { throw new Error("boom"); });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("boom");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/result.test.ts`
Expected: FAIL — cannot find module `./result.js`.

- [ ] **Step 3: Write `src/result.ts`**

```ts
import { ProfitleeError } from "./client.js";

export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

/** Run an async producer; serialize success to JSON text, map errors to an error result. */
export async function toToolResult(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    const value = await fn();
    return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
  } catch (e) {
    const msg = e instanceof ProfitleeError ? e.message : e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: msg }], isError: true };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/result.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/result.ts src/result.test.ts
git commit -m "feat: toToolResult helper (JSON success / error mapping)"
```

---

### Task 6: calculate_profit tool

**Files:**
- Create: `src/tools/calculate.ts`, `src/tools/calculate.test.ts`

- [ ] **Step 1: Write the failing test** — `src/tools/calculate.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { runCalculate } from "./calculate.js";

const config = { baseUrl: "https://profitlee.com", apiToken: undefined };
const validFba = {
  platform: "amazon", region: "us", mode: "fba",
  L: 17, W: 13, H: 4, weight: 1.4, fob: 3.2, headShip: 1.1, duty: 0.96,
  inboundOption: "single", storageMonths: 1.5, storageSeason: "janSep",
  price: 24.99, ppcAcos: 0.18, returnRate: 0.05, monthlyVolume: 300,
  referralPct: 0.15, isApparel: false,
};

afterEach(() => vi.restoreAllMocks());

describe("runCalculate", () => {
  it("POSTs to /api/v1/calculate with NO auth header and returns result", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ result: { mode: "fba", netProfitAfterPPC: 1.7 } }), {
        status: 200, headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const out = await runCalculate(config, validFba) as { mode: string };
    expect(out.mode).toBe("fba");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://profitlee.com/api/v1/calculate");
    expect((init as RequestInit).method).toBe("POST");
    expect(((init as RequestInit).headers as Record<string, string>).authorization).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/calculate.test.ts`
Expected: FAIL — cannot find module `./calculate.js`.

- [ ] **Step 3: Write `src/tools/calculate.ts`**

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import { apiRequest } from "../client.js";
import { calcInputShape } from "../schemas.js";
import { toToolResult } from "../result.js";

/** Core calculate call — public endpoint, no token. Returns the `result` object. */
export async function runCalculate(config: Config, args: unknown): Promise<unknown> {
  const out = await apiRequest<{ result: unknown }>(config, {
    method: "POST",
    path: "/api/v1/calculate",
    body: args,
    auth: false,
  });
  return out.result;
}

export function registerCalculateTool(server: McpServer, config: Config): void {
  server.registerTool(
    "calculate_profit",
    {
      title: "Calculate profit",
      description:
        "Compute the full per-unit cost stack, gross/net margin, and monthly P&L for an Amazon FBA/FBM or TikTok Shop product. Free — no API token required.",
      inputSchema: calcInputShape,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toToolResult(() => runCalculate(config, args)),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/calculate.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/tools/calculate.ts src/tools/calculate.test.ts
git commit -m "feat: calculate_profit tool (public, no token)"
```

---

### Task 7: Scenario tools (list / get / save / update / delete)

**Files:**
- Create: `src/tools/scenarios.ts`, `src/tools/scenarios.test.ts`

- [ ] **Step 1: Write the failing test** — `src/tools/scenarios.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { listScenarios, getScenario, saveScenario, updateScenario, deleteScenario } from "./scenarios.js";

const config = { baseUrl: "https://profitlee.com", apiToken: "eck_live_tok" };
const noToken = { baseUrl: "https://profitlee.com", apiToken: undefined };

function ok(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
}
function lastInit(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls[0][1] as RequestInit;
}

const inputs = {
  platform: "amazon", region: "us", mode: "fba",
  L: 17, W: 13, H: 4, weight: 1.4, fob: 3.2, headShip: 1.1, duty: 0.96,
  inboundOption: "single", storageMonths: 1.5, storageSeason: "janSep",
  price: 24.99, ppcAcos: 0.18, returnRate: 0.05, monthlyVolume: 300,
  referralPct: 0.15, isApparel: false,
};

afterEach(() => vi.restoreAllMocks());

describe("scenario tools", () => {
  it("listScenarios GETs /api/v1/scenarios with auth", async () => {
    const f = ok({ scenarios: [{ id: "a" }] }); vi.stubGlobal("fetch", f);
    const out = await listScenarios(config) as { scenarios: unknown[] };
    expect(out.scenarios).toHaveLength(1);
    expect(f.mock.calls[0][0]).toBe("https://profitlee.com/api/v1/scenarios");
    expect((lastInit(f).headers as Record<string, string>).authorization).toBe("Bearer eck_live_tok");
  });

  it("getScenario GETs /api/v1/scenarios/:id", async () => {
    const f = ok({ scenario: { id: "abc" } }); vi.stubGlobal("fetch", f);
    await getScenario(config, { id: "abc" });
    expect(f.mock.calls[0][0]).toBe("https://profitlee.com/api/v1/scenarios/abc");
  });

  it("saveScenario POSTs name + inputs", async () => {
    const f = ok({ scenario: { id: "new" } }, 201); vi.stubGlobal("fetch", f);
    await saveScenario(config, { name: "Test", inputs });
    const init = lastInit(f);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Test", inputs });
  });

  it("updateScenario with inputs uses PUT", async () => {
    const f = ok({ scenario: { id: "abc" } }); vi.stubGlobal("fetch", f);
    await updateScenario(config, { id: "abc", inputs, name: "Renamed" });
    const init = lastInit(f);
    expect(f.mock.calls[0][0]).toBe("https://profitlee.com/api/v1/scenarios/abc");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ inputs, name: "Renamed" });
  });

  it("updateScenario with only name uses PATCH", async () => {
    const f = ok({ scenario: { id: "abc", name: "Renamed" } }); vi.stubGlobal("fetch", f);
    await updateScenario(config, { id: "abc", name: "Renamed" });
    const init = lastInit(f);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Renamed" });
  });

  it("updateScenario with neither name nor inputs throws (no fetch)", async () => {
    const f = ok({}); vi.stubGlobal("fetch", f);
    await expect(updateScenario(config, { id: "abc" })).rejects.toThrowError(/name or inputs/i);
    expect(f).not.toHaveBeenCalled();
  });

  it("deleteScenario DELETEs /api/v1/scenarios/:id", async () => {
    const f = ok({ deleted: "abc" }); vi.stubGlobal("fetch", f);
    await deleteScenario(config, { id: "abc" });
    expect(lastInit(f).method).toBe("DELETE");
  });

  it("scenario tools require a token (preflight, no fetch)", async () => {
    const f = ok({}); vi.stubGlobal("fetch", f);
    await expect(listScenarios(noToken)).rejects.toThrowError(/PROFITLEE_API_TOKEN/);
    expect(f).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/scenarios.test.ts`
Expected: FAIL — cannot find module `./scenarios.js`.

- [ ] **Step 3: Write `src/tools/scenarios.ts`**

```ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import { apiRequest, ProfitleeError } from "../client.js";
import { calcInputShape } from "../schemas.js";
import { toToolResult } from "../result.js";

const idShape = { id: z.string().min(1).describe("Scenario id.") } as const;

export async function listScenarios(config: Config): Promise<unknown> {
  return apiRequest(config, { method: "GET", path: "/api/v1/scenarios", auth: true });
}

export async function getScenario(config: Config, args: { id: string }): Promise<unknown> {
  return apiRequest(config, { method: "GET", path: `/api/v1/scenarios/${args.id}`, auth: true });
}

export async function saveScenario(config: Config, args: { name: string; inputs: unknown }): Promise<unknown> {
  return apiRequest(config, {
    method: "POST", path: "/api/v1/scenarios", auth: true,
    body: { name: args.name, inputs: args.inputs },
  });
}

export async function updateScenario(
  config: Config,
  args: { id: string; name?: string; inputs?: unknown },
): Promise<unknown> {
  if (args.inputs !== undefined) {
    const body: { inputs: unknown; name?: string } = { inputs: args.inputs };
    if (args.name !== undefined) body.name = args.name;
    return apiRequest(config, { method: "PUT", path: `/api/v1/scenarios/${args.id}`, auth: true, body });
  }
  if (args.name !== undefined) {
    return apiRequest(config, { method: "PATCH", path: `/api/v1/scenarios/${args.id}`, auth: true, body: { name: args.name } });
  }
  throw new ProfitleeError("Provide name or inputs to update.");
}

export async function deleteScenario(config: Config, args: { id: string }): Promise<unknown> {
  return apiRequest(config, { method: "DELETE", path: `/api/v1/scenarios/${args.id}`, auth: true });
}

export function registerScenarioTools(server: McpServer, config: Config): void {
  server.registerTool(
    "list_scenarios",
    { title: "List saved scenarios", description: "List the caller's saved Profitlee scenarios. Requires a Pro API token.", inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: true } },
    async () => toToolResult(() => listScenarios(config)),
  );

  server.registerTool(
    "get_scenario",
    { title: "Get a scenario", description: "Fetch one saved scenario (inputs + outputs) by id. Requires a Pro API token.", inputSchema: idShape, annotations: { readOnlyHint: true, openWorldHint: true } },
    async (args) => toToolResult(() => getScenario(config, args)),
  );

  server.registerTool(
    "save_scenario",
    { title: "Save a scenario", description: "Save a named scenario from calculator inputs (outputs are computed server-side). Requires a Pro API token.", inputSchema: { name: z.string().min(1).max(120).describe("Scenario name."), inputs: z.object(calcInputShape).describe("Calculator inputs, same shape as calculate_profit.") }, annotations: { openWorldHint: true } },
    async (args) => toToolResult(() => saveScenario(config, args)),
  );

  server.registerTool(
    "update_scenario",
    { title: "Update a scenario", description: "Update a saved scenario: pass inputs to replace+recompute, and/or name to rename. Requires a Pro API token.", inputSchema: { ...idShape, name: z.string().min(1).max(120).optional().describe("New name (optional)."), inputs: z.object(calcInputShape).optional().describe("Replacement calculator inputs (optional).") }, annotations: { openWorldHint: true } },
    async (args) => toToolResult(() => updateScenario(config, args)),
  );

  server.registerTool(
    "delete_scenario",
    { title: "Delete a scenario", description: "Delete a saved scenario by id. Requires a Pro API token.", inputSchema: idShape, annotations: { destructiveHint: true, openWorldHint: true } },
    async (args) => toToolResult(() => deleteScenario(config, args)),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tools/scenarios.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/scenarios.ts src/tools/scenarios.test.ts
git commit -m "feat: scenario CRUD tools (token-gated, PATCH/PUT routing)"
```

---

### Task 8: Server bootstrap (index.ts)

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Write `src/index.ts`**

```ts
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { registerCalculateTool } from "./tools/calculate.js";
import { registerScenarioTools } from "./tools/scenarios.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = new McpServer({ name: "profitlee-mcp", version: "0.1.0" });

  registerCalculateTool(server, config);
  registerScenarioTools(server, config);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio servers must not write to stdout; log to stderr only.
  console.error("profitlee-mcp running on stdio");
}

main().catch((err) => {
  console.error("profitlee-mcp failed to start:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: `dist/` created, no TypeScript errors.

- [ ] **Step 3: Smoke-test the binary boots**

Run: `node dist/index.js <<< ''`
Expected: prints `profitlee-mcp running on stdio` to stderr, then waits on stdin (Ctrl-C to exit). If it exits with an import/SDK error, fix the import paths/SDK usage before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: stdio server bootstrap wiring all tools"
```

---

### Task 9: README

**Files:**
- Create/replace: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# profitlee-mcp

An [MCP](https://modelcontextprotocol.io) server for [Profitlee](https://profitlee.com) — compute Amazon FBA/FBM and TikTok Shop profit margins, and manage saved scenarios, from any MCP client.

## Tools

| Tool | Auth | Description |
| --- | --- | --- |
| `calculate_profit` | none | Full cost stack, gross/net margin, monthly P&L. |
| `list_scenarios` | Pro token | List saved scenarios. |
| `get_scenario` | Pro token | Read one scenario by id. |
| `save_scenario` | Pro token | Save a named scenario. |
| `update_scenario` | Pro token | Rename and/or replace inputs. |
| `delete_scenario` | Pro token | Delete a scenario. |

`calculate_profit` is free and needs no token. The scenario tools need a Profitlee Pro API token (`PROFITLEE_API_TOKEN`), created on your [account page](https://profitlee.com/account).

## Usage

Add to your MCP client config (Claude Desktop / Claude Code):

```json
{
  "mcpServers": {
    "profitlee": {
      "command": "npx",
      "args": ["-y", "profitlee-mcp"],
      "env": {
        "PROFITLEE_API_TOKEN": "eck_live_xxx"
      }
    }
  }
}
```

`PROFITLEE_API_TOKEN` is optional — omit it to use `calculate_profit` only.

### Environment variables

| Var | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PROFITLEE_API_TOKEN` | No | — | Pro token; needed only for scenario tools. |
| `PROFITLEE_BASE_URL` | No | `https://profitlee.com` | Override the API origin (testing). |

## Development

```bash
npm install
npm test          # vitest
npm run build     # tsc -> dist/
npm run dev       # tsx src/index.ts
```
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with tools, config, and usage"
```

---

### Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all suites pass (config 3, client 7, schemas 5, result 3, calculate 1, scenarios 8 = 27 tests).

- [ ] **Step 2: Type-check / build**

Run: `npm run build`
Expected: exits 0, no errors.

- [ ] **Step 3: Live smoke against production calculate (optional but recommended)**

Run:
```bash
node -e "import('./dist/tools/calculate.js').then(async m => { const r = await m.runCalculate({ baseUrl: 'https://profitlee.com', apiToken: undefined }, { platform:'amazon', region:'us', mode:'fba', L:17,W:13,H:4,weight:1.4, fob:3.2, headShip:1.1, duty:0.96, inboundOption:'single', storageMonths:1.5, storageSeason:'janSep', price:24.99, ppcAcos:0.18, returnRate:0.05, monthlyVolume:300, referralPct:0.15, isApparel:false }); console.log(r); });"
```
Expected: prints a result object with `mode: "fba"` and numeric margin fields. (Requires the public `/api/v1/calculate` to be deployed — PR #21 in the calculator repo. If it still 401s, the deploy hasn't landed yet; note it and skip.)

- [ ] **Step 4: Final commit (if anything changed)**

```bash
git add -A
git commit -m "chore: final verification pass" || echo "nothing to commit"
```

---

## Self-Review

- **Spec coverage:** stdio TS server ✓ (Tasks 1,8); env config ✓ (Task 2); `calculate_profit` via public `/api/v1/calculate` ✓ (Task 6); scenario CRUD via `/api/v1/*` token ✓ (Task 7); guided described input schema ✓ (Task 4); error reason→message mapping + token preflight ✓ (Task 3); vitest mocked-fetch tests ✓ (every task); README + npx distribution ✓ (Task 9). Out-of-scope items (remote transport, prompts/resources, referral-category lookup) correctly omitted.
- **Placeholders:** none — every code/test step is complete.
- **Type consistency:** `Config` (Task 2) is consumed unchanged by `apiRequest` (Task 3), tools (Tasks 6–7), and bootstrap (Task 8). `calcInputShape` (Task 4) is reused by calculate + save/update. `ProfitleeError` (Task 3) is used by `toToolResult` (Task 5) and `updateScenario` (Task 7). Tool handler signatures match the `runCalculate`/`listScenarios`/… functions they wrap.

## Notes for the executor

- The MCP SDK registration API is `server.registerTool(name, { title, description, inputSchema, annotations }, handler)` where `inputSchema` is a **Zod raw shape** (a plain object of Zod validators), not a `z.object(...)`. Pass `calcInputShape` directly. If the installed `@modelcontextprotocol/sdk` differs, follow its current `registerTool`/`McpServer`/`StdioServerTransport` API and keep the handler return shape `{ content: [{ type: "text", text }], isError? }`.
- Never `console.log` in a stdio server — it corrupts the protocol stream. Use `console.error`.
- Keep the API as the strict validation authority; do not re-implement the per-mode discriminated union locally.
