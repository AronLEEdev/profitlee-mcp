export interface Config {
  /** Profitlee API origin, no trailing slash. */
  baseUrl: string;
  /** Pro API token (eck_live...), or undefined when not configured. */
  apiToken: string | undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const baseUrl = (env.PROFITLEE_BASE_URL ?? "https://profitlee.com").replace(/\/+$/, "");
  const token = env.PROFITLEE_API_TOKEN?.trim();
  return { baseUrl, apiToken: token ? token : undefined };
}
