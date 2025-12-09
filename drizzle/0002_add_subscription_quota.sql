ALTER TABLE "subscriptions"
  ADD COLUMN "monthly_quota" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "usage_count" integer DEFAULT 0 NOT NULL,
  ADD COLUMN "usage_reset_at" timestamptz;

