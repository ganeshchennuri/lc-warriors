CREATE TABLE "sheet_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"csv" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
