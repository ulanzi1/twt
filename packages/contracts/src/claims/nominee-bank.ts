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

import { EnglishScriptName } from '../_common/primitives.js';
import { NAME_DIFFERENCE_NOTE_MAX_CHARS } from './nominee-name-check.js';

/**
 * The RBI IFSC shape RE-DECLARED as a wire constant (value-aligned with `@twt/platform-adapters`
 * IFSC_REGEX — contracts cannot depend on platform-adapters, the ground-inspection wire-enum
 * precedent). 4-letter bank code + a literal `0` + a 6-char alphanumeric branch code. The server
 * re-asserts this before the bank lookup (never trust the client).
 */
export const NOMINEE_BANK_IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/**
 * The NPCI UPI VPA (`handle@psp`) shape RE-DECLARED as a wire constant (Story 8.13 — the
 * `NOMINEE_BANK_IFSC_REGEX` precedent: contracts MUST NOT import `@twt/domain` /
 * `@twt/platform-adapters`, the browser-bundle rule). A handle of allowed chars, a literal `@`, and
 * a PSP token starting with a letter. Mirrored client-side (`apps/mobile/lib/nominee-bank-vpa.ts`)
 * and re-asserted server-side before encryption (never trust the client). This is the PAYEE
 * (nominee) VPA — the `pa=` money-in destination — NOT the Story 9.4 sender (member) VPA.
 */
export const NOMINEE_BANK_VPA_REGEX = /^[A-Za-z0-9.\-_]{2,256}@[A-Za-z][A-Za-z0-9.\-_]{1,63}$/;

/**
 * An Indian bank account number: 9–18 digits (the RBI CBS range; digits only).
 *
 * ⭐ EXPORTED 2026-09-22 (code review). Its sibling `NOMINEE_BANK_IFSC_REGEX` was already a wire
 * constant that the clients import; this one was module-private, so `BankDetailsCard` and the
 * mobile form each HAND-COPIED it. ⚠ Two copies of a validation rule is ⛔ not duplication as a
 * style problem — it is a rule that can DRIFT: the day the server widens or narrows the range, a
 * number the boundary accepts starts being refused in the console (or worse, the reverse, and the
 * family is told their details are fine right up until the write fails).
 */
export const NOMINEE_BANK_ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

/**
 * One disbursement account the filer types. NO `nomineeRank` / nominee linkage (D1 APPROVED — the
 * two accounts are a claim-scoped dual-account disbursement channel, not one-per-nominee). The
 * PII fields are encrypted server-side; the bank name/branch is resolved server-side from the IFSC
 * (not carried on the request — the client only supplies what the filer types). `vpa` is OPTIONAL
 * (Story 8.13) — the nominee's own UPI VPA for the `pa=` payee; a missing VPA is a first-class
 * state (the account#+IFSC disbursement path is unaffected and VPA never gates the claim lifecycle).
 */
