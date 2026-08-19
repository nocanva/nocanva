# NoCanva agent guide

NoCanva is a deterministic, agent-native media workspace. It does not make embedded LLM calls. The calling agent supplies verified copy and creative judgment; NoCanva owns constrained brands, versioned templates, revisions, mechanical checks, approvals, and immutable PNG rendering.

## Development

- Use Node.js 22.13 or newer.
- Keep local development on stdio MCP with `npm run mcp:dev` and the web app at `http://localhost:3000`.
- Use the `nocanva_*` draft lifecycle for new work. `canvnah_*` exists only for advanced brand/template administration and backward compatibility.
- Preserve deterministic rendering, exact template-version pinning, immutable revisions, and stable workspace URLs.
- Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run mcp:fixture`, `npm run mcp:draft-fixture`, and `npm run mcp:carousel-fixture` after changes to media or MCP behavior.

## Creating media

1. Read the source repository and establish an evidence ledger. Never invent product claims.
2. Read the approved brand with `nocanva_get_brand` and reuse a listed template.
3. Create a draft with `nocanva_create_draft` and retain its stable workspace URL.
4. Before updating, retrieve the draft and use its exact `currentRevision` as `expectedRevision`.
5. Review with `nocanva_review_draft`. Inspect the returned PNG visually in addition to checking schema, dimensions, bounds, overflow, and deterministic hashes.
6. Approve the exact reviewed revision with `nocanva_approve_draft`, then render it with `nocanva_render`.
7. Retrieve the immutable render with `nocanva_get_render` and report its workspace URL, asset URL, pinned template version, dimensions, and SHA-256.

Do not publish externally, create a new brand/template for each post, bypass review, or claim that mechanical checks establish aesthetic quality.

For a 3–7 slide story, use the parallel `nocanva_*_carousel` lifecycle. Keep one brand, format, template, and pinned template version across the set; visually inspect every PNG returned by `nocanva_review_carousel`; approve the complete review set; and report every slide hash plus the immutable ZIP URL.
