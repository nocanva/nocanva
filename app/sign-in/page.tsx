import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/server/auth";
import { SignInCard } from "./sign-in-card";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safeReturnTo(value: string | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";
  return value.startsWith("/sign-in") || value.startsWith("/api/auth") ? "/" : value;
}

function oauthContinuation(params: Record<string, string | string[] | undefined>) {
  if (!single(params.sig) || !single(params.client_id)) return null;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) query.append(key, item);
  }
  return `/api/auth/oauth2/authorize?${query.toString()}`;
}

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const callbackURL = oauthContinuation(params) ?? safeReturnTo(single(params.returnTo));
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect(callbackURL);

  return <main className="auth-shell"><SignInCard callbackURL={callbackURL} /></main>;
}
