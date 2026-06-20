import { ProfitleeError } from "./client.js";

export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

/** Run an async producer; serialize success to JSON text, map errors to an error result. */
export async function toToolResult(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    const value = await fn();
    return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
  } catch (e) {
    const msg = e instanceof ProfitleeError ? e.message : e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: msg }], isError: true };
  }
}
