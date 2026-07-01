// member_addresses accessors — Story 3.9 (Task 2).
//
// The Life Events address-update write (APPEND a NEW row — append-only history; AC1 "prior value
// preserved") + the latest-address read (presence/summary for the panel). TENANT-scoped (RLS
// `withCheck` enforces the caller's `app.pariwar_id` matches `pariwarId`); runs its statement
// DIRECTLY on the passed (scoped) `db`, so a scoped caller is already inside the `SET LOCAL
// app.pariwar_id` transaction (the member_medical_disclosures write precedent).
//
// ── Encryption is an APP-LAYER concern (the route does it) ─────────────────────────────────
// `insertMemberAddress` takes ALREADY-SERIALIZED Tier-1 envelope ciphertext (`addressLineCiphertext`)
// + the NON-PII `locale` — it NEVER encrypts. The route encrypts under the member's real `pariwarId`
// context and passes the ciphertext in. NO HTTP, NO audit, NO event emission here — the route
// orchestrates (mirror appendMedicalDisclosure).

import { desc, and, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { type MemberAddressRow, memberAddresses } from '../schema/member_addresses.js';

/** One pre-encrypted address row to append (the locale is server-validated NON-PII metadata). */
export interface InsertMemberAddressInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  /** Tier-1 envelope ciphertext (serialized) of the member's address line (always set). */
  addressLineCiphertext: string;
  /** Which locale the form was filled in ('hi' | 'en'). NON-PII. */
  locale: string;
}

/**
 * Append ONE new address row (append-only history — NO delete of prior rows; AC1). Runs in the
 * caller's single scope tx (the event append runs in the same tx, so a later throw rolls the whole
 * update back). Returns the inserted row. Tenant-scoped.
 */
export async function insertMemberAddress(
  db: Db,
  input: InsertMemberAddressInput,
): Promise<MemberAddressRow> {
  const inserted = await db
    .insert(memberAddresses)
    .values({
      memberId: input.memberId,
      pariwarId: input.pariwarId,
      addressLineCiphertext: input.addressLineCiphertext,
      locale: input.locale,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error('[insertMemberAddress] insert returned no row — check session scope');
  }
  return row;
}

/**
 * Resolve a member's CURRENT (newest) address row within a Pariwar, or `null` when none exists.
 * The current address is simply the newest row by `created_at` (append-only history). Tenant-scoped
 * (RLS + the explicit predicate). Returns the row with its ciphertext AS STORED — the caller maps
 * it to a NON-PII presence summary (never decrypts / echoes the bytes).
 */
export async function getMemberAddressLatest(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<MemberAddressRow | null> {
  const rows = await db
    .select()
    .from(memberAddresses)
    .where(and(eq(memberAddresses.pariwarId, pariwarId), eq(memberAddresses.memberId, memberId)))
    .orderBy(desc(memberAddresses.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
