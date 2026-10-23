// `claim_peer_mesh_pings` — the delivery-neutral ping-intent record (Story 6.6, Task 3; AC3).
//
// ONE row per selected member per selection (the `(selection_id, member_id)` UNIQUE is
// the idempotency anchor). This is the CONCRETE ARTIFACT the later dispatch-composition
// story reads to know WHO to actually send to — "recorded" means a persisted row, not an
// in-memory object the job discards.
//
// ── Decision D1 — delivery-neutral, NOT dispatched (6.6) ──────────────────────
// 6.6 owns "an intent was CONSTRUCTED for member X" — NOT delivery state. 6.6 added NO dispatch-status
// columns; those were the dispatch-composition story's to add via its OWN migration. ⭐ Story 6.27a (PM18,
// re-pin 2026-10-12): 6.6's *"There is still NO live `dispatch()` caller anywhere"* is STALE —
// `contribution-notify.ts` and `claim-correction-reminders.ts` call it. And these texts do ⛔ not go through
// `dispatch()` at all: 6.27c sends ONE claim SMS per ping through the claim send core (PM2).
// ⭐ Migration 0156 (Story 6.27a PM4 [a]) adds the DELIVERY RECORD on THIS row — `send_outcome IS NULL` means
// "⛔ not yet begun"; once-ever is a compare-and-set from NULL (6.27c's writers); a finished outcome is frozen by
// 0156's trigger; `twt_app` may UPDATE ONLY these columns (REVOKE + column GRANT — 6.6's identity columns are
// ⛔ never rewritten). The `detail` grammar is 6.27c's (here only the length).
//
// ── Decision D2 — no AlertCategory binding ────────────────────────────────────
// `message_key` is a plain VERSIONED copy-template key, NOT a value from the frozen 9-value
// `AlertCategory` union (which 6.6 does not edit). The dispatch-composition story maps
// `message_key` → whatever category it lands on.
//
// TENANT-ISOLATED (mirrors the selections table). RLS in the SAME policy file
// (policies/claim-peer-mesh-selections-rls.ts). NO PII: opaque member id + a copy-template
// key + a timestamp — no message body, no member contact info.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { type AnyPgColumn, foreignKey, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId, PeerMeshPingId, PeerMeshSelectionId } from '../ids/index.js';
import { claimPeerMeshSelections, type PeerMeshSource } from './claim_peer_mesh_selections.js';

/** The default versioned copy-template key for a peer-mesh verification-request ping. */
export const PEER_MESH_MESSAGE_KEY = 'peer_mesh_verification_request_v1';

/**
 * Story 6.27a (PM4) — the send outcomes a ping's text may record: 0138's vocabulary EXCEPT `recorded` (meaningless for a
 * text). ⚠ LOCKSTEP with 0156's `claim_peer_mesh_pings_send_outcome_check`.
 */
export const PEER_MESH_SEND_OUTCOMES = [
  'attempting',
  'accepted',
  'rejected_invalid_number',
  'rejected_unreachable',
  'no_target',
  'error',
  'skipped_superseded',
] as const;
export type PeerMeshSendOutcome = (typeof PEER_MESH_SEND_OUTCOMES)[number];

/**
 * Story 6.27a (PM22) — why the text's language was chosen. ⚠ LOCKSTEP with 0156's `locale_source` CHECK — 📌 widened 2026-10-23
 * by Story 6.35 (migration 0179, Decision 2026-10-23-387 LS9): `member_choice` — the recipient's own choice in the app; else
 * `pariwar_default`. (The reminder's third value, `pariwar_fallback`, is the reminder's own — `PEER_MESH_WA_REMINDER_LOCALE_SOURCES`.)
 */
export const PEER_MESH_LOCALE_SOURCES = ['pariwar_default', 'member_choice'] as const;
export type PeerMeshLocaleSource = (typeof PEER_MESH_LOCALE_SOURCES)[number];

/**
 * Story 6.27c (R3 / R4) — why a NEIGHBOUR could ⛔ be texted (the `no_target:<reason>` a skipped ping records). These — and ONLY
 * these — are REPLACED by the next eligible person of the same group (`-311` PM1 (ii)). ⚠ LOCKSTEP with 0166's
 * `claim_peer_mesh_pings_replacement_guard` and its grammar CHECKs (a spec iterates this array). ⚠ The District Admin sees the
 * code verbatim (the console's `noTargetReason`) — ⛔ a name, number or id in one. ⭐ Story 6.36d: `peer_is_nominee` added — 0180
 * widens 0166's CHECKs and the replacement guard's list (LOCKSTEP moved there).
 */
export const PEER_MESH_REQUEST_REPLACEABLE_REASONS = [
  'peer_not_active',
  'peer_reported_deceased',
  'peer_filed_for_this_death',
  // ⭐ Story 6.36d (`2026-10-23-386` ND5 (a)) — the neighbour signs in with one of the deceased's nominee numbers (0180).
  'peer_is_nominee',
  'peer_not_eligible',
  'no_sendable_number',
] as const;
export type PeerMeshRequestReplaceableReason = (typeof PEER_MESH_REQUEST_REPLACEABLE_REASONS)[number];

/**
 * Story 6.27c (BF25) — the form of a ping's `link_code` (12 base62). ⚠ LOCKSTEP with 0156's `claim_peer_mesh_pings_link_code_check`
 * (a policy spec reads the CHECK) AND with `@twt/contracts`' `APP_LINK_CODE_PATTERN` (a contracts test runs both over the same
 * samples — the domain ⛔ imports the contracts, so the two cannot share one constant).
 */
export const PEER_MESH_LINK_CODE_PATTERN = '^[0-9A-Za-z]{12}$';

/** Story 6.27c (R9) — the DECEASED's name could ⛔ be used: claim-wide, so ⛔ replaced (R3). ⚠ LOCKSTEP with 0166's grammar. */
export const PEER_MESH_REQUEST_NAME_REASONS = ['name_too_long', 'name_none', 'name_erased', 'name_unresolvable'] as const;
export type PeerMeshRequestNameReason = (typeof PEER_MESH_REQUEST_NAME_REASONS)[number];

/**
 * ⭐ Story 6.27c (PM4 [c]) — the GRAMMAR of `detail` / `first_detail`: every value `peerMeshRequestDetail` builds, ⛔ anything else
 * (⛔ a space, ⛔ `+`, ⛔ a run of 7+ digits anywhere — a bare phone number). A gateway `<code>` is `[A-Za-z0-9_.-]{1,64}` (sanitised
 * by the builder). ⚠ LOCKSTEP with 0166's two `*_vocabulary_check` CHECKs (re-added from this string by 0180 — Story 6.36d) (a spec pins the catalog's pattern to this string) and
 * asserted by the writers (`claim/peer-mesh-request.ts`). ⛔ Backslashes — the same string reads the same in a JS `RegExp` and a PG
 * ARE.
 */
export const PEER_MESH_REQUEST_DETAIL_PATTERN =
  '^(?!.*[0-9]{7})(no_target:(peer_not_active|peer_reported_deceased|peer_filed_for_this_death|peer_is_nominee|peer_not_eligible|no_sendable_number|name_too_long|name_none|name_erased|name_unresolvable)|superseded:claim_decided|exhausted:(attempting_three_days|recheck_(claim_decided|peer_ineligible))|decrypt_failed:tier1|hash_failed:tier1|config_unavailable:secret_manager|config:(dlt_template_id_missing|helpline_number_missing|sms_gateway_unconfigured|sms_messaging_unavailable|secret_manager_[A-Za-z0-9_]{1,64})|(invalid_number|carrier_reject|rate_limited|api_unavailable|dlt_template_not_approved|auth|unknown):[A-Za-z0-9_.-]{1,64})$';

export const claimPeerMeshPings = pgTable(
  'claim_peer_mesh_pings',
  {
    // Per-row ping-intent id (server-side gen_random_uuid()). Branded PeerMeshPingId.
    pingId: uuid('ping_id').defaultRandom().primaryKey().$type<PeerMeshPingId>(),

    // The selection this intent belongs to. FK → claim_peer_mesh_selections (cascade:
    // deleting a selection sweeps its intents).
    selectionId: uuid('selection_id')
      .notNull()
      .$type<PeerMeshSelectionId>()
      .references(() => claimPeerMeshSelections.selectionId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded) — same construct as the
    // selections table so a cross-tenant reader sees nothing on EITHER table.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The ping target (a selected member). Opaque id — non-PII.
    memberId: uuid('member_id').notNull().$type<MemberId>(),

    // A versioned copy-template key (NOT an AlertCategory — Decision D2). Default set here
    // so the bulk-insert accessor need not repeat it.
    messageKey: text('message_key').notNull().default(PEER_MESH_MESSAGE_KEY),

    constructedAt: timestamp('constructed_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    // ── Story 6.27a (migration 0156, PM4 [a]) — the delivery record; written ONLY by 6.27c's writers ──
    /** NULL = ⛔ not yet begun (the member was ⛔ never texted). */
    sendOutcome: text('send_outcome').$type<PeerMeshSendOutcome>(),
    /** 0 until begin; ≥ 1 after (`(send_outcome IS NULL) = (attempt_count = 0)`). */
    attemptCount: integer('attempt_count').notNull().default(0),
    claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'date' }),
    claimedByJob: text('claimed_by_job'),
    /** The give-up's anchor — moves only forward (0156's trigger). */
    agingSince: timestamp('aging_since', { withTimezone: true, mode: 'date' }),
    parkedAt: timestamp('parked_at', { withTimezone: true, mode: 'date' }),
    /** ≤ 200 characters; the grammar is 6.27c's (0166 — `PEER_MESH_REQUEST_DETAIL_PATTERN`). ⛔ Never PII, ⛔ never the link code. */
    detail: text('detail'),
    firstDetail: text('first_detail'),
    providerMessageId: text('provider_message_id'),
    /** A KEYED hash of the number texted. ⛔ Never the number. */
    recipientNumberHash: text('recipient_number_hash'),
    sendUpdatedAt: timestamp('send_updated_at', { withTimezone: true, mode: 'date' }),
    /** Why the text's language was chosen (PM22). */
    localeSource: text('locale_source').$type<PeerMeshLocaleSource>(),
    /**
     * Story 6.35 (migration 0179; LS9, I5) — the language the text was sent in, written at the FRESH begin with `locale_source`;
     * a re-claim REUSES it (⛔ re-resolved — one attempt, one language). Written once (0179's guard arm) and frozen with the other
     * delivery columns. NULL on a row ⛔ begun, or finished without a begin (`skipFresh`), or begun by pre-6.35 code (which sent
     * the Pariwar's default).
     */
    locale: text('locale').$type<'hi' | 'en'>(),
    /** The 12-character base62 code in the text's link (PM21 (a)) — written ONCE; ⛔ never logged. */
    linkCode: text('link_code').unique('claim_peer_mesh_pings_link_code_uq'),

    // ── Story 6.36 (migration 0163; SW24, I9) ──
    /** Where this person came from — EQUAL to its selection's `source` (0163's BEFORE INSERT trigger); immutable by grant. */
    source: text('source').$type<PeerMeshSource>(),

    // ── Story 6.27c (migration 0166; `-311` PM1 (ii), R2 / R3 / R5) ──
    /**
     * The ping this one REPLACES — one skipped at send time for a peer reason (`PEER_MESH_REQUEST_REPLACEABLE_REASONS`), of the SAME
     * selection, at `attempt_count = 1` (0166's BEFORE INSERT trigger). UNIQUE ⇒ a ping is replaced at most once ⇒ live pings ≤
     * the original count. Immutable by grant (⛔ in 0156's UPDATE column list). NULL for an original ping.
     */
    replacesPingId: uuid('replaces_ping_id')
      .$type<PeerMeshPingId>()
      .references((): AnyPgColumn => claimPeerMeshPings.pingId, { onDelete: 'cascade' })
      .unique('claim_peer_mesh_pings_replaces_ping_uq'),
  },
  (t) => [
    // One intent per member per selection — the idempotency anchor (a re-run of the select
    // job inserts nothing new; still exactly 5 rows, never 10).
    unique('claim_peer_mesh_pings_selection_member_uq').on(t.selectionId, t.memberId),
    unique('claim_peer_mesh_pings_owner_uq').on(t.pariwarId, t.pingId, t.selectionId, t.memberId),
    foreignKey({ name: 'claim_peer_mesh_pings_selection_owner_fk', columns: [t.pariwarId, t.selectionId], foreignColumns: [claimPeerMeshSelections.pariwarId, claimPeerMeshSelections.selectionId] }).onDelete('cascade'),
    // Per-tenant scans / RLS-aware planner hint.
    index('claim_peer_mesh_pings_pariwar_id_idx').on(t.pariwarId),
  ],
);

export type ClaimPeerMeshPingRow = typeof claimPeerMeshPings.$inferSelect;
export type ClaimPeerMeshPingInsert = typeof claimPeerMeshPings.$inferInsert;
