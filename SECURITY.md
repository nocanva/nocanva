# Security policy

## Supported version

Security fixes are applied to the latest release candidate and the current `main` branch.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub’s private vulnerability reporting for `nocanva/nocanva`, or contact the repository owner privately if that feature is unavailable. Include reproduction steps, affected endpoints, and the expected impact. Please allow a reasonable remediation window before public disclosure.

## Deployment boundaries

- Never run a hosted workspace with `NOCANVA_AUTH_MODE=disabled`.
- Keep `NOCANVA_APP_TOKEN`, MCP bearer tokens, and Cloudflare credentials in secret storage; never commit them.
- Managed MCP tokens are shown once and stored only as SHA-256 hashes.
- Protect a human-facing custom domain with Cloudflare Access before routing production traffic to the Workers app.
- Keep `workers.dev` agent/service access fail-closed when Cloudflare Access is not present.
- Use `NOCANVA_APPROVAL_MODE=human_required` when a human must authorize final output.

NoCanva’s mechanical review checks layout, dimensions, structure, and deterministic hashes. It does not establish factual accuracy, copyright clearance, or aesthetic quality.
