ALTER TABLE "resources" ALTER COLUMN "youtube_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "kind" text DEFAULT 'video' NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "thumbnail" text;