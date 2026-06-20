# profitlee-mcp

An [MCP](https://modelcontextprotocol.io) server for [Profitlee](https://profitlee.com): compute Amazon FBA/FBM and TikTok Shop profit margins, and manage saved scenarios, from any MCP client.

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

`PROFITLEE_API_TOKEN` is optional. Omit it to use `calculate_profit` only.

### Environment Variables

| Var | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PROFITLEE_API_TOKEN` | No | - | Pro token; needed only for scenario tools. |
| `PROFITLEE_BASE_URL` | No | `https://profitlee.com` | Override the API origin for testing. |

## Development

```bash
npm install
npm test
npm run build
npm run dev
```
