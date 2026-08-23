# Security policy

## Supported version

Security fixes are applied to the latest release candidate and the current `main` branch.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting for `nocanva/nocanva`, or email [rohitsainihere@gmail.com](mailto:rohitsainihere@gmail.com) if that feature is unavailable. Include reproduction steps, affected endpoints, and the expected impact. Please allow a reasonable remediation window before public disclosure.

## Deployment boundaries

- Never run a hosted workspace with `NOCANVA_AUTH_MODE=disabled`.
- Use `NOCANVA_AUTH_MODE=better_auth` for the public hosted application and keep Google OAuth credentials, `BETTER_AUTH_SECRET`, `NOCANVA_APP_TOKEN`, MCP bearer tokens, and Cloudflare credentials in secret storage.
- Keep local secrets in `.dev.vars` or `.env` files. Both are ignored by Git and Docker; never commit OAuth credential downloads, service-account files, private keys, or production tokens.
- Managed MCP tokens are shown once and stored only as SHA-256 hashes.
- Do not place Cloudflare Access in front of the public app; it would intercept NoCanva's Google sign-in and MCP consent routes.
- Keep every hosted API and workspace route fail-closed for anonymous requests.
- Use `NOCANVA_APPROVAL_MODE=human_required` for the hosted beta.
- Treat OAuth client secrets, authorization codes, access tokens, refresh tokens, and signed consent URLs as credentials. Never log or commit them.

NoCanva’s mechanical review checks layout, dimensions, structure, and deterministic hashes. It does not establish factual accuracy, copyright clearance, or aesthetic quality.
