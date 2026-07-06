// `member_wa_opt_in` — the member WhatsApp opt-in state-machine substrate (Story 5.4, Task 3; AC1/AC3/AC4).
//
// The FIVE-state OPERATIONAL lifecycle the consent registry's two-state grant/revoke row cannot express:
// PENDING (awaiting the inbound-webhook match) → ACTIVE (matched; 24h Meta customer-service window open) →
// REVOKED (member/STOP/admin opt-out) | BLOCKED_BY_META (Meta block/opt-out status callback) |
// EXPIRED_24H_WINDOW (time-based sweep). It carries the operational nuance the registry cannot: the
// verification phrase (the inbound-match token), the mobile blind index (the match key), and the 24h-window
// expiry. `consent_records` stays the canonical "valid consent at time Y?" surface (recordConsent on ACTIVE,
// revokeConsent on REVOKED/BLOCKED) — this table is the state machine; the two are kept consistent by the
// caller's audit-or-throw (audit line FIRST, then consent + state transition in one scoped tx). This mirrors
// the Story 3.1 member-lifecycle "state machine + events" split (the state machine framework lives in
// @twt/domain; @twt/domain CANNOT import @twt/events).
//
// ── RLS: standard inline tenant-isolation (0037/0038 shape) ────────────────────────────────────────────
// A member's WA opt-in must NOT be cross-tenant readable — STANDARD inline tenant-isolation RLS on
// pariwar_id (Story 1.6 closed-failure construct: unset scope → 0 rows), NOT a cross-tenant carve-out. RLS
// lives INLINE in migration 0042 (the 0037/0038 pattern — no separate *-rls.ts).
//
// ── PII discipline ─────────────────────────────────────────────────────────────────────────────────────
// `mobile_blind_index` is a deterministic HMAC (the SAME member_identities.mobile_blind_index value) — NOT
// plaintext, computed at the apps/api boundary; the domain never sees the raw msisdn. `verification_phrase`
// is a random, non-PII match token. No Tier-1 envelope column here.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields camelCase; table plural.

import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { ConsentId, MemberId, MemberWaOptInId, PariwarId } from '../ids/index.js';

/**
 * The member WA opt-in operational lifecycle states (AC4). Value order is APPEND-only discipline (a pgEnum
 * yields stored ordinals):
 *   · `PENDING`             — minted on the settings-toggle tap; awaiting the inbound-webhook match.
 *   · `ACTIVE`             — the inbound message matched a PENDING; the 24h Meta window is open.
 *   · `REVOKED`            — member/STOP/admin opt-out (a MUTATE via revokeOptIn, never a delete).
 *   · `BLOCKED_BY_META`    — Meta block / opt-out status callback → authoritative block signal.
 *   · `EXPIRED_24H_WINDOW` — the time-based sweep (stale PENDING TTL, or ACTIVE past window_expires_at).
 *
 * ⚠ LOCKSTEP with the `@twt/contracts` `WaOptInStateSchema` z.enum (the consent_type discipline): the list
 * is DUPLICATED there because `@twt/domain` must NOT import `@twt/contracts` (turbo cycle). Drift is
 * prevented by an equality assertion in the contracts test.
 */
export const waOptInStateEnum = pgEnum('wa_opt_in_state', [
  'PENDING',
  'ACTIVE',
  'REVOKED',
  'BLOCKED_BY_META',
  'EXPIRED_24H_WINDOW',
]);

export const memberWaOptIn = pgTable(
  'member_wa_opt_in',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded `MemberWaOptInId`.
    optInId: uuid('opt_in_id').defaultRandom().primaryKey().$type<MemberWaOptInId>(),

    // Tenant key + RLS predicate column. Branded `PariwarId`.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The member subject. POLYMORPHIC member reference (mirror consent_records.subject_id): NO FK (members
    // cross-references are Epic 3), carries the MemberId brand as a $type hint only.
    memberId: uuid('member_id').notNull().$type<MemberId>(),

    // The operational lifecycle state (see waOptInStateEnum). Default PENDING (minted awaiting match).
    state: waOptInStateEnum('state').notNull().default('PENDING'),

    // The unique per-PENDING match token pre-filled into the Send-Hello deep-link. DB-enforced uniqueness:
    // a PARTIAL unique index UNIQUE (pariwar_id, verification_phrase) WHERE state='PENDING' (migration 0042)
    // so two concurrently-outstanding PENDING opt-ins can NEVER share a phrase (a collision would let one
    // member's inbound WA message match another's PENDING → wrong-member ACTIVE). Partial so a phrase is free
    // to recur across terminal/historical rows.
    verificationPhrase: text('verification_phrase').notNull(),

    // Deterministic HMAC of the member's mobile (the SAME member_identities.mobile_blind_index value), the
    // inbound-match key. Computed at the apps/api boundary — the domain never sees plaintext.
    mobileBlindIndex: text('mobile_blind_index').notNull(),

    // The Meta 24h customer-service window end, set on the ACTIVE transition; NULL while PENDING.
    windowExpiresAt: timestamp('window_expires_at', { withTimezone: true, mode: 'date' }),

    // FK-free link to the consent_records row minted on ACTIVE (the registry is canonical; this is a
    // convenience back-reference). Branded ConsentId; NULL while not-yet-ACTIVE.
    consentId: uuid('consent_id').$type<ConsentId>(),

    // Set when a webhook match flips PENDING→ACTIVE (provenance for AC5 chronological history).
    matchedAt: timestamp('matched_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The worker's PENDING-match lookup: (pariwar, mobile blind index, state).
    index('member_wa_opt_in_match_idx').on(t.pariwarId, t.mobileBlindIndex, t.state),
    // The member-status read (getOptInForMember + the AC6 resolver gate).
    index('member_wa_opt_in_member_idx').on(t.pariwarId, t.memberId),
  ],
);

export type MemberWaOptInRow = typeof memberWaOptIn.$inferSelect;
export type MemberWaOptInInsert = typeof memberWaOptIn.$inferInsert;

/** The opt-in operational lifecycle-state union (`PENDING` | … | `EXPIRED_24H_WINDOW`). */
export type WaOptInState = (typeof waOptInStateEnum.enumValues)[number];
