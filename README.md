# profitlee-mcp

[![npm version](https://img.shields.io/npm/v/profitlee-mcp.svg)](https://www.npmjs.com/package/profitlee-mcp)
[![license](https://img.shields.io/npm/l/profitlee-mcp.svg)](./LICENSE)
[![smithery badge](https://smithery.ai/badge/aronleedev/profitlee-mcp)](https://smithery.ai/servers/aronleedev/profitlee-mcp)
[![Glama MCP Server](https://glama.ai/mcp/servers/AronLEEdev/profitlee-mcp/badges/score.svg)](https://glama.ai/mcp/servers/AronLEEdev/profitlee-mcp)

An [MCP](https://modelcontextprotocol.io) server for [Profitlee](https://profitlee.com) — compute **country-accurate Amazon FBA/FBM and TikTok Shop profit margins**, and manage saved scenarios, from any MCP client (Claude Desktop, Claude Code, Cursor, …).

`calculate_profit` is **free and needs no token**. The scenario tools require a Profitlee Pro API token.

> MCP registry name: `io.github.AronLEEdev/profitlee-mcp`

## Quick start

Add to your MCP client config:

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

`PROFITLEE_API_TOKEN` is **optional** — omit the whole `env` block to use `calculate_profit` only. Create a token on your Profitlee [account page](https://profitlee.com/account) to unlock the scenario tools.

Requires Node.js 20+.

## Tools

| Tool | Auth | Description |
| --- | --- | --- |
| `calculate_profit` | none | Full per-unit cost stack, gross/net margin, and monthly P&L. |
| `list_scenarios` | Pro token | List your saved scenarios. |
| `get_scenario` | Pro token | Read one scenario (inputs + outputs) by id. |
| `save_scenario` | Pro token | Save a named scenario from calculator inputs. |
| `update_scenario` | Pro token | Rename and/or replace a scenario's inputs. |
| `delete_scenario` | Pro token | Delete a scenario by id. |

### `calculate_profit` inputs

Pick a `platform` + `mode`, give the product's physical and cost details, and Profitlee folds every fee into a single net margin. Rates are **0–1 decimals** (e.g. `0.15` = 15%). US uses inches + pounds; DE/JP use cm + kg.

| Field | Notes |
| --- | --- |
| `platform` | `amazon` (default) or `tiktok_shop`. |
| `region` | `us`, `de`, or `jp`. |
| `mode` | amazon: `fba` \| `fbm`. tiktok_shop: `fbt` \| `self_fulfilled`. |
| `L`, `W`, `H`, `weight` | Dimensions + unit weight. |
| `fob`, `headShip`, `duty` | Unit cost, inbound freight/unit, import duty/unit. |
| `price` | Selling price (gross; VAT-inclusive for DE/JP). |
| `ppcAcos`, `returnRate` | Ad ACoS and return rate (0–1). |
| `monthlyVolume` | Units/month (scales the P&L). |
| `referralPct` | Referral fee (0–1). Preferred over `referralCategory`. |
| `isApparel` | Affects some fees. |
| mode-specific | FBA: `inboundOption`, `storageMonths`, `storageSeason`. FBM / TikTok self-fulfilled: `outboundShipPerUnit`, `pickPackPerUnit`, `monthly3plStorage`. TikTok FBT: `storageMonthsPastFree`. |

The Profitlee API is the source of truth for validation — incomplete or out-of-range inputs come back as a clear error listing the offending fields. Full field reference: <https://profitlee.com/docs/api>.

## Environment variables

| Var | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PROFITLEE_API_TOKEN` | No | — | Pro token (`eck_live_…`); needed only for the scenario tools. |
| `PROFITLEE_BASE_URL` | No | `https://profitlee.com` | Override the API origin (testing). |

## How it works

The server is a thin wrapper over Profitlee's public HTTP API:

- `calculate_profit` → `POST /api/v1/calculate` (public, no token).
- scenario tools → `/api/v1/scenarios*` (require the Pro token; the server fails fast with a clear message if it's missing).

No fee logic is reimplemented here, so results always match the live Profitlee calculator and current fee tables.

## Development

```bash
npm install
npm test       # vitest (27 tests)
npm run build  # tsc -> dist/
npm run dev    # run from source with tsx
```

## Releasing

Maintainers: see [PUBLISHING.md](./PUBLISHING.md) for npm publish + MCP registry steps. The registry manifest lives in [server.json](./server.json).

## License

[MIT](./LICENSE)
