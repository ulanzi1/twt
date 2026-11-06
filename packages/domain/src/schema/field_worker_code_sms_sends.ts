// The field-worker CODE SMS send record — Story 13.1b (Task 1; AD1, AD3, AD8; AC1, AC4 (g)), migration 0202.
//
//   · `field_worker_code_sms_sends` — ONE row per worker id: the OUTBOX `activateFieldWorker` writes in the approval's own
//                                     transaction, then the sweep's record of the one text. AT MOST ONCE: a row is claimed (committed)
//                                     BEFORE the gateway call and goes back to `due` only after a definite no. What is KNOWN, ⛔ never
//                                     `delivered` (that is `sms_send_deliveries`, through the CRQID kind `fw`).
//
// The hand-authored half (GRANTs, the per-command policies, FORCE RLS, the guard trigger) lives in 0202. PII: ⛔ name, ⛔ mobile,
// ⛔ code, ⛔ hash. TENANT-ISOLATED; RLS in policies/field-worker-code-sms-sends-rls.ts.

import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { FieldWorkerId, PariwarId } from '../ids/index.js';
import { fieldWorkers } from './field_workers.js';

/**
 * `due` (recorded by the approval, or released: the gateway DEFINITELY did not take it); `attempting` (claimed and committed, the send
 * in flight or crashed); the finals. ⚠ LOCKSTEP with 0202's `field_worker_code_sms_sends_outcome_check`.
 */
export const FIELD_WORKER_CODE_SMS_OUTCOMES = [
  'due',
  'attempting',
  'accepted',
  'rejected_invalid_number',
  'rejected_unreachable',
  'skipped_not_active',
  'error',
] as const;
export type FieldWorkerCodeSmsOutcome = (typeof FIELD_WORKER_CODE_SMS_OUTCOMES)[number];

/** ⚠ LOCKSTEP with 0202's `field_worker_code_sms_sends_locale_check`. */
export const FIELD_WORKER_CODE_SMS_LOCALES = ['hi', 'en'] as const;
export type FieldWorkerCodeSmsLocale = (typeof FIELD_WORKER_CODE_SMS_LOCALES)[number];

/**
 * What an officer reads on the list (AD12): five words and a null. ⚠ RE-DECLARED in `packages/contracts/src/field-workers/enums.ts`
 * (the bundle boundary), a test-only sync guard pins the two. The derivation is `deriveFieldWorkerCodeSmsStatus`.
 */
export const FIELD_WORKER_CODE_SMS_STATUSES = ['sending', 'sent', 'delivered', 'not_delivered', 'not_confirmed'] as const;
export type FieldWorkerCodeSmsStatus = (typeof FIELD_WORKER_CODE_SMS_STATUSES)[number];

/**
 * ⭐ The GRAMMAR of `detail`: every value the sweep writes, ⛔ anything else (⛔ a space, ⛔ `+`, ⛔ a run of 6+ digits, so neither a
 * code nor a mobile can rest here as a contiguous run of digits — TR9; ⚠ one split by `.`, `_`, `-` or a letter is not barred, as on every SMS kind:
 * code review CB52, deferred CB60). A gateway `<code>` is `[A-Za-z0-9_.-]{1,64}`. ⚠ LOCKSTEP with
 * `field_worker_code_sms_sends_detail_vocabulary_check` (0202; the policy spec pins the two equal) and asserted by the writers.
 * ⛔ Backslashes — the same string must read the same in a JS `RegExp` and a PG ARE.
 */
export const FIELD_WORKER_CODE_SMS_DETAIL_PATTERN =
  '^(?!.*[0-9]{6})(exhausted:(expired|attempts|outcome_unknown(:(api_unavailable|unknown):[A-Za-z0-9_.-]{1,64})?)|config:[A-Za-z0-9_.-]{1,64}|config_unavailable:secret_manager|no_code|identity_unreadable:(envelope|key_rejected|authentication)|api_unavailable:(kms|audit|db)|(rate_limited|invalid_number|carrier_reject|auth|dlt_template_not_approved|unknown):[A-Za-z0-9_.-]{1,64})$';

export const fieldWorkerCodeSmsSends = pgTable(
  'field_worker_code_sms_sends',
  {
    /** The CRQID's row id (kind `fw` — DR3). */
    sendId: uuid('send_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    fieldWorkerId: uuid('field_worker_id').notNull().$type<FieldWorkerId>(),
    /** The `field_worker.activated` audit line — how a decrypt line is followed back to the approver (AD5). */
    activatedAuditId: uuid('activated_audit_id').notNull(),
    outcome: text('outcome').notNull().default('due').$type<FieldWorkerCodeSmsOutcome>(),
    /** {@link FIELD_WORKER_CODE_SMS_DETAIL_PATTERN}. ⛔ Never PII, ⛔ provider free text. Read for the status, ⛔ on the wire. */
    detail: text('detail'),
    /** MSG91's request id — REQUIRED on `accepted` (the correlator matches the report by it). */
    providerMessageId: text('provider_message_id'),
    /** One per claim (`randomUUID`) — settle and release are compare-and-set on it. */
    claimToken: text('claim_token'),
    /** The language the text was prepared in: the Pariwar's default at send (AD10). */
    locale: text('locale').$type<FieldWorkerCodeSmsLocale>(),
    /** Rises at each claim. */
    attemptCount: integer('attempt_count').notNull().default(0),
    /** The max age's clock (a release ⛔ moves it). */
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
    /** The lease's and the backoff's clock. */
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    unique('field_worker_code_sms_sends_pariwar_worker_uq').on(t.pariwarId, t.fieldWorkerId),
    foreignKey({
      name: 'field_worker_code_sms_sends_worker_fk',
      columns: [t.pariwarId, t.fieldWorkerId],
      foreignColumns: [fieldWorkers.pariwarId, fieldWorkers.fieldWorkerId],
    }).onDelete('no action'),
    index('field_worker_code_sms_sends_open_idx').on(t.updatedAt, t.sendId).where(sql`"outcome" IN ('due', 'attempting')`),
    check(
      'field_worker_code_sms_sends_outcome_check',
      sql`${t.outcome} IN ('due', 'attempting', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'skipped_not_active', 'error')`,
    ),
    check('field_worker_code_sms_sends_locale_check', sql`${t.locale} IN ('hi', 'en')`),
    check('field_worker_code_sms_sends_attempt_count_check', sql`${t.attemptCount} >= 0`),
    check('field_worker_code_sms_sends_claim_token_check', sql`${t.claimToken} IS NULL OR char_length(${t.claimToken}) BETWEEN 1 AND 200`),
    check('field_worker_code_sms_sends_attempting_token_check', sql`${t.outcome} <> 'attempting' OR ${t.claimToken} IS NOT NULL`),
    check('field_worker_code_sms_sends_accepted_provider_id_check', sql`${t.outcome} <> 'accepted' OR ${t.providerMessageId} IS NOT NULL`),
    check('field_worker_code_sms_sends_detail_length_check', sql`${t.detail} IS NULL OR char_length(${t.detail}) <= 200`),
    check(
      'field_worker_code_sms_sends_detail_vocabulary_check',
      sql`${t.detail} IS NULL OR ${t.detail} ~ ${sql.raw(`'${FIELD_WORKER_CODE_SMS_DETAIL_PATTERN}'`)}`,
    ),
  ],
);

export type FieldWorkerCodeSmsSendRow = typeof fieldWorkerCodeSmsSends.$inferSelect;
