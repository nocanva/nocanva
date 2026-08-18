# Sprout autonomous media agent

Use these instructions when working in the Fortwin AI repository. The product brand is **Sprout** and Canvnah is the local media production system.

## One-time human setup

1. Copy this file into the Fortwin AI repository as `FORTWIN_SPROUT_AGENT.md`.
2. Add this line to the repository’s root `CLAUDE.md`: `@FORTWIN_SPROUT_AGENT.md`
3. Start the local Canvnah app at `http://localhost:3000`.
4. From the Fortwin AI repository, register the local MCP server:

   `claude mcp add canvnah --scope local --env CANVNAH_BASE_URL=http://localhost:3000 -- /Users/rohit/projects/canvnah/node_modules/.bin/tsx /Users/rohit/projects/canvnah/mcp/server.ts`

5. Verify it with `claude mcp get canvnah`.

For a non-interactive autonomous run after setup:

`claude -p --max-turns 40 --allowedTools "Read,Grep,Glob,Write,mcp__canvnah" "Create and review a three-post Sprout batch from this repository using the Canvnah workflow."`

## Mission

Autonomously turn verified information in this repository into reviewed, brand-consistent Sprout social posts. Discover the brand from source files, maintain its Canvnah brand and templates, review every design, create the posts, render them, inspect the saved records, and return a concise manifest.

Do not wait for step-by-step approval for local brand setup, template versioning, review, post creation, or rendering. Ask the user only when a required fact cannot be established from the repository, a claim would create legal or reputational risk, or an action would publish outside the local Canvnah workspace.

## Required local tools

The `canvnah` MCP server must expose these tools:

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

At the beginning of a media task, verify that the tools are available. If they are missing, stop and report: “The local Canvnah MCP server is not connected.” If a tool reports that Canvnah is unreachable, stop and report: “Start the Canvnah app at http://localhost:3000 and retry.” Do not substitute a hosted endpoint.

## Sources of truth

Use repository evidence in this order:

1. Explicit Sprout brand guidelines and strategy documents.
2. Product pages, README files, product specifications, and maintained documentation.
3. Existing design tokens, CSS variables, theme configuration, logos, and marketing assets.
4. Tests and implementation details that confirm product behavior.
5. Recent approved Sprout copy already present in the repository.

Never read or reproduce secrets, credentials, private customer data, personal data, or unannounced roadmap material. Never invent performance numbers, customer claims, integrations, prices, certifications, or launch dates.

When sources conflict, prefer the most explicit and recently maintained source. Record the chosen source paths in the post prompt so the content remains traceable.

## Autonomous workflow

### 1. Discover Sprout

- Inspect the repository structure and search for `Sprout`, brand tokens, product positioning, audience descriptions, benefits, proof points, and approved terminology.
- Build a short internal evidence ledger containing the source path, supported fact, and confidence.
- Determine the brand name, tagline, website label, background color, primary text color, accent color, muted text color, and safe area.
- Use only six-digit hex colors supported by source evidence. If no complete palette exists, derive the smallest accessible palette from the most prominent existing Sprout colors and explicitly label it as a derived local working palette in the final manifest.

### 2. Create or reconcile the Sprout brand

- Call `canvnah_list_brands` first.
- Use the stable brand ID `sprout`.
- If Sprout is absent, call `canvnah_create_brand` with the evidence-backed configuration.
- If Sprout exists, compare it with current repository evidence. Call `canvnah_create_brand` only when a material token or naming change is required; the tool updates the existing local record.
- Keep the safe area between 56 and 96 pixels unless explicit brand guidance requires another supported value.

### 3. Create or reconcile templates

Maintain no more than these two default templates unless the user asks for another format:

- `sprout-statement`: renderer `statement`; one decisive product insight with concise support.
- `sprout-signal`: renderer `signal`; a numbered finding, principle, or evidence-led observation.

Call `canvnah_list_templates` with `brandId: "sprout"` before creating anything. Reuse an existing suitable template. Calling `canvnah_create_template` with an existing ID creates a new version, so do this only when the renderer family, name, or purpose materially changes.

### 4. Review templates before production

For every template selected for the task:

- Call `canvnah_review_template` in both `portrait` and `square` formats.
- Use realistic Sprout copy near the expected maximum length, not placeholder text.
- Require every automated check to pass: schema, canvas bounds, overflow, and deterministic PNG hash.
- Inspect the returned PNG visually. Check spelling, hierarchy, contrast, whitespace, brand identity, line breaks, footer accuracy, and whether the design looks credible as a Sprout post.
- If review fails, revise the copy, brand safe area/colors, or template renderer and review again. Make at most two focused correction cycles. Do not create production posts from an unreviewed or failing template.

### 5. Plan the post batch

If the user supplies a topic or campaign, follow it. Otherwise derive three posts from repository evidence:

1. A clear Sprout product capability.
2. A useful problem insight for Sprout’s intended audience.
3. An evidence-backed workflow principle or differentiator.

Each post must contain:

- `eyebrow`: 1–28 characters.
- `headline`: 1–84 characters.
- `support`: 1–150 characters.
- A prompt field naming the source files and the content goal.

Prefer direct, specific language. Avoid generic AI phrasing, inflated adjectives, unsupported superlatives, hashtags, emojis, and calls to action unless the repository establishes them as part of Sprout’s voice.

### 6. Review and render every post

For each final post:

1. Call `canvnah_review_template` with the exact final content and format.
2. Inspect the returned PNG and require all checks to pass.
3. Call `canvnah_create_post` using `brandId: "sprout"` and the reviewed template ID.
4. Call `canvnah_render_post` with the returned post ID.
5. Call `canvnah_get_render` with the returned render ID.
6. Verify that brand, template version, dimensions, input snapshot, asset URL, workspace URL, and SHA-256 are present and consistent.

If the saved result needs a copy-only iteration, create a new post with corrected content, review it, and render it with the previous render ID as `parentRenderId`. Use `canvnah_rerender` only when an unchanged snapshot should be reproduced exactly.

### 7. Save a run manifest

Create or update `artifacts/canvnah/sprout-latest.md` in this repository. Include:

- Date and task summary.
- Repository source paths used.
- Brand ID and relevant template IDs/versions.
- For every post: headline, format, post ID, render ID, asset URL, workspace URL, dimensions, and SHA-256.
- Review result and any derived assumptions.

Do not commit generated PNG bytes to the Fortwin AI repository unless the user explicitly requests that. The immutable local Canvnah asset URL is the default artifact reference.

## Completion standard

A task is complete only when every requested post has passed exact-content review, has a saved immutable render, can be inspected through its workspace URL, and appears in the run manifest. Finish with a compact summary of what was created, the manifest path, and the local workspace URLs. Do not claim that anything was published to social media.
