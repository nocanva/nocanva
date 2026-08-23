import { env } from "cloudflare:workers";
import { personalWorkspaceId } from "../workspace-identity";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export type PersonalWorkspace = {
  id: string;
  name: string;
  role: "owner";
};

function workspaceName(user: AuthUser) {
  const firstName = user.name.trim().split(/\s+/)[0] || user.email.split("@")[0] || "My";
  return `${firstName}’s workspace`.slice(0, 80);
}

async function existingPersonalWorkspace(userId: string): Promise<PersonalWorkspace | null> {
  const row = await env.DB.prepare(`
    SELECT w.id, w.name, wm.role
    FROM workspaces w
    JOIN workspace_memberships wm ON wm.workspace_id = w.id
    WHERE w.personal_owner_user_id = ? AND wm.user_id = ? AND w.kind = 'personal'
    LIMIT 1
  `).bind(userId, userId).first<{ id: string; name: string; role: string }>();
  return row ? { id: row.id, name: row.name, role: "owner" } : null;
}

export async function getOrCreatePersonalWorkspace(user: AuthUser): Promise<PersonalWorkspace> {
  const existing = await existingPersonalWorkspace(user.id);
  if (existing) return existing;

  const workspaceId = await personalWorkspaceId(user.id);
  const membershipId = `wmem-${workspaceId.slice(4)}`;
  const name = workspaceName(user);
  const now = Date.now();

  await env.DB.batch([
    env.DB.prepare(`
      INSERT OR IGNORE INTO workspaces (id, name, kind, personal_owner_user_id, created_at, updated_at)
      VALUES (?, ?, 'personal', ?, ?, ?)
    `).bind(workspaceId, name, user.id, now, now),
    env.DB.prepare(`
      INSERT OR IGNORE INTO workspace_memberships (id, workspace_id, user_id, role, created_at)
      VALUES (?, ?, ?, 'owner', ?)
    `).bind(membershipId, workspaceId, user.id, now),
  ]);

  const created = await existingPersonalWorkspace(user.id);
  if (!created) throw new Error("The personal workspace could not be provisioned.");
  return created;
}

export async function getOrCreatePersonalWorkspaceForUserId(userId: string) {
  const user = await env.DB.prepare("SELECT id, name, email, image FROM user WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<AuthUser>();
  if (!user) return null;
  return getOrCreatePersonalWorkspace(user);
}
