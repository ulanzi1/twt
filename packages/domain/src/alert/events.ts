// Alert event vocabulary + Zod payload schemas — Story 8.1 (Task 2; AC1/AC3/AC4).
//
// The `alert.*` event types are the alert lifecycle's WRITE vocabulary: every legal
// transition is a named, dotted `resource.action` event on the alert's `events_log`
// stream (stream_id = alert_id). These schemas validate the event PAYLOAD;
// `occurred_at` + `pariwar_id` + `actor_id` are columns on `events_log` and are NOT
// duplicated here.
//
// ── These are DOMAIN LIFECYCLE events, NOT Story 5.1 notification/dispatch alerts ─
// `alert.frozen` / `alert.published` / `alert.live` are the alert STATE MACHINE's own
// events on the alert's `events_log` stream — the transitions this story owns. They are
// NOT the `AlertCategory` notification payloads in contracts/src/alerts/alert.ts. The
// notification whose category is `alert_published` is a SEPARATE artifact Story 8.8
// dispatches when it observes the `alert.published` LIFECYCLE event (the FR-23 nudge
// seam: 8.1 emits the event, 8.8 owns trigger-logic+copy, Epic 5 owns delivery). Do not
// conflate the lifecycle event with the notification payload (Story 8.1 D6).
//
// ── Why these live in @twt/domain (not @twt/contracts) ────────────────────────
// `@twt/events` depends on @twt/domain; the registry (packages/events/src/registry.ts)
// imports these schemas, and so does the reducer (alert/state.ts). Putting them in
// @twt/contracts would force domain→contracts, reversing the legal import direction
// (contracts→domain). Same rationale as pool/events.ts.
//
// ── Event-name delimiter: single-dot snake_case (the merged-registry convention) ──
// `alert.frozen` / `alert.published` / `alert.live` / `alert.closed` / `alert.settled`
// — the same `resource.action` snake_case convention pool.*/member.*/claim.* follow
// (contrast the epic prose's occasional hyphen forms). All five actions are single
// words, so there is no delimiter ambiguity to reconcile (unlike pool's opened-for-
// contributions).
//
// Every transition payload carries the architecture §1.14 audit shape — `from_state`,
// `to_state`, `trigger`, `actor` — plus event-specific fields where load-bearing.
// `.strict()` everywhere: an unknown key is a defect, not silently tolerated.

import { z } from 'zod';

import { ALERT_LIFECYCLE_STATES } from '../schema/alerts.js';
import { CycleFreezeAttestationSchema } from '../pool/cycle-events.js';

/**
 * Who caused the alert transition (architecture §1.14 line 1262-1268). Alert lifecycle
 * is predominantly cycle/time-driven — `system` = the cycle-open trigger / scheduler /
 * SIE. `operator` (helpline staff) + `trustee` cover a manually-driven close/settle. A
 * `member` never drives alert lifecycle (deliberately absent — the pool.* precedent).
 */
export const alertActorSchema = z.enum(['system', 'operator', 'trustee']);
export type AlertEventActor = z.infer<typeof alertActorSchema>;

/** An alert-lifecycle-state literal, derived from the one tuple in schema/alerts.ts. */
export const alertLifecycleStateSchema = z.enum(ALERT_LIFECYCLE_STATES);

/**
 * The audit shape every alert.* payload carries. `from_state` is nullable — the initial
 * `alert.frozen` genesis event may carry the pre-genesis `draft` fold state (or null).
 *
 * NOTE: these are AUDIT metadata. The reducer (alert/state.ts) is the runtime authority
 * for the transition — it derives the next state from the CURRENT state + the event TYPE,
 * never from `to_state` in the payload (so a mislabelled payload can never corrupt replay).
 */
const auditShape = {
  from_state: alertLifecycleStateSchema.nullable(),
  to_state: alertLifecycleStateSchema,
  // Freeform human-readable audit note — NOT a machine-matched enum; callers pass e.g.
  // "cycle.frozen:cycle_open", "cron:close_of_cycle", "reconciliation:settled".
  // Deliberately unconstrained (the pool/events.ts trigger-field decision) — no bounded
  // trigger vocabulary is specified for alerts, and constraining it would invent a rule
  // the ACs never asked for.
  trigger: z.string().min(1),
  actor: alertActorSchema,
};

/**
 * `alert.frozen` → `frozen` (the genesis event: draft → frozen). Owner: Story 8.1 (the
 * cycle-open trigger). The FIRST event of the alert's stream. It carries the alert's
 * cycle identity (`cycle_id`, `pariwar_id`), the pool count N + the spawned pools' ids
 * (copied from the `cycle.frozen` payload — the audit / regulator-traceable set), and the
 * trustee attestation COPIED from `cycle.frozen` (reuse CycleFreezeAttestationSchema — do
 * NOT re-declare an attestation shape). `pool_ids` MUST have exactly `pool_count` entries
 * (the invariant `cycle.frozen` already enforces; re-asserted here as cheap insurance).
 */
export const AlertFrozenPayloadSchema = z
  .object({
    ...auditShape,
    cycle_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    // N — the number of pools spawned in this cycle (one per approved claim). Strictly
    // positive: a cycle with no approved claims never triggers a spawn / an alert.
    pool_count: z.number().int().positive(),
    // The spawned pools' stream ids, in pool_index order (copied from cycle.frozen).
    pool_ids: z.array(z.string().uuid()),
    // The trustee attestation copied verbatim from the cycle.frozen payload.
    attestation: CycleFreezeAttestationSchema,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.pool_ids.length !== v.pool_count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `pool_ids length ${v.pool_ids.length} must equal pool_count ${v.pool_count}`,
        path: ['pool_ids'],
      });
    }
    // Review Finding: a length match alone doesn't rule out a duplicated/wrong pool id silently
    // displacing a real one — each pool_index must be a DISTINCT pool within the alert.
    if (new Set(v.pool_ids).size !== v.pool_ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `pool_ids must be distinct (found a duplicate among ${String(v.pool_ids.length)} entries)`,
        path: ['pool_ids'],
      });
    }
  });
export type AlertFrozenPayload = z.infer<typeof AlertFrozenPayloadSchema>;

/**
 * `alert.published` → `published` (member-visible). Owner: Story 8.1 (the cycle-open
 * trigger). Carries the AR-18 `time_critical` signal (AC4): `true` when the Pariwar is in
 * `cycle_open_sms_bridge` degraded mode at cycle-open — the cost-optimization override
 * that Story 8.8's dispatcher + Story 5.8's SMS bridge consume. 8.1 SETS the signal; it
 * does not itself send SMS. Story 8.8 subscribes to THIS lifecycle event to perform the
 * Story 5.1-dispatcher fan-out (the FR-23 nudge seam).
 */
export const AlertPublishedPayloadSchema = z
  .object({
    ...auditShape,
    // The AR-18 cost-optimization override (AC4). `true` iff a `cycle_open_sms_bridge`
    // degraded-mode declaration is active for the cycle's Pariwar at cycle-open.
    time_critical: z.boolean(),
  })
  .strict();
export type AlertPublishedPayload = z.infer<typeof AlertPublishedPayloadSchema>;

/** `alert.live` → `live` (contribution window open). Owner: Story 8.1 (the cycle-open
 *  trigger — the ratified extension of the epic's literal AC, D10). */
export const AlertLivePayloadSchema = z.object({ ...auditShape }).strict();
export type AlertLivePayload = z.infer<typeof AlertLivePayloadSchema>;

/** `alert.closed` → `closed` (no more contributions accepted) at FR-22's hard Day-15 boundary.
 *  Reducer arm + this schema: Story 8.1. EMITTER: Story 8.14 (`alert.closeCycleAlert`, driven by the
 *  apps/jobs close-of-cycle sweep). ⚠ This slot was attributed to Story 8.9 for four stories while no
 *  emitter existed anywhere — 8.9 owns the post-close reconciliation TAIL, never this transition. */
export const AlertClosedPayloadSchema = z.object({ ...auditShape }).strict();
export type AlertClosedPayload = z.infer<typeof AlertClosedPayloadSchema>;

/** `alert.settled` → `settled` (terminal — reconciliation complete + disbursement).
 *  Owner: Epic 9 EXCLUSIVELY (the yellow → green flip). The reducer arm exists (state.ts);
 *  8.1 does NOT emit it. */
export const AlertSettledPayloadSchema = z.object({ ...auditShape }).strict();
export type AlertSettledPayload = z.infer<typeof AlertSettledPayloadSchema>;

// ── The alert-event vocabulary + the type→schema map (single source) ──────────

export const ALERT_EVENT_TYPES = [
  'alert.frozen',
  'alert.published',
  'alert.live',
  'alert.closed',
  'alert.settled',
] as const;

/** The dotted `alert.*` event-type literal union (the 5 alert lifecycle events). */
export type AlertEventType = (typeof ALERT_EVENT_TYPES)[number];

/**
 * type → payload-schema map. The ONE place the 5 events bind to their schemas;
 * `EVENT_TYPE_REGISTRY` (packages/events) and the projector both consume it. The
 * `satisfies` keeps it exhaustive — adding an `AlertEventType` without a schema is a
 * compile error.
 */
export const ALERT_EVENT_PAYLOAD_SCHEMAS = {
  'alert.frozen': AlertFrozenPayloadSchema,
  'alert.published': AlertPublishedPayloadSchema,
  'alert.live': AlertLivePayloadSchema,
  'alert.closed': AlertClosedPayloadSchema,
  'alert.settled': AlertSettledPayloadSchema,
} as const satisfies Record<AlertEventType, z.ZodTypeAny>;
