-- Migration 0100 — code-review follow-up on Story 10.20's moderation record model (WS-E).
--
-- ⚠ DO NOT REGENERATE with `db:generate` (same discipline as 0021–0099): the drizzle snapshot
-- baseline is frozen at 0020, so a regenerate emits a bloated catch-up migration and can raise
-- 42P07. This file is HAND-AUTHORED, carrying ONLY these three follow-up fixes. No snapshot file
-- is emitted.
--
-- ── (1) `supersedes_ground_id` had a dangling cross-row invariant ─────────────────────────────
-- `member_moderation_grounds_supersedes_fk` (0099) only proves the target ROW EXISTS. Nothing
-- stopped a supporting ground from pointing at a ground on a DIFFERENT moderation_action_id, or at
-- the PRIMARY ground of its own action — both would corrupt the "primary never moves" invariant
-- 0099's header commits to. `member_moderation_grounds_primary_never_supersedes` (0099) only
-- prevents a PRIMARY row from HAVING a supersedes_ground_id; it says nothing about what a
-- SUPPORTING row's supersedes_ground_id may point AT. A CHECK constraint cannot see sibling rows,
-- so this needs a trigger. `twt_app` holds only `UPDATE (note_ciphertext)` on this table (0099), so
-- the sole path a `supersedes_ground_id` value can ever be written through is INSERT — BEFORE
-- INSERT is sufficient; there is no UPDATE path to guard.
CREATE FUNCTION member_moderation_grounds_supersede_integrity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_action_id uuid;
  target_is_primary boolean;
BEGIN
  IF NEW.supersedes_ground_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT moderation_action_id, is_primary
    INTO target_action_id, target_is_primary
    FROM member_moderation_grounds
    WHERE ground_id = NEW.supersedes_ground_id;

  IF target_action_id IS DISTINCT FROM NEW.moderation_action_id THEN
    RAISE EXCEPTION
      'member_moderation_grounds: ground % cannot supersede ground % — the target belongs to a different moderation action (% expected, got %)',
      NEW.ground_id, NEW.supersedes_ground_id, NEW.moderation_action_id, target_action_id
      USING ERRCODE = 'P0001';
  END IF;

  IF target_is_primary THEN
    RAISE EXCEPTION
      'member_moderation_grounds: ground % cannot supersede ground % — the primary ground is un-supersedable by construction (Story 10.20 AC9)',
      NEW.ground_id, NEW.supersedes_ground_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER member_moderation_grounds_supersede_integrity_guard
  BEFORE INSERT ON "member_moderation_grounds"
  FOR EACH ROW EXECUTE FUNCTION member_moderation_grounds_supersede_integrity();
--> statement-breakpoint

-- ── (2) At most ONE active superseder per target ───────────────────────────────────────────────
-- Nothing stopped two supporting grounds from both naming the same `supersedes_ground_id` — either
-- two concurrent `appendGround` requests racing past the application-level pre-check
-- (`grounds.ts`'s SELECT), or a caller that never re-fetched console state and reused a target
-- another append had already superseded. Either way, a reader would have no way to tell which
-- superseding entry is the current one. The pre-check in `grounds.ts` (`ModerationGroundAlready
-- SupersededError`, → 409) is the INTERFACE; this partial unique index is the BACKSTOP that closes
-- the race the pre-check alone cannot — same "index is the backstop, typed error is the interface"
-- discipline as `member_moderation_grounds_one_primary_idx` (0099).
CREATE UNIQUE INDEX "member_moderation_grounds_supersedes_target_idx" ON "member_moderation_grounds" USING btree ("supersedes_ground_id") WHERE "supersedes_ground_id" IS NOT NULL;--> statement-breakpoint

-- ── (3) `r7a_restorations_used_snapshot` had zero DB-level validation ──────────────────────────
-- A negative count is meaningless (it is a cumulative restorations-used snapshot, Q5(a)) but
-- nothing stopped one from being written by a future non-domain writer. NULL stays legal — NULL
-- means UNKNOWN (0099's own comment), never 0.
ALTER TABLE "member_moderation_actions" ADD CONSTRAINT "member_moderation_actions_r7a_restorations_used_snapshot_nonneg" CHECK ("r7a_restorations_used_snapshot" IS NULL OR "r7a_restorations_used_snapshot" >= 0);--> statement-breakpoint
