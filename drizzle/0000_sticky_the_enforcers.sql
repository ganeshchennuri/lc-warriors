CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"lc" integer NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"lc" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"topic" text NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"heading" text NOT NULL,
	"youtube_id" text NOT NULL,
	"title" text,
	"added_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_status" (
	"task_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_status_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"lc" integer NOT NULL,
	"stage" text NOT NULL,
	"date" date,
	"applies_to" text[] NOT NULL,
	CONSTRAINT "tasks_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_lc_problems_lc_fk" FOREIGN KEY ("lc") REFERENCES "public"."problems"("lc") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_status" ADD CONSTRAINT "task_status_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lc_problems_lc_fk" FOREIGN KEY ("lc") REFERENCES "public"."problems"("lc") ON DELETE no action ON UPDATE no action;