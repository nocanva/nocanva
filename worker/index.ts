/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { identityFromValidatedAccessJwt, verifyCloudflareAccessJwt } from "../lib/server/cloudflare-access";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  NOCANVA_AUTH_MODE?: string;
  NOCANVA_ACCESS_TEAM_DOMAIN?: string;
  NOCANVA_ACCESS_AUD?: string;
}

const ACCESS_ID_HEADER = "x-nocanva-access-user-id";
const ACCESS_EMAIL_HEADER = "x-nocanva-access-user-email";
const ACCESS_NAME_HEADER = "x-nocanva-access-user-name";

async function requestWithAccessIdentity(request: Request, env: Env, ctx: ExecutionContext) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(ACCESS_ID_HEADER);
  requestHeaders.delete(ACCESS_EMAIL_HEADER);
  requestHeaders.delete(ACCESS_NAME_HEADER);

  let identity: CloudflareAccessIdentity | undefined;
  try {
    identity = await ctx.access?.getIdentity();
  } catch (error) {
    console.error(JSON.stringify({ event: "access_identity_lookup_failed", error: error instanceof Error ? error.message : "Unknown error" }));
  }
  const accessJwt = request.headers.get("cf-access-jwt-assertion");
  const jwtIdentity = ctx.access
    ? identityFromValidatedAccessJwt(accessJwt)
    : await verifyCloudflareAccessJwt(accessJwt, env.NOCANVA_ACCESS_TEAM_DOMAIN ?? "", env.NOCANVA_ACCESS_AUD ?? "");
  const userId = identity?.user_uuid?.trim() || identity?.email?.trim() || jwtIdentity?.userId;
  if (userId) requestHeaders.set(ACCESS_ID_HEADER, userId);
  const email = identity?.email?.trim() || jwtIdentity?.email;
  const name = identity?.name?.trim() || jwtIdentity?.name;
  if (email) requestHeaders.set(ACCESS_EMAIL_HEADER, email);
  if (name) requestHeaders.set(ACCESS_NAME_HEADER, name);
  if (ctx.access && !userId) console.error(JSON.stringify({ event: "access_identity_missing", aud: ctx.access.aud }));
  return new Request(request, { headers: requestHeaders });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/.well-known/oauth-authorization-server/api/auth") {
      url.pathname = "/api/auth/.well-known/oauth-authorization-server";
      return handler.fetch(new Request(url, request), env, ctx);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const authenticatedRequest = await requestWithAccessIdentity(request, env, ctx);
    if (env.NOCANVA_AUTH_MODE === "cloudflare_access" && !authenticatedRequest.headers.has(ACCESS_ID_HEADER) && !authenticatedRequest.headers.get("authorization")?.startsWith("Bearer ")) {
      return new Response("Cloudflare Access identity validation failed.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
    }
    return handler.fetch(authenticatedRequest, env, ctx);
  },
};

export default worker;
