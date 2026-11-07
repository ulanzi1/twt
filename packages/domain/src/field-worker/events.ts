// Field-worker event vocabulary + Zod payload schemas — Story 13.1 (QE6, QE7, QE12, QE17, QE18, QE20; AC3).
//
// The `field_worker.*` event types are a field worker's lifecycle WRITE vocabulary: every legal transition is a named,
// dotted `resource.action` event on the worker's `events_log` stream (stream_id = field_worker_id). These schemas validate
// the event PAYLOAD; AR-14's `pariwar_id` / `timestamp`, the stream id and the actor's id are the `events_log` columns
// `pariwar_id` / `occurred_at` / `stream_id` / `actor_id` and are ⛔ duplicated in payloads (the 12.1 convention — a
// duplicate could disagree with its column). The actor KIND is the payload key `actor` (`events_log` has ⛔ `actor` column).
//
// ── Why these live in @twt/domain (⛔ @twt/contracts) ────────────────────────────────────────────
// `@twt/events` depends on @twt/domain; the registry (packages/events/src/registry.ts) imports these schemas, and so does
// the projector (field-worker/project.ts). The marketplace/events.ts rationale.
//
// ── PINNED SEAM — event-name delimiter: single-dot snake_case ─────────────────────────────────────
// `field_worker.kyc_completed`, ⛔ the epic's `field_worker.kyc-completed`: the four newest primitives (pool, alert,
// helpdesk, module) use snake_case after one dot (G8), and `writeAuditEntry` refuses an action outside
// `^[a-z0-9_]+(\.[a-z0-9_]+)+$` — so a hyphen would also fail as the audit action. Read the registry for spellings,
// ⛔ the epic. Renaming a shipped event type is a migration of every stream that carries it — pinned here, once.
//
// ── Actors (QE7, I7) — HUMAN ONLY ─────────────────────────────────────────────────────────────────
// `operator` / `trustee`, with a non-null `actorId`, for ALL seven events. `system` and `member` are refused here, in the
// commands and in the projector (three places, as 12.1's I11): Story 13.6's commitment that heuristics "do not
// independently terminate field-worker eligibility" is cheapest to keep if the primitive CANNOT record a machine as the
// author of a suspension or termination. A later automated actor is a new decision, ⛔ a quiet enum value.
//
// ── NO PII (I8) ───────────────────────────────────────────────────────────────────────────────────
// `.strict()` everywhere — an unknown key is a defect, and the reason a payload can never grow a worker's name or mobile.
// A district name and a reason code are not personal data; free text is ⛔ allowed anywhere (it would carry names into an
// immutable stream that survives erasure — QE12).

import { z } from 'zod';

import { SCOPE_DIMENSIONS } from '../rbac/scope.js';
import { FIELD_WORKER_STATES, type FieldWorkerReasonCode } from '../schema/field_workers.js';

/** WHO caused a field-worker event — HUMAN ONLY (QE7). */
export const fieldWorkerActorSchema = z.enum(['operator', 'trustee']);
export type FieldWorkerEventActor = z.infer<typeof fieldWorkerActorSchema>;

/** A field-worker lifecycle-state literal, derived from the one tuple in schema/field_workers.ts. */
export const fieldWorkerStateSchema = z.enum(FIELD_WORKER_STATES);

// ── The reason lists (QE12 — the NEUTRAL values; an author-commit, `2026-11-03-442`) ──────────────

/** A suspension's reasons. ⛔ A labelling value — Story 13.6 adds those with the writer that uses them. */
export const FIELD_WORKER_SUSPEND_REASONS = ['under_review', 'at_worker_request'] as const satisfies readonly FieldWorkerReasonCode[];
/** A termination's reasons. `died` — Story 13.1c (the Panel's `2026-11-07-454` Q5 A, `-455`): on the officer's word, and
 *  `ended_on` is the date of death. */
