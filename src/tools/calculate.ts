import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiRequest } from "../client.js";
import type { Config } from "../config.js";
import { toToolResult } from "../result.js";
import { calcInputShape, calculateProfitOutputShape } from "../schemas.js";

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
        "Calculate ecommerce profit for one product on Amazon FBA, Amazon FBM, TikTok Shop FBT, or TikTok Shop self-fulfilled. Returns per-unit fees, landed cost, gross margin, net margin after ads/returns/storage, and monthly P&L. Free to use; no Profitlee API token required.",
      inputSchema: calcInputShape,
      outputSchema: calculateProfitOutputShape,
      annotations: {
        title: "Calculate marketplace profit",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => toToolResult(() => runCalculate(config, args), (result) => ({ result })),
  );
}
