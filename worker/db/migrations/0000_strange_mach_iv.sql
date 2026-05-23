CREATE TABLE `projects` (
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `project_id`)
);
--> statement-breakpoint
CREATE TABLE `threads` (
	`user_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`title` text,
	`project_id` text,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_message_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `thread_id`)
);
--> statement-breakpoint
CREATE INDEX `threads_user_updated` ON `threads` (`user_id`,`updated_at`);