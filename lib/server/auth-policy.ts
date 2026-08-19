export type NoCanvaAuthMode = "disabled" | "sites_private";
export type NoCanvaPrincipal = {
  kind: "local" | "service" | "sites-user";
  actor: string;
  workspaceId: string;
};

export type NoCanvaAuthConfig = {
  mode: NoCanvaAuthMode;
  workspaceId?: string;
  serviceToken?: string;
};

const workspaceIdPattern = /^[a-z][a-z0-9-]{1,47}$/;

function configuredWorkspaceId(value?: string) {
  return parseWorkspaceId(value) ?? "default";
}

function parseWorkspaceId(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized && workspaceIdPattern.test(normalized) ? normalized : null;
}

function trustedActor(value: string | null, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length <= 120 ? normalized : fallback;
}

async function tokensMatch(presented: string, expected: string) {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(presented)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

export async function resolvePrincipal(requestHeaders: Headers, config: NoCanvaAuthConfig): Promise<NoCanvaPrincipal | null> {
  if (config.mode === "disabled") {
    return {
      kind: "local",
      actor: trustedActor(requestHeaders.get("x-nocanva-created-by") ?? requestHeaders.get("x-canvnah-created-by"), "human:workspace"),
      workspaceId: configuredWorkspaceId(config.workspaceId),
    };
  }

  const authorization = requestHeaders.get("authorization");
  const serviceToken = config.serviceToken?.trim();
  if (authorization?.startsWith("Bearer ") && serviceToken && serviceToken.length >= 24) {
    const presented = authorization.slice("Bearer ".length).trim();
    if (await tokensMatch(presented, serviceToken)) {
      return {
        kind: "service",
        actor: trustedActor(requestHeaders.get("x-nocanva-actor-id"), "agent:mcp"),
        workspaceId: parseWorkspaceId(requestHeaders.get("x-nocanva-workspace-id")) ?? configuredWorkspaceId(config.workspaceId),
      };
    }
  }

  const userId = requestHeaders.get("oai-authenticated-user-id")?.trim();
  if (userId) return { kind: "sites-user", actor: `human:${userId}`, workspaceId: configuredWorkspaceId(config.workspaceId) };
  return null;
}
