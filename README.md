# NoCanva

**The shared media desk for humans and agents.**

Your agent drafts. You review in the browser. NoCanva keeps every revision and exports the exact PNG you approved.

No embedded LLM. No mystery rerender. No design-by-coordinate prompts.

![NoCanva: prompt, review, approve, ship](./docs/assets/nocanva-beta-demo.gif)

## Try the hosted beta

1. Open [NoCanva](https://nocanva-app.sidsaini1196.workers.dev) and continue with Google. A personal workspace is created automatically.
2. Connect Codex:

```bash
codex mcp add nocanva --url https://nocanva-mcp.sidsaini1196.workers.dev/mcp
codex mcp login nocanva
```

Your browser opens once. Continue with Google and approve the connection. The MCP is then bound to your personal workspace.

3. Install the media workflow in Codex:

```text
$skill-installer https://github.com/nocanva/nocanva/tree/main/skills/nocanva-media
```

4. Restart Codex if asked, then try:

```text
$nocanva-media Turn this verified brief into a 4-slide carousel.
Show me the draft before approval.
```

The skill teaches the agent NoCanva's draft, review, human-approval, and immutable-render workflow. Need headless access for CI? Create a revocable token under **Connect** and use `--bearer-token-env-var` instead.

## What happens in the UI

- Review the actual rendered design—not a text preview.
- Edit copy, choose media, and adjust crop or focal point.
- Approve one exact revision.
- Download the approved PNG or carousel ZIP.
- Connect interactive MCP clients with Google; create revocable tokens only for CI or headless agents.

Draft URLs stay stable. Approved exports do not change.

## Self-host

Requires Docker and Node.js 22.18+.

```bash
git clone https://github.com/nocanva/nocanva.git
cd nocanva
npm install
npm run self-host
```

Open `http://localhost:3000`, then connect Codex:

```bash
export NOCANVA_MCP_TOKEN="$(npm run --silent self-host:token)"
codex mcp add nocanva \
  --url http://localhost:3100/mcp \
  --bearer-token-env-var NOCANVA_MCP_TOKEN
```

Full setup: [Self-hosting](./docs/SELF_HOSTING.md)

## Develop locally

```bash
npm install
npm run dev                 # UI: http://localhost:3000
npm run connect -- codex    # local stdio MCP
```

Useful checks:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run mcp:draft-fixture
npm run mcp:carousel-fixture
```

## The contract

- Agents supply verified copy and creative judgment.
- NoCanva owns brands, constrained compositions, revisions, checks, approvals, and rendering.
- Every edit is revisioned; stale writes fail.
- Approval pins a reviewed revision and its PNG hash.
- Final rendering promotes those exact bytes.
- Templates and brand rules are versioned.

The daily MCP API uses `nocanva_*`. The older `canvnah_*` namespace remains for advanced administration and compatibility.

## Read next

- [What is NoCanva?](./docs/WHAT_IS_NOCANVA.md)
- [Build media with the NoCanva skill](./skills/nocanva-media/SKILL.md)
- [Author layouts](./skills/nocanva-layout/SKILL.md)
- [Cloud deployment](./docs/CLOUD_DEPLOYMENT.md)
- [Beta release checklist](./docs/BETA_RELEASE.md)
- [Operations](./docs/OPERATIONS.md)

MIT licensed.
