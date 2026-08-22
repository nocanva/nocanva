# NoCanva beta release

## Recommended release shape

Ship an **invite-only developer beta** first:

- Google sign-in through Cloudflare Access
- one personal workspace per user
- bearer tokens created and revoked in **Connections**
- human approval required before final rendering
- hosted UI and MCP on NoCanva-owned domains

Do not open sign-in to everyone yet. The current hosted configuration maps authenticated users to one `default` workspace. Public access must wait until workspace and token isolation are enforced.

## Decisions needed from the founder

- [ ] **Domains:** choose the UI and MCP domains, for example `app.nocanva.com` and `mcp.nocanva.com`.
- [ ] **Beta access:** invite-only email allowlist or open signup. Invite-only is recommended for the first release.
- [ ] **Workspace model:** personal workspace per user now; teams and organizations later is recommended.
- [ ] **Google identity:** provide or approve the Google OAuth client used by Cloudflare Access.
- [ ] **First testers:** provide the initial email allowlist.
- [ ] **Approval:** keep a human approval gate for hosted beta renders. Recommended: yes.
- [ ] **Limits:** decide uploads, renders per day, storage, and token count per workspace.
- [ ] **Retention:** decide how long drafts, assets, and renders are kept and how deletion/export works.
- [ ] **Legal:** provide the owner/contact plus Privacy Policy and Terms URLs.
- [ ] **Support:** choose one public feedback channel and response owner.
- [ ] **Launch:** approve the one-line positioning, demo content, launch date, and launch channels.

## Engineering gates

- [ ] Create a workspace for each new identity; never fall back to a shared public workspace.
- [ ] Add workspace membership checks to every UI API, asset, draft, render, and MCP-token path.
- [ ] Require human approval in the hosted environment.
- [ ] Add rate limits and basic abuse controls to token creation, uploads, reviews, and renders.
- [ ] Attach custom domains and verify Cloudflare Access policies do not include `Everyone`.
- [ ] Add onboarding, empty, error, expired-session, revoked-token, and quota states.
- [ ] Add account data export and deletion procedures.
- [ ] Run the complete test suite and a two-user isolation test in production.
- [ ] Verify analytics, error reporting, backups, restore, and support contact.

## Launch order

1. Finish workspace isolation and hosted approval enforcement.
2. Configure Google sign-in, custom domains, limits, and legal links.
3. Dogfood with two separate accounts and prove neither can see the other's data.
4. Invite 10–20 developers and watch their first connection and first render.
5. Fix onboarding friction, then expand the allowlist.
6. Open self-serve signup only after abuse, deletion, support, and reliability are proven.

## Auth after beta

Bearer tokens are simple and suitable for the invite beta. Add standards-based MCP OAuth when NoCanva moves to public self-serve onboarding; keep revocable scoped tokens for CI and service agents.
