"use client";

import { useState } from "react";
import { authClient } from "../../lib/auth-client";

export function SignInCard({ callbackURL }: { callbackURL: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const result = await authClient.signIn.social({ provider: "google", callbackURL });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in could not be started.");
      setBusy(false);
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-mark" aria-hidden="true">N</div>
      <p className="auth-kicker">Your creative workspace</p>
      <h1>Make good work.<br />Keep it yours.</h1>
      <p className="auth-copy">NoCanva gives you and your agent one calm place to create, review, and keep brand-ready media.</p>
      <button className="google-button" type="button" onClick={signIn} disabled={busy}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4L15.4 17c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6 12c0-.7.1-1.3.4-1.9V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.7Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7C7.2 7.8 9.4 6 12 6Z"/></svg>
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <p className="auth-fineprint">One login creates your personal workspace. By continuing, you agree to our <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.</p>
    </section>
  );
}
