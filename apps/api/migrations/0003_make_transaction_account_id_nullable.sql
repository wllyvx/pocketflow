PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text,
	`envelope_id` text,
	`destination_envelope_id` text,
	`category_id` text,
	`plaid_transaction_id` text,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`date` integer NOT NULL,
	`is_manual` integer NOT NULL,
	`receipt_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destination_envelope_id`) REFERENCES `envelopes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_transactions`("id", "user_id", "account_id", "envelope_id", "destination_envelope_id", "category_id", "plaid_transaction_id", "description", "amount", "type", "date", "is_manual", "receipt_url", "created_at", "updated_at") SELECT "id", "user_id", "account_id", "envelope_id", NULL, "category_id", "plaid_transaction_id", "description", "amount", "type", "date", "is_manual", "receipt_url", "created_at", "updated_at" FROM `transactions`;
--> statement-breakpoint
DROP TABLE `transactions`;
--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_plaid_transaction_id_unique` ON `transactions` (`plaid_transaction_id`);
