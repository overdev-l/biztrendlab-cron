CREATE TABLE "direction_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" bigint NOT NULL,
	"direction_index" integer DEFAULT 0 NOT NULL,
	"alert_threshold" text DEFAULT '10' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"to_email" text NOT NULL,
	"email_type" text NOT NULL,
	"subject" text NOT NULL,
	"status" text NOT NULL,
	"message_id" text,
	"error_message" text,
	"metadata" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"weekly_digest" boolean DEFAULT true NOT NULL,
	"trend_alerts" boolean DEFAULT true NOT NULL,
	"subscription_alerts" boolean DEFAULT true NOT NULL,
	"unsubscribe_token" text,
	"locale" text DEFAULT 'us' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_preferences_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
CREATE TABLE "custom_trends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"content" text,
	"analysis" jsonb,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "direction_subscriptions" ADD CONSTRAINT "direction_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "direction_subscriptions_user_direction_unique" ON "direction_subscriptions" USING btree ("user_id","topic_id","direction_index");--> statement-breakpoint
CREATE UNIQUE INDEX "email_preferences_user_id_unique" ON "email_preferences" USING btree ("user_id");