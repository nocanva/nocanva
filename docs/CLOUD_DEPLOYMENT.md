# Deploy NoCanva to Cloudflare

The hosted stack uses two Workers:

- `nocanva-app`: UI, API, Better Auth, D1, and R2.
- `nocanva-mcp`: Streamable HTTP MCP, OAuth token verification, Browser Rendering, and a service binding to the app.

The public UI uses Google sign-in. Do not place Cloudflare Access in front of the app Worker; it would intercept NoCanva's own sign-in and MCP consent flow.

## Prerequisites

- Node.js 22.18 or newer.
- A Cloudflare account authenticated with Wrangler.
- A Google OAuth web application.
- D1 database `nocanva-db` and R2 bucket `nocanva-media`, or equivalent bindings in `wrangler.jsonc`.

For a fork, replace the Cloudflare resource IDs, Worker names, and `workers.dev` origins in both Wrangler files before deploying.

## Google OAuth

Configure this callback in Google Cloud:

```text
https://YOUR_APP_ORIGIN/api/auth/callback/google
```

Set the OAuth consent screen to external when any Google user should be able to sign in. Add the production privacy, terms, support email, and application branding before publishing it.

## Secrets

Create independent random values. Never reuse an MCP bearer token as an internal service secret.

App Worker:

```bash
npx wrangler secret put BETTER_AUTH_SECRET --config wrangler.jsonc
npx wrangler secret put GOOGLE_CLIENT_ID --config wrangler.jsonc
npx wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.jsonc
npx wrangler secret put NOCANVA_APP_TOKEN --config wrangler.jsonc
```

MCP Worker:

```bash
npx wrangler secret put NOCANVA_APP_TOKEN --config wrangler.mcp.jsonc
```

`NOCANVA_APP_TOKEN` must have the same value on both Workers. It authenticates internal app requests and must never be returned to users.

## Database and deployment

```bash
npm ci
npx wrangler d1 migrations apply nocanva-db --remote --config wrangler.jsonc
npm run deploy:cloudflare
npm run mcp:worker:deploy
```

Deploy the app before the MCP Worker whenever OAuth, JWKS, internal identity, or API contracts change.

## Required configuration

`wrangler.jsonc` must use:

- `NOCANVA_AUTH_MODE=better_auth`
- `NOCANVA_APPROVAL_MODE=human_required`
- the public app origin as `BETTER_AUTH_URL`
- the public MCP URL as `NOCANVA_MCP_RESOURCE`

`wrangler.mcp.jsonc` must use that same resource URL and `${BETTER_AUTH_URL}/api/auth` as `NOCANVA_AUTH_ISSUER`. Its `NOCANVA_APP` service binding must target the deployed app Worker.

## Verify

```bash
curl -fsSL https://YOUR_APP_ORIGIN/api/health
curl -fsSL https://YOUR_MCP_ORIGIN/.well-known/oauth-protected-resource/mcp
curl -fsSL https://YOUR_APP_ORIGIN/.well-known/oauth-authorization-server/api/auth
```

Then complete fresh OAuth connections from Codex and Claude Code. A successful browser callback is not enough: each client must report connected and successfully initialize the MCP endpoint.

## Security invariants

- Anonymous media API and workspace requests fail closed.
- Every user receives a personal workspace; there is no shared public fallback workspace.
- OAuth access tokens are audience-bound to the MCP resource and require `nocanva:read` and `nocanva:write`.
- The MCP Worker retrieves JWKS through its app service binding and never logs token contents.
- Hosted final rendering requires a human approval on the exact reviewed revision.
- D1 queries and R2 keys are workspace-scoped.
