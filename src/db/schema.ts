import { date, integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";
import type { SheetMeta } from "@/lib/csv-import";

export const problems = pgTable("problems", {
  lc: integer("lc").primaryKey(),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  url: text("url").notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  lc: integer("lc")
    .notNull()
    .references(() => problems.lc),
  stage: text("stage").notNull(),
  date: date("date", { mode: "string" }),
  appliesTo: text("applies_to").array().notNull(),
  // row order and raw columns from the sheet, so it can be exported back unchanged
  position: integer("position").notNull().default(0),
  sheet: jsonb("sheet").$type<SheetMeta>(),
});

export const taskStatus = pgTable(
  "task_status",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id),
    userId: text("user_id").notNull(),
    status: text("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.userId] })],
);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  lc: integer("lc")
    .notNull()
    .references(() => problems.lc),
  userId: text("user_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  heading: text("heading").notNull(),
  // "video" | "playlist" | "link"; youtubeId is the video or playlist id, null for links
  kind: text("kind").notNull().default("video"),
  youtubeId: text("youtube_id"),
  url: text("url"),
  title: text("title"),
  thumbnail: text("thumbnail"),
  addedBy: text("added_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// every sheet imported so far; the latest one is the base for the next three-way sync
export const sheetImports = pgTable("sheet_imports", {
  id: serial("id").primaryKey(),
  csv: text("csv").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
