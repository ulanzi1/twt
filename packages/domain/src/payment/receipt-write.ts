// vyawastha_shulk_receipts write accessor — Story 3.6b (Task 2).
//
// The confirm write: persist ONE signup-fee receipt (AR-67 indefinite retention). Runs its INSERT
// DIRECTLY on the passed (scoped) `db`, so a scoped caller is already inside the `SET LOCAL
// app.pariwar_id` transaction (the member_medical_disclosures write precedent). NO HTTP, NO audit, NO
// event emission — the handler orchestrates those.
//
// ── Idempotency on `tr` (AC1) ─────────────────────────────────────────────────────────────────────
// `tr` carries a UNIQUE constraint. A re-confirm with the same `tr` raises a 23505; the caller treats
// it as the idempotent re-confirm path (load the existing receipt + re-evaluate lock-in WITHOUT a
// second insert or re-emit). `isReceiptTrDuplicate` narrows 23505 to EXACTLY the
// `vyawastha_shulk_receipts_tr_uq` constraint name (mirror 3.6a's isMemberIdentityDuplicate P9
// narrowing — so any other unique violation is NOT silently swallowed).

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import {
  type VyawasthaShulkReceiptRow,
  vyawasthaShulkReceipts,
} from '../schema/vyawastha_shulk_receipts.js';

/** The Postgres unique-violation SQLSTATE. */
const UNIQUE_VIOLATION = '23505';
/** The `tr` UNIQUE constraint name (matches the 0027 migration). */
const TR_CONSTRAINT = 'vyawastha_shulk_receipts_tr_uq';
/** The `(pariwar_id, utr)` UNIQUE constraint name (matches the 0029 migration). */
const PARIWAR_UTR_CONSTRAINT = 'vyawastha_shulk_receipts_pariwar_utr_uq';

/** Read {code, constraint} off a pg error, whether raw or wrapped by Drizzle in `.cause`. */
function pgViolation(err: unknown): { code?: unknown; constraint?: unknown } {
  if (typeof err !== 'object' || err === null) return {};
  const e = err as { code?: unknown; constraint?: unknown; cause?: unknown };
  // Drizzle (≥0.30) wraps the driver error in `.cause`; older paths expose code/constraint directly.
  if (e.code === undefined && typeof e.cause === 'object' && e.cause !== null) {
    return e.cause as { code?: unknown; constraint?: unknown };
  }
  return e;
}

/**
 * True iff `err` is the `vyawastha_shulk_receipts_tr_uq` unique violation — the signpost the confirm
 * handler uses to convert a same-`tr` re-confirm into the idempotent path. Checks the constraint NAME
 * so any other unique violation on the table is not silently swallowed (mirror 3.6a's narrowing).
 */
export function isReceiptTrDuplicate(err: unknown): boolean {
  const v = pgViolation(err);
  return v.code === UNIQUE_VIOLATION && v.constraint === TR_CONSTRAINT;
}

/**
 * True iff `err` is the `vyawastha_shulk_receipts_pariwar_utr_uq` unique violation — the signpost the
 * renewal confirm handler uses to detect a bank UTR already submitted in this pariwar (D2: payment
 * integrity guard). A ConflictError is raised so the member sees a clear "already used" message.
 */
export function isReceiptPariwarUtrDuplicate(err: unknown): boolean {
  const v = pgViolation(err);
  return v.code === UNIQUE_VIOLATION && v.constraint === PARIWAR_UTR_CONSTRAINT;
}

/** One receipt to persist (amount/validThrough are SERVER-derived — the handler stamps them). */
export interface InsertVyawasthaShulkReceiptInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  /** The server-minted UPI Intent transaction-ref — the idempotency key. */
  tr: string;
  /** The member's self-attested UTR. */
  utr: string;
  /** Whole INR (server-authoritative; v1 = 110). */
  amountInr: number;
  /** v1 always 'upi_intent'. */
  paymentMethod: string;
  /** paid_at + 1 year (the handler computes it from the clock). */
  validThrough: Date;
}

/**
 * Insert a Vyawastha Shulk receipt within the caller's scope tx. Returns the inserted row. On the `tr`
 * UNIQUE violation the raw 23505 propagates — the caller catches it via `isReceiptTrDuplicate` and
 * runs the idempotent re-confirm path. Tenant-scoped (RLS `withCheck` enforces `app.pariwar_id`).
 */
export async function insertVyawasthaShulkReceipt(
  db: Db,
  input: InsertVyawasthaShulkReceiptInput,
): Promise<VyawasthaShulkReceiptRow> {
  const inserted = await db
    .insert(vyawasthaShulkReceipts)
    .values({
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      tr: input.tr,
      utr: input.utr,
      amountInr: input.amountInr,
      paymentMethod: input.paymentMethod,
      validThrough: input.validThrough,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[insertVyawasthaShulkReceipt] insert returned no row — check session scope');
  }
  return row;
}