export const FIELD_WORKER_TERMINATE_REASONS = [
  'left_voluntarily',
  'inactive',
  'registered_in_error',
  'died',
] as const satisfies readonly FieldWorkerReasonCode[];
/** A move of REPORTING district's reasons (QE17): the worker asked, or the Trust moves them. */
export const FIELD_WORKER_POST_REASONS = ['at_worker_request', 'reassigned'] as const satisfies readonly FieldWorkerReasonCode[];

export const fieldWorkerSuspendReasonSchema = z.enum(FIELD_WORKER_SUSPEND_REASONS);
export const fieldWorkerTerminateReasonSchema = z.enum(FIELD_WORKER_TERMINATE_REASONS);
export const fieldWorkerPostReasonSchema = z.enum(FIELD_WORKER_POST_REASONS);

/**
 * The audit note naming the COMMAND that wrote the event (QE6) — the commands COMPUTE it (⛔ caller input). ⛔ Free text (review
 * R3-16): each event type accepts only its command's value — `field_worker.suspend` / `.terminate` carry a reason as a `:<reason>`
 * suffix drawn from that event's own reason list (ANY reason of the list — the schema does not bind it to `reason_code`; the commands
 * build both from the one validated value — R4-14) — so no name or number can ride into the append-only stream here. The FOLD ignores
 * this field (`state.ts`, review R4-10): a later trigger rename must never change a replayed fact.
 */
function triggerOf<const T extends string>(command: T) {
  return z.literal(command);
}
function triggerWithReason<const T extends string>(command: T, reasons: readonly [string, ...string[]]) {
  return z.enum(reasons.map((r) => `${command}:${r}`) as [string, ...string[]]);
}

/**
 * A REPORTING district (QE17) as it is stored: non-blank, bounded. Whether it is a LISTED district of the Pariwar is the
 * API layer's check (`assertDistrictRecorded`) — the list is data. ⛔ Normalised: the gate compared the raw bytes (TR12).
 */
export const fieldWorkerDistrictSchema = z
  .string()
  .max(200)
  .refine((d) => d.trim().length > 0, 'district must not be blank');

/** `YYYY-MM-DD` and a REAL calendar date (QE20) — ⛔ `2026-02-30`. */
export function isCalendarDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1) return false;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= daysInMonth;
}
export const fieldWorkerEndedOnSchema = z.string().refine(isCalendarDateString, 'ended_on must be a real YYYY-MM-DD date');

// ── The authorization SNAPSHOT (QE18) ──────────────────────────────────────────────────────────────

/**
 * What authorized THIS act at THIS moment — the snake_case image of the RBAC check's `VerifiedAuthorization`, written by
 * the command (⛔ by a caller). ⛔ Pariwar or actor key (they are `events_log.pariwar_id` / `actor_id`). ⛔ Personal data.
 * `grant.value` is null IFF `grant.dimension === 'global'` (a `super_admin` grant); `target.value` is a non-null string
 * (both field-worker acts are district-gated); `grant_id` (`role_grants.id`) is optional only for a test-built grant.
 */
export const FieldWorkerAuthorizationSnapshotSchema = z
  .object({
    permission_key: z.string().min(1).max(128),
    role: z.string().min(1).max(128),
    grant: z
      .object({
        dimension: z.enum(SCOPE_DIMENSIONS),
        value: z.string().min(1).max(200).nullable(),
        grant_id: z.string().uuid().optional(),
      })
      .strict()
      .refine((g) => (g.value === null) === (g.dimension === 'global'), {
        message: 'grant.value must be null iff the grant is global',
        path: ['value'],
      }),
    target: z
      .object({
        dimension: z.enum(SCOPE_DIMENSIONS),
        value: z.string().min(1).max(200),
      })
      .strict(),
    catalog_version: z.number().int().positive(),
  })
  .strict();
export type FieldWorkerAuthorizationSnapshot = z.infer<typeof FieldWorkerAuthorizationSnapshotSchema>;

// ── The seven payloads ─────────────────────────────────────────────────────────────────────────────

/**
 * `field_worker.registered` → `pending_kyc` (the genesis: (none) → pending_kyc). Owner: Story 13.1's registration route.
 * Carries the authorization snapshot (QE18) and the FIRST reporting district (QE17 — the stream must carry it or I4 cannot
 * fold it). ⛔ `attributionCodeId`: the composite FK forces the worker row before the code row (QE6).
 */
export const FieldWorkerRegisteredPayloadSchema = z
  .object({
    from_state: z.null(),
    to_state: z.literal('pending_kyc'),
    trigger: triggerOf('field_worker.register'),
    actor: fieldWorkerActorSchema,
    authorization: FieldWorkerAuthorizationSnapshotSchema,
    district: fieldWorkerDistrictSchema,
  })
  .strict();
export type FieldWorkerRegisteredPayload = z.infer<typeof FieldWorkerRegisteredPayloadSchema>;

/** `field_worker.kyc_completed`: `pending_kyc` → `pending_kyc` — a SAME-STATE event (QE8: an operator confirms they have
 *  verified this person — Story 13.1a AD2: the APPROVING officer accepts the identity check done at the interview). Emitted by
 *  Story 13.1a's approval route, in ONE transaction with `field_worker.activated`, and carries the SAME authorization snapshot
 *  (13.1 QE18 — "the other five events when their routes are built"; 13.1a AD3: key `field_worker.approve`). */
export const FieldWorkerKycCompletedPayloadSchema = z
  .object({
    from_state: z.literal('pending_kyc'),
    to_state: z.literal('pending_kyc'),
    trigger: triggerOf('field_worker.kyc_complete'),
    actor: fieldWorkerActorSchema,
    authorization: FieldWorkerAuthorizationSnapshotSchema,
  })
  .strict();
export type FieldWorkerKycCompletedPayload = z.infer<typeof FieldWorkerKycCompletedPayloadSchema>;

/** `field_worker.activated`: `pending_kyc` → `active` (guarded: KYC completed). Emitted by Story 13.1a's approval route,
 *  after `field_worker.kyc_completed` in the same transaction, with the same authorization snapshot (13.1a AD3). ⛔ The approving
 *  admin's display name: that is a ROW column (`approved_by_display`, decision `-447` item 2), never a payload field. */
export const FieldWorkerActivatedPayloadSchema = z
  .object({
    from_state: z.literal('pending_kyc'),
    to_state: z.literal('active'),
    trigger: triggerOf('field_worker.activate'),
    actor: fieldWorkerActorSchema,
    authorization: FieldWorkerAuthorizationSnapshotSchema,
  })
  .strict();
export type FieldWorkerActivatedPayload = z.infer<typeof FieldWorkerActivatedPayloadSchema>;

/** `field_worker.suspended`: `active` → `suspended`, with a suspension reason. Emitted by Story 13.1c's suspend route; carries
 *  the verified `field_worker.suspend` authorization snapshot (13.1 QE18; 13.1c AD3 — `-443` Q3 A: "the log records which
 *  authorisation allowed each act"). */
export const FieldWorkerSuspendedPayloadSchema = z
  .object({
    from_state: z.literal('active'),
    to_state: z.literal('suspended'),
    trigger: triggerWithReason('field_worker.suspend', FIELD_WORKER_SUSPEND_REASONS),
    actor: fieldWorkerActorSchema,
    authorization: FieldWorkerAuthorizationSnapshotSchema,
    reason_code: fieldWorkerSuspendReasonSchema,
  })
  .strict();
export type FieldWorkerSuspendedPayload = z.infer<typeof FieldWorkerSuspendedPayloadSchema>;

/** `field_worker.reactivated`: `suspended` → `active` (the way back — AI-10-1). Emitted by Story 13.1c's reactivate route;
 *  carries the verified `field_worker.reactivate` authorization snapshot (13.1c AD3). */
export const FieldWorkerReactivatedPayloadSchema = z
  .object({
    from_state: z.literal('suspended'),
    to_state: z.literal('active'),
    trigger: triggerOf('field_worker.reactivate'),
    actor: fieldWorkerActorSchema,
    authorization: FieldWorkerAuthorizationSnapshotSchema,
  })
  .strict();
