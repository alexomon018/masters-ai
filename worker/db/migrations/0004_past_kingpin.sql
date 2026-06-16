CREATE TABLE `feedback` (
	`user_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`message_id` text NOT NULL,
	`sentiment` text NOT NULL,
	`reason` text,
	`comment` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `thread_id`, `message_id`),
	CONSTRAINT "feedback_sentiment" CHECK(`sentiment` IN ('up', 'down'))
);
--> statement-breakpoint
CREATE INDEX `feedback_user_thread` ON `feedback` (`user_id`,`thread_id`);