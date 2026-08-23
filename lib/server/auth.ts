import { env } from "cloudflare:workers";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as authSchema from "../../db/auth-schema";

const appOrigin = env.BETTER_AUTH_URL;
const authIssuer = `${appOrigin.replace(/\/$/, "")}/api/auth`;

function createAuth() {
  return betterAuth({
    appName: "NoCanva",
    baseURL: appOrigin,
    basePath: "/api/auth",
    database: drizzleAdapter(drizzle(env.DB, { schema: authSchema }), {
      provider: "sqlite",
      schema: authSchema,
    }),
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [appOrigin, "http://localhost:3000"],
    account: {
      encryptOAuthTokens: true,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/oauth2/register": { window: 60, max: 10 },
        "/sign-in/social": { window: 60, max: 20 },
      },
    },
    advanced: {
      database: { generateId: "uuid" },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        scope: ["openid", "email", "profile"],
      },
    },
    plugins: [
      jwt({ jwt: { issuer: authIssuer } }),
      mcp({
        loginPage: "/sign-in",
        consentPage: "/consent",
        resource: env.NOCANVA_MCP_RESOURCE,
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        clientRegistrationClientSecretExpiration: "30 days",
        scopes: ["openid", "profile", "email", "offline_access", "nocanva:read", "nocanva:write"],
        clientRegistrationDefaultScopes: ["openid", "profile", "email", "offline_access", "nocanva:read", "nocanva:write"],
      }),
      nextCookies(),
    ],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  auth ??= createAuth();
  return auth;
}

export const noCanvaAuthIssuer = authIssuer;
