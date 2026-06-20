# Publishing & registry listing

Maintainer steps to release `profitlee-mcp` to npm and list it in MCP registries.
Run these yourself — they require your npm and registry credentials.

## 1. Pre-flight

```bash
npm ci          # clean install
npm test        # 27 tests should pass
npm run build   # tsc -> dist/, exit 0
```

Bump the version in **both** `package.json` and `server.json` (keep them in
sync) following semver. They are `0.1.0` for the first release.

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
(already set to `io.github.aronleedev/profitlee-mcp`) — so publish to npm first.

```bash
# Install the publisher CLI (see the registry repo for the current install method)
# then authenticate with GitHub (namespace io.github.<your-username>):
mcp-publisher login github

# Validate/refresh the manifest if the schema has changed, then publish it:
mcp-publisher publish   # reads ./server.json
```

> The registry schema evolves. If `server.json` fails validation, run
> `mcp-publisher init` to regenerate it against the current schema, then
> re-apply our `environment_variables` and commit the result.

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
git tag v0.1.0
git push --tags
```
