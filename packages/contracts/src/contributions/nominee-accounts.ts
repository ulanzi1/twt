// packages/contracts/src/contributions/nominee-accounts.ts
//
// Story 9.9 — the donor-facing nominee-payment-destinations READ contract. The contributing member (donor)
// sees the nominee's (up to two) EQUAL bank accounts — each labeled by bank name, with the nominee's name +
// full banking details — and picks which one to pay. Sibling of `upi-intent.ts` (8.4/8.13): same `.strict()`
// discipline, the SAME no-`.openapi()` posture (bundle-safe — `pay.tsx` imports these types directly and
// `@twt/domain`'s `contribution` barrel drags `pg` into the Metro bundle, so nothing here may import it;
// `[[project_contracts_domain_bundle_boundary]]`), and NO addition to `openapi/v1.yaml`.
//
// ── EQUAL destinations, no primary/secondary (the story's binding scope) ────────────────────────────
// The two accounts are SEMANTICALLY EQUAL payment destinations — the donor's choice, not server routing.
// `rank` (1/2) is a STABLE per-account IDENTITY the donor's selection echoes back (the Story 6.8 composite-PK
// row identity), NEVER a priority: the list order is stable across requests (by rank, for determinism) but
// position carries no meaning and the client must not treat position 1 as a default. There is DELIBERATELY no
// `primary`/`default`/`isPreferred` field — adding one is the change this shape exists to forbid.
//
// ── The banking details are operational payment coordinates, not informational PII ──────────────────
// `accountHolderName` (the NOMINEE name), the FULL `accountNumber`, and `ifsc` are the destination the
// nominee supplied for RECEIVING member contributions — the coordinates the donor needs to complete a
// UPI/NEFT payment (no masking; a masked account# cannot be transferred to). They are stored Tier-1 and
// decrypted only at the API boundary; on a decrypt error the server renders a DISTINCT sentinel string
// (never a 500, never a blank that masquerades as real data — the appeal-crypto precedent). This shape
// carries only the decrypted STRING — the transport can't tell a real value from the sentinel, and it must
// never be logged / put in an event or audit payload.
//
// ── The nominee's UPI ID joined them at Story 8.17 (`2026-09-10-212` cl.2, Trustee-ratified) ────────
// `vpa` is a FIFTH coordinate on this view — OPTIONAL, unmasked, on the same ground as the account number.
// ⚠ It is the ONE field here that is omitted rather than sentinel-ed on a decrypt failure: a sentinel in a
// UPI-ID slot is something a member might try to PAY, so absence is the only safe degrade. `vpaPresent`
// is retained beside it and is NOT redundant — `vpaPresent && vpa === undefined` IS the decrypt-failure
// state, and it is what the pay button reads.

import { z } from 'zod';

import { ContributionAccount } from './upi-intent.js';
import { MyContributionStatus } from './upi-intent.js';

/**
 * The DISTINCT sentinel a Tier-1 decrypt failure renders on any of `NomineeBankAccountView`'s decrypted
 * fields (AC6; the appeal-crypto precedent). Shared between the API (which returns it as a fail-soft field
 * value — `apps/api/src/modules/claims/nominee-bank-crypto.ts`) and the mobile client (which compares
 * against it to detect a per-account TOTAL decrypt failure and show a distinct warning rather than
 * presenting sentinel text as ordinary banking data). NEVER a blank — a blank could masquerade as real data.
 */
export const NOMINEE_BANK_DECRYPT_FAILED_SENTINEL = '[unavailable — could not be shown]';

/**
 * One nominee payment destination (AC1). EQUAL to its sibling — `rank` is a stable identity the donor's
 * selection echoes back, NOT a priority. `bankName` is the Tier-3 plaintext label (no decrypt). The holder
 * name / account# / IFSC are Tier-1, decrypted at the API boundary (or the distinct decrypt-failed sentinel).
 * `vpaPresent` says whether a UPI `pa=` can be built for this account today WITHOUT exposing the VPA itself.
 */
export const NomineeBankAccountView = z
  .object({
    /** The stable per-account identity the donor's selection echoes back (#1/#2) — identity, NOT a priority. */
    rank: ContributionAccount,
    /** The Tier-3 plaintext bank-name label the donor chooses by (no decrypt). */
    bankName: z.string().min(1).max(200),
    /** The NOMINEE (account-holder) name — Tier-1 decrypted (or the distinct decrypt-failed sentinel). Bound
     *  generously — must stay wide enough to fit `NOMINEE_BANK_DECRYPT_FAILED_SENTINEL` on any field. */
    accountHolderName: z.string().min(1).max(200),
    /** The FULL account number — Tier-1 decrypted; unmasked (a masked number can't be transferred to). */
    accountNumber: z.string().min(1).max(100),
    /** The IFSC — Tier-1 decrypted (or the sentinel). No format regex — `ifsc_validated` (Story 6.8) already
     *  covers format validation upstream at collection time; this bound is corrupted-decrypt hardening only. */
    ifsc: z.string().min(1).max(100),
    /** Whether a UPI `pa=` can be built for this account today (VPA presence). RETAINED at Story 8.17
     *  alongside `vpa` below — it is non-PII, it is what the pay button reads, and it stays TRUE for an
     *  account whose VPA decrypt failed soft (where `vpa` is omitted). Presence and plaintext are NOT
     *  redundant: `vpaPresent && vpa === undefined` is precisely the decrypt-failure state. */
    vpaPresent: z.boolean(),
    /**
     * The nominee's UPI ID (VPA) — Tier-1 decrypted at the API boundary, OPTIONAL, and shown to the paying
     * member as a readable payment coordinate.
     *
     * ⭐ **RULED: `#decision-2026-09-10-212` cl.2 (Trustee-ratified, DR + KB)** — the nominee's UPI ID is
     * NOT on the member's drive-detail page; it is ADDED to the PAYMENT screen, where a member is actually
     * asked to pay. cl.2 APPLIES `#decision-2026-09-04-191` cl.1, which had already ruled the VPA *"shown
     * to the logged-in member so they can make the contribution"* — a clause that was read narrowly,
     * recorded as *"already satisfied"* by the pay button, and lapsed for six days.
     * ⇒ the member can pay from whichever app or device they actually use, instead of being locked to one
     * screen at one moment. Unmasked and complete, on the SAME ground as `accountNumber` above: a masked
     * VPA cannot be paid to either.
     *
     * ⛔ **ABSENT, NEVER NULL.** `vpa_ciphertext` is nullable BY DESIGN — a nominee without a UPI ID is a
     * FIRST-CLASS state (it is an optional field at claim-time intake), never an error and never a gap.
     * The key is OMITTED in that case, and the screen omits the row: no placeholder, no error copy.
     * The same omission is the fail-soft for a decrypt failure — ⛔ this field NEVER carries
     * `NOMINEE_BANK_DECRYPT_FAILED_SENTINEL`, because a UPI ID that failed to decrypt must not be
     * presented as something the member could type into a payment app.
     *
     * ⛔ **THIS IS THE DONOR VIEW ONLY.** The module-private `NomineeBankAccountView` in
     * `claims/nominee-bank.ts` — staff/nominee eyes at claim time — carries NO `vpa`; cl.2 does not reach
     * it, and adding one there would be a NEW disclosure nobody has ruled.
     * ⛔ Like every decrypted value in this shape: NEVER logged, NEVER in an event or audit payload.
     */
    vpa: z.string().min(1).max(255).optional(),
  })
  .strict();
export type NomineeBankAccountView = z.output<typeof NomineeBankAccountView>;

/**
 * Why no nominee accounts can be listed (AC1) — a first-class ABSENCE, never a 404/throw:
 *   · `unassigned`             — the member is not an `active` member assigned to a `live`-cycle pool.
 *   · `accounts_not_collected` — the assigned pool's claim has no nominee bank accounts collected yet
 *                                (also what a cross-tenant `claimCaseId` resolves to — tenant-scoped empty).
 */
export const NomineeAccountsUnavailableReason = z.enum(['unassigned', 'accounts_not_collected']);
export type NomineeAccountsUnavailableReason = z.output<typeof NomineeAccountsUnavailableReason>;

/** The listed nominee destinations (AC1) — 1 or 2 EQUAL accounts, stable order by `rank` (no priority). */
export const NomineeAccountsAvailable = z
  .object({
    available: z.literal(true),
    /** 1 or 2 EQUAL accounts, stable order by `rank`. Position carries NO priority — the donor chooses. */
    accounts: z.array(NomineeBankAccountView).min(1).max(2),
    /** The member's OWN attestation state (mirrors the intent contract) — lets `/pay` route an already-
     *  attested member (even an out-of-band payer, 8.10) straight to confirmation without a needless choice. */
    myContribution: MyContributionStatus,
  })
  .strict();
export type NomineeAccountsAvailable = z.output<typeof NomineeAccountsAvailable>;

/** The first-class ABSENCE state (AC1) — never a 404/throw. */
export const NomineeAccountsUnavailable = z
  .object({
    available: z.literal(false),
    reason: NomineeAccountsUnavailableReason,
    /** Carried on the absence branch too (the intent-contract precedent) — a member can be unassigned/
     *  accounts-less AND already `attested`. */
    myContribution: MyContributionStatus,
  })
  .strict();
export type NomineeAccountsUnavailable = z.output<typeof NomineeAccountsUnavailable>;

/** `GET /api/v1/member/contribution/nominee-accounts` response — the discriminated union on `available`. */
export const NomineeAccountsResponse = z.discriminatedUnion('available', [
  NomineeAccountsAvailable,
  NomineeAccountsUnavailable,
]);
export type NomineeAccountsResponse = z.output<typeof NomineeAccountsResponse>;
