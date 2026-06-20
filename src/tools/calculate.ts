import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "../client.js";
import type { Config } from "../config.js";
import { toToolResult } from "../result.js";
import { calcInputShape } from "../schemas.js";

/** Core calculate call: public endpoint, no token. Returns the `result` object. */
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
        "Compute the full per-unit cost stack, gross/net margin, and monthly P&L for an Amazon FBA/FBM or TikTok Shop product. Free: no API token required.",
      inputSchema: calcInputShape,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toToolResult(() => runCalculate(config, args)),
  );
}
