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
  const scopes = (single(params.scope) ?? "").split(/\s+/).filter(Boolean);
  return <main className="auth-shell"><ConsentCard scopes={scopes} /></main>;
}
