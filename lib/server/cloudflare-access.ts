import { createRemoteJWKSet, jwtVerify } from "jose";

type AccessClaims = {
  sub?: unknown;
  email?: unknown;
  name?: unknown;
};

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function stringClaim(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function identityFromValidatedAccessJwt(token: string | null) {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const claims = JSON.parse(atob(normalized)) as AccessClaims;
    const email = stringClaim(claims.email);
    const userId = stringClaim(claims.sub) ?? email;
    if (!userId) return null;
    return { userId, email, name: stringClaim(claims.name) };
  } catch {
    return null;
  }
}

export async function verifyCloudflareAccessJwt(token: string | null, teamDomain: string, audience: string) {
  if (!token || !teamDomain || !audience) return null;
  const issuer = teamDomain.replace(/\/$/, "");
  const issuerUrl = new URL(issuer);
  if (issuerUrl.protocol !== "https:" || !issuerUrl.hostname.endsWith(".cloudflareaccess.com")) return null;
  const certsUrl = `${issuer}/cdn-cgi/access/certs`;
  let keySet = keySets.get(certsUrl);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(certsUrl));
    keySets.set(certsUrl, keySet);
  }
  try {
    const { payload } = await jwtVerify(token, keySet, { issuer, audience });
    const email = stringClaim(payload.email);
    const userId = stringClaim(payload.sub) ?? email;
    if (!userId) return null;
    return { userId, email, name: stringClaim(payload.name) };
  } catch {
    return null;
  }
}
