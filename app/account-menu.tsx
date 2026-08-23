"use client";

import { authClient } from "../lib/auth-client";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ME";
}

export function AccountMenu() {
  const { data } = authClient.useSession();
  const user = data?.user;
  if (!user) return <span className="avatar" aria-label="Current workspace">ME</span>;

  return (
    <details className="account-menu">
      <summary className="avatar" aria-label="Open account menu">{initials(user.name)}</summary>
      <div className="account-popover">
        <strong>{user.name}</strong>
        <span>{user.email}</span>
        <small>Personal workspace</small>
        <button type="button" onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/sign-in"; } } })}>Sign out</button>
      </div>
    </details>
  );
}
