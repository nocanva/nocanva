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

For repeat checks, call `nocanva_list_compositions` with `compact: true` and a
`candidate` to get live diversity guidance without retransmitting the full
catalog. `nocanva_list_renders` also returns `feedPreview.tiles`: exactly nine
newest-per-lineage grid positions, with `null` for empty positions.

## Upload a repository image without sending bytes through the model

Use `nocanva_create_asset_upload` when the source PNG or JPEG is already on the
agent's filesystem. Compute the exact file size and SHA-256 locally, then pass
only the name, MIME type, size, and hash to the tool. It returns a five-minute
upload URL plus a workspace-scoped bearer ticket bound to those exact values.

From the repository terminal, upload the unchanged file directly:

```bash
curl --fail-with-body --request PUT \
  --header "Authorization: Bearer <returned ticket>" \
  --header "Content-Type: image/jpeg" \
  --data-binary @./path/to/screenshot.jpg \
  "<returned uploadUrl>"
```

The response contains the new asset ID and its SHA-256. NoCanva rejects an
expired ticket, a different MIME type, byte count, or hash, and any image that
does not decode. The source bytes go from the terminal to NoCanva rather than
through the MCP/model payload. Keep the short-lived ticket out of committed
files and logs. The original base64 upload tool remains available for clients
that can carry binary data without altering it.

## Safely retry a draft review

`nocanva_review_draft` records a review and is not read-only. If the transport
drops after sending the call, first use `nocanva_get_draft`. When the current
revision already has the expected latest `review` (compare its status, SHA-256,
reviewer, and creation time), treat the original call as committed instead of
submitting the same review again. Retry only when the current revision has no
matching review.

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
