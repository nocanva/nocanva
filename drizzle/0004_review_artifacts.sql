ALTER TABLE `draft_reviews` ADD `asset_key` text;
--> statement-breakpoint
ALTER TABLE `draft_reviews` ADD `asset_content_type` text;
--> statement-breakpoint
ALTER TABLE `draft_reviews` ADD `width` integer;
--> statement-breakpoint
ALTER TABLE `draft_reviews` ADD `height` integer;
--> statement-breakpoint
ALTER TABLE `draft_reviews` ADD `sha256` text;
--> statement-breakpoint
ALTER TABLE `draft_approvals` ADD `review_id` text REFERENCES draft_reviews(id);
--> statement-breakpoint
CREATE INDEX `idx_draft_approvals_review` ON `draft_approvals` (`review_id`);
