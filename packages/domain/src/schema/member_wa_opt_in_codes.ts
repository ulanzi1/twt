// `member_wa_opt_in_codes` — the WhatsApp CODE for a member whose WhatsApp is on another phone (Story 5.13, WC2; Decision
// 2026-10-21-374 option A, Trustee-ratified; build decisions in Decision 2026-10-21-376). Migration 0178 (hand-authored — the
// GRANTs, the per-command policies, FORCE RLS, the CHECKs, the partial UNIQUE and the guard trigger live there).
//
// ⭐ ONE row per CLAIMED send (WC1 step 2): the code's SHA-256 hash (⛔ the code — I7), a DB-clock expiry (10 minutes), its tries,
// and what Meta did with it. The DATABASE caps a request (one PENDING opt-in) at TWO counted sends (`send_seq ∈ {1, 2}` + the
// partial UNIQUE `member_wa_opt_in_codes_counted_seq_uq` WHERE `send_outcome <> 'released'`) and a code at TWO tries (CHECKs); the
// trigger freezes identity, moves the outcome only FROM `sending` (once), never lowers `attempts` and never clears
// `consumed_at` / `invalidated_at` (I3). Its OWN store — ⛔ `member_auth_otps` (I4: a code switches on WhatsApp and nothing else).
// A composite OWNER FK ties a row to its opt-in's Pariwar and member. TENANT-ISOLATED; RLS in policies/member-wa-opt-in-codes-rls.ts.
// ⛔ PII: ids, a code HASH, the wamid, a fixed-vocabulary `detail` — ⛔ the code, ⛔ a number.

import { sql } from 'drizzle-orm';
import { foreignKey, index, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, MemberWaOptInId, PariwarId } from '../ids/index.js';
import { memberWaOptIn } from './member_wa_opt_in.js';

/**
 * What Meta did with a claimed send (WC3). `sending` — claimed, the call not yet recorded (a crash leaves it here: counted, live
 * until it expires); `accepted` — Meta returned a wamid; `may_have_sent` — it may have reached the member; `refused` — Meta refused
 * it for the recipient or for an unclassified reason (COUNTED); `released` — provably never delivered and ⛔ the recipient's
 * fault (UNCOUNTED — frees its seq). ⚠ LOCKSTEP with 0178's `member_wa_opt_in_codes_send_outcome_check` (a spec reads the CHECK).
 */
export const WA_OPT_IN_CODE_SEND_OUTCOMES = ['sending', 'accepted', 'may_have_sent', 'refused', 'released'] as const;
export type WaOptInCodeSendOutcome = (typeof WA_OPT_IN_CODE_SEND_OUTCOMES)[number];

/**
 * ⭐ The GRAMMAR of `detail`: a fixed prefix, a colon, then `[a-z0-9_]{1,48}` — ⛔ a space, ⛔ `+`, ⛔ a run of 7+ digits (a bare
 * phone number). ⚠ LOCKSTEP with 0178's `member_wa_opt_in_codes_detail_vocabulary_check` (a spec pins the two equal). ⛔
 * Backslashes — the same string reads the same in a JS `RegExp` and a PG ARE.
 */
export const WA_OPT_IN_CODE_DETAIL_PATTERN =
  '^(?!.*[0-9]{7})(may_have_sent|rate_limited|api_unavailable|scope|recipient|unknown_scope|pre_send):[a-z0-9_]{1,48}$';

export const memberWaOptInCodes = pgTable(
  'member_wa_opt_in_codes',
  {
    codeId: uuid('code_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** The request (the PENDING opt-in) this code belongs to. */
    optInId: uuid('opt_in_id').notNull().$type<MemberWaOptInId>(),
    memberId: uuid('member_id').notNull().$type<MemberId>(),
    /** 1 or 2 — the lowest seq ⛔ held by a non-released row of the request (WC2's slot rule). */
    sendSeq: smallint('send_seq').notNull(),
    /** `hashOtp(code)` — SHA-256 hex. ⛔ The code. */
    codeHash: text('code_hash').notNull(),
    /** DB clock — `created_at` + 10 minutes (WC3). */
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    /** Wrong tries, 0..2 — ⛔ decreasing; at 2 the code is `invalidated_at`. */
    attempts: smallint('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true, mode: 'date' }),
    sendOutcome: text('send_outcome').notNull().default('sending').$type<WaOptInCodeSendOutcome>(),
    /** The wamid of an `accepted` send. */
    providerMessageId: text('provider_message_id'),
    /** The fixed grammar (`WA_OPT_IN_CODE_DETAIL_PATTERN`). ⛔ Never PII. */
    detail: text('detail'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    index('member_wa_opt_in_codes_opt_in_idx').on(t.pariwarId, t.optInId, t.createdAt),
    // Migration 0178 — the composite OWNER FK (0175's shape): a code's Pariwar and member are its opt-in's.
    foreignKey({
      name: 'member_wa_opt_in_codes_opt_in_owner_fk',
      columns: [t.pariwarId, t.memberId, t.optInId],
      foreignColumns: [memberWaOptIn.pariwarId, memberWaOptIn.memberId, memberWaOptIn.optInId],
    }).onDelete('cascade'),
    // + the SQL-only partial UNIQUE `member_wa_opt_in_codes_counted_seq_uq` and the trigger `member_wa_opt_in_codes_guard` (0178).
  ],
);

export type MemberWaOptInCodeRow = typeof memberWaOptInCodes.$inferSelect;
