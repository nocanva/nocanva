import { createHash, timingSafeEqual } from "node:crypto";

export type McpTokenRecord = {
  id: string;
  token: string;
  workspaceId: string;
  revokedAt?: string | null;
};

export type McpPrincipal = Omit<McpTokenRecord, "token">;

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function equalSecret(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

export function loadTokenRecords(environment: Record<string, string | undefined> = process.env): McpTokenRecord[] {
  const records: McpTokenRecord[] = [];
  if (environment.NOCANVA_MCP_TOKENS) {
    const value = JSON.parse(environment.NOCANVA_MCP_TOKENS) as unknown;
    if (!Array.isArray(value)) throw new Error("NOCANVA_MCP_TOKENS must be a JSON array.");
    records.push(...value.map((entry, index) => {
      if (!entry || typeof entry !== "object") throw new Error(`MCP token record ${index + 1} is invalid.`);
      const record = entry as Record<string, unknown>;
      const token = String(record.token ?? "");
      if (token.length < 24) throw new Error(`MCP token record ${index + 1} must contain a token of at least 24 characters.`);
      return {
        id: String(record.id ?? `token-${index + 1}`),
        token,
        workspaceId: String(record.workspaceId ?? "default"),
        revokedAt: record.revokedAt ? String(record.revokedAt) : null,
      };
    }));
  }

  const token = environment.NOCANVA_MCP_TOKEN;
  if (token) {
    if (token.length < 24) throw new Error("NOCANVA_MCP_TOKEN must contain at least 24 characters before the remote MCP server can start.");
    records.push({ id: "self-host", token, workspaceId: environment.NOCANVA_WORKSPACE_ID ?? "default", revokedAt: null });
  }
  if (records.length === 0) {
    throw new Error("NOCANVA_MCP_TOKEN must contain at least 24 characters before the remote MCP server can start.");
  }
  return records;
}

export function authenticateBearer(authorization: string | undefined, records: McpTokenRecord[]): McpPrincipal | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const candidate = match[1];
  const record = records.find((item) => equalSecret(candidate, item.token));
  if (!record || record.revokedAt) return null;
  return { id: record.id, workspaceId: record.workspaceId, revokedAt: record.revokedAt };
}
