# NoCanva roadmap

## Now: public developer beta

NoCanva's current release is a narrow, trustworthy loop:

`verified evidence → agent draft → rendered review → human approval → immutable export`

The beta is successful when a developer can connect Codex or Claude Code, create useful media, inspect the real PNG in the browser, make a small edit, and export the exact approved bytes without learning a design tool.

Current quality gate: the 20-task Blindspot benchmark in `benchmarks/blindspot-v1.json` must reach at least 70% publishable without design edits and a median human edit time below two minutes.

## Beta priorities

1. Improve composition quality and variety without weakening brand constraints.
2. Make first connection, first draft, and first approval obvious.
3. Prove personal-workspace isolation, OAuth reliability, backup, and restore in production.
4. Observe real developers and remove the highest-friction step each week.
5. Document account deletion, export, limits, and support before expanding usage.

## Next, after the quality gate

- Teams and shared workspaces.
- Reusable designer-authored brand systems.
- More launch-media formats and partial carousel rerendering.
- Quotas, billing, and operational controls based on measured beta usage.

## Explicitly not now

- Social publishing or scheduling.
- Video or animation.
- A template marketplace.
- A general-purpose freeform canvas.
- Embedded NoCanva LLM calls.
- Broad platform integrations before the core workflow is excellent.

NoCanva remains agent-native, model-neutral, deterministic, versioned, and human-approved.
