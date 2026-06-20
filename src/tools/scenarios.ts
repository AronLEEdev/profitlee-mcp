import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, ProfitleeError } from "../client.js";
import type { Config } from "../config.js";
import { toToolResult } from "../result.js";
import { calcInputShape } from "../schemas.js";

const idShape = { id: z.string().min(1).describe("Scenario id.") } as const;

export async function listScenarios(config: Config): Promise<unknown> {
  return apiRequest(config, { method: "GET", path: "/api/v1/scenarios", auth: true });
}

export async function getScenario(config: Config, args: { id: string }): Promise<unknown> {
  return apiRequest(config, { method: "GET", path: `/api/v1/scenarios/${encodeURIComponent(args.id)}`, auth: true });
}

export async function saveScenario(config: Config, args: { name: string; inputs: unknown }): Promise<unknown> {
  return apiRequest(config, {
    method: "POST",
    path: "/api/v1/scenarios",
    auth: true,
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
    return apiRequest(config, { method: "PUT", path: `/api/v1/scenarios/${encodeURIComponent(args.id)}`, auth: true, body });
  }
  if (args.name !== undefined) {
    return apiRequest(config, {
      method: "PATCH",
      path: `/api/v1/scenarios/${encodeURIComponent(args.id)}`,
      auth: true,
      body: { name: args.name },
    });
  }
  throw new ProfitleeError("Provide name or inputs to update.");
}

export async function deleteScenario(config: Config, args: { id: string }): Promise<unknown> {
  return apiRequest(config, { method: "DELETE", path: `/api/v1/scenarios/${encodeURIComponent(args.id)}`, auth: true });
}

export function registerScenarioTools(server: McpServer, config: Config): void {
  server.registerTool(
    "list_scenarios",
    {
      title: "List saved scenarios",
      description: "List the caller's saved Profitlee scenarios. Requires a Pro API token.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => toToolResult(() => listScenarios(config)),
  );

  server.registerTool(
    "get_scenario",
    {
      title: "Get a scenario",
      description: "Fetch one saved scenario (inputs + outputs) by id. Requires a Pro API token.",
      inputSchema: idShape,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toToolResult(() => getScenario(config, args)),
  );

  server.registerTool(
    "save_scenario",
    {
      title: "Save a scenario",
      description: "Save a named scenario from calculator inputs. Outputs are computed server-side. Requires a Pro API token.",
      inputSchema: {
        name: z.string().min(1).max(120).describe("Scenario name."),
        inputs: z.object(calcInputShape).describe("Calculator inputs, same shape as calculate_profit."),
      },
      annotations: { openWorldHint: true },
    },
    async (args) => toToolResult(() => saveScenario(config, args)),
  );

  server.registerTool(
    "update_scenario",
    {
      title: "Update a scenario",
      description: "Update a saved scenario: pass inputs to replace and recompute, and/or name to rename. Requires a Pro API token.",
      inputSchema: {
        ...idShape,
        name: z.string().min(1).max(120).optional().describe("New name (optional)."),
        inputs: z.object(calcInputShape).optional().describe("Replacement calculator inputs (optional)."),
      },
      annotations: { openWorldHint: true },
    },
    async (args) => toToolResult(() => updateScenario(config, args)),
  );

  server.registerTool(
    "delete_scenario",
    {
      title: "Delete a scenario",
      description: "Delete a saved scenario by id. Requires a Pro API token.",
      inputSchema: idShape,
      annotations: { destructiveHint: true, openWorldHint: true },
    },
    async (args) => toToolResult(() => deleteScenario(config, args)),
  );
}
