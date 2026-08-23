import { requireNoCanvaViewer } from "../../lib/server/request-auth";
import { ConsentCard } from "./consent-card";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ConsentPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) query.append(key, item);
  }
  await requireNoCanvaViewer(`/consent?${query.toString()}`);
  const code = single(params.code);
  if (!code) return <main className="auth-shell"><section className="auth-card"><h1>This connection has expired.</h1><p className="auth-copy">Return to your MCP client and start the connection again.</p></section></main>;
  const scopes = (single(params.scope) ?? "").split(/\s+/).filter(Boolean);
  return <main className="auth-shell"><ConsentCard scopes={scopes} /></main>;
}
