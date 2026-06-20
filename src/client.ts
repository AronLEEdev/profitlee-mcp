import type { Config } from "./config.js";

/** Error type for every failure surfaced to the MCP caller. */
export class ProfitleeError extends Error {}

/** Stable API `reason` codes to human messages. See https://profitlee.com/docs/api. */
const REASON_MESSAGES: Record<string, string> = {
  auth_required: "Set PROFITLEE_API_TOKEN to a valid Pro API token.",
  invalid_token: "PROFITLEE_API_TOKEN is not valid. Check it on your Profitlee account page.",
  pro_required: "Saved scenarios require a Profitlee Pro plan.",
  scenario_limit: "You've reached the saved-scenario limit. Delete one before creating another.",
  invalid_input: "The calculator inputs failed validation.",
  invalid_json: "The request body was not valid JSON.",
  not_found: "Scenario not found.",
};

/** Abort a request that takes longer than this so a hung API can't hang the tool call. */
const REQUEST_TIMEOUT_MS = 15_000;

export interface RequestOptions {
  method: string;
  /** Path beginning with a slash, e.g. "/api/v1/calculate". */
  path: string;
  body?: unknown;
  /** When true, require and attach the Pro token. */
  auth?: boolean;
}

export async function apiRequest<T>(config: Config, opts: RequestOptions): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.auth) {
    if (!config.apiToken) {
      throw new ProfitleeError("This action needs a Pro API token. Set PROFITLEE_API_TOKEN.");
    }
    headers.authorization = `Bearer ${config.apiToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}${opts.path}`, {
      method: opts.method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "network error";
    throw new ProfitleeError(`Could not reach Profitlee (${detail}).`);
  }

  const text = await res.text();
  let json: unknown;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Leave undefined; HTTP status handling below still reports the failure.
    }
  }

  if (!res.ok) {
    const obj = (json ?? {}) as { reason?: string; issues?: unknown; limit?: number };
    const base = (obj.reason && REASON_MESSAGES[obj.reason]) || `Profitlee request failed (HTTP ${res.status}).`;
    const limit = typeof obj.limit === "number" ? ` (limit ${obj.limit})` : "";
    const issues = obj.issues ? ` Issues: ${JSON.stringify(obj.issues)}` : "";
    throw new ProfitleeError(base + limit + issues);
  }

  return json as T;
}
