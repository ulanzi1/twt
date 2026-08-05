// `member_search_projection` — the AR-65 admin member-search compound read model (Story 4.7, Task 1).
//
// The denormalized read store AR-65 (architecture §1.18, item 18 at architecture.md:326-330) commits:
// a precomputed, per-member projection the admin member-search reads in ONE join-free lookup per
// result (no query-time fan-out across identity/nominee/state/contribution/claim — the N+1 anti-
// pattern architecture.md:3919-3926 flags, and the reason AR-65 exists). It is the SURROUNDING context
// for `<MemberStatusPanel>` (Story 4.7) — NOT a second validity computation. Eligibility itself is
// ALWAYS the canonical Story 4.6 `MemberValidityPayload`, never this projection (Dev Notes invariant).
//
// ── NOT the validity cache ─────────────────────────────────────────────────────────────────────────
// This is the admin member-SEARCH result projection. The FR-12A validity payload's cache is a SEPARATE
// Postgres materialized view built in Story 4.8 (architecture.md:1044-1048). The two caches are
// distinct by design; this table never holds an eligibility answer.
//
// ── PII discipline — NON-PII summary only (D1 "scope-safe fields") ──────────────────────────────────
// A denormalized read store must NOT materialize Tier-1 encrypted identity PII (name/mobile/Aadhaar) —
// that would defeat the architecture §2.7 encryption posture and duplicate `member_identities` /
// `member_kyc_profiles`. So this table carries ONLY the non-PII denormalized sections: lifecycle state,
// the nominee summary (count + split + relationship — all non-PII; relationship is Tier-3 plaintext,
// mirroring the `member.nominees_declared` event which records only count + split), and the D2 typed
// producer-unavailability sentinels. The admin-search read JOINs the encrypted identity columns from
// `member_identities` + `member_kyc_profiles` ONCE (a single query for the whole result page — NOT a
// per-result loop) and decrypts them in the handler.
//
// ── D2: contribution + claim sections = typed `producer_unavailable`, NEVER empty arrays ────────────
// Claims are Epic 6; contributions are Epic 8/9 — NEITHER producer exists yet
// ([[project_engine_never_infers_contribution_facts]]; Story 4.6 shipped the same sentinel for
// `contribution_history_summary`). An empty `[]` reads as "assessed, no events found," indistinguishable
// from an un-assessed member — the exact confusion the never-placeholder discipline ([[CR-4.4-D3]] /
// [[CR-4.5-D1]]) forbids. So both sections are JSONB carrying the distinct `{status:'producer_unavailable',
// producer}` sentinel; the panel renders them as an explicit "not yet available" affordance.
//
// ── Projector-EXCLUSIVE write ownership (D1 refinement ii — LOAD-BEARING) ────────────────────────────
// This projection is write-owned EXCLUSIVELY by the Story 3.1 member projector (member/project.ts). No
// HTTP handler, admin action, background job, or SQL trigger writes it directly — mirroring the
// `members.state` projector-only + trigger-guarded discipline ([[project_member_lifecycle_domain_substrate]]).
// The migration hand-supplements a BEFORE INSERT/UPDATE write-rejection trigger keyed on the transaction-
// scoped `app.member_search_projection_writer` guard (the 0018 `members.state` trigger is the precedent),
// and the member-state-invariant CI gate is extended to fail on any out-of-band write.
//
// ── Freshness (D1 refinement iii — operational) ─────────────────────────────────────────────────────
// Eventual consistency within the normal projector latency budget: the projection is refreshed
// incrementally on every member-state event append (real-time-within-seconds per AR-65). A stale
// projection is a projector-lag observation, not a correctness bug — the canonical eligibility answer is
// always the 4.6 payload. `state_event_version` mirrors `members.state_event_version` as the staleness /
// idempotency anchor.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase. Header style
// mirrors members.ts / member_kyc_profiles.ts.

import { bigint, index, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId } from '../ids/index.js';
import { memberLifecycleStateEnum } from './members.js';
import { members } from './members.js';

