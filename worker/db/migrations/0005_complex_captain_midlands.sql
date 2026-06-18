CREATE TABLE `user_api_keys` (
	`user_id` text NOT NULL,
	`provider` text NOT NULL CHECK(`provider` IN ('anthropic', 'openai')),
	`ciphertext` text NOT NULL,
	`iv` text NOT NULL,
	`last_four` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `provider`)
);
