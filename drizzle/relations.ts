import { relations } from "drizzle-orm/relations";
import { user, account, session, billingProfiles, subscriptions, chatSessions, chatMessages, directionSubscriptions, emailLogs, emailPreferences, passages, embeddings, clusters, clusterMembers, posts, topics, trendSubscriptions } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	sessions: many(session),
	subscriptions: many(subscriptions),
	chatSessions: many(chatSessions),
	directionSubscriptions: many(directionSubscriptions),
	emailLogs: many(emailLogs),
	emailPreferences: many(emailPreferences),
	billingProfiles: many(billingProfiles),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
	billingProfile: one(billingProfiles, {
		fields: [subscriptions.billingProfileId],
		references: [billingProfiles.id]
	}),
	user: one(user, {
		fields: [subscriptions.userId],
		references: [user.id]
	}),
}));

export const billingProfilesRelations = relations(billingProfiles, ({one, many}) => ({
	subscriptions: many(subscriptions),
	user: one(user, {
		fields: [billingProfiles.userId],
		references: [user.id]
	}),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	chatSession: one(chatSessions, {
		fields: [chatMessages.sessionId],
		references: [chatSessions.id]
	}),
}));

export const chatSessionsRelations = relations(chatSessions, ({one, many}) => ({
	chatMessages: many(chatMessages),
	user: one(user, {
		fields: [chatSessions.userId],
		references: [user.id]
	}),
}));

export const directionSubscriptionsRelations = relations(directionSubscriptions, ({one}) => ({
	user: one(user, {
		fields: [directionSubscriptions.userId],
		references: [user.id]
	}),
}));

export const emailLogsRelations = relations(emailLogs, ({one}) => ({
	user: one(user, {
		fields: [emailLogs.userId],
		references: [user.id]
	}),
}));

export const emailPreferencesRelations = relations(emailPreferences, ({one}) => ({
	user: one(user, {
		fields: [emailPreferences.userId],
		references: [user.id]
	}),
}));

export const embeddingsRelations = relations(embeddings, ({one}) => ({
	passage: one(passages, {
		fields: [embeddings.passageId],
		references: [passages.id]
	}),
}));

export const passagesRelations = relations(passages, ({one, many}) => ({
	embeddings: many(embeddings),
	clusterMembers: many(clusterMembers),
	post: one(posts, {
		fields: [passages.postId],
		references: [posts.id]
	}),
}));

export const clusterMembersRelations = relations(clusterMembers, ({one}) => ({
	cluster: one(clusters, {
		fields: [clusterMembers.clusterId],
		references: [clusters.id]
	}),
	passage: one(passages, {
		fields: [clusterMembers.passageId],
		references: [passages.id]
	}),
}));

export const clustersRelations = relations(clusters, ({many}) => ({
	clusterMembers: many(clusterMembers),
}));

export const postsRelations = relations(posts, ({many}) => ({
	passages: many(passages),
}));

export const trendSubscriptionsRelations = relations(trendSubscriptions, ({one}) => ({
	topic: one(topics, {
		fields: [trendSubscriptions.topicId],
		references: [topics.id]
	}),
}));

export const topicsRelations = relations(topics, ({many}) => ({
	trendSubscriptions: many(trendSubscriptions),
}));