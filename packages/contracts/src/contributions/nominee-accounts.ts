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
    /** Whether a UPI `pa=` can be built for this account today (VPA presence — the VPA itself is NEVER sent). */
    vpaPresent: z.boolean(),
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
