# Canvnah

Canvnah turns structured ideas into deterministic, brand-ready social media. The current workspace includes a Blindspot brand system, versioned templates, exact-size PNG rendering, immutable render history, and a local MCP interface for agent workflows.

## Local development

Canvnah requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The app starts at `http://localhost:3000`. Local D1 and R2 state is managed by the development runtime inside the project workspace.

## Local MCP server

Keep the Canvnah app running, then configure an MCP client to spawn:

```json
{
  "mcpServers": {
    "canvnah": {
      "command": "npm",
      "args": ["run", "mcp:dev"],
      "cwd": "/Users/rohit/projects/canvnah",
      "env": {
        "CANVNAH_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

The MCP process uses stdio and accepts loopback URLs only. It is intentionally not hosted or exposed over HTTP.

Available tools:

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

The render tools open the local preview with Playwright, verify two identical PNG hashes, save the asset through the same API used by the UI, and return the render ID, post ID, dimensions, template version, asset URL, and workspace URL.

For an autonomous Claude Code workflow that derives the Sprout brand and content from the Fortwin AI repository, copy [FORTWIN_SPROUT_AGENT.md](./FORTWIN_SPROUT_AGENT.md) into that repository and import it from the project `CLAUDE.md`.

## Validation

With the local app running, execute the full agent workflow fixture:

```bash
npm run mcp:fixture
```

The fixture creates a local Sprout brand and template, reviews portrait and square layouts, creates a post, renders it, inspects it, and creates a linked rerender.

Run the regular project checks with:

```bash
npm test
npm run lint
npx tsc --noEmit
```
