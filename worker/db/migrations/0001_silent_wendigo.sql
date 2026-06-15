CREATE TABLE `courses` (
	`instructor` text NOT NULL,
	`course_name` text NOT NULL,
	PRIMARY KEY(`instructor`, `course_name`)
);
--> statement-breakpoint
CREATE INDEX `courses_instructor` ON `courses` (`instructor`);