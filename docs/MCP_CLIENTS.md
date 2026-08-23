# Connect an MCP client

NoCanva uses one hosted Streamable HTTP endpoint:

```text
https://nocanva-mcp.sidsaini1196.workers.dev/mcp
```

Interactive clients use OAuth with PKCE. The browser handles Google sign-in and consent; access and refresh tokens stay in the client's credential store.

## Codex

```bash
codex mcp add nocanva --url https://nocanva-mcp.sidsaini1196.workers.dev/mcp
codex mcp login nocanva
codex mcp get nocanva
```

Install the NoCanva media skill from a Codex task:

```text
$skill-installer https://github.com/nocanva/nocanva/tree/main/skills/nocanva-media
```

Codex MCP reference: [official OpenAI documentation](https://developers.openai.com/codex/mcp/)

## Claude Code

```bash
claude mcp add --transport http nocanva https://nocanva-mcp.sidsaini1196.workers.dev/mcp
claude mcp login nocanva
claude mcp get nocanva
```

Install the skill globally:

```bash
mkdir -p ~/.claude/skills/nocanva-media
curl -fsSL https://raw.githubusercontent.com/nocanva/nocanva/main/skills/nocanva-media/SKILL.md \
  -o ~/.claude/skills/nocanva-media/SKILL.md
```

Use `.claude/skills/nocanva-media/SKILL.md` instead if the skill should be committed to one project. Claude Code documents both locations in its [skills guide](https://code.claude.com/docs/en/skills).

Claude Code MCP reference: [official documentation](https://code.claude.com/docs/en/mcp)

## What the browser flow does

1. The MCP client discovers NoCanva's OAuth metadata.
2. NoCanva registers the native client and validates its loopback callback.
3. The browser opens Google sign-in, followed by NoCanva consent.
4. NoCanva returns an authorization code to the local client callback.
5. The client exchanges it for a one-hour access token and a rotating 30-day refresh token.

The client refreshes credentials automatically. Signing in again is normally required only after the refresh credential expires or is revoked.

The Google identity determines both `user_id` and the user's personal `workspace_id`. MCP tools and the UI therefore read and update the same workspace. Hosted final approval remains human-only.

## CI and headless clients

OAuth is preferred for interactive clients. For CI:

1. Open **Connect** in NoCanva.
2. Create a named token and copy it once.
3. Store it in the CI secret manager as `NOCANVA_MCP_TOKEN`.

Codex:

```bash
codex mcp add nocanva \
  --url https://nocanva-mcp.sidsaini1196.workers.dev/mcp \
  --bearer-token-env-var NOCANVA_MCP_TOKEN
```

Claude Code:

```bash
claude mcp add --transport http nocanva \
  https://nocanva-mcp.sidsaini1196.workers.dev/mcp \
  --header "Authorization: Bearer $NOCANVA_MCP_TOKEN"
```

Never put a bearer token in a repository, prompt, shell history, or committed MCP configuration. Revoke it from **Connect** when the job no longer needs it.

## Troubleshooting

### `This connection has expired`

Return to the client and start a fresh login:

```bash
codex mcp login nocanva
# or
claude mcp login nocanva
```

Do not reuse an old consent URL. OAuth state and PKCE challenges are intentionally short-lived.

### The client still uses an old bearer-token setup

Remove the old entry, add the OAuth entry again, and log in:

```bash
codex mcp remove nocanva
claude mcp remove nocanva
```

Run only the command for the client you are fixing.

### Verify the service

```bash
curl -fsSL https://nocanva-mcp.sidsaini1196.workers.dev/.well-known/oauth-protected-resource/mcp
curl -fsSL https://nocanva-app.sidsaini1196.workers.dev/.well-known/oauth-authorization-server/api/auth
```

Both commands should return JSON metadata. The MCP endpoint itself returns `401` until a client supplies a valid OAuth or bearer token.
