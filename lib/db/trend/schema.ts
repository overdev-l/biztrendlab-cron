import {
  pgTable,
  bigserial,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  real,
  bigint,
  uuid
} from "drizzle-orm/pg-core";

export const posts = pgTable("posts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  source: varchar("source", { length: 50 }).notNull(),
  sourceId: text("source_id").notNull(),
  url: text("url"),
  title: text("title"),
  body: text("body"),
  author: text("author"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  scrapedAt: timestamp("scraped_at", { withTimezone: true }).defaultNow(),
  score: integer("score"),
  numComments: integer("num_comments"),
  language: varchar("language", { length: 16 }),
  meta: jsonb("meta"),
});

export const passages = pgTable("passages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  postId: bigint("post_id", { mode: "number" }).notNull().references(() => posts.id, { onDelete: "cascade" }),
  passageText: text("passage_text").notNull(),
  passageIndex: integer("passage_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const embeddings = pgTable("embeddings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  passageId: bigint("passage_id", { mode: "number" }).notNull().references(() => passages.id, { onDelete: "cascade" }),
  model: varchar("model", { length: 64 }).notNull(),
  vector: real("vector").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const clusters = pgTable("clusters", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  clusterLabel: text("cluster_label").notNull(),
  centroid: real("centroid").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const clusterMembers = pgTable("cluster_members", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  clusterId: bigint("cluster_id", { mode: "number" }).notNull().references(() => clusters.id, { onDelete: "cascade" }),
  passageId: bigint("passage_id", { mode: "number" }).notNull().references(() => passages.id, { onDelete: "cascade" }),
  score: real("score"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const topics = pgTable("topics", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: text("title"),
  summary: text("summary"),
  examplePassages: jsonb("example_passages"),
  metrics: jsonb("metrics"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Deprecated: Use directionSubscriptions in email/schema.ts instead
export const trendSubscriptions = pgTable("trend_subscriptions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: text("user_id").notNull(), 
  topicId: bigint("topic_id", { mode: "number" }).notNull().references(() => topics.id, { onDelete: "cascade" }),
  directionIndex: integer("direction_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const customTrends = pgTable("custom_trends", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // Linking to auth user
  url: text("url").notNull(),
  title: text("title"),
  content: text("content"),
  analysis: jsonb("analysis"),
  status: text("status").default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
