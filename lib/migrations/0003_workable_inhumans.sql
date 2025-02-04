CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" RENAME TO "threads";--> statement-breakpoint
ALTER TABLE "messages" RENAME COLUMN "chat_id" TO "thread_id";--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_chat_id_chats_id_fk";
--> statement-breakpoint
DROP INDEX "user_id_idx";--> statement-breakpoint
DROP INDEX "chat_id_idx";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "last_message_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "threads_user_id_idx" ON "threads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "threads_project_id_idx" ON "threads" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "thread_id_idx" ON "messages" USING btree ("thread_id");