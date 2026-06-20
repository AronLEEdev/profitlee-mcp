# Profitlee MCP Server — Design

**Date:** 2026-06-18
**Status:** Approved (ready for implementation plan)
**Repo:** https://github.com/AronLEEdev/profitlee-mcp

## Goal

A Model Context Protocol (MCP) server that lets any MCP client (Claude
Desktop, Claude Code, Cursor, other agents) call Profitlee's profit
calculator and manage saved scenarios — without writing API glue. It is both a
utility and a **distribution channel**: being listed in MCP registries puts
Profitlee in front of AI users and dogfoods the public API.

Success criteria: an agent can compute an accurate FBA/FBM/TikTok-Shop profit
breakdown with **no token**, and a Pro user who sets a token can list, read,
save, update, and delete scenarios — all through clearly described tools.

## Non-goals (YAGNI)

- Remote / OAuth (Streamable HTTP) transport — stdio only for v1.
- The `/api/v1/calculate` endpoint — the free anonymous `/api/calculate`
  covers calculation, so the token-gated calculate is redundant here.
- MCP prompts and resources — tools only for v1.
- A referral-category lookup tool — no public categories endpoint exists yet;
  the calculate tool steers the model to `referralPct` (a number) instead.
- Embedding the calc engine — the MCP wraps the HTTP API (see Architecture).

## Architecture

A thin **stdio MCP server** in TypeScript using `@modelcontextprotocol/sdk`,
published to npm and run via `npx profitlee-mcp`. It wraps Profitlee's **public
HTTP API** rather than embedding the calc engine. Wrapping the API keeps the
MCP decoupled from engine internals, always in sync with production fee tables,
and routes free calculations through the anonymous endpoint (the free→Pro
funnel).

**No API refactor is required.** `POST /api/calculate` is already fully
anonymous (no auth, no rate limit, no cap — confirmed in the route handler); it
ignores any `Authorization` header. Only the `/api/v1/*` endpoints require a
token, and those back the scenario tools.

### Configuration (environment variables)

| Var | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PROFITLEE_API_TOKEN` | No | — | Pro API token (`eck_live_…`). Needed **only** for scenario tools. |
| `PROFITLEE_BASE_URL` | No | `https://profitlee.com` | Override for local/staging testing. |

`calculate_profit` works with no configuration at all.

## Tools (6)

| Tool | HTTP | Token | Annotation |
| --- | --- | --- | --- |
| `calculate_profit` | `POST /api/calculate` | ❌ free | read-only |
| `list_scenarios` | `GET /api/v1/scenarios` | ✅ | read-only |
| `get_scenario` | `GET /api/v1/scenarios/:id` | ✅ | read-only |
| `save_scenario` | `POST /api/v1/scenarios` | ✅ | — |
| `update_scenario` | `PATCH` or `PUT /api/v1/scenarios/:id` | ✅ | — |
| `delete_scenario` | `DELETE /api/v1/scenarios/:id` | ✅ | destructive |

### Tool contracts

- **`calculate_profit`** — input: the guided `CalcInputs` schema (below).
  Output: the API's `outputs` object (cost stack, gross/net margin, monthly
  P&L), returned as structured JSON text content.
- **`list_scenarios`** — no input. Output: array of scenario summaries.
- **`get_scenario`** — input `{ id }`. Output: one scenario (inputs + outputs).
- **`save_scenario`** — input `{ name, inputs }` (inputs = guided schema).
  Output: the created scenario.
- **`update_scenario`** — input `{ id, name?, inputs? }`. Routing:
  - `inputs` present → `PUT` (replace inputs, recompute, optional rename).
  - only `name` present → `PATCH` (rename only).
  - neither → validation error.
- **`delete_scenario`** — input `{ id }`. Output: `{ deleted: id }`.

## Input schema (guided)

One shared zod schema, reused by `calculate_profit`, `save_scenario`, and
`update_scenario`. It mirrors the API's `mode`-discriminated union
(`fba` | `fbm` | `fbt` | `self_fulfilled`) over a shared base, but adds
LLM-facing affordances:

- **Rich descriptions** on every field.
- **Explicit units**: "rates are 0–1 decimals (e.g. `0.15` = 15%)" for
  `ppcAcos`, `returnRate`, `referralPct`, `adSalesShare`, `unsellableReturnRate`.
- **Defaults**: `platform="amazon"`, `adSalesShare=1`, `unsellableReturnRate=1`.
- **Referral guidance**: prefer `referralPct` (number); note `referralCategory`
  is an advanced slug-based override most callers should skip.

Base fields: `platform`, `region` (`us`|`de`|`jp`), `L`, `W`, `H`, `weight`,
`fob`, `headShip`, `duty`, `moq?`, `price`, `ppcAcos`, `adSalesShare`,
`returnRate`, `unsellableReturnRate`, `monthlyVolume`, `referralPct`,
`referralCategory?`, `isApparel`, `unitsPerCase?`.

Mode-specific:
- `fba`: `inboundOption` (`optimized`|`partial`|`single`), `storageMonths`,
  `storageSeason` (`janSep`|`octDec`).
- `fbm`: `outboundShipPerUnit`, `pickPackPerUnit`, `monthly3plStorage`.
- `fbt`: `storageMonthsPastFree`.
- `self_fulfilled`: `outboundShipPerUnit`, `pickPackPerUnit`,
  `monthly3plStorage`.

Units: US uses inches/pounds; DE/JP use cm/kg (documented in field
descriptions). The MCP validates locally with zod before calling the API, so
obvious mistakes return a clear error without a round trip.

## Error handling

A single fetch wrapper (`client.ts`) maps the API's stable `reason` codes to
readable tool errors:

| API response | Tool error message |
| --- | --- |
| `401 auth_required` / `invalid_token` | "Set PROFITLEE_API_TOKEN to a valid Pro API token." |
| `403 pro_required` | "Saved scenarios require a Profitlee Pro plan." |
| `403 scenario_limit` | The cap message (limit included). |
| `400 invalid_input` | Surface the field issues from `issues`. |
| `404 not_found` | "Scenario not found." |
| network / non-JSON | "Could not reach Profitlee ({detail})." |

**Preflight:** scenario tools check for a configured token first and return a
friendly "this tool needs a Pro API token" error instead of a doomed request.
The error wrapper never leaks the token value.

## Project structure

```
profitlee-mcp/
  src/
    index.ts        # bootstrap: create server, register tools, stdio transport
    config.ts       # read + validate env (token, base URL)
    client.ts       # fetch wrapper + reason→message mapping
    schemas.ts      # shared zod input schema + field descriptions
    tools/
      calculate.ts  # calculate_profit
      scenarios.ts  # list/get/save/update/delete
  tests/            # vitest with mocked fetch
  package.json      # "bin": { "profitlee-mcp": "dist/index.js" }; sdk + zod
  tsconfig.json
  README.md         # install + npx config snippet + env vars
  LICENSE           # (exists)
```

## Testing

**Vitest with mocked `fetch`** — no live API calls:

1. Schema validation: valid payloads per mode pass; missing mode-specific
   fields and out-of-range rates fail with clear issues.
2. Request building: each tool hits the right method + path + body; the token
   is attached only to `/api/v1/*` requests.
3. Error mapping: each `reason` code → the expected message; network failure →
   the network message.
4. Preflight: scenario tools without a token return the token error and make
   **no** fetch call.

## Distribution

- Publish to npm as `profitlee-mcp` (so `npx profitlee-mcp` resolves).
- README ships a copy-paste MCP client config block (Claude Desktop / Code)
  showing the `npx` command and the two env vars.
- Follow-up (separate task): submit to MCP registries (Smithery, PulseMCP,
  mcp.so) — the next distribution channel after the directory listings.

## Risks / notes

- The API contract is treated as **v1-stable**; the MCP pins to it. If the API
  changes shape, the client wrapper + schema are the single update points.
- `calculate_profit` returns whatever `outputs` the API produces; the MCP does
  not re-document every output field (it passes them through), keeping the MCP
  decoupled from output evolution.
