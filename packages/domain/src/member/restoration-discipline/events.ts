// The `member.restoration_discipline.*` event payload schema — Story 10.23 (Task 2; AC1, AC3).
//
// ONE event on the MEMBER's OWN stream (`stream_id = member_id`), registered in `EVENT_TYPE_REGISTRY`
// and folded by `evaluateRestorationDisciplineOverlay`. It is a lifecycle NON-transition: it folds
// through `memberStateMachine` as IDENTITY (its `default: return state` arm), so
// `from_state === to_state` on every one and `members.state` provably cannot move (AC1).
//
// ── ⚠ NO PII, NO FREE TEXT, AND NO TIER-1 COLUMN ANYWHERE IN THIS INSTRUMENT (D5) ───────────────
// The moderation overlay carries `reason_code`, `actor_id`, `actor_display` and a Tier-1-encrypted
// rationale because a HUMAN decided and had to explain themselves. Nothing decides here: §3.1
// applies, and **the clause id IS the reason**. So this instrument has no reason-code registry, no
// actor columns, no Tier-1 column, no KMS envelope and no RTBF scrub leg — `auditShape.actor` is
// `'system'`, and every field below is either a registry identifier, a governance number or an
// instant. Story 10.16 already assumed exactly this: its lock-in arm returns `reasonLabelKey: null`
// because "the lock-in instrument carries no trustee reason code of its own — it is a consequence of
// the restoration discipline, not a fresh finding".
//
// ⚠ That also means the pay-screen crash class Story 10.10 shipped (a missing
// `memberStatus.moderationReason.<code>` locale entry crashing the render) is NOT inherited here —
// there is no reason code to look up. Do not introduce one.
//
// ── The EVENT is the authority; the table is a derived read-cache (AC3, D1) ─────────────────────
// `member_restoration_impositions` mirrors these fields for indexed reads, exactly as
// `member/events.ts:135-147` states for the join lock-in's snapshot. Replay reads THIS payload.

import { z } from 'zod';

import { auditShape } from '../audit-shape.js';
import { RESTORATION_COMBINATION_RULES } from './status.js';

/**
 * The "same unresolved episode" identity (AC2, Decision `2026-08-07-088` clause 3).
 *
 * ⚠ BOUNDED BY REGEX ON PURPOSE — it is derived, machine-generated data on a plaintext-JSONB payload,
 * and a `z.string()` here would be an unbounded free-text field on the member's own event stream (the
 * exact R1 discipline the rest of this file observes). The shape is
 * `<anchor-instant-or-"no-record">|skips:<n>`; see `episodeKeyOf` in `write.ts` for what anchors it
 * and why that anchor moves exactly when the episode genuinely changes.
 */
const episodeKeySchema = z
  .string()
  .max(64)
  .regex(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z|no-record)\|skips:\d+$/,
    'episode_key must be `<ISO-8601 instant|no-record>|skips:<n>` — no free text',
  );

/**
 * A restoration lock-in was imposed by the §3.1 ladder (AC2). AUTOMATIC — `actor: 'system'`.
 *
 * ⚖ **Read the automatic actor correctly.** `ux-design-specification.md:89` permits time-as-actor
 * (SIE) "for non-punitive state transitions only (lock-in expiry, renewal grace close, pool window
 * close). Suspensions, accusations, and asset actions always require a human edge." Lock-in EXPIRY is
 * on that allowlist; lock-in IMPOSITION is not — and this event is an imposition that removes
 * coverage with no human in the loop. The reconciliation, stated rather than assumed: **a restoration
 * lock-in is NOT a sanction.** The moderation decision brief's §1c table classifies it as "Not a
 * sanction" against suspension's "A sanction", and Niyamavali §1.3 (`docs/legal/niyamavali.md:38`)
 * defines it as "imposed on joining, rejoining, or after a discipline event" — a consequence that
 * attaches BY RULE, not a §8.2 ground a trustee finds. See the imposition site in `write.ts` for the
 * full argument; it is repeated there because that is where the next reader will otherwise read an
 * automatic `is_valid: false` as an auto-suspension. **Escalation 3 — routed, not absorbed.**
 */
export const RestorationDisciplineImposedPayloadSchema = z
  .object({
    ...auditShape,
    /**
     * The R7 clause that imposed. **This is the reason** (D5) — no reason-code registry exists or is
     * wanted. Not an enum: the ladder is registry DATA, and a `z.enum` here would put it in code and
     * go stale the first time the Trustee Panel adds a rung.
     */
    clause_id: z.string().min(1).max(128),
    /**
     * The R7 clause VERSION that supplied `lock_in_months` (AC3, the FR-8 pin). Re-resolution at any
     * later read MUST go through `resolveByClauseVersionId`, never `resolveByClauseId` — the latter
     * returns the CURRENT version and would silently re-lock every existing member on a re-tune.
     */
    clause_version_id: z.string().uuid(),
    /**
     * The `niy.restoration-discipline.policy` clause VERSION that supplied the instrument-level
     * parameters (D2): the month-counting convention and the concurrency rule. The SECOND half of
     * AC3's pin — the R7 clause owns the DURATION, this clause owns the INSTRUMENT, and both are
     * pinned so amending either is a governance act with no retroactive effect.
     */
    policy_clause_version_id: z.string().uuid(),
    /** The duration IN FORCE AT IMPOSITION, from the applied R7 clause's `restoration.lock_in_months`. */
    lock_in_months: z.number().int().positive().max(120),
    /**
     * The concurrency rule in force at imposition, resolved from the policy clause payload (AC5).
     * Recorded here rather than re-resolved at read for the same FR-8 reason the duration is: a later
     * Panel amendment must not move an existing member's effective unlock date.
     */
    concurrency_rule: z.enum(RESTORATION_COMBINATION_RULES),
    /** DB-authoritative imposition instant (architecture §1.11) — never an app-server clock. */
    imposed_at: z.string().datetime(),
    /** `imposed_at + lock_in_months`, calendar-correct with end-of-month clamping (AC4). */
    expires_at: z.string().datetime(),
    /**
     * The skip-count/anchor context at imposition — AUDIT DATA ONLY. It does **not** gate
     * re-imposition (see `completion_unsatisfiable` for that); a fresh skip or an IST-year rollover
     * moves this value even while the member's underlying gap stays genuinely unresolved, which is
     * exactly why it stopped being the matching key (write.ts `shouldImpose`, review finding on
     * Story 10.23).
     */
    episode_key: episodeKeySchema,
    /**
     * Did THIS clause's restoration package name a completion condition nothing could satisfy, AT
     * imposition (Decision `2026-08-08-091`, amending Decision `2026-08-07-088` clause 3)?
     *
     * ⛔ **THIS, not `episode_key`, is what the re-imposition bar matches on.** Pinned at imposition
     * (FR-8) rather than re-derived, because the bar must stay TRUE for this row even after a later
     * Trustee amendment changes `write.ts`'s `UNSATISFIABLE_COMPLETION_KEYS` — that global list
     * shrinking is the documented discharge path, and it works by making the OUTER gate on a NEW
     * candidate evaluation false, never by rewriting history on old rows. `shouldImpose` stays PURE:
     * no re-resolution of a historical clause version is needed to answer "does the bar still apply".
     */
    completion_unsatisfiable: z.boolean(),
  })
  .strict();

/** type → payload-schema map for the family (consumed by `member/events.ts`). */
export const RESTORATION_DISCIPLINE_EVENT_PAYLOAD_SCHEMAS = {
  'member.restoration_discipline.imposed': RestorationDisciplineImposedPayloadSchema,
} as const;
