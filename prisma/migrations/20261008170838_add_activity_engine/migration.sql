-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "faith_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "local_day" DATE NOT NULL,
    "timezone" TEXT NOT NULL,
    "source_ref" TEXT,
    "client_event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_rollups" (
    "user_id" TEXT NOT NULL,
    "faith_id" TEXT NOT NULL,
    "local_day" DATE NOT NULL,
    "counts" JSONB NOT NULL DEFAULT '{}',
    "points" INTEGER NOT NULL DEFAULT 0,
    "goal_met" BOOLEAN NOT NULL DEFAULT false,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_rollups_pkey" PRIMARY KEY ("user_id","faith_id","local_day")
);

-- CreateTable
CREATE TABLE "streak_states" (
    "user_id" TEXT NOT NULL,
    "faith_id" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "longest" INTEGER NOT NULL DEFAULT 0,
    "last_goal_met_day" DATE,
    "freezes_left" INTEGER NOT NULL DEFAULT 2,
    "freeze_reset_on" DATE,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streak_states_pkey" PRIMARY KEY ("user_id","faith_id")
);

-- CreateTable
CREATE TABLE "user_goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "faith_id" TEXT NOT NULL,
    "goal_type" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_events_user_id_faith_id_local_day_idx" ON "activity_events"("user_id", "faith_id", "local_day");

-- CreateIndex
CREATE INDEX "activity_events_user_id_faith_id_activity_type_local_day_idx" ON "activity_events"("user_id", "faith_id", "activity_type", "local_day");

-- CreateIndex
CREATE UNIQUE INDEX "activity_events_user_id_client_event_id_key" ON "activity_events"("user_id", "client_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_goals_user_id_faith_id_effective_from_key" ON "user_goals"("user_id", "faith_id", "effective_from");

