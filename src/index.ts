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
  console.error("profitlee-mcp running on stdio");
}

main().catch((err) => {
  console.error("profitlee-mcp failed to start:", err);
  process.exit(1);
});
