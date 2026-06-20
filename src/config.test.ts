import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("defaults baseUrl to production and token to undefined", () => {
    const c = loadConfig({});
    expect(c.baseUrl).toBe("https://profitlee.com");
    expect(c.apiToken).toBeUndefined();
  });

  it("reads overrides and strips trailing slashes from baseUrl", () => {
    const c = loadConfig({
      PROFITLEE_BASE_URL: "http://localhost:3000/",
      PROFITLEE_API_TOKEN: "eck_live_x",
    });
    expect(c.baseUrl).toBe("http://localhost:3000");
    expect(c.apiToken).toBe("eck_live_x");
  });

  it("treats blank/whitespace token as undefined", () => {
    expect(loadConfig({ PROFITLEE_API_TOKEN: "   " }).apiToken).toBeUndefined();
  });
});
