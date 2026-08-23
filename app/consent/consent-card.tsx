"use client";

import { useState } from "react";
import { authClient } from "../../lib/auth-client";

const scopeLabels: Record<string, string> = {
  openid: "Confirm your NoCanva identity",
  profile: "Read your name and profile image",
  email: "Read your email address",
  offline_access: "Stay connected after this window closes",
  "nocanva:read": "Read designs in your workspace",
  "nocanva:write": "Create and update designs in your workspace",
};

export function ConsentCard({ scopes }: { scopes: string[] }) {
  const [busy, setBusy] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(accept: boolean) {
    setBusy(accept ? "accept" : "deny");
    setError(null);
    const result = await authClient.oauth2.consent({ accept });
    if (result.error) {
      setError(result.error.message ?? "The connection could not be completed.");
      setBusy(null);
    }
  }

  return (
    <section className="auth-card consent-card">
      <div className="connection-glyph" aria-hidden="true"><span>N</span><i /><span>↗</span></div>
      <p className="auth-kicker">Connect your agent</p>
      <h1>Let this MCP work in your space?</h1>
      <p className="auth-copy">It will act on the same personal workspace you see here. Your agent can prepare work, but only you can give final approval.</p>
      <ul className="consent-list">
        {scopes.filter((scope) => scopeLabels[scope]).map((scope) => <li key={scope}><i>✓</i><span>{scopeLabels[scope]}</span></li>)}
      </ul>
      <div className="consent-actions">
        <button className="google-button" type="button" onClick={() => decide(true)} disabled={busy !== null}>{busy === "accept" ? "Connecting…" : "Connect MCP"}</button>
        <button className="quiet-button" type="button" onClick={() => decide(false)} disabled={busy !== null}>{busy === "deny" ? "Cancelling…" : "Not now"}</button>
      </div>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
    </section>
  );
}
