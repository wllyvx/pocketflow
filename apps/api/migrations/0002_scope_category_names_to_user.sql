DROP INDEX `categories_name_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_user_name` ON `categories` (`user_id`, `name`);
