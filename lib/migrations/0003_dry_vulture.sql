ALTER TABLE "master_sync_.messages_table" DROP CONSTRAINT "master_sync_.messages_table_thread_id_master_sync_.threads_table_id_fk";
--> statement-breakpoint
DROP INDEX "messages_thread_id_idx";--> statement-breakpoint
ALTER TABLE "master_sync_.messages_table" DROP COLUMN "thread_id";