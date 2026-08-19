CREATE TABLE `mcp_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`token_prefix` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_mcp_tokens_hash` ON `mcp_tokens` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `idx_mcp_tokens_workspace` ON `mcp_tokens` (`workspace_id`,`created_at`);