export type FieldWorkerReactivatedPayload = z.infer<typeof FieldWorkerReactivatedPayloadSchema>;

/** `field_worker.terminated`: `pending_kyc` | `active` | `suspended` → `terminated` — TERMINAL (QE5). Carries the
 *  termination reason and `ended_on`, the ACTUAL LAST DAY (QE20 — the clock of the 8-year removal; for `died`, the date of
 *  death, `-455`). Emitted by Story 13.1c's terminate route (Q-1 C, `-453`); carries the verified `field_worker.terminate`
 *  authorization snapshot (13.1c AD3) — whose `role` is who ended the worker (row 13-1f's appeal reads it, `-454` Q1 A). */
export const FieldWorkerTerminatedPayloadSchema = z
  .object({
    from_state: z.enum(['pending_kyc', 'active', 'suspended']),
    to_state: z.literal('terminated'),
    trigger: triggerWithReason('field_worker.terminate', FIELD_WORKER_TERMINATE_REASONS),
    actor: fieldWorkerActorSchema,
    authorization: FieldWorkerAuthorizationSnapshotSchema,
    reason_code: fieldWorkerTerminateReasonSchema,
    ended_on: fieldWorkerEndedOnSchema,
  })
  .strict();
export type FieldWorkerTerminatedPayload = z.infer<typeof FieldWorkerTerminatedPayloadSchema>;

/**
 * `field_worker.posted`: a move of REPORTING district (QE17) — a SAME-STATE event (`pending_kyc` | `active` | `suspended`,
 * ⛔ `terminated`). Carries the authorization snapshot, both districts and a post reason. The reason lives in the EVENT
 * only — ⛔ projected into `state_reason_code`. Emitted by Story 13.1c's move route (a Pariwar Admin's direct move, key
 * `field_worker.move`); Story 13.1d adds the accepted request.
 */
export const FieldWorkerPostedPayloadSchema = z
  .object({
    from_state: z.enum(['pending_kyc', 'active', 'suspended']),
    to_state: z.enum(['pending_kyc', 'active', 'suspended']),
    trigger: triggerOf('field_worker.post'),
    actor: fieldWorkerActorSchema,
    authorization: FieldWorkerAuthorizationSnapshotSchema,
    from_district: fieldWorkerDistrictSchema,
    to_district: fieldWorkerDistrictSchema,
    reason_code: fieldWorkerPostReasonSchema,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.to_state !== v.from_state) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'a posting never changes the state', path: ['to_state'] });
    }
    if (v.to_district === v.from_district) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'a posting changes the district', path: ['to_district'] });
    }
  });
export type FieldWorkerPostedPayload = z.infer<typeof FieldWorkerPostedPayloadSchema>;

// ── The event-type vocabulary + the type→schema map (single source) ────────────────────────────────

export const FIELD_WORKER_EVENT_TYPES = [
  'field_worker.registered',
  'field_worker.kyc_completed',
  'field_worker.activated',
  'field_worker.suspended',
  'field_worker.reactivated',
  'field_worker.terminated',
  'field_worker.posted',
] as const;

/** The dotted `field_worker.*` event-type literal union (genesis + six). */
export type FieldWorkerEventType = (typeof FIELD_WORKER_EVENT_TYPES)[number];

/**
 * type → payload-schema map. The ONE place the events bind to their schemas; the projector and the registry
 * (packages/events) both consume it. `satisfies` keeps it exhaustive.
 */
export const FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS = {
  'field_worker.registered': FieldWorkerRegisteredPayloadSchema,
  'field_worker.kyc_completed': FieldWorkerKycCompletedPayloadSchema,
  'field_worker.activated': FieldWorkerActivatedPayloadSchema,
  'field_worker.suspended': FieldWorkerSuspendedPayloadSchema,
  'field_worker.reactivated': FieldWorkerReactivatedPayloadSchema,
  'field_worker.terminated': FieldWorkerTerminatedPayloadSchema,
  'field_worker.posted': FieldWorkerPostedPayloadSchema,
} as const satisfies Record<FieldWorkerEventType, z.ZodTypeAny>;
