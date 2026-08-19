# NoCanva

NoCanva turns structured ideas into deterministic, brand-ready social media. It is an MIT-licensed, agent-native workspace with versioned brand systems and templates, exact-size PNG rendering, immutable revisions, and local or authenticated remote MCP interfaces.

NoCanva does not make embedded LLM calls. Codex, Claude Code, or another calling agent supplies copy and visual judgment; the workspace enforces structure, brand constraints, provenance, review state, and reproducible rendering.

## Self-host in two minutes

```bash
npm run self-host
```

This generates a unique bearer token and starts the web workspace plus its Streamable HTTP MCP sidecar with Docker Compose. Continue with [the self-hosting guide](./docs/SELF_HOSTING.md), or use local development below.

## Local development

NoCanva requires Node.js 22.18 or newer.

```bash
npm install
npm run dev
```

The app starts at `http://localhost:3000`. Local D1 and R2 state is managed by the development runtime inside the project workspace.

## Local MCP server

Keep the NoCanva app running, then configure an MCP client to spawn:

```json
{
  "mcpServers": {
    "nocanva": {
      "command": "npm",
      "args": ["run", "mcp:dev"],
      "cwd": "/absolute/path/to/nocanva",
      "env": {
      "NOCANVA_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

The MCP process uses stdio and accepts loopback URLs by default. For remote self-hosting, run `npm run mcp:http` with `NOCANVA_MCP_TOKEN` and `NOCANVA_BASE_URL`, or use the Docker setup. The managed deployment uses `npm run mcp:worker:deploy`: an authenticated Streamable HTTP Worker plus Cloudflare Browser Rendering, with no Container or embedded LLM.

Primary daily-use tools:

- `nocanva_get_brand`
- `nocanva_list_templates`
- `nocanva_list_drafts`
- `nocanva_get_draft`
- `nocanva_create_draft`
- `nocanva_update_draft`
- `nocanva_review_draft`
- `nocanva_approve_draft`
- `nocanva_archive_draft`
- `nocanva_render`
- `nocanva_get_render`

Legacy and advanced tools:

The existing `canvnah_*` tool namespace is retained for MCP-client compatibility while clients migrate to the `nocanva_*` draft workflow. Brand and template creation remain advanced setup operations.

- `canvnah_list_brands`
- `canvnah_create_brand`
- `canvnah_list_templates`
- `canvnah_create_template`
- `canvnah_review_template`
- `canvnah_create_post`
- `canvnah_list_posts`
- `canvnah_render_post`
- `canvnah_list_renders`
- `canvnah_get_render`
- `canvnah_rerender`

The draft workflow gives every agent-created draft a stable `/drafts/:id` URL, creates immutable revisions, prevents stale edits with `expectedRevision`, records review and approval actors, and pins the exact template version used for review and rendering. Render tools use local Playwright for self-hosting or Cloudflare Browser Rendering in the managed Worker, verify two identical PNG hashes, save the asset through the same API used by the UI, and return the render ID, revision, dimensions, template version, asset URL, and workspace URL.

For an autonomous Codex or Claude Code workflow that derives the Sprout brand and content from the Fortwin AI repository, copy [FORTWIN_SPROUT_AGENTS.md](./FORTWIN_SPROUT_AGENTS.md) into that repository as `AGENTS.md`. Codex discovers it automatically; import it from Claude Code's project `CLAUDE.md` with `@AGENTS.md`.

## Validation

With the local app running, execute the full agent workflow fixture:

```bash
npm run mcp:fixture
```

The fixture creates a local Sprout brand and template, reviews portrait and square layouts, creates a post, renders it, inspects it, and creates a linked rerender.

Run the Sprint 1 agent/workspace lifecycle fixture with:

```bash
npm run mcp:draft-fixture
```

It proves multi-actor revision retrieval, stale-write protection, mechanical review, approval, template-version pinning, immutable rendering, approval invalidation after edits, and archive/restore.

Approval is agent-enabled by default for autonomous workspaces. Set `NOCANVA_APPROVAL_MODE=human_required` to require approval actors whose ID begins with `human:` before final rendering.

Generate the reviewed NoCanva launch-post set with:

```bash
npm run render:nocanva
```

Run the regular project checks with:

```bash
npm test
npm run lint
npx tsc --noEmit
```

Operational procedures for migrations, seed data, backups, restores, and upgrades are documented in [docs/OPERATIONS.md](./docs/OPERATIONS.md). The reusable agent workflow is in [AGENTS.md](./AGENTS.md).
