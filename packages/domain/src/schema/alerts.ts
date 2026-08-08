// `alerts` table — Story 8.1 substrate (the alert-lifecycle anchor; the FOURTH
// event-derived-state primitive).
//
// The FIRST Epic-8 landing and a `[CONSUMER]` — the alert-lifecycle TWIN of
// Story 3.1's `members` table + Story 6.1's `claims` table + Story 7.1's `pools`
// table. This table is the alert's lifecycle ANCHOR: an alert object whose state
// is DERIVED from its `events_log` stream (stream_id = alert_id) replayed through
// the pure reducer in `alert/state.ts`. It is the fourth instance of the same
// event-derived-state primitive shape (member → claim → pool → alert).
//
// ── The contribution-cycle alert (FR-22) ──────────────────────────────────────
// One alert per contribution cycle: when Epic 7's spawn saga emits `cycle.frozen`,
// the cycle-open trigger (alert/project.ts + apps/jobs) mints THIS alert and drives
// it draft → frozen → published → live (the contribution window opens). `closed` is
// emitted by Story 8.14's close-of-cycle sweep at FR-22's hard Day-15 boundary; `settled`
// is Epic 9's exclusive (yellow → green flip) and remains UNEMITTED. The reducer arms for
// all six states exist (alert/state.ts); Story 8.1 emitted only the first three.
//
// ── alerts.current_state is a READ-OPTIMIZATION CACHE, not the source of truth ──
// The source of truth for an alert's lifecycle state is the alert's `events_log`
// stream (stream_id = alert_id) replayed through the pure reducer in `alert/state.ts`.
// The persisted `current_state` column is a projection of that replay — written ONLY
// by the projector (`alert/project.ts`) inside the same transaction that appends the
// transition event (cache-invalidation invariant, AC5). Two guards keep it honest —
// the exact posture Story 3.1/6.1/7.1 established:
//   · the DB trigger (migration 0078, AC5) — rejects any INSERT/UPDATE to
//     `current_state` that is not issued by the projector (session-variable
//     `app.alert_state_writer` guard, mirroring `app.pool_state_writer`);
//   · the CI gate (scripts/alert-state-invariant, AC5) — static-scans
//     packages/domain/src and fails on any `.update(alerts).set({ currentState })`
//     outside the projector allowlist.
//
// ── alert_id = the event-stream stream_id (no DB default), 1:1 with the cycle ──
// `alert_id` IS the alert's `events_log.stream_id` (one stream per alert). It is
// minted by the cycle-open trigger as `deriveAlertId(cycle_id)` (UUIDv5 — alert/id.ts),
// so it is DETERMINISTIC and 1:1 with `cycle_id`: a redelivered `cycle.frozen`
// recomputes the identical id, loses the genesis version-0 race, and no-ops. It is
// therefore caller-minted — NO `gen_random_uuid()` default — so an alert row can
// never exist with an id that does not match its event stream (the pools/claims
// posture). The UNIQUE index on `cycle_id` is the structural one-alert-per-cycle
// backstop (AC2). Branded `AlertId` (ids/index.ts:90 — pre-reserved for "alerts 8.x";
// reused, NOT re-declared).
//
// Naming discipline per architecture line 3663-3677: DB columns snake_case, TS
// fields camelCase, table snake_case-plural. Header style mirrors schema/pools.ts.

