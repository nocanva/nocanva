# Sprout autonomous media agent for Codex and Claude Code

Use these instructions with either Codex or Claude Code when working in the Fortwin AI repository. The product brand is **Sprout** and NoCanva is the local media production system.

## One-time human setup

1. Copy this file into the root of the Fortwin AI repository as `AGENTS.md`. Codex discovers this file automatically.
2. For Claude Code, add this line to the repository’s root `CLAUDE.md`: `@AGENTS.md`
3. Start the local NoCanva app at `http://localhost:3000`.
4. Register the local MCP server for Claude Code:

   `claude mcp add nocanva --scope local --env NOCANVA_BASE_URL=http://localhost:3000 -- npm --prefix /absolute/path/to/nocanva run mcp:dev`

5. Register the same local MCP server for Codex:

   `codex mcp add nocanva --env NOCANVA_BASE_URL=http://localhost:3000 -- npm --prefix /absolute/path/to/nocanva run mcp:dev`

6. Verify with `claude mcp get nocanva` and `codex mcp list`. Start a new agent session after registration so its MCP tool inventory is refreshed.

For a non-interactive autonomous run after setup:

`claude -p --max-turns 40 --allowedTools "Read,Grep,Glob,Write,mcp__nocanva" "Create and review a three-post Sprout batch from this repository using the NoCanva workflow."`

## Mission

Autonomously turn verified information in this repository into reviewed, brand-consistent Sprout social posts. Discover the brand from source files, maintain its NoCanva brand and templates, review every design, create the posts, render them, inspect the saved records, and return a concise manifest.

Do not wait for step-by-step approval for local brand setup, template versioning, review, post creation, or rendering. Ask the user only when a required fact cannot be established from the repository, a claim would create legal or reputational risk, or an action would publish outside the local NoCanva workspace.

## Required local tools

The `nocanva` MCP server must expose these tools:

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

Advanced setup and compatibility tools:

- `canvnah_list_brands`
- `canvnah_create_brand`
- `canvnah_create_template`
- `canvnah_review_template`

At the beginning of a media task, verify that the tools are available. If they are missing, stop and report: “The local NoCanva MCP server is not connected.” If a tool reports that NoCanva is unreachable, stop and report: “Start the NoCanva app at http://localhost:3000 and retry.” Do not substitute a hosted endpoint.

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

Call `nocanva_list_templates` with `brandId: "sprout"` before creating anything. Reuse an existing suitable template. Calling the advanced `canvnah_create_template` tool with an existing ID creates a new version, so do this only when the renderer family, name, or purpose materially changes.

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

### 6. Create, review, approve, and render every draft

For each final post:

1. Call `nocanva_create_draft` using `brandId: "sprout"` and the selected template ID.
2. Save the stable draft workspace URL.
3. Call `nocanva_review_draft` with the returned draft ID.
4. Inspect the returned PNG and require all mechanical checks to pass. Visual acceptance is your responsibility as the multimodal agent.
5. Call `nocanva_approve_draft` with the exact current revision and identify yourself as the approval actor.
6. Call `nocanva_render` with the approved draft ID.
7. Call `nocanva_get_render` with the returned render ID.
8. Verify that draft revision, brand, pinned template version, dimensions, input snapshot, asset URL, workspace URL, and SHA-256 are present and consistent.

Before changing an existing draft, call `nocanva_get_draft` and pass its `currentRevision` to `nocanva_update_draft`. Never guess a revision number. An update creates a new immutable revision and clears the previous approval, so review and approve it again before rendering.

### 7. Save a run manifest

Create or update `artifacts/nocanva/sprout-latest.md` in this repository. Include:

- Date and task summary.
- Repository source paths used.
- Brand ID and relevant template IDs/versions.
- For every post: headline, format, draft ID/revision, pinned template version, render ID, asset URL, workspace URL, dimensions, and SHA-256.
- Review result and any derived assumptions.

Do not commit generated PNG bytes to the Fortwin AI repository unless the user explicitly requests that. The immutable local NoCanva asset URL is the default artifact reference.

## Completion standard

A task is complete only when every requested post has passed exact-content review, has a saved immutable render, can be inspected through its workspace URL, and appears in the run manifest. Finish with a compact summary of what was created, the manifest path, and the local workspace URLs. Do not claim that anything was published to social media.
