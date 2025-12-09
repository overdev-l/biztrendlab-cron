CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE TABLE "billing_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "stripe_customer_id" text NOT NULL,
  "default_payment_method" text,
  "currency" text DEFAULT 'usd' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "billing_profiles_stripe_customer_id_unique" UNIQUE ("stripe_customer_id"),
  CONSTRAINT "billing_profiles_user_id_unique" UNIQUE ("user_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "billing_profile_id" uuid,
  "stripe_subscription_id" text NOT NULL,
  "stripe_price_id" text NOT NULL,
  "status" text NOT NULL,
  "current_period_start" timestamptz,
  "current_period_end" timestamptz,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "canceled_at" timestamptz,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE ("stripe_subscription_id"),
  CONSTRAINT "subscriptions_user_id_unique" UNIQUE ("user_id")
);
--> statement-breakpoint
ALTER TABLE "billing_profiles"
  ADD CONSTRAINT "billing_profiles_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_billing_profile_id_billing_profiles_id_fk"
  FOREIGN KEY ("billing_profile_id") REFERENCES "public"."billing_profiles"("id") ON DELETE cascade;

