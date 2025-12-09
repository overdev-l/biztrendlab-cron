-- Email preferences table
CREATE TABLE IF NOT EXISTS "email_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "weekly_digest" boolean DEFAULT true NOT NULL,
  "trend_alerts" boolean DEFAULT true NOT NULL,
  "subscription_alerts" boolean DEFAULT true NOT NULL,
  "unsubscribe_token" text UNIQUE,
  "locale" text DEFAULT 'us' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "email_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_preferences_user_id_unique" ON "email_preferences" ("user_id");

-- Direction subscriptions table
CREATE TABLE IF NOT EXISTS "direction_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "direction_id" uuid NOT NULL,
  "alert_threshold" text DEFAULT '10' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "direction_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "direction_subscriptions_user_direction_unique" ON "direction_subscriptions" ("user_id", "direction_id");

-- Email logs table
CREATE TABLE IF NOT EXISTS "email_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text,
  "to_email" text NOT NULL,
  "email_type" text NOT NULL,
  "subject" text NOT NULL,
  "status" text NOT NULL,
  "message_id" text,
  "error_message" text,
  "metadata" text,
  "sent_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL
);

