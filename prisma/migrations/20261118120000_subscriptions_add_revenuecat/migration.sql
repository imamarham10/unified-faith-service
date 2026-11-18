-- Make `subscriptions` carry a store purchase as well as a Razorpay one.
--
-- Plus is in-app digital content, and Play's payments policy requires Play
-- Billing for that — so an Android purchase arrives through RevenueCat, which
-- verifies the receipt with the store and tells us over a webhook. Razorpay
-- stays for the web flow, where the policy does not apply.
--
-- Existing rows are all Razorpay, which is why `provider` defaults to it:
-- the backfill is the default, and no UPDATE is needed.

ALTER TABLE "subscriptions"
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'razorpay',
  ADD COLUMN "revenuecat_user_id" TEXT,
  ADD COLUMN "store_product_id" TEXT,
  ADD COLUMN "store" TEXT;

-- A store purchase has no Razorpay ids. Postgres allows many NULLs under a
-- UNIQUE index, so the existing uniqueness on razorpay_subscription_id keeps
-- working for the rows that do have one.
ALTER TABLE "subscriptions"
  ALTER COLUMN "razorpay_subscription_id" DROP NOT NULL,
  ALTER COLUMN "razorpay_plan_id" DROP NOT NULL;

-- Webhooks arrive with RevenueCat's app user id and nothing else to find the
-- account by.
CREATE INDEX "subscriptions_revenuecat_user_id_idx"
  ON "subscriptions" ("revenuecat_user_id");
