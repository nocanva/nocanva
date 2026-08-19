ALTER TABLE `brands` ADD `workspace_id` text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
ALTER TABLE `templates` ADD `workspace_id` text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
ALTER TABLE `template_versions` ADD `workspace_id` text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
ALTER TABLE `posts` ADD `workspace_id` text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
ALTER TABLE `drafts` ADD `workspace_id` text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
ALTER TABLE `draft_revisions` ADD `workspace_id` text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
ALTER TABLE `draft_reviews` ADD `workspace_id` text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
ALTER TABLE `draft_approvals` ADD `workspace_id` text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
ALTER TABLE `renders` ADD `workspace_id` text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
CREATE INDEX `idx_brands_workspace` ON `brands` (`workspace_id`,`name`);
--> statement-breakpoint
CREATE INDEX `idx_templates_workspace` ON `templates` (`workspace_id`,`brand_id`);
--> statement-breakpoint
CREATE INDEX `idx_posts_workspace` ON `posts` (`workspace_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_drafts_workspace` ON `drafts` (`workspace_id`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_renders_workspace` ON `renders` (`workspace_id`,`created_at`);
