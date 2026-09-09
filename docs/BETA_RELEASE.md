# Public beta checklist

## Ready now

- [x] Open Google sign-in; no invite list.
- [x] One isolated personal workspace for every user.
- [x] OAuth MCP flow with PKCE, dynamic client registration, and refresh tokens.
- [x] End-to-end login verified with Codex and Claude Code.
- [x] UI and MCP resolve the same `user_id` and `workspace_id`.
- [x] Human-only final approval in the hosted environment.
- [x] Immutable reviewed PNGs, revisions, hashes, and carousel ZIPs.
- [x] Revocable workspace-scoped tokens for CI and headless agents.
- [x] Public privacy, terms, support email, and Google-only authentication pages.
- [x] Two-workspace isolation and anonymous fail-closed contract tests.

## Owner actions before announcing broadly

- [ ] Publish the Google OAuth consent screen for external users and verify its app name, logo, support email, privacy URL, and terms URL.
- [x] Decide beta limits for uploads, renders, storage, and bearer tokens per workspace.
- [x] Decide retention, account deletion, and data export behavior.
- [x] Choose the public support/feedback channel and response owner.
- [ ] Run a production dogfood pass with two unrelated Google accounts.
- [x] Verify backups and complete one restore drill.
- [ ] Make the GitHub repository public, enable private vulnerability reporting, and protect `main` with required CI.
- [ ] Create the release tag and GitHub release notes after the final smoke test.

A custom domain is intentionally not a beta blocker. Replace the two `workers.dev` origins together when a domain is ready; OAuth issuer, resource metadata, Google callback, and client documentation must stay consistent.

## Beta operating policy

- Source images are limited to 750 KB each. A workspace may hold up to 100 source images, perform up to 100 render or review captures in a rolling 24-hour period, retain up to 250 MB of media, and keep up to five active bearer tokens. Workspace-count and storage limits are soft caps during beta; new writes may be paused when a workspace exceeds them. Existing immutable artifacts remain readable. There is no beta billing.
- Workspace records and media are retained while the account remains active. Export and deletion requests are accepted at `rohitsainihere@gmail.com` and completed within 30 days. Operational logs are retained for up to 30 days. Deleted workspace data may remain in encrypted disaster-recovery backups for up to 30 additional days before expiry.
- Rohit Saini owns beta support and feedback at `rohitsainihere@gmail.com`, with an initial response target of five business days. Security reports should use GitHub private vulnerability reporting.

Restore drill evidence: on 10 September 2026, a stopped local runtime snapshot (208,737,568 bytes) was archived, its SHA-256 sidecar was verified, restored into an isolated state directory, and compared byte-for-byte with the source state.

## Launch smoke test

1. Create a clean Google account session and sign in to the UI.
2. Connect a fresh Codex installation through OAuth.
3. Connect a fresh Claude Code installation through OAuth.
4. Create a draft, open its stable workspace URL, edit it in the UI, and retrieve that revision through MCP.
5. Review the rendered PNG, approve it as a human, render it, and verify the final SHA-256 matches the reviewed artifact.
6. Repeat with a second account and prove neither account can read the other's draft, asset, render, or token.

## After beta

- Teams and shared workspaces.
- Account deletion and export UI.
- Quotas, billing, and abuse controls informed by beta usage.
- Custom domains.

Scheduling, publishing, video, marketplaces, and a freeform canvas remain outside the beta scope.
