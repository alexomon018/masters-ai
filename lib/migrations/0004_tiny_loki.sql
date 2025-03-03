ALTER TABLE "master_sync_.messages_table" ADD COLUMN "thread_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "master_sync_.threads_table" ADD COLUMN "thread_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX "messages_thread_id_idx" ON "master_sync_.messages_table" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "threads_thread_id_idx" ON "master_sync_.threads_table" USING btree ("thread_id");