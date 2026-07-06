// `member_telegram_opt_in` — the member Telegram opt-in state-machine substrate (Story 5.5, Task 2;
// AC1/AC3/AC4/AC10).
//
// The FIVE-state OPERATIONAL lifecycle the consent registry's two-state grant/revoke row cannot express:
// PENDING (awaiting the bot `/start <code>` match) → ACTIVE (matched; the bot may deliver — NO 24h window,
// Telegram bots message until the user blocks/stops) → REVOKED (member/`/stop`/admin opt-out) |
// BLOCKED (`my_chat_member` block/kick) | EXPIRED (stale-PENDING sweep only — NO past-window sweep). It
// carries the operational nuance the registry cannot: the verification code (the `/start` match token) and
// the captured `chat_id` (the delivery address). `consent_records` stays the canonical "valid consent at
// time Y?" surface (recordConsent on ACTIVE, revokeConsent on REVOKED/BLOCKED) — this table is the state
// machine; the two are kept consistent by the caller's audit-or-throw (audit line FIRST, then consent + state
// transition in one scoped tx). Mirrors member_wa_opt_in but SIMPLER: no mobile blind index (Telegram never
// shares the phone; the match key is the verification code alone), no window_expires_at (no Meta window).
//
// ── RLS: standard inline tenant-isolation (0037/0038 shape) ────────────────────────────────────────────
// A member's Telegram opt-in must NOT be cross-tenant readable — STANDARD inline tenant-isolation RLS on
// pariwar_id (Story 1.6 closed-failure construct: unset scope → 0 rows). RLS lives INLINE in migration 0046.
//
// ── PII discipline ─────────────────────────────────────────────────────────────────────────────────────
// `verification_code` is a random, non-PII match token. `chat_id` is the opaque Telegram chat id (Telegram
// carries no phone/Aadhaar) — OPERATIONAL, not a Tier-1 envelope column. No Tier-1 envelope column here.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields camelCase; table plural.

import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { ConsentId, MemberId, MemberTelegramOptInId, PariwarId } from '../ids/index.js';

/**
 * The member Telegram opt-in operational lifecycle states (AC4). Value order is APPEND-only discipline (a
 * pgEnum yields stored ordinals):
 *   · `PENDING` — minted on the settings-toggle tap; awaiting the bot `/start <code>` match.
 *   · `ACTIVE`  — the inbound `/start` matched a PENDING; the bot may deliver (no window).
 *   · `REVOKED` — member/`/stop`/admin opt-out (a MUTATE via revokeOptIn, never a delete).
 *   · `BLOCKED` — the user blocked/kicked the bot (`my_chat_member` update).
 *   · `EXPIRED` — the stale-PENDING sweep (a PENDING that never matched within the TTL). NO past-window sweep.
 *
 * ⚠ LOCKSTEP with the `@twt/contracts` `TelegramOptInStateSchema` z.enum (the consent_type discipline): the
 * list is DUPLICATED there because `@twt/domain` must NOT import `@twt/contracts` (turbo cycle). Drift is
 * prevented by an equality assertion in the contracts test.
 */
export const telegramOptInStateEnum = pgEnum('telegram_opt_in_state', [
  'PENDING',
  'ACTIVE',
  'REVOKED',
  'BLOCKED',
  'EXPIRED',
]);

export const memberTelegramOptIn = pgTable(
  'member_telegram_opt_in',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded `MemberTelegramOptInId`.
    optInId: uuid('opt_in_id').defaultRandom().primaryKey().$type<MemberTelegramOptInId>(),

    // Tenant key + RLS predicate column. Branded `PariwarId`.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The member subject. POLYMORPHIC member reference (mirror consent_records.subject_id): NO FK (members
    // cross-references are Epic 3), carries the MemberId brand as a $type hint only.
    memberId: uuid('member_id').notNull().$type<MemberId>(),

    // The operational lifecycle state (see telegramOptInStateEnum). Default PENDING (minted awaiting match).
    state: telegramOptInStateEnum('state').notNull().default('PENDING'),

    // The unique per-PENDING match token handed to the member via the `t.me/<bot>?start=<code>` deep-link.
    // DB-enforced uniqueness: a PARTIAL unique index UNIQUE (pariwar_id, verification_code) WHERE
    // state='PENDING' (migration 0046) so two concurrently-outstanding PENDING opt-ins can NEVER share a code
    // (a collision would let one member's `/start` match another's PENDING → wrong-member ACTIVE). Partial so
    // a code is free to recur across terminal/historical rows.
    verificationCode: text('verification_code').notNull(),

    // The opaque Telegram chat id captured on the ACTIVE transition (the `SendTarget.address`). NULL while
    // PENDING. OPERATIONAL, not a PII-envelope column (Telegram carries no phone/Aadhaar).
    chatId: text('chat_id'),

    // FK-free link to the consent_records row minted on ACTIVE (the registry is canonical; this is a
    // convenience back-reference). Branded ConsentId; NULL while not-yet-ACTIVE.
    consentId: uuid('consent_id').$type<ConsentId>(),

    // Set when a webhook `/start` match flips PENDING→ACTIVE (provenance for AC10 chronological history).
    matchedAt: timestamp('matched_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The worker's PENDING-match lookup: (pariwar, verification code, state).
    index('member_telegram_opt_in_match_idx').on(t.pariwarId, t.verificationCode, t.state),
    // The member-status read (getOptInForMember + the composition resolver gate).
    index('member_telegram_opt_in_member_idx').on(t.pariwarId, t.memberId),
  ],
);

export type MemberTelegramOptInRow = typeof memberTelegramOptIn.$inferSelect;
export type MemberTelegramOptInInsert = typeof memberTelegramOptIn.$inferInsert;

/** The opt-in operational lifecycle-state union (`PENDING` | … | `EXPIRED`). */
export type TelegramOptInState = (typeof telegramOptInStateEnum.enumValues)[number];
