const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isHttpLoopbackRedirect(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:"
      && LOOPBACK_HOSTS.has(url.hostname.toLowerCase())
      && !url.username
      && !url.password
      && !url.hash;
  } catch {
    return false;
  }
}

export async function normalizeLoopbackNativeRegistration(request: Request) {
  const url = new URL(request.url);
  if (request.method !== "POST" || url.pathname !== "/api/auth/oauth2/register") return request;
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return request;

  const body = await request.clone().json().catch(() => null) as Record<string, unknown> | null;
  if (!body || Array.isArray(body)) return request;
  if (body.application_type !== undefined && body.application_type !== "web") return request;
  if (!Array.isArray(body.redirect_uris) || body.redirect_uris.length === 0) return request;
  if (!body.redirect_uris.every(isHttpLoopbackRedirect)) return request;

  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request.url, {
    method: request.method,
    body: JSON.stringify({ ...body, application_type: "native" }),
    headers,
    redirect: request.redirect,
  });
}
