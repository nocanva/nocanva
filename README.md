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

Keep the NoCanva app running, then connect an agent in one command:

```bash
npm run connect -- codex
# or
npm run connect -- claude
```

For the managed authenticated endpoint, export the workspace token and add `--remote`. The installer keeps the token in `NOCANVA_MCP_TOKEN` rather than writing it to the repository.

```bash
NOCANVA_MCP_TOKEN=... npm run connect -- codex --remote
```

Hosted workspace owners can create and revoke per-agent tokens on the Connect page. NoCanva shows each secret once, stores only its SHA-256 hash, and rejects a revoked token on its next request. Environment-backed tokens remain supported for self-hosting and backward compatibility.

The MCP process uses stdio and accepts loopback URLs by default. For remote self-hosting, run `npm run mcp:http` with `NOCANVA_MCP_TOKEN` and `NOCANVA_BASE_URL`, or use the Docker setup. The managed deployment uses `npm run mcp:worker:deploy`: an authenticated Streamable HTTP Worker plus Cloudflare Browser Rendering, with no Container or embedded LLM.

Primary daily-use tools:

- `nocanva_list_assets`
- `nocanva_upload_asset`
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
- `nocanva_list_carousels`
- `nocanva_get_carousel`
- `nocanva_create_carousel`
- `nocanva_update_carousel`
- `nocanva_review_carousel`
- `nocanva_approve_carousel`
- `nocanva_archive_carousel`
- `nocanva_render_carousel`
- `nocanva_get_carousel_render`

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

The draft workflow gives every agent-created draft a stable `/drafts/:id` URL, creates immutable revisions, prevents stale edits with `expectedRevision`, records review and approval actors, and pins the exact template version and reviewed PNG. Review tools use local Playwright for self-hosting or Cloudflare Browser Rendering in the managed Worker, verify two identical PNG hashes, and save the checked artifact. Approval pins that review record; rendering promotes the exact reviewed bytes without a second browser capture and returns the render ID, revision, dimensions, template version, asset URL, and workspace URL.

The carousel workflow applies that same lifecycle to 3–7 slides under one brand, format, template, and pinned template version. A review captures and checks every slide, approval pins the complete artifact set, and rendering promotes those exact bytes into immutable per-slide PNGs plus a ZIP download. Stable workspaces live at `/carousels/:id` and immutable exports at `/carousel-renders/:id`.

Drafts and individual carousel slides can reference immutable PNG/JPEG workspace images. Humans and agents can select an image, choose cover or contain, set a normalized focal point, and apply a constrained 1–3× zoom. Those crop instructions live in the immutable revision and are reproduced by every renderer. Uploads are currently limited to 750 KB so the same contract works through local, Workers, and remote MCP request boundaries.

## Managed release candidate

The private release-candidate app runs at [nocanva-app.sidsaini1196.workers.dev](https://nocanva-app.sidsaini1196.workers.dev) with dedicated D1 and R2 bindings. Its APIs fail closed for anonymous requests. The authenticated MCP endpoint is [nocanva-mcp.sidsaini1196.workers.dev/mcp](https://nocanva-mcp.sidsaini1196.workers.dev/mcp) and reaches the app through a Cloudflare service binding.

The current Workers URL is service/agent accessible. Human UI access remains on the private Sites deployment until a custom domain is attached and protected by Cloudflare Access. Do not switch the Workers app to anonymous mode.

The reusable agent workflow is bundled as [`skills/nocanva-media/SKILL.md`](./skills/nocanva-media/SKILL.md).

The layout-authoring skill is bundled as [`skills/nocanva-layout/SKILL.md`](./skills/nocanva-layout/SKILL.md). It lets a calling agent generate distinct HTML/CSS poster directions and create versioned `rendererKey: "layout"` templates without editing the renderer for every composition.

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

Run the multi-slide lifecycle fixture with:

```bash
npm run mcp:carousel-fixture
```

It proves 3-slide capture, per-slide checks and hashes, review-set approval, exact-byte promotion, ZIP export, stale-write protection, approval invalidation, and archive/restore.

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
