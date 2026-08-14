import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerCalculateTool } from "./tools/calculate.js";
import { registerScenarioTools } from "./tools/scenarios.js";

const SUPPORTED = "https://json-schema.org/draft/2020-12/schema";

describe("advertised tool schemas", () => {
  it("never advertises an outputSchema dialect other than 2020-12", async () => {
    const config = { baseUrl: "https://profitlee.com", apiToken: "eck_live_test" };
    const server = new McpServer({ name: "profitlee-mcp", version: "test" });
    registerCalculateTool(server, config);
    registerScenarioTools(server, config);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);

    // outputSchema is the one clients hard-reject: the SDK hands it to Ajv 2020-12,
    // which refuses to even compile a draft-07 document. inputSchema is currently
    // tolerated by clients, so it is not asserted here.
    const offenders = tools
      .filter((t) => t.outputSchema?.$schema !== undefined && t.outputSchema.$schema !== SUPPORTED)
      .map((t) => `${t.name}.outputSchema -> ${String(t.outputSchema?.$schema)}`);
    expect(offenders).toEqual([]);

    await client.close();
  });
});
