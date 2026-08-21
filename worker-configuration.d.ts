declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    MEDIA: R2Bucket;
		NOCANVA_APPROVAL_MODE?: "agent_allowed" | "human_required";
		NOCANVA_AUTH_MODE?: "disabled" | "sites_private" | "cloudflare_access";
		NOCANVA_ACCESS_TEAM_DOMAIN?: string;
		NOCANVA_ACCESS_AUD?: string;
		NOCANVA_APP_TOKEN?: string;
		NOCANVA_WORKSPACE_ID?: string;
  }
}
