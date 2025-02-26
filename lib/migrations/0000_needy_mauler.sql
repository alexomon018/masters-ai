CREATE TABLE "master_sync_.messages_table" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_provided_id" text NOT NULL,
	"user_id" text NOT NULL,
	"thread_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"data" json,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "master_sync_.messages_table_user_provided_id_unique" UNIQUE("user_provided_id")
);
--> statement-breakpoint
CREATE TABLE "master_sync_.projects_table" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_provided_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "master_sync_.projects_table_user_provided_id_unique" UNIQUE("user_provided_id")
);
--> statement-breakpoint
CREATE TABLE "master_sync_.threads_table" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"project_id" integer,
	"user_provided_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"data" json
);
--> statement-breakpoint
ALTER TABLE "master_sync_.messages_table" ADD CONSTRAINT "master_sync_.messages_table_thread_id_master_sync_.threads_table_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."master_sync_.threads_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_sync_.threads_table" ADD CONSTRAINT "master_sync_.threads_table_project_id_master_sync_.projects_table_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."master_sync_.projects_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_user_provided_id_idx" ON "master_sync_.messages_table" USING btree ("user_provided_id");--> statement-breakpoint
CREATE INDEX "messages_user_id_idx" ON "master_sync_.messages_table" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_thread_id_idx" ON "master_sync_.messages_table" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "projects_user_provided_id_idx" ON "master_sync_.projects_table" USING btree ("user_provided_id");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "master_sync_.projects_table" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "threads_user_provided_id_idx" ON "master_sync_.threads_table" USING btree ("user_provided_id");--> statement-breakpoint
CREATE INDEX "threads_project_id_idx" ON "master_sync_.threads_table" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "threads_user_id_idx" ON "master_sync_.threads_table" USING btree ("user_id");