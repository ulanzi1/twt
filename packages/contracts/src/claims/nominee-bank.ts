// packages/contracts/src/claims/nominee-bank.ts
//
// Claim-time nominee bank-detail collection transport DTOs (Story 6.8, Task 5). The request/
// response wire shapes for the dual-account (#1/#2) collection consumed by BOTH the member-app
// (Ravi-mode) route and the helpline (operator) route, plus the IFSC-lookup read:
//   · GET  /api/v1/member/claims/ifsc/:ifsc                    → resolve an IFSC (public data)
//   · POST /api/v1/member/claims/:claimCaseId/nominee-bank     → record both accounts (member-app)
//   · POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-bank → record both (helpline)
//
// ── Contracts discipline (the filing.ts precedent) ─────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` OR `@twt/platform-adapters` (the
// browser-bundle rule). So the RBI IFSC format regex is RE-DECLARED here as a wire constant
// (value-aligned with `@twt/platform-adapters` IFSC_REGEX), exactly the CLAIM_LIFECYCLE_STATES
// re-declaration precedent. ALL objects `.strict()`.
//
// ── PII discipline (D6) ────────────────────────────────────────────────────────────────
// The request CARRIES the PII (holder name / account number / IFSC) — it is encrypted server-side
// before persistence. The response NEVER echoes it back: `RecordNomineeBankResponse` is a NON-PII
// PRESENCE view (rank + public bank name + validated flag + a holder-name-present boolean), the
// `NomineeStatusResponse` presence-flag precedent. `IfscLookupResponse` echoes ONLY public,
// IFSC-derived bank/branch data (safe to return).

import { z } from 'zod';

/**
 * The RBI IFSC shape RE-DECLARED as a wire constant (value-aligned with `@twt/platform-adapters`
 * IFSC_REGEX — contracts cannot depend on platform-adapters, the ground-inspection wire-enum
 * precedent). 4-letter bank code + a literal `0` + a 6-char alphanumeric branch code. The server
 * re-asserts this before the bank lookup (never trust the client).
 */
export const NOMINEE_BANK_IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** An Indian bank account number: 9–18 digits (the RBI CBS range; digits only). */
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

/**
 * One disbursement account the filer types. NO `nomineeRank` / nominee linkage (D1 APPROVED — the
 * two accounts are a claim-scoped dual-account disbursement channel, not one-per-nominee). The
 * three fields are PII (encrypted server-side); the bank name/branch is resolved server-side from
 * the IFSC (not carried on the request — the client only supplies what the filer types).
 */
export const NomineeBankAccountEntry = z
  .object({
    accountHolderName: z.string().trim().min(1).max(200),
    accountNumber: z.string().regex(ACCOUNT_NUMBER_REGEX, 'account number must be 9–18 digits'),
    ifsc: z.string().regex(NOMINEE_BANK_IFSC_REGEX, 'IFSC must match the RBI format (e.g. SBIN0000001)'),
  })
  .strict();
export type NomineeBankAccountEntry = z.output<typeof NomineeBankAccountEntry>;

/**
 * Reject two accounts sharing the same account number (case where a filer or operator submits the
 * same payee twice) — the account number is the RBI per-payee-per-day identifier, so a duplicate
 * silently defeats the two-account failover the feature exists for (review finding, 2026-07-11).
 */
function accountNumbersAreDistinct(accounts: readonly NomineeBankAccountEntry[]): boolean {
  return accounts[0]?.accountNumber !== accounts[1]?.accountNumber;
}
const DISTINCT_ACCOUNT_NUMBERS_ISSUE = {
  message: 'the two accounts must have different account numbers',
  path: ['accounts'] as (string | number)[],
};

/**
 * `POST …/nominee-bank` — record EXACTLY TWO complete accounts in ONE atomic request (Task 5
 * RESOLVED — v1 requires both #1 and #2; there is NO "save #1, add #2 later" workflow). The
 * server ranks them #1/#2 by array position and does a latest-wins replace of the claim's pair.
 */
export const RecordNomineeBankRequest = z
  .object({
    accounts: z.array(NomineeBankAccountEntry).length(2),
  })
  .strict()
  .refine((v) => accountNumbersAreDistinct(v.accounts), DISTINCT_ACCOUNT_NUMBERS_ISSUE);
export type RecordNomineeBankRequest = z.output<typeof RecordNomineeBankRequest>;

/**
 * The HELPLINE (authorized-admin) variant. Identical to the member request PLUS an optional
 * `correctionReason` — MANDATORY (server-enforced) only when the claim is in the post-verifier-
 * approval correction window (D3 tier-2); ignored during ordinary pre-approval collection. The
 * member request stays `.strict()` and REJECTS `correctionReason`, so a nominee can never submit a
 * correction (nominee edits are read-only after approval). The reason is NON-PII operator
 * justification (audited) — never a place for names/account data.
 */
export const RecordNomineeBankHelplineRequest = z
  .object({
    accounts: z.array(NomineeBankAccountEntry).length(2),
    correctionReason: z.string().trim().min(1).max(500).optional(),
  })
  .strict()
  .refine((v) => accountNumbersAreDistinct(v.accounts), DISTINCT_ACCOUNT_NUMBERS_ISSUE);
export type RecordNomineeBankHelplineRequest = z.output<typeof RecordNomineeBankHelplineRequest>;

/**
 * The NON-PII presence view of one recorded account (never echo account number / holder name /
 * raw IFSC — the `NomineeStatusResponse` presence-flag precedent). The rank, the public bank
 * name, the validated flag, and a holder-name-present boolean.
 */
const NomineeBankAccountView = z
  .object({
    rank: z.union([z.literal(1), z.literal(2)]),
    bankName: z.string(),
    ifscValidated: z.boolean(),
    holderNamePresent: z.boolean(),
  })
  .strict();

/** The response after recording — always exactly two accounts (Task 5 RESOLVED). */
export const RecordNomineeBankResponse = z
  .object({
    accounts: z.array(NomineeBankAccountView).length(2),
  })
  .strict();
export type RecordNomineeBankResponse = z.output<typeof RecordNomineeBankResponse>;

/**
 * `GET …/nominee-bank` — the presence view of whatever is currently on file (review finding,
 * 2026-07-11): `[]` when nothing has been recorded yet (the AC3 "absence is a signal" posture —
 * never a 404 for "not yet collected"), both accounts once recorded. Lets `<NomineeDetailEditor>`
 * show what's on file before a re-edit, and lets a D3 tier-2 admin correction see what it's
 * correcting instead of blindly overwriting.
 */
export const NomineeBankStatusResponse = z
  .object({
    accounts: z.array(NomineeBankAccountView),
  })
  .strict();
export type NomineeBankStatusResponse = z.output<typeof NomineeBankStatusResponse>;

/**
 * `GET …/claims/ifsc/:ifsc` — the public IFSC-lookup result backing the <NomineeDetailEditor>
 * bank-name autocomplete + pre-validation. Public, non-PII, IFSC-derived — safe to echo. A
 * malformed or unknown IFSC is a dignified 404 (Pattern-4 copy), NOT a body with nulls.
 */
export const IfscLookupResponse = z
  .object({
    ifsc: z.string(),
    bankName: z.string(),
    branch: z.string().nullable(),
  })
  .strict();
export type IfscLookupResponse = z.output<typeof IfscLookupResponse>;