/**
 * One non-PII nominee entry in the denormalized `nominee_summary`. Mirrors what the
 * `member.nominees_declared` event records (count + split) plus the Tier-3-plaintext relationship —
 * NEVER the Tier-1-encrypted nominee name/mobile/address. `rank` 1 = primary, 2 = secondary.
 */
export interface NomineeSummaryEntry {
  rank: number;
  relationship: string;
  splitPct: number;
}

/** The D2 producer-unavailability sentinel shape stored for the contribution + claim sections. */
export interface ProducerUnavailableSection {
  status: 'producer_unavailable';
  /** The story family that will supply the real events (audit trail for the gap). */
  producer: 'epic-6' | 'story-10-24';
}

/**
 * The contribution-section sentinel constant.
 *
 * ⚠ Story 10.24 re-pointed the LABEL only (`epic-8-9` → `story-10-24`, migration 0093 does the column
 * DEFAULT + the existing rows). Populating this section with REAL facts is DEFERRED and recorded in
 * `deferred-work.md`: the admin member-search compound read model keeps its sentinel even though the
 * `contribution.*` producer now exists, because filling it is a projector change with its own
 * backfill, not a label change.
 */
export const CONTRIBUTION_SECTION_UNAVAILABLE: ProducerUnavailableSection = {
  status: 'producer_unavailable',
  producer: 'story-10-24',
};

/** The claim-section sentinel constant (producer is Epic 6). */
export const CLAIM_SECTION_UNAVAILABLE: ProducerUnavailableSection = {
  status: 'producer_unavailable',
  producer: 'epic-6',
};

export const memberSearchProjection = pgTable(
  'member_search_projection',
  {
    // One projection row per member (PK = member_id). FK → members.member_id keeps referential
    // integrity; the projector's upsert runs in the member's Pariwar scope so the FK check sees the
    // row (same RLS family). RTBF anonymization is a member-state event, so the projector refreshes
    // this row (to the anonymized state) through the normal path.
    memberId: uuid('member_id')
      .$type<MemberId>()
      .primaryKey()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded). The admin-search path scopes every read by
    // this column (pariwar_id-first, mirroring members_pariwar_id_idx).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // Denormalized lifecycle state (section 5 of the projection). A mirror of `members.state`; the
    // panel reads the CANONICAL state from the 4.6 payload, but the search-result row shows this so an
    // admin can triage a result list without a per-row validity call.
    state: memberLifecycleStateEnum('state').notNull(),

    // The `members.state_event_version` this projection row was refreshed from — the staleness /
    // idempotency anchor (mirror `members.state_event_version`; `mode:'number'` for the same
    // BigInt-vs-number reason members.ts documents).
    stateEventVersion: bigint('state_event_version', { mode: 'number' }).notNull(),

    // Non-PII nominee summary (section 2): count is `array length`; the entries carry rank + split +
    // Tier-3 relationship only. `[]` here legitimately means "no nominees declared" (a genuine assessed
    // state), unlike the contribution/claim sections whose absence is a MISSING PRODUCER (see D2).
    nomineeSummary: jsonb('nominee_summary').notNull().$type<NomineeSummaryEntry[]>().default([]),

    // Contribution section (section 3) — the D2 typed sentinel, NEVER an empty array. Filled with real
    // events when the Epic 8/9 contribution producer lands.
    contributionSection: jsonb('contribution_section')
      .notNull()
      .$type<ProducerUnavailableSection>()
      .default(CONTRIBUTION_SECTION_UNAVAILABLE),

    // Claim section (section 4) — the D2 typed sentinel, NEVER an empty array. Filled with real events
    // when the Epic 6 claim producer lands.
    claimSection: jsonb('claim_section')
      .notNull()
      .$type<ProducerUnavailableSection>()
      .default(CLAIM_SECTION_UNAVAILABLE),

    projectedAt: timestamp('projected_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Per-tenant projection scans / RLS-aware planner hint (pariwar_id leads, mirroring
    // members_pariwar_id_idx). Point lookups by member_id use the PK.
    index('member_search_projection_pariwar_id_idx').on(t.pariwarId),
  ],
);

export type MemberSearchProjectionRow = typeof memberSearchProjection.$inferSelect;
export type MemberSearchProjectionInsert = typeof memberSearchProjection.$inferInsert;
