CREATE TABLE `user_memory` (
	`user_id` text NOT NULL,
	`memory_id` text NOT NULL,
	`type` text NOT NULL,
	`memory_key` text,
	`content` text NOT NULL,
	`content_hash` text NOT NULL,
	`source` text DEFAULT 'inferred' NOT NULL,
	`confidence` integer DEFAULT 100 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`superseded_by` text,
	`source_thread_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `memory_id`),
	CONSTRAINT "user_memory_type" CHECK("user_memory"."type" IN ('preference', 'fact', 'episode')),
	CONSTRAINT "user_memory_status" CHECK("user_memory"."status" IN ('active', 'provisional', 'revoked', 'superseded'))
);
--> statement-breakpoint
CREATE INDEX `user_memory_scope` ON `user_memory` (`user_id`,`type`,`status`);--> statement-breakpoint
CREATE INDEX `user_memory_dedup` ON `user_memory` (`user_id`,`content_hash`);