// Story 6.39a — the finance officer's BANK DATE for a joining fee recorded after the death (Task 3.1; DL3, DL5, DL9, DL10).
//
// `2026-11-21-473` Q2 B: *"Staff may use the bank's date when the Trust's own bank statement shows the money arrived
// before the death; they record that they did, with a reason, and it is audited."* Built `2026-11-27-510`; the edges
// ruled `2026-11-27-511` (Q1 B, Q2 A, Q3 A, Q4 A).
//
// ⭐ The request carries the payment reference EXACTLY as the Trust's statement shows it: the server compares it with the
// joining payment's stored reference and then DROPS it — ⛔ stored, ⛔ logged, ⛔ echoed (N3, TR5). The response and the
// list carry ⛔ name, ⛔ date of death and ⛔ the check's fee outcome (N2 — `same_day` beside a bank date IS the date of
// death).
// ⚠ MIRRORED, ⛔ imported: the domain owns every tuple below (`@twt/domain` — `schema.FEE_BANK_DATE_REASON_CODES`,
// `schema.MEMBERSHIP_CHECK_FEE_DATE_SOURCES`, `claim.FEE_BANK_DATE_REFUSAL_REASONS`); contracts ⛔ never imports
// `@twt/domain` (the browser-bundle rule; a turbo cycle). `packages/contracts/tests/claims-fee-bank-date.test.ts` pins each
// pair equal. ALL objects `.strict()`.

import { z } from 'zod';

/**
 * ⭐ DL9 — the step-up context the POST requires FRESH (after the permission hook). The ONE constant the route AND the
 * admin caller import (step-up contexts have ⛔ registry). ⚠ In production ⛔ admin step-up code is delivered until
 * deferral R4 is discharged (roster Row 58 leg (e)).
 */
export const FEE_BANK_DATE_STEP_UP_CONTEXT = 'fee_bank_date';

/** Why the recorded fee date is wrong (DL5 (d)). */
export const FEE_BANK_DATE_REASON_CODES = ['recorded_late_by_member', 'recorded_by_family_after_death', 'other'] as const;
export const FeeBankDateReasonCode = z.enum(FEE_BANK_DATE_REASON_CODES);
export type FeeBankDateReasonCode = z.output<typeof FeeBankDateReasonCode>;

/** The route-level refusal codes, `fee_bank_date.<reason>` (the admin maps each to its approved line — DL11). */
export const FEE_BANK_DATE_REFUSAL_REASONS = [
  'not_found',
  'window_closed',
  'not_held',
  'no_fee_receipt',
  'reference_mismatch',
  'in_future',
  'before_joining',
  'invalid_reason',
  'stale',
  'missing_display',
] as const;
export type FeeBankDateRefusalReason = (typeof FEE_BANK_DATE_REFUSAL_REASONS)[number];
export const FEE_BANK_DATE_CODE_PREFIX = 'fee_bank_date.';

/** Is `code` a `fee_bank_date.<reason>` code? Returns the reason, or `null`. */
export function feeBankDateRefusalReasonOf(code: unknown): FeeBankDateRefusalReason | null {
  if (typeof code !== 'string' || !code.startsWith(FEE_BANK_DATE_CODE_PREFIX)) return null;
  const reason = code.slice(FEE_BANK_DATE_CODE_PREFIX.length);
  return (FEE_BANK_DATE_REFUSAL_REASONS as readonly string[]).includes(reason) ? (reason as FeeBankDateRefusalReason) : null;
}

/**
 * Which fee date the membership check compared (DL6) — the membership check's own vocabulary, mirrored here for the list.
 * ⚠ The SAME tuple as `MEMBERSHIP_CHECK_FEE_DATE_SOURCES` in `membership-check.ts` (pinned there).
 */
const FEE_DATE_SOURCES = ['recorded', 'bank'] as const;

/**
 * A payment reference as the UPI / NEFT form admits it — the SAME regex as the payment confirm
 * (`payments/vyawastha-shulk.ts`): 12 digits, or 22 letters and digits. ⚠ The message is STATIC — a Zod issue for it
 * carries ⛔ input value (TR5).
 */
export const STATEMENT_REFERENCE_RE = /^\d{12}$|^[A-Za-z0-9]{22}$/;

/** A `YYYY-MM-DD` that is a REAL calendar date (2026-02-30 is refused) — UTC-anchored, as the domain's `isRealCalendarDate`. */
function isRealCalendarDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}
const RealDate = z.string().refine(isRealCalendarDateString, 'a real YYYY-MM-DD calendar date');
const DateShape = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'a YYYY-MM-DD calendar date');

/** `POST …/admin/claims/:claimCaseId/fee-bank-date` — behind the `FEE_BANK_DATE_STEP_UP_CONTEXT` step-up. */
export const FeeBankDateRequest = z
  .object({
    /**
     * The payment reference EXACTLY as the Trust's statement shows it. Trimmed FIRST (the anchored regex alone would 400 a
     * trailing space before the server could trim it — DL10); compared with the stored one, letters without regard to case
     * (DL3). ⛔ Stored, ⛔ logged.
     */
    statement_reference: z.string().trim().regex(STATEMENT_REFERENCE_RE, 'a payment reference is 12 digits or 22 letters and digits'),
    /** The date the money arrived, as the statement shows it. Re-asserted by the writer (⛔ in the future, ⛔ before joining). */
    bank_credit_date: RealDate,
    reason_code: FeeBankDateReasonCode,
    /** Which statement — account, period, line — and what was seen. REQUIRED (Q2 B: "with a reason"). Tier-1 at rest. */
    note: z.string().trim().min(1).max(2000),
    /** The live check the finance officer saw (the list row's) — REQUIRED, `null` = none. */
    expected_live_check_id: z.string().uuid().nullable(),
    /** The live bank-date record the finance officer saw — REQUIRED, `null` = none. */
    expected_live_record_id: z.string().uuid().nullable(),
  })
  .strict();
export type FeeBankDateRequest = z.output<typeof FeeBankDateRequest>;

export const FeeBankDateWriteResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    record_id: z.string().uuid(),
    superseded_record_id: z.string().uuid().nullable(),
    event_version: z.number().int().positive(),
  })
  .strict();
export type FeeBankDateWriteResponse = z.output<typeof FeeBankDateWriteResponse>;

/** A claim's live bank-date record, as the finance officer's list shows it (⛔ the note). */
export const FeeBankDateLiveRecord = z
  .object({
    record_id: z.string().uuid(),
    bank_credit_date: DateShape,
    reason_code: FeeBankDateReasonCode,
    recorded_by_display: z.string(),
    recorded_at: z.string().datetime(),
  })
  .strict();
export type FeeBankDateLiveRecord = z.output<typeof FeeBankDateLiveRecord>;

/** One row of the list. ⛔ Name, ⛔ date of death, ⛔ the check's fee outcome (N2). */
export const FeeBankDateListRow = z
  .object({
    claim_case_id: z.string().uuid(),
    /** The deceased's latest posting district (plaintext) — may be absent. */
    latest_posting_district: z.string().nullable(),
    /** The joining payment's RECORDED date, Indian calendar. */
    recorded_fee_date: DateShape,
    amount_inr: z.number().int(),
    /** The stored reference's last four — ⛔ the whole reference (DL3: the typed one is a real check, ⛔ a copy). */
    reference_last4: z.string(),
    fee_date_source: z.enum(FEE_DATE_SOURCES),
    expected_live_check_id: z.string().uuid(),
    expected_live_record_id: z.string().uuid().nullable(),
    live_record: FeeBankDateLiveRecord.nullable(),
  })
  .strict();
export type FeeBankDateListRow = z.output<typeof FeeBankDateListRow>;

/** `GET …/admin/fee-bank-dates` — the two sections (DL10), each capped on its own. */
export const FeeBankDateListResponse = z
  .object({
    /** In the window, the live check holds the claim on its fee. */
    held: z.array(FeeBankDateListRow),
    /** In the window, a live record exists and the check's fee half now passes (listed so a wrong date can be corrected). */
    recorded: z.array(FeeBankDateListRow),
    held_truncated: z.boolean(),
    recorded_truncated: z.boolean(),
  })
  .strict();
export type FeeBankDateListResponse = z.output<typeof FeeBankDateListResponse>;

export const FeeBankDateListQuery = z
  .object({
    /** Each section's cap (default 50, max 200 — clamped by the domain read). */
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();
export type FeeBankDateListQuery = z.output<typeof FeeBankDateListQuery>;
