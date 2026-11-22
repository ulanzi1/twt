// `marketplace_lead_handoffs` table — Story 12.5 (Task 1.2; Decision `2026-11-21-483` QE4, QE6, QE10, QE11), migration 0215.
//
// ONE row per lead: the OUTBOX 12.3's lead route writes in the SAME transaction as `module.lead_submitted` (`recordLeadHandoff`),
// then the jobs sweep's record of delivering it to the module's `lead_handoff_url` (`apps/jobs/src/scheduler/module-lead-handoff.ts`).
// AT LEAST ONCE (QE6 (A)): a timeout after the request was written is retried, and the partner dedupes on `Idempotency-Key: <lead_id>`.
//
// ── What the row holds ──────────────────────────────────────────────────────────────────────────────
//   · ids (lead, Pariwar, module, member, the consent that backs it, the caller's audit line);
//   · `member_fields_ciphertext` — ONE Tier-1 envelope (field class `module_lead_fields`, `rowKey = lead_id`) of the SEALED object
//     `{ version: 1, nonce, full_name, mobile, district, preferred_language }` (QE11 (A)) — what the member CONFIRMED on the form,
//     ⛔ a re-read of their record (I5). NULL once the send is stopped (W9), the member is erased (W11), or 30 days after a final
//     delivery or failure (W12) — `-484` Q4 A;
//   · the delivery state: `status`, `outcome_detail` (QE10's CLOSED grammar), the counters and clocks of the W table;
//   · `partner_reference` — ADVISORY ONLY (I3; the epic's boundary AC): a short safe token from ONE response header, ⛔ a source
//     of truth for anything. The partner-boundary fence (rule (b)) keeps its name to the four files that may touch it.
//
// The hand-authored half (the guard trigger, the GRANTs, FORCE RLS, the per-command policies) lives in 0215. PII: the ONE ciphertext.
// Story 12.5b (0216) adds the BACKSTOP `marketplace_lead_handoffs_route_guard` (BEFORE INSERT): a `partner_form` module never gets a row (I2).
// TENANT-ISOLATED; RLS in policies/marketplace-lead-handoffs-rls.ts. ⚠ The sweep's login BYPASSES RLS (roster Row 26), so every
// sweep statement carries `pariwar_id` itself (TR11).

import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { MODULE_LEAD_FIELDS_FIELD_CLASS } from '../encryption/field-classes.js';
import { piiColumn } from '../encryption/column.js';
import type { ConsentId, MemberId, ModuleId, ModuleLeadId, PariwarId } from '../ids/index.js';
import { consentRecords } from './consent_records.js';
import { marketplaceModules } from './marketplace_modules.js';
import { members } from './members.js';

/**
 * The row's statuses (QE4). `due` (recorded, released, held, lapsed or requeued — waiting for its `next_attempt_at`); `attempting`
 * (claimed and committed; the request in flight or crashed); the three FINALS. ⚠ LOCKSTEP with 0215's
 * `marketplace_lead_handoffs_status_check` and its guard function (the schema spec pins both).
 */
export const LEAD_HANDOFF_STATUSES = ['due', 'attempting', 'delivered', 'failed_delivery', 'cancelled'] as const;
export type LeadHandoffStatus = (typeof LEAD_HANDOFF_STATUSES)[number];

/** The finals (I10): `delivered` and `cancelled` never change again but for the fields going NULL; `failed_delivery` also by W13. */
export const LEAD_HANDOFF_FINAL_STATUSES = ['delivered', 'failed_delivery', 'cancelled'] as const;
export type LeadHandoffFinalStatus = (typeof LEAD_HANDOFF_FINAL_STATUSES)[number];

/** The v1 body's version (QE12). ⚠ LOCKSTEP with 0215's `marketplace_lead_handoffs_envelope_version_check`. */
export const LEAD_ENVELOPE_VERSION = 1 as const;

/**
 * ⭐ QE10 — the CLOSED grammar of `outcome_detail`: every word the sweep, erasure and the requeue write, ⛔ anything else (⛔ an error
 * message, a body, a header value, a hostname, an IP, a secret name — I8). An HTTP code is three digits of its own class.
 * ⚠ LOCKSTEP with `marketplace_lead_handoffs_outcome_detail_check` — 0215's, REPLACED by 0216 to add `cancelled:partner_form_route`
 * (Story 12.5b QE4 / QE5; the schema spec reads the constraint and compares).
 * ⛔ Backslashes — the same string must read the same in a JS `RegExp` and a PG ARE.
 */
export const LEAD_HANDOFF_DETAIL_PATTERN =
  '^(delivered:http_2xx:2[0-9]{2}|released:(http_5xx:5[0-9]{2}|http_408|http_429|timeout|network|http_401|http_403|http_404|address_refused)|held:(signing_key|kms|audit|db|dns)_unavailable|lapsed:lease_expired|requeued:manual|failed_delivery:(http_4xx:4[0-9]{2}|http_3xx:3[0-9]{2}|port_refused|url_refused|fields_unreadable|retries_exhausted|outcome_unknown|hold_expired:(signing_key|kms|audit|db|dns))|cancelled:(consent_revoked|member_erased|member_withdrawn|member_terminated|account_frozen|death_reported|module_withdrawn|partner_form_route))$';

/** ADVISORY (I3): the only partner-provided value stored. ⚠ LOCKSTEP with `marketplace_lead_handoffs_partner_reference_check`. */
export const LEAD_HANDOFF_PARTNER_REFERENCE_PATTERN = '^[A-Za-z0-9_.-]{1,64}$';

export const marketplaceLeadHandoffs = pgTable(
  'marketplace_lead_handoffs',
  {
    /** = the `module.lead_submitted` payload's `lead_id` (caller-minted, lower-case). ⛔ DB default. */
    leadId: uuid('lead_id').primaryKey().$type<ModuleLeadId>(),
    /** Tenant key. ⛔ FK (⛔ `pariwars` table — the 12.1 posture). */
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    /** COMPOSITE FK `(pariwar_id, module_id)` — an FK check ignores RLS, so a single column would let a row name another Pariwar's module. */
    moduleId: uuid('module_id').notNull().$type<ModuleId>(),
    /** = the event's `member_id` (12.1 I11). FK `members(member_id)` ON DELETE no action (a member row is never deleted). */
    memberId: uuid('member_id').notNull().$type<MemberId>(),
    /** The ONE consent that backs THIS lead (`consent_type = 'module_lead_handoff'`, `consent_artifact_ref = lead_id`) — QE2 (A). */
    consentId: uuid('consent_id').notNull().unique('marketplace_lead_handoffs_consent_id_unique').$type<ConsentId>(),
    envelopeVersion: smallint('envelope_version').notNull(),
    /** The sealed fields (QE11 (A)). NULL after W9, W11 or W12; it never comes back (the guard). */
    memberFieldsCiphertext: piiColumn(1, MODULE_LEAD_FIELDS_FIELD_CLASS)('member_fields_ciphertext'),
    status: text('status').notNull().default('due').$type<LeadHandoffStatus>(),
    /** {@link LEAD_HANDOFF_DETAIL_PATTERN}; NULL until the first outcome. */
    outcomeDetail: text('outcome_detail'),
    /** Raised AT THE CLAIM (W2); a hold gives it back (W6 / W7). */
    attemptCount: integer('attempt_count').notNull().default(0),
    /** The backoff (QE6). */
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    /** One per claim — every settle and release is compare-and-set on it. NOT NULL ⇔ `attempting`. */
    claimToken: text('claim_token'),
    /** The lease start. NOT NULL ⇔ `attempting`. */
    claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'date' }),
    /** The start of an unbroken run of holds (W6); the hold expires `MAX_HOLD_MS` after it (W7). */
    heldSince: timestamp('held_since', { withTimezone: true, mode: 'date' }),
    /** ADVISORY (I3) — {@link LEAD_HANDOFF_PARTNER_REFERENCE_PATTERN}, from `X-Partner-Reference` only, else NULL. */
    partnerReference: text('partner_reference'),
    /** NOT NULL ⇔ `delivered`. */
    deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'date' }),
    /** The caller's `module.lead_handoff_recorded` intent line (QE14 (a)). ⛔ FK. */
    auditId: uuid('audit_id').notNull(),
    /** Written in the event's own transaction: the body's `submitted_at` (QE12). */
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    /** Set on every write; the purge's clock (W12). */
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'marketplace_lead_handoffs_module_fk',
      columns: [t.pariwarId, t.moduleId],
      foreignColumns: [marketplaceModules.pariwarId, marketplaceModules.moduleId],
    }).onDelete('no action'),
    foreignKey({
      name: 'marketplace_lead_handoffs_member_fk',
      columns: [t.memberId],
      foreignColumns: [members.memberId],
    }).onDelete('no action'),
    foreignKey({
      name: 'marketplace_lead_handoffs_consent_fk',
      columns: [t.consentId],
      foreignColumns: [consentRecords.consentId],
    }).onDelete('no action'),
    // The claim (S3), ordered `next_attempt_at, updated_at` (TR6).
    index('marketplace_lead_handoffs_due_idx').on(t.nextAttemptAt, t.updatedAt).where(sql`status = 'due'`),
    // The lapse (W10).
    index('marketplace_lead_handoffs_attempting_idx').on(t.claimedAt).where(sql`status = 'attempting'`),
    // The purge (W12).
    index('marketplace_lead_handoffs_purge_idx')
      .on(t.updatedAt)
      .where(sql`member_fields_ciphertext IS NOT NULL AND status IN ('delivered', 'failed_delivery')`),
    index('marketplace_lead_handoffs_pariwar_module_idx').on(t.pariwarId, t.moduleId),
    // Erasure (W11) and 12.3's status read; K-13's "which partners received this member's details".
    index('marketplace_lead_handoffs_pariwar_member_idx').on(t.pariwarId, t.memberId),
    check(
      'marketplace_lead_handoffs_status_check',
      sql`${t.status} IN ('due', 'attempting', 'delivered', 'failed_delivery', 'cancelled')`,
    ),
    check('marketplace_lead_handoffs_envelope_version_check', sql`${t.envelopeVersion} = 1`),
    check('marketplace_lead_handoffs_attempt_count_check', sql`${t.attemptCount} >= 0`),
    check(
      'marketplace_lead_handoffs_claim_token_check',
      sql`${t.claimToken} IS NULL OR char_length(${t.claimToken}) BETWEEN 1 AND 200`,
    ),
    check(
      'marketplace_lead_handoffs_attempting_claim_check',
      sql`(${t.status} = 'attempting') = (${t.claimToken} IS NOT NULL) AND (${t.status} = 'attempting') = (${t.claimedAt} IS NOT NULL)`,
    ),
    check('marketplace_lead_handoffs_delivered_at_check', sql`(${t.status} = 'delivered') = (${t.deliveredAt} IS NOT NULL)`),
    // A cancelled row holds NO fields (`-484` Q4 A; code review 2026-11-22, patch 2): W9, W11 and W14 all write NULL, and the purge never
    // visits a cancelled row — so the database says it too.
    check('marketplace_lead_handoffs_cancelled_fields_check', sql`${t.status} <> 'cancelled' OR ${t.memberFieldsCiphertext} IS NULL`),
    check(
      'marketplace_lead_handoffs_partner_reference_check',
      sql`${t.partnerReference} IS NULL OR ${t.partnerReference} ~ ${sql.raw(`'${LEAD_HANDOFF_PARTNER_REFERENCE_PATTERN}'`)}`,
    ),
    check(
      'marketplace_lead_handoffs_outcome_detail_check',
      sql`${t.outcomeDetail} IS NULL OR ${t.outcomeDetail} ~ ${sql.raw(`'${LEAD_HANDOFF_DETAIL_PATTERN}'`)}`,
    ),
    check(
      'marketplace_lead_handoffs_status_detail_check',
      // ⚠ `IS NOT NULL` in each final branch: `NULL LIKE …` is NULL, and a CHECK that is NULL passes.
      sql`(${t.status} = 'delivered' AND ${t.outcomeDetail} IS NOT NULL AND ${t.outcomeDetail} LIKE 'delivered:%')
        OR (${t.status} = 'failed_delivery' AND ${t.outcomeDetail} IS NOT NULL AND ${t.outcomeDetail} LIKE 'failed_delivery:%')
        OR (${t.status} = 'cancelled' AND ${t.outcomeDetail} IS NOT NULL AND ${t.outcomeDetail} LIKE 'cancelled:%')
        OR (${t.status} IN ('due', 'attempting') AND (${t.outcomeDetail} IS NULL OR ${t.outcomeDetail} ~ '^(released|held|lapsed|requeued):'))`,
    ),
  ],
);

export type MarketplaceLeadHandoffRow = typeof marketplaceLeadHandoffs.$inferSelect;
