import { pgTable, foreignKey, text, timestamp, unique, boolean, uniqueIndex, uuid, jsonb, integer, varchar, bigint, bigserial, real } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	billingProfileId: uuid("billing_profile_id"),
	stripeSubscriptionId: text("stripe_subscription_id").notNull(),
	stripePriceId: text("stripe_price_id").notNull(),
	status: text().notNull(),
	currentPeriodStart: timestamp("current_period_start", { withTimezone: true, mode: 'string' }),
	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true, mode: 'string' }),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
	canceledAt: timestamp("canceled_at", { withTimezone: true, mode: 'string' }),
	metadata: jsonb().default({}).notNull(),
	monthlyQuota: integer("monthly_quota").default(0).notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	usageResetAt: timestamp("usage_reset_at", { withTimezone: true, mode: 'string' }),
	aiCredits: integer("ai_credits").default(0).notNull(),
	aiCreditsQuota: integer("ai_credits_quota").default(0).notNull(),
	aiCreditsResetAt: timestamp("ai_credits_reset_at", { withTimezone: true, mode: 'string' }),
	aiDailyLimit: integer("ai_daily_limit").default(0).notNull(),
	aiDailyCount: integer("ai_daily_count").default(0).notNull(),
	aiDailyResetAt: timestamp("ai_daily_reset_at", { withTimezone: true, mode: 'string' }),
	aiCooldownSeconds: integer("ai_cooldown_seconds").default(0).notNull(),
	aiCooldownUntil: timestamp("ai_cooldown_until", { withTimezone: true, mode: 'string' }),
	aiMaxTokens: integer("ai_max_tokens").default(1024).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("subscriptions_user_id_unique").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.billingProfileId],
			foreignColumns: [billingProfiles.id],
			name: "subscriptions_billing_profile_id_billing_profiles_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "subscriptions_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("subscriptions_stripe_subscription_id_unique").on(table.stripeSubscriptionId),
]);

export const chatMessages = pgTable("chat_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	role: varchar({ length: 20 }).notNull(),
	content: text().notNull(),
	model: varchar({ length: 50 }),
	creditsUsed: integer("credits_used").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [chatSessions.id],
			name: "chat_messages_session_id_chat_sessions_id_fk"
		}).onDelete("cascade"),
]);

export const chatSessions = pgTable("chat_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	directionId: integer("direction_id").notNull(),
	title: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "chat_sessions_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const directionSubscriptions = pgTable("direction_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	topicId: bigint("topic_id", { mode: "number" }).notNull(),
	directionIndex: integer("direction_index").default(0).notNull(),
	alertThreshold: text("alert_threshold").default('10').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("direction_subscriptions_user_direction_unique").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.topicId.asc().nullsLast().op("int4_ops"), table.directionIndex.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "direction_subscriptions_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const clusters = pgTable("clusters", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	clusterLabel: text("cluster_label").notNull(),
	centroid: real().array(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const customTrends = pgTable("custom_trends", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	url: text().notNull(),
	title: text(),
	content: text(),
	analysis: jsonb(),
	status: text().default('pending'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id"),
	toEmail: text("to_email").notNull(),
	emailType: text("email_type").notNull(),
	subject: text().notNull(),
	status: text().notNull(),
	messageId: text("message_id"),
	errorMessage: text("error_message"),
	metadata: text(),
	sentAt: timestamp("sent_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "email_logs_user_id_user_id_fk"
		}).onDelete("set null"),
]);

export const emailPreferences = pgTable("email_preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	weeklyDigest: boolean("weekly_digest").default(true).notNull(),
	trendAlerts: boolean("trend_alerts").default(true).notNull(),
	subscriptionAlerts: boolean("subscription_alerts").default(true).notNull(),
	unsubscribeToken: text("unsubscribe_token"),
	locale: text().default('us').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("email_preferences_user_id_unique").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "email_preferences_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("email_preferences_unsubscribe_token_unique").on(table.unsubscribeToken),
]);

export const embeddings = pgTable("embeddings", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	passageId: bigint("passage_id", { mode: "number" }).notNull(),
	model: varchar({ length: 64 }).notNull(),
	vector: real().array(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.passageId],
			foreignColumns: [passages.id],
			name: "embeddings_passage_id_passages_id_fk"
		}).onDelete("cascade"),
]);

export const topics = pgTable("topics", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	title: text(),
	summary: text(),
	examplePassages: jsonb("example_passages"),
	metrics: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const posts = pgTable("posts", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	source: varchar({ length: 50 }).notNull(),
	sourceId: text("source_id").notNull(),
	url: text(),
	title: text(),
	body: text(),
	author: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	scrapedAt: timestamp("scraped_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	score: integer(),
	numComments: integer("num_comments"),
	language: varchar({ length: 16 }),
	meta: jsonb(),
});

export const billingProfiles = pgTable("billing_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	stripeCustomerId: text("stripe_customer_id").notNull(),
	defaultPaymentMethod: text("default_payment_method"),
	currency: text().default('usd').notNull(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("billing_profiles_user_id_unique").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "billing_profiles_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("billing_profiles_stripe_customer_id_unique").on(table.stripeCustomerId),
]);

export const clusterMembers = pgTable("cluster_members", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clusterId: bigint("cluster_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	passageId: bigint("passage_id", { mode: "number" }).notNull(),
	score: real(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.clusterId],
			foreignColumns: [clusters.id],
			name: "cluster_members_cluster_id_clusters_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.passageId],
			foreignColumns: [passages.id],
			name: "cluster_members_passage_id_passages_id_fk"
		}).onDelete("cascade"),
]);

export const passages = pgTable("passages", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	postId: bigint("post_id", { mode: "number" }).notNull(),
	passageText: text("passage_text").notNull(),
	passageIndex: integer("passage_index").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "passages_post_id_posts_id_fk"
		}).onDelete("cascade"),
]);

export const trendSubscriptions = pgTable("trend_subscriptions", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	userId: text("user_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	topicId: bigint("topic_id", { mode: "number" }).notNull(),
	directionIndex: integer("direction_index").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.topicId],
			foreignColumns: [topics.id],
			name: "trend_subscriptions_topic_id_topics_id_fk"
		}).onDelete("cascade"),
]);
