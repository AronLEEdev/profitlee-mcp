# Changelog

All notable changes to `profitlee-mcp` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Dates are npm publish dates.

## [Unreleased]

## [0.2.1] — 2026-08-14

### Fixed

- **All 7 tools were uncallable on clients that validate with JSON Schema 2020-12.**
  Every `registerTool` call advertised an `outputSchema` derived from a Zod 3 shape,
  which the SDK serializes through `zod-to-json-schema` — that stamps
  `$schema: "http://json-schema.org/draft-07/schema#"`. Clients using the SDK's
  default Ajv 2020-12 validator refuse to compile a document declaring an unknown
  dialect and invalidate the tool, so every `tools/call` was rejected client-side
  and never dispatched. The server still installed, connected, and listed its tools,
  which made the failure look like a working install until the first real call.
  The `outputSchema` entries were passthroughs (`{ result: z.unknown() }` /
  `{ response: z.unknown() }`) that validated nothing, and `toToolResult` already
  serializes the full API response into `content`, so removing them restores every
  tool with no loss of data or contract.
- Server version reported in the MCP handshake is now read from `package.json`
  instead of a hardcoded literal, which had drifted to `0.1.1` while the package
  was at `0.2.0`.

### Added

- `src/schema-dialect.test.ts` — a regression guard that stands the server up over
  an in-memory transport and asserts on the schemas actually advertised by
  `tools/list`. The previous suite only exercised handler functions directly, which
  is why a release-blocking bug shipped with 30 passing tests.

### Known issues

- Every tool's `inputSchema` still carries the same draft-07 stamp. Clients tolerate
  it today because only `outputSchema` is hard-validated, so nothing is broken — but
  it is the same defect, and unlike `outputSchema` the input schemas are load-bearing
  and cannot simply be dropped. Migrating input schema generation to emit 2020-12 is
  the durable fix; the regression test deliberately scopes to `outputSchema` until then.

## [0.2.0] — 2026-06-25

### Added

- `copy_scenario` tool — duplicates a saved scenario, recomputing outputs server-side
  against the current fee tables. The copy defaults to `"Copy of <source name>"`.
  Brings the tool count to 7.
- Richer tool metadata for registry and client display: `title`, per-tool
  `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`),
  and expanded field descriptions across the calculator input schema.
- `context7.json` for Context7 documentation indexing.
- Glama badge in the README.

### Removed

- Internal planning and design documents are no longer tracked in the repository.

### Note

This release introduced the draft-07 `outputSchema` defect fixed in 0.2.1 —
the four `*OutputShape` schemas arrived as part of the tool metadata work. **0.2.0 is
unusable on clients validating with Ajv 2020-12**, which includes most MCP clients.
Versions 0.1.0 and 0.1.1 declared no `outputSchema` and are unaffected.

## [0.1.1] — 2026-06-21

### Added

- `manifest.json` describing the server for MCP bundle installers, and `.mcpbignore`
  to keep the bundle lean.
- Registry metadata so the server can be listed in the official MCP registry and
  community catalogs.

## [0.1.0] — 2026-06-20

Initial release.

### Added

- MCP server over stdio wrapping the Profitlee ecommerce profit calculator, covering
  Amazon FBA/FBM and TikTok Shop FBT/self-fulfilled across the US, DE, and JP
  marketplaces.
- `calculate_profit` — per-unit fees, landed cost, gross margin, net margin after
  ads/returns/storage, and monthly P&L. Free; requires no API token.
- Saved-scenario tools requiring `PROFITLEE_API_TOKEN`: `list_scenarios`,
  `get_scenario`, `save_scenario`, `update_scenario`, `delete_scenario`.

[Unreleased]: https://github.com/AronLEEdev/profitlee-mcp/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/AronLEEdev/profitlee-mcp/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/AronLEEdev/profitlee-mcp/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/AronLEEdev/profitlee-mcp/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/AronLEEdev/profitlee-mcp/releases/tag/v0.1.0
