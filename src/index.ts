#!/usr/bin/env node
import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { registerCalculateTool } from "./tools/calculate.js";
import { registerScenarioTools } from "./tools/scenarios.js";

/** Single source of truth for the version reported in the MCP handshake. */
const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

async function main(): Promise<void> {
  const config = loadConfig();
  const server = new McpServer({ name: "profitlee-mcp", version });

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
