"use client";

import { useState } from "react";
import type { ManagedMcpToken } from "../../lib/server/media-repository";

export function TokenManager({ initialTokens }: { initialTokens: ManagedMcpToken[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [name, setName] = useState("My agent");
  const [secret, setSecret] = useState<string | null>(null);
  const [notice, setNotice] = useState("Optional fallback for CI and headless machines. Interactive clients should use Google above.");

  async function createToken() {
    setSecret(null);
    const response = await fetch("/api/mcp-tokens", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    const result = await response.json() as { token?: string; record?: ManagedMcpToken; error?: string };
    if (!response.ok || !result.token || !result.record) return setNotice(result.error ?? "Token creation failed.");
    setTokens((current) => [result.record!, ...current]);
    setSecret(result.token);
    setNotice("Copy this token now. NoCanva stores only its SHA-256 hash.");
  }

  async function revokeToken(id: string) {
    const response = await fetch(`/api/mcp-tokens/${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json() as { token?: ManagedMcpToken; error?: string };
    if (!response.ok || !result.token) return setNotice(result.error ?? "Token revocation failed.");
    setTokens((current) => current.map((token) => token.id === id ? result.token! : token));
    setNotice("Token revoked. New MCP requests using it will be rejected.");
  }

  return <section className="token-panel">
    <div><p className="kicker">Headless fallback</p><h2>Workspace tokens</h2><p>{notice}</p></div>
    <div className="token-create"><input aria-label="Token name" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} /><button className="primary-button" onClick={createToken} type="button">Create token</button></div>
    {secret && <div className="token-secret"><code>{secret}</code><button onClick={() => void navigator.clipboard.writeText(secret)} type="button">Copy</button></div>}
    <div className="token-list">{tokens.length ? tokens.map((token) => <div key={token.id}>
      <span><strong>{token.name}</strong><small>{token.tokenPrefix} · {token.lastUsedAt ? `used ${new Date(token.lastUsedAt).toLocaleDateString()}` : "never used"}</small></span>
      {token.revokedAt ? <em>Revoked</em> : <button onClick={() => revokeToken(token.id)} type="button">Revoke</button>}
    </div>) : <p>No managed tokens yet.</p>}</div>
  </section>;
}
