# Evidence ledger — Cloudflare Agents SDK

## Benchmark role

Information-heavy developer product launch.

## Approved sources

- Agents documentation: <https://developers.cloudflare.com/agents/>
- Getting started: <https://developers.cloudflare.com/agents/getting-started/>
- Agents API: <https://developers.cloudflare.com/agents/runtime/agents-api/>
- Original launch changelog: <https://developers.cloudflare.com/changelog/post/2025-02-25-agents-sdk/>

## Approved facts

- The Agents SDK is used to build and host agents on Cloudflare.
- The runtime provides durable identity, state, connections, scheduling, and recovery.
- Agent sessions can use local SQL storage and real-time connections.
- Supported integration surfaces described by the current documentation include chat, email, voice, Slack, and webhooks.
- Agents use Durable Objects.
- The SDK includes a server-side `Agent` class and client-side APIs.
- An agent can be added to an existing Workers application.

## Prohibited or time-sensitive claims

- Unqualified performance, latency, cost, or scale superiority.
- Feature support not present in the current official documentation.
- Exact limits or pricing without a fresh source check.
- “No infrastructure” or “infinitely scalable” rewrites beyond the precise official language.
- Third-party adoption or customer claims without a primary case study.

## Source assets required

- Official Cloudflare logo and current Agents product mark if available for permitted internal use.
- A real code example from the official documentation.
- A current architecture or UI screenshot from an official source.
- Optional durable-state visualization derived from documented concepts, clearly presented as explanatory artwork rather than product UI.

## Candidate directions

1. **Every agent gets a durable identity** — identity and state as the central visual metaphor.
2. **One agent, many channels** — connected channel system around the durable agent runtime.
3. **State survives the conversation** — code-and-architecture editorial poster.
