# NoCanva agent — feedback from a real run

Written 2026-08-19 after driving the NoCanva MCP surface end-to-end (before the namespace rename): discovered a brand from a
repo, created/reconciled a brand, added a new renderer, reviewed templates in both formats, and
produced three rendered posts with immutable records.

Target as stated: **a no-nonsense Canva** — every kind of Instagram post, single and carousel.
Measured against that target, here is what holds up and what blocks it.

---

## What already works and should not be traded away

- **Provenance is the product.** Post → render → immutable asset + SHA-256 + input snapshot +
  workspace URL is something Canva does not give you. Deterministic double-screenshot hashing is
  the right correctness primitive. Keep it as the core promise.
- **Review before create** is the right agent contract. It stopped me from persisting anything I
  had not looked at, and the failure text is specific enough to act on.
- **Brand as a small typed token set** (four colors + safe area) makes brand drift structurally
  impossible. Good constraint; it just needs a few more slots (below).
- **Loopback-only client guard** in `mcp/canvnah-client.ts` is a good default.

---

## Blockers for "all Instagram post types"

### 1. No carousel — the single biggest gap
A post is one payload and one render. Instagram's highest-performing organic format is a 3–10 slide
carousel with a cover, body slides, and a CTA slide. Nothing in the data model expresses a deck.

What it needs:
- `decks` (or `posts.slides[]`): one brand + one template + ordered slides, each with its own
  content and an explicit role (`cover` | `body` | `cta`).
- Slide-aware renderers: slide index ("3/7"), continuity of a motif across slides, cover treated
  differently from body.
- `canvnah_create_deck`, `canvnah_render_deck`, `canvnah_get_deck` returning an ordered asset list
  plus a deck-level SHA (hash of slide hashes) so a deck is verifiable as one unit.
- Deck view in the workspace, and a re-render that keeps unchanged slides byte-identical.

### 2. Content model is one template's shape, hardcoded globally
`postPayloadSchema` fixes `eyebrow ≤28 / headline ≤84 / support ≤150` for every template that will
ever exist. Templates already carry a `contentSchema` column — it is stored and then ignored.
Real IG posts need quote cards, stat cards, list/step cards, before-after, testimonial, screenshot
+ caption. Each is a different field set.

Fix: validate a post against **its template's** `contentSchema`, not a global constant. That single
change unlocks most format variety without touching renderers.

### 3. Templates are not data — adding one is a code change
`canvnah_create_template` reads as if an agent can create a template. It cannot: `rendererKey` is a
closed enum, and the actual layout lives in a React component plus global CSS. To add one new look
(the Sprout `bloom` card) I edited five files: `lib/media.ts`, `app/post-artwork.tsx`,
`app/globals.css`, `app/layout.tsx`, and two type unions. An agent cannot do that through MCP.

Fix, in increasing order of ambition:
1. Registry: `renderers/{key}.tsx` auto-discovered, so adding a file is the whole change.
2. Layout-as-JSON: a small block spec (stack / text / image / rule / badge / motif) with brand
   tokens as the only color source, interpreted by one generic renderer. Then
   `canvnah_create_template` becomes real, and the agent can invent formats at runtime.

### 4. No images
Every second real IG post is a photo or a product screenshot. There is R2 and no way to put a
picture in a post. Needs: asset upload, an image block with focal point and crop, and brand-safe
treatments (duotone in brand colors, grain, rounded frame) so uploaded images cannot break the look.

### 5. Format registry is too small
`portrait` and `square` only. Instagram also needs 1080×1920 stories/reel covers, and stories need
**platform-safe-area guides** — roughly 250px top and 320px bottom are covered by IG chrome. A
render that passes canvas bounds can still be unreadable in the app. Add per-format safe zones and
make the bounds check aware of them.

### 6. Brand tokens are too thin for a real brand
There is no logo, no font pair, no motif set. So Sprout's leaf mark ended up hand-coded inside a
shared renderer, and Fraunces/Plus Jakarta Sans got wired into the app's root layout rather than
into the brand. A brand record should carry: `logo` (SVG), `fonts.display` / `fonts.body`,
`motifs[]`, and an extended palette. I added `colors.accent` as optional this run — that is the
minimum, not the endpoint.

---

## Bugs and rough edges found while using it

- **Render version pinning is wrong.** `createRender` binds `template_version_id` to
  `` `${payload.templateId}@1` `` unconditionally (`lib/server/media-repository.ts:228`). Every
  render claims template v1 even when it rendered v3, while `data-template-version` in the DOM
  reports the truth. Provenance is the whole pitch here, so this one matters.
- **Chromium per call.** Each `reviewTemplate` / `renderPost` launches and closes a browser. A
  three-post batch with two review passes each = eight launches. Add a batch review endpoint and/or
  a pooled browser; a 10-slide carousel will be unusable otherwise.
- **`tsx` needs arm64 Node.** With an x64 Node on the PATH (`/usr/local/bin/node` here), the MCP
  server dies on the esbuild binary with a Rosetta error. Pin the interpreter in the launch command
  or document it — the failure message does not point at the MCP server.
- **`getTemplateById` loads every template** and filters in JS. Fine now, wrong shape later.
- **No delete/archive.** A rejected draft is permanent. Agents iterate; give them a soft delete.
- **MCP surface gaps:** no `canvnah_list_formats`, no `canvnah_get_brand`, no preview URL tool for
  a human to eyeball before persisting.

---

## Two agent-ergonomics wins that are cheap

1. **Fit check without a browser.** `canvnah_fit_check(templateId, format, content)` returning
   per-field predicted line counts, overflow risk and a suggested trim would let an agent converge
   on copy in one round trip instead of screenshotting to find out a headline is two words long.
2. **Return the diff, not just the verdict.** When a review fails, say which region overflowed by
   how many pixels. "1 region(s) are clipped" makes the agent guess.

---

## Positioning

The instinct to be "Canva without the nonsense" is right, but the moat is not fewer buttons — it is
**verifiable, brand-locked, reproducible output that an agent can drive**. Lean into that: version
pinning that actually pins, decks that hash as a unit, brand tokens that make off-brand output
impossible, and templates that are data an agent can author. Freeform drag-and-drop is the part of
Canva worth leaving behind.
