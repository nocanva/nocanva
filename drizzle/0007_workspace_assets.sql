CREATE TABLE `workspace_assets` (`id` text PRIMARY KEY NOT NULL, `workspace_id` text NOT NULL, `name` text NOT NULL, `mime_type` text NOT NULL, `width` integer NOT NULL, `height` integer NOT NULL, `sha256` text NOT NULL, `asset_key` text NOT NULL, `archived_at` integer, `created_by` text NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `idx_workspace_assets_workspace` ON `workspace_assets` (`workspace_id`,`created_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspace_assets_sha` ON `workspace_assets` (`workspace_id`,`sha256`);
