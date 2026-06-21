import { ProfitleeError } from "./client.js";

export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
}

/** Run an async producer; serialize success to JSON text, map errors to an error result. */
export async function toToolResult(
  fn: () => Promise<unknown>,
  structuredContent?: (value: unknown) => Record<string, unknown>,
): Promise<ToolResult> {
  try {
    const value = await fn();
    return {
      content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
      ...(structuredContent ? { structuredContent: structuredContent(value) } : {}),
    };
  } catch (e) {
    const msg = e instanceof ProfitleeError ? e.message : e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: msg }], isError: true };
  }
}
