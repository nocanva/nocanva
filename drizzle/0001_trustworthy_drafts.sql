CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`template_id` text NOT NULL,
	`current_revision` integer NOT NULL,
	`status` text NOT NULL,
	`archived_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`),
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_drafts_updated_at` ON `drafts` (`updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_drafts_brand_id` ON `drafts` (`brand_id`);
--> statement-breakpoint
CREATE TABLE `draft_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_id` text NOT NULL,
	`revision` integer NOT NULL,
	`template_version_id` text NOT NULL,
	`format` text NOT NULL,
	`content_json` text NOT NULL,
	`prompt` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `drafts`(`id`),
	FOREIGN KEY (`template_version_id`) REFERENCES `template_versions`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_draft_revisions_draft_revision` ON `draft_revisions` (`draft_id`,`revision`);
--> statement-breakpoint
CREATE TABLE `draft_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_revision_id` text NOT NULL,
	`reviewer` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`checks_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`draft_revision_id`) REFERENCES `draft_revisions`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_draft_reviews_revision` ON `draft_reviews` (`draft_revision_id`);
--> statement-breakpoint
CREATE TABLE `draft_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_revision_id` text NOT NULL,
	`actor` text NOT NULL,
	`decision` text NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`draft_revision_id`) REFERENCES `draft_revisions`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_draft_approvals_revision` ON `draft_approvals` (`draft_revision_id`);
--> statement-breakpoint
ALTER TABLE `renders` ADD COLUMN `draft_revision_id` text REFERENCES `draft_revisions`(`id`);
