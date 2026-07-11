ALTER TABLE "outbox_events"
  ADD COLUMN "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "locked_until" TIMESTAMPTZ(3),
  ADD COLUMN "locked_by" VARCHAR(120),
  ADD COLUMN "last_error" VARCHAR(1000),
  ADD COLUMN "dead_lettered_at" TIMESTAMPTZ(3);

DROP INDEX "outbox_events_processed_at_occurred_at_idx";
CREATE INDEX "outbox_events_processed_at_dead_lettered_at_next_attempt_at_occurred_at_idx"
  ON "outbox_events"("processed_at", "dead_lettered_at", "next_attempt_at", "occurred_at");
