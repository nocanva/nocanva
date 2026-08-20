# Contributing to NoCanva

NoCanva welcomes focused changes that preserve deterministic rendering, constrained brand systems, immutable revisions, and agent/UI parity.

## Development

Use Node.js 22.18 or newer, install dependencies with `npm install`, and start the app with `npm run dev`. Keep local agent development on stdio with `npm run mcp:dev`.

Before submitting a change, run:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run mcp:fixture
npm run mcp:draft-fixture
npm run mcp:carousel-fixture
```

Media changes also require visual inspection of the returned PNGs. Automated checks do not prove that an image looks good.

Keep pull requests narrow, document schema migrations, avoid embedded LLM dependencies, and do not add publishing, scheduling, or freeform-canvas behavior without prior design discussion.