export const NomineeBankAccountEntry = z
  .object({
    // Story 6.18 (AC12), `2026-09-20-227` cl.9 — captured in ENGLISH script so it can be compared
    // with the declared nominee's name without transliterating. ⛔ INPUT-ONLY: this predicate must
    // NEVER reach an output schema (responses are serializer-parsed; see the predicate's doc-block).
    accountHolderName: EnglishScriptName,
    accountNumber: z.string().regex(NOMINEE_BANK_ACCOUNT_NUMBER_REGEX, 'account number must be 9–18 digits'),
    ifsc: z.string().regex(NOMINEE_BANK_IFSC_REGEX, 'IFSC must match the RBI format (e.g. SBIN0000001)'),
    vpa: z.string().trim().regex(NOMINEE_BANK_VPA_REGEX, 'UPI ID must look like name@bank').optional(),
    /**
     * Story 6.18 (AC7) — the filer's OPTIONAL note to the District Admin explaining a clerical
     * difference between this account's holder name and the nominee the member declared.
     * `2026-09-19-226` cl.2: *"A clerical difference (an initial, a married name, a bank's shortened
     * name) in form can be submitted with note to District Admin."*
     * ⭐ OPTIONAL by ruling, ⛔ never required: cl.2 PERMITS a note, it does not oblige one, and a
     * missing note must ⛔ never block a filing or a check.
     * ⚠ Tier-1 PII — encrypted server-side, and read back ONLY through the AC2 nominee-name-check
     * DTO. ⛔ Never echoed by the presence view, ⛔ never in a log, event, audit line or error body.
     */
    nameDifferenceNote: z.string().trim().min(1).max(NAME_DIFFERENCE_NOTE_MAX_CHARS).optional(),
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
 *
 * ── ⭐ THE ONE NAMED EXCEPTION (Story 6.18, AC2/AC9 — `2026-09-19-226` cl.3/cl.5) ─────────────
 * ⭐ THIS SHAPE IS UNCHANGED and the rule above still binds every schema in THIS file. The
 * exception lives in ONE other place and is named here so a reader meets it at the rule, ⛔ not by
 * discovering a second holder-name echo and assuming the rule rotted:
 *   · `packages/contracts/src/claims/nominee-name-check.ts` — the `NomineeNameCheckResponse` read,
 *     gated on the dedicated key `claim.view_nominee_name_check` at `dimension: 'district'`.
 * ⭐ WHY IT IS PERMITTED, in one line: the Trustee Panel made a NAMED HUMAN read the two names and
 * record whether they match (cl.3), and a duty to compare two strings cannot be discharged without
 * seeing them. The verifier console's own decrypted `deceasedName` is the same posture — an
 * authorized surface decrypts server-side for a person who is entitled to look.
 * ⛔ WHAT THE EXCEPTION DOES **NOT** COVER, and this is the load-bearing half: the account number,
 * the raw IFSC and the VPA stay NEVER-ECHOED on every surface including that one. The exception is
 * for the HOLDER NAME (and the filer's name-difference note) ALONE, because those are the only two
 * fields the ruled-on comparison needs. A future reader widening it to "the account is visible on
 * the check route" would be inventing a disclosure nobody ruled.
 */
const NomineeBankAccountView = z
  .object({
    rank: z.union([z.literal(1), z.literal(2)]),
    bankName: z.string(),
    ifscValidated: z.boolean(),
    holderNamePresent: z.boolean(),
    /** Whether THIS account carries a UPI VPA (Story 8.13) — a NON-PII presence boolean (never the
     *  VPA itself), so the editor + status view can show which accounts can drive a UPI intent. */
    vpaPresent: z.boolean(),
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
    /**
     * Story 6.18 (AC5) — the bank details need correcting: either the District Admin recorded that a
     * holder name does not match the declared nominee (`-226` cl.6), or the Pariwar Admin returned
     * the claim for correction (`-227` cl.10).
     *
     * ⛔⛔ IT IS NOT A DENIAL, AND THE COPY THAT RENDERS IT MUST NOT READ AS ONE. The claim stays
     * open and in its state; the family is being asked to fix a detail. ⛔ It carries NO name and NO
     * reason text — a filer is told WHAT to do, never handed a judgement about whose name is wrong.
     */
    correctionNeeded: z.boolean(),
    /**
     * Can the MEMBER/filer edit the accounts from the app right now?
     *
     * ⚠⚠ IT IS ⛔ NOT THE SAME QUESTION AS `correctionNeeded`, AND CONFLATING THEM PRODUCED A
     * CRUEL SCREEN (code review 2026-09-20). A live return exists at `verifier_approved`,
     * `reversed` or `state_trustee_freeze` — ⛔ none of them a member-writable state. So the app
     * told a grieving family *"please correct the bank details below"*, showed them an editable
     * form, and answered their save with a generic 409 *"could not save"*. `-227` cl.10 never asked
     * the family to do anything: it asks the DISTRICT ADMIN to contact them, take the corrected
     * details and send the claim back up.
     * ⭐ `true` ⇒ show the form and the "correct these" copy. `false` ⇒ say what will happen and
     * ⛔ offer no edit.
     */
    memberEditable: z.boolean(),
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
