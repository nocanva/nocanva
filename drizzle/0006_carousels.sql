CREATE TABLE `carousels` (`id` text PRIMARY KEY NOT NULL, `workspace_id` text NOT NULL, `brand_id` text NOT NULL REFERENCES brands(id), `template_id` text NOT NULL REFERENCES templates(id), `current_revision` integer NOT NULL, `status` text NOT NULL, `archived_at` integer, `created_by` text NOT NULL, `created_at` integer NOT NULL, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `idx_carousels_workspace` ON `carousels` (`workspace_id`,`updated_at`);
--> statement-breakpoint
CREATE TABLE `carousel_revisions` (`id` text PRIMARY KEY NOT NULL, `workspace_id` text NOT NULL, `carousel_id` text NOT NULL REFERENCES carousels(id), `revision` integer NOT NULL, `template_version_id` text NOT NULL REFERENCES template_versions(id), `format` text NOT NULL, `slides_json` text NOT NULL, `prompt` text, `created_by` text NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_carousel_revisions_revision` ON `carousel_revisions` (`carousel_id`,`revision`);
--> statement-breakpoint
CREATE TABLE `carousel_reviews` (`id` text PRIMARY KEY NOT NULL, `workspace_id` text NOT NULL, `carousel_revision_id` text NOT NULL REFERENCES carousel_revisions(id), `reviewer` text NOT NULL, `status` text NOT NULL, `notes` text, `checks_json` text NOT NULL, `artifacts_json` text NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `idx_carousel_reviews_revision` ON `carousel_reviews` (`carousel_revision_id`);
--> statement-breakpoint
CREATE TABLE `carousel_approvals` (`id` text PRIMARY KEY NOT NULL, `workspace_id` text NOT NULL, `carousel_revision_id` text NOT NULL REFERENCES carousel_revisions(id), `review_id` text REFERENCES carousel_reviews(id), `actor` text NOT NULL, `decision` text NOT NULL, `notes` text, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `idx_carousel_approvals_revision` ON `carousel_approvals` (`carousel_revision_id`);
--> statement-breakpoint
CREATE INDEX `idx_carousel_approvals_review` ON `carousel_approvals` (`review_id`);
--> statement-breakpoint
CREATE TABLE `carousel_renders` (`id` text PRIMARY KEY NOT NULL, `workspace_id` text NOT NULL, `carousel_revision_id` text NOT NULL REFERENCES carousel_revisions(id), `template_version_id` text NOT NULL REFERENCES template_versions(id), `review_id` text NOT NULL REFERENCES carousel_reviews(id), `artifacts_json` text NOT NULL, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `idx_carousel_renders_workspace` ON `carousel_renders` (`workspace_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_carousel_renders_revision` ON `carousel_renders` (`carousel_revision_id`);
