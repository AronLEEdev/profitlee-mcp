# Publishing & registry listing

Maintainer steps to release `profitlee-mcp` to npm and list it in MCP registries.
Run these yourself — they require your npm and registry credentials.

## 1. Pre-flight

```bash
npm ci          # clean install
npm test        # all tests should pass
npm run build   # tsc -> dist/, exit 0
```

Bump the version in **all three** of `package.json`, `server.json`, and
`manifest.json` (keep them in sync) following semver. The version reported in the
MCP handshake is read from `package.json`, so it needs no separate bump.

**Update `CHANGELOG.md` before every publish.** Move the `[Unreleased]` entries
under a new heading for the version being released, dated with the publish date,
and add a fresh empty `[Unreleased]` section above it. Update the compare links at
the bottom of the file. A published version with no changelog entry is a release
nobody can audit later — npm versions are immutable, so the changelog is the only
place a mistake can be explained after the fact.

## 2. Publish to npm

```bash
npm login                 # one-time, uses your npm account
npm publish --access public
```

`prepublishOnly` re-runs build + tests before the upload. After it lands, verify:

```bash
npm view profitlee-mcp version
npx -y profitlee-mcp      # should print "profitlee-mcp running on stdio" to stderr
```

> Note: npm versions are immutable — you can't re-publish the same version. To
> fix a mistake, bump the patch version and publish again.

## 3. List in the official MCP registry

The [official registry](https://github.com/modelcontextprotocol/registry) verifies
npm ownership by matching the `mcpName` field in the **published** package.json
(already set to `io.github.AronLEEdev/profitlee-mcp`) — so publish to npm first.

```bash
# Install the publisher CLI (see the registry repo for the current install method)
# then authenticate with GitHub (namespace io.github.<your-username>):
mcp-publisher login github

# Validate/refresh the manifest if the schema has changed, then publish it:
mcp-publisher publish   # reads ./server.json
```

> The registry schema evolves. If `server.json` fails validation, run
> `mcp-publisher init` to regenerate it against the current schema, then
> re-apply our `environmentVariables` and commit the result.

## 4. Other directories (optional)

These are community catalogs — submit when you want extra reach:

- **Smithery** (https://smithery.ai) — add a `smithery.yaml` and connect the
  GitHub repo via their dashboard.
- **PulseMCP** (https://www.pulsemcp.com) — submit the repo via their site.
- **mcp.so** (https://mcp.so) — submit the repo via their site.

Most of these auto-ingest from the official registry once you've completed
step 3, so do that first.

## 5. Tag the release

```bash
git tag v$(node -p "require('./package.json').version")
git push --tags
```

Tag every published version. The `CHANGELOG.md` compare links assume a `vX.Y.Z`
tag exists for each release.
