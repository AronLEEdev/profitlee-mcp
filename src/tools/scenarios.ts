import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, ProfitleeError } from "../client.js";
import type { Config } from "../config.js";
import { toToolResult } from "../result.js";
import { calcInputShape, scenarioListOutputShape, scenarioMutationOutputShape, scenarioOutputShape } from "../schemas.js";

const idShape = { id: z.string().min(1).describe("Saved Profitlee scenario id returned by list_scenarios or save_scenario.") } as const;

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

export async function copyScenario(config: Config, args: { id: string; name?: string }): Promise<unknown> {
  const body: { name?: string } = {};
  if (args.name !== undefined) body.name = args.name;
  return apiRequest(config, {
    method: "POST",
    path: `/api/v1/scenarios/${encodeURIComponent(args.id)}/copy`,
    auth: true,
    body,
  });
}

export function registerScenarioTools(server: McpServer, config: Config): void {
  server.registerTool(
    "list_scenarios",
    {
      title: "List saved scenarios",
      description:
        "List saved Profitlee profit scenarios for the authenticated Pro account. Use this before get_scenario, update_scenario, or delete_scenario when you need a scenario id. Requires PROFITLEE_API_TOKEN.",
      inputSchema: {},
      outputSchema: scenarioListOutputShape,
      annotations: {
        title: "List saved profit scenarios",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => toToolResult(() => listScenarios(config), (response) => ({ response })),
  );

  server.registerTool(
    "get_scenario",
    {
      title: "Get a scenario",
      description:
        "Fetch one saved Profitlee scenario by id, including the original calculator inputs and the computed profit output. Requires PROFITLEE_API_TOKEN.",
      inputSchema: idShape,
      outputSchema: scenarioOutputShape,
      annotations: {
        title: "Get saved profit scenario",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => toToolResult(() => getScenario(config, args), (response) => ({ response })),
  );

  server.registerTool(
    "save_scenario",
    {
      title: "Save a scenario",
      description:
        "Create a saved Profitlee scenario from a scenario name and calculator inputs. Profitlee validates the inputs and computes outputs server-side. Requires PROFITLEE_API_TOKEN.",
      inputSchema: {
        name: z.string().min(1).max(120).describe("Human-readable scenario name, up to 120 characters."),
        inputs: z.object(calcInputShape).describe("Calculator inputs using the same field meanings and units as calculate_profit."),
      },
      outputSchema: scenarioMutationOutputShape,
      annotations: {
        title: "Save profit scenario",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => toToolResult(() => saveScenario(config, args), (response) => ({ response })),
  );

  server.registerTool(
    "update_scenario",
    {
      title: "Update a scenario",
      description:
        "Update an existing Profitlee scenario by id. Pass name to rename it, inputs to replace calculator inputs and recompute outputs, or both. Requires PROFITLEE_API_TOKEN.",
      inputSchema: {
        ...idShape,
        name: z.string().min(1).max(120).optional().describe("Optional new scenario name, up to 120 characters."),
        inputs: z
          .object(calcInputShape)
          .optional()
          .describe("Optional replacement calculator inputs using the same field meanings and units as calculate_profit."),
      },
      outputSchema: scenarioMutationOutputShape,
      annotations: {
        title: "Update profit scenario",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => toToolResult(() => updateScenario(config, args), (response) => ({ response })),
  );

  server.registerTool(
    "delete_scenario",
    {
      title: "Delete a scenario",
      description:
        "Delete one saved Profitlee scenario by id. This permanently removes the saved scenario from the authenticated Pro account. Requires PROFITLEE_API_TOKEN.",
      inputSchema: idShape,
      outputSchema: scenarioMutationOutputShape,
      annotations: {
        title: "Delete profit scenario",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => toToolResult(() => deleteScenario(config, args), (response) => ({ response })),
  );

  server.registerTool(
    "copy_scenario",
    {
      title: "Copy a scenario",
      description:
        'Duplicate an existing Profitlee scenario into a new one. Profitlee reads the source inputs server-side and recomputes outputs, so the copy reflects the current fee tables. The new name defaults to "Copy of <source name>" unless you pass name. Counts against the saved-scenario limit. Requires PROFITLEE_API_TOKEN.',
      inputSchema: {
        ...idShape,
        name: z
          .string()
          .min(1)
          .max(120)
          .optional()
          .describe('Optional name for the copy, up to 120 characters. Defaults to "Copy of <source name>".'),
      },
      outputSchema: scenarioMutationOutputShape,
      annotations: {
        title: "Copy profit scenario",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => toToolResult(() => copyScenario(config, args), (response) => ({ response })),
  );
}