import { sql } from 'drizzle-orm';
import { bigint, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { AlertId, CycleFreezeCommitId, PariwarId } from '../ids/index.js';

/**
 * The canonical alert-lifecycle state list — the ONE spelling authority (AC1/AC2).
 *
 * These are the six lifecycle states an alert passes through:
 *   · `draft`     — the initial / pre-genesis fold state (trustee preparing).
 *   · `frozen`    — the cycle freeze was consumed (`alert.frozen`, the genesis event).
 *   · `published` — member-visible (`alert.published`).
 *   · `live`      — contributions accepted (`alert.live`).
 *   · `closed`    — no more contributions (`alert.closed`; Story 8.9).
 *   · `settled`   — Epic 9 reconciliation complete + disbursement (`alert.settled`; terminal).
 *
 * The state LABELS need no delimiter (single words). Choosing the label set here
 * (not the event-name delimiter, which alert/events.ts resolves) keeps this the sole
 * spelling authority: alert is a new independent per-table enum namespace (nothing
 * joins an alert state to a member/claim/pool state), so its delimiter choices are its own.
 *
 * Both the pgEnum (DB CREATE TYPE) and the `AlertLifecycleState` TS union below are
 * DERIVED from this single tuple — there is no second list to drift.
 */
export const ALERT_LIFECYCLE_STATES = ['draft', 'frozen', 'published', 'live', 'closed', 'settled'] as const;

/** pgEnum (`CREATE TYPE alert_lifecycle_state`) derived from the one tuple. */
export const alertLifecycleStateEnum = pgEnum('alert_lifecycle_state', ALERT_LIFECYCLE_STATES);

/** The lifecycle-state literal union — derived from the same tuple (no drift). */
export type AlertLifecycleState = (typeof ALERT_LIFECYCLE_STATES)[number];

export const alerts = pgTable(
  'alerts',
  {
    // The alert's canonical id AND its events_log stream_id. Caller-minted (the
    // cycle-open trigger derives it as deriveAlertId(cycle_id) — UUIDv5, 1:1 with the
    // cycle); NO gen_random_uuid() default so a row can never exist with an id that
    // does not match an event stream. Branded AlertId (reused from ids/index.ts:90 —
    // NOT re-declared).
    alertId: uuid('alert_id').primaryKey().$type<AlertId>(),

    // The cycle boundary this alert belongs to. There is NO `cycles` table in the
    // substrate — the cycle boundary is `cycle_freeze_commits.commit_id` (the Epic-7
    // pool-spawn anchor). unFK'd, mirroring pools.cycle_id's no-FK posture. Branded
    // `CycleFreezeCommitId` (reused — there is no dedicated `CycleId` brand today).
    // The UNIQUE index below enforces the one-alert-per-cycle invariant (AC2).
    cycleId: uuid('cycle_id').notNull().$type<CycleFreezeCommitId>(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded. unFK'd
    // (mirrors pools.pariwar_id — there is no pariwars FK yet).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // N — the number of pools spawned in this cycle (copied from the `cycle.frozen`
    // payload). One pool per approved claim; `claim_id`/`pool_index` distinguish the N
    // pools WITHIN this single alert (architecture's (alert_id, claim_id) → pool_id).
    poolCount: integer('pool_count').notNull(),

    // The CACHED lifecycle state — a projection of the event-replay, NOT the source
    // of truth. Written ONLY by the projector (alert/project.ts); guarded by the DB
    // trigger + the CI gate. No DB default: the projector writes the replayed result
    // explicitly (the first event projects to `frozen`, then `published`, then `live`).
    currentState: alertLifecycleStateEnum('current_state').notNull(),

    // The `events_log.event_version` the cached `current_state` was projected from —
    // the staleness / idempotency anchor. `mode: 'number'` matches the pools/claims
    // precedent (without it Drizzle returns a JS BigInt that breaks numeric comparison
    // with the `number` the projector produces).
    stateEventVersion: bigint('state_event_version', { mode: 'number' }).notNull(),

    // WHO minted the alert (the trustee attestation actor_id copied from `cycle.frozen`
    // — NON-PII controlled-staff attribution). `text` NOT NULL, mirroring
    // cycle_freeze_commits.actor_id (the alert's attestation source): the alert is
    // never system-anonymous — it always carries the freeze committer's attribution.
    createdByActor: text('created_by_actor').notNull(),

    // The freeze-transition audit anchor (AC1). The cycle-freeze commit that triggered
    // the alert threads its audit id here. Nullable — a plain reference (the
    // pools.audit_id / claims.audit_id no-FK-at-primitive posture).
    auditId: uuid('audit_id'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Per-tenant alert scans / RLS-aware planner hint (pariwar_id leads, mirroring
    // pools_pariwar_id_idx). Point lookups use the alert_id PK.
    index('alerts_pariwar_id_idx').on(t.pariwarId),
    // The ONE-ALERT-PER-CYCLE invariant (AC2). alert_id = deriveAlertId(cycle_id) is
    // 1:1 with the cycle, but this UNIQUE index is the DB-level backstop: a second
    // alert for an already-minted cycle (a non-deterministic-id bug) hits this index
    // (23505), never a duplicate alert. Also serves the cycle → alert lookup the
    // recovery sweep runs (find cycles with a cycle.frozen but no minted alert).
    uniqueIndex('alerts_cycle_id_uq').on(t.cycleId),
    // Story 8.14 (Review Finding) — the close-of-cycle sweep's cross-tenant scan filters
    // `WHERE current_state = 'live'` every hour, BYPASSRLS, across every Pariwar. `live` is a small
    // minority of rows once cycles start closing/settling, so a partial index keeps that filter an
    // index scan instead of a full-table scan as `alerts` grows.
    index('alerts_current_state_live_idx').on(t.currentState).where(sql`current_state = 'live'`),
  ],
);

// Inferred row types for the accessor read/write paths (pools precedent).
export type AlertRow = typeof alerts.$inferSelect;
export type AlertInsert = typeof alerts.$inferInsert;
