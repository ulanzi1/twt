// Member-identity write accessor — Story 3.6a (Task 3; AC1).
//
// The signup flow is the SOLE writer of `member_identities` (the schema header: "Mobile is written
// by the signup flow (Story 3.6) in-scope"). `insertMemberIdentity` writes the one identity row a
// new member gets: the Tier-1 envelope of the normalized mobile + its deterministic blind index +
// the tenant scope. It runs INSIDE the same member scope-tx as the `member.signup_initiated` event
// (which creates the `members` row the FK references) — so a member can never exist without its
// identity row, and the FK + RLS see the members row written moments earlier in the same tx.
//
// ── Transaction contract ──────────────────────────────────────────────────────
// Runs its statement DIRECTLY on the passed `db` (no own transaction) — RLS scope (`SET LOCAL
// app.pariwar_id`) is transaction-scoped, so the caller is already inside the scope-tx (the
// signup-create handler opens it). Mirrors the consent/medical accessors' contract.
//
// ── Conflict surfacing (the duplicate-signup race) ────────────────────────────
// The `member_identities_pariwar_mobile_uq` unique index (one mobile = one member per Pariwar) is
// the structural backstop. The handler runs a pre-check for the clean 409, but two concurrent
// signups for the same mobile can both pass it; `isMemberIdentityDuplicate(err)` lets the handler
// map the resulting 23505 to the same clean `auth.member_already_exists` rather than a raw 500.

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { memberIdentities } from '../schema/member_identities.js';

export interface InsertMemberIdentityInput {
  memberId: MemberId;
  pariwarId: PariwarId;
  /** Tier-1 envelope ciphertext (serialized) of the normalized mobile. */
  mobileCiphertext: string;
  /** Deterministic HMAC blind index of the normalized mobile (the login lookup key). */
  mobileBlindIndex: string;
}

/** Insert the new member's identity row (the signup flow's second write, in the scope-tx). */
export async function insertMemberIdentity(db: Db, input: InsertMemberIdentityInput): Promise<void> {
  await db.insert(memberIdentities).values({
    memberId: input.memberId,
    pariwarId: input.pariwarId,
    mobileCiphertext: input.mobileCiphertext,
    mobileBlindIndex: input.mobileBlindIndex,
  });
}

/** The Postgres unique-violation SQLSTATE for the per-Pariwar mobile uniqueness index. */
const UNIQUE_VIOLATION = '23505';

/**
 * True iff `err` is the `member_identities` per-Pariwar-mobile unique violation — the signpost the
 * signup-create handler uses to convert a duplicate-signup race into a clean 409.
 */
export function isMemberIdentityDuplicate(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}
