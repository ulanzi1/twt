// packages/contracts/src/claims/nominee-name-check.ts
//
// The nominee NAME CHECK transport DTOs — Story 6.18 (AC2, AC3).
//   · GET  /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-name-check  → the two-names read
//   · POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-name-check  → the DA's verdict
//
// ── What this surface IS ────────────────────────────────────────────────────────────────────
// `2026-09-19-226` (Trustee-ratified, Dhiraj Rahul + Kalpana Bharti) cl.5: *"System shouldn't act
// for name mismatch at any time, but display/highlight that approved named is mismatched for
// District Admin, Pariwar Admin, Super Admin."* So this surface SHOWS two strings to a person and
// RECORDS what that person decided. ⛔ It NEVER compares them.
//
// ⛔⛔ TRAP 1 — THERE IS NO JOIN, NO MATCH RULE AND NO COMPUTER COMPARISON, ANYWHERE.
// Story 6.8's D1 made the two bank accounts a claim-scoped payment channel with ⛔ no nominee
// linkage (`NomineeBankAccountEntry` carries no `nomineeRank`, deliberately). Nothing here adds
// one. ⛔ No FK, ⛔ no string equality, ⛔ no similarity score, ⛔ no "looks different" hint, ⛔ no
// ordering that implies a pairing. The accounts and the nominees are two INDEPENDENT lists shown
// side by side; a human reads them and a human decides. A future "helpful" auto-match would
// reverse a ratified ruling by way of a DTO edit.
//
// ── Contracts discipline ────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). The verdict and
// clerical-reason wire enums are RE-DECLARED here, value-aligned with their domain twins, and
// pinned by a lockstep test (the `cycle-freeze.ts` / `verification-decision.ts` posture).
// Field names are **snake_case** — the Story 6.11 `verification-decision.ts` convention for a claim
// admin WRITE surface, which this pairs with. (⚠ The 6.10 `verifier-console.ts` READ is camelCase;
// the claim admin family genuinely carries both. The story pins snake_case for this pair so the
// read and the write it feeds agree with each other, which matters more than agreeing with a
// neighbour it never exchanges a field with.) ALL objects `.strict()`.
//
// ── PII posture (AC9, Trap 4) ───────────────────────────────────────────────────────────────
// ⭐ This is the ONE NAMED EXCEPTION to `nominee-bank.ts`'s "never echo the holder name" rule, and
// that file names it at the rule. The exception covers the HOLDER NAME and the filer's
// NAME-DIFFERENCE NOTE only.
// ⛔ NEVER on this surface: account number, raw IFSC, VPA, nominee mobile, nominee address.
// ⛔ NEVER anywhere: a name, a HASH of a name, or a note in a log, event payload, audit line, error
// body or cache key. The nominee is a SECOND, LIVING Tier-1 subject — not the deceased — so their
// name is not carried by the claim's own consent posture.
//
// ⚠⚠ WHY THE NAME FIELDS ARE **UNIONS** AND NOT `z.string().nullable()` — a 500 waits for anyone
// who "simplifies" this. `apps/api/src/plugins/zod-openapi/index.ts:24-25` sets a
// `serializerCompiler`, so RESPONSES ARE PARSED against these schemas. A decrypt failure and an
// RTBF-anonymized nominee are both NORMAL, EXPECTED states of a live row, and each must render as
// ITSELF on the console — *"we could not read this"* and *"this person exercised erasure"* are
// different facts and a District Admin must not be shown one as the other. A nullable string
// collapses them into an indistinguishable blank.

import { z } from 'zod';

/** Max length of the filer's per-account note to the District Admin (AC7, `-226` cl.2). */
export const NAME_DIFFERENCE_NOTE_MAX_CHARS = 500;

// ── The verdict vocabulary (AC3) ────────────────────────────────────────────────────────────

/**
 * The District Admin's verdict on ONE account's holder name (value-aligned with the domain
 * `nominee_name_check_verdict` tuple).
 *   · `matches`             — the name is the nominee the member declared.
 *   · `clerical_difference` — a difference in FORM only; permitted WITH a selected reason (cl.4).
 *   · `does_not_match`      — sent back for correction (cl.6). ⛔ NEVER a denial.
 */
export const NomineeNameCheckVerdict = z.enum(['matches', 'clerical_difference', 'does_not_match']);
export type NomineeNameCheckVerdict = z.output<typeof NomineeNameCheckVerdict>;

/**
 * The three clerical reasons — `2026-09-19-226` cl.2 names exactly these: *"an initial, a married
 * name, a bank's shortened name"*.
 *
 * ⛔ THERE IS NO `other`, and that is deliberate: cl.6 rules that a difference which is not clerical
 * is SENT BACK for correction, so an escape hatch would let a District Admin approve past the very
 * judgement the ruling asked them to make.
 * ⛔⛔ AND THERE IS NO `transliteration` — `2026-09-20-227` cl.9: *"No transliteration should not be
 * counted as clerical reason. Please use English Name everywhere to avoid this."* The script problem
 * is solved at CAPTURE (AC12's input-only English-script gate), ⛔ never by tolerating it here.
 */
export const NomineeNameClericalReason = z.enum(['initial', 'married_name', 'bank_shortened_name']);
export type NomineeNameClericalReason = z.output<typeof NomineeNameClericalReason>;

// ── The readable-value unions (see the header) ──────────────────────────────────────────────

/**
 * A Tier-1 field the caller decrypted for this authorized surface. `unreadable` is a real, expected
 * state (a rotated or corrupt envelope) and renders as itself — ⛔ never as an empty name, and
 * ⛔ never as a sentinel string that could be read as a person's name.
 */
export const ReadableName = z.discriminatedUnion('state', [
  z.object({ state: z.literal('readable'), value: z.string() }).strict(),
  z.object({ state: z.literal('unreadable') }).strict(),
]);
export type ReadableName = z.output<typeof ReadableName>;

/**
 * A declared nominee's name. Adds the third state the bank side cannot have: `anonymized`.
 * `packages/domain/src/member/anonymize.ts` writes an ENCRYPTED `'[anonymized]'` on RTBF, so the
 * row decrypts successfully to a literal that is ⛔ NOT a name. Mapping it to `anonymized` is what
 * stops *"[anonymized]"* being rendered as the person the member nominated.
 */
export const ReadableNomineeName = z.discriminatedUnion('state', [
  z.object({ state: z.literal('readable'), value: z.string() }).strict(),
  z.object({ state: z.literal('unreadable') }).strict(),
  z.object({ state: z.literal('anonymized') }).strict(),
]);
export type ReadableNomineeName = z.output<typeof ReadableNomineeName>;

// ── (a) The bank side ───────────────────────────────────────────────────────────────────────

/**
 * One live disbursement account, as the District Admin sees it. ⛔ No account number, ⛔ no raw
 * IFSC, ⛔ no VPA — the check is about the NAME.
 *
 * `account_updated_at` is the staleness token. `claim_nominee_bank_accounts.updated_at` is
 * `defaultNow()` and the writer is delete-then-insert, so ANY edit moves it and the recorded check
 * stops being current (AC3, D5). ⚠ It is an ISO-8601 string on the wire: JS `Date` is millisecond
 * precision and PG `timestamptz` is microsecond, so the comparison is made server-side against the
 * value read back through Drizzle — ⛔ never by re-parsing a client-supplied instant.
 */
export const NomineeNameCheckAccount = z
  .object({
    account_rank: z.union([z.literal(1), z.literal(2)]),
    account_updated_at: z.string(),
    holder_name: ReadableName,
    /** The filer's note (AC7, cl.2). `null` when none was submitted — the common case. */
    name_difference_note: ReadableName.nullable(),
  })
  .strict();
export type NomineeNameCheckAccount = z.output<typeof NomineeNameCheckAccount>;

// ── (b) The declared-nominee side ───────────────────────────────────────────────────────────

/**
 * One nominee the DECEASED MEMBER declared, from `member_nominees` keyed on
 * `claims.deceased_member_id`. ⛔ No mobile, ⛔ no address — neither is needed to read a name.
 *
 * ⚠ `split_pct` and `relationship` are here because they are what lets a human tell two nominees
 * apart when both names are plausible. They are ⛔ NOT a linkage to an account (Trap 1).
 */
export const NomineeNameCheckDeclaredNominee = z
  .object({
    rank: z.number().int(),
    split_pct: z.number().int(),
    relationship: z.string(),
    nominee_name: ReadableNomineeName,
  })
  .strict();
export type NomineeNameCheckDeclaredNominee = z.output<typeof NomineeNameCheckDeclaredNominee>;

// ── (c) The recorded check ──────────────────────────────────────────────────────────────────

/** One account's recorded verdict, as read back. */
export const NomineeNameCheckAccountVerdict = z
  .object({
    account_rank: z.union([z.literal(1), z.literal(2)]),
    account_updated_at: z.string(),
    verdict: NomineeNameCheckVerdict,
    clerical_reason: NomineeNameClericalReason.nullable(),
  })
  .strict();
export type NomineeNameCheckAccountVerdict = z.output<typeof NomineeNameCheckAccountVerdict>;

/**
 * The CURRENT check, or `null`.
 *
 * ⭐ `null` means one of two things that are deliberately ⛔ NOT distinguished on the wire: no check
 * was ever recorded, or the one that was is now STALE (a bank edit or a re-declaration moved a
 * token). Both mean the same thing to every consumer — *the District Admin must look again* — and
 * collapsing them keeps a consumer from treating a stale check as a weak pass.
 * ⛔ A check is NEVER inferred or back-filled: claims decided before this shipped carry none, and
 * they say so rather than being credited with a judgement nobody made.
 */
export const NomineeNameCheckCurrent = z
  .object({
    checked_at: z.string(),
    checked_by_actor_display: z.string(),
    nominee_declaration_token: z.string(),
    accounts: z.array(NomineeNameCheckAccountVerdict),
    /** True when EVERY account's verdict is `matches` or `clerical_difference` (the AC4 gate). */
    passing: z.boolean(),
  })
  .strict();
export type NomineeNameCheckCurrent = z.output<typeof NomineeNameCheckCurrent>;

// ── The read response ───────────────────────────────────────────────────────────────────────

/**
 * The Pariwar Admin's live RETURN, when the claim is under correction (AC11, `-227` cl.10).
 *
 * ⭐ WHY IT RIDES THIS READ instead of a new queue surface: this is where the District Admin acts.
 * cl.10 asks them to *"contact claimant regarding discrepancy and get it corrected"*, then re-check
 * — so the note that tells them WHAT to correct belongs beside the two names they are about to
 * re-read, not on a separate list they must remember to visit.
 *
 * ⛔ `resubmitted` is DERIVED and carries ⛔ no write: it is true once the accounts have been
 * corrected since the return AND a current, passing check exists. There is ⛔ no resubmit route and
 * ⛔ no new key — the District Admin re-checks, and that IS the resubmission.
 */
export const NomineeNameCheckReturn = z
  .object({
    returned_at: z.string(),
    returned_by_actor_display: z.string(),
    /** The Pariwar Admin's note. Tier-1, decrypted for this authorized surface only. */
    note: ReadableName,
    /** Derived — the correction landed and the District Admin has checked again (AC11). */
    resubmitted: z.boolean(),
  })
  .strict();
export type NomineeNameCheckReturn = z.output<typeof NomineeNameCheckReturn>;

/**
 * `GET …/admin/claims/:claimCaseId/nominee-name-check`.
 *
 * ⭐ ABSENCE IS SAID EXPLICITLY, never implied by an empty array (AC2/AC6): `accounts_complete`
 * distinguishes *"this claim has its two accounts"* from *"it does not"*, because a claim filed
 * before `-226` cl.7 made both accounts mandatory WAITS for them — it is ⛔ never refused for it —
 * and the console must say "bank details missing", ⛔ not show a blank panel. `declared_nominees:
 * []` likewise means the member declared NOBODY, which is a fact a District Admin needs stated.
 *
 * ⭐ `nominee_declared_at` beside `claim_filed_at` is a PLAIN PAIR OF DATES with ⛔ no highlight and
 * ⛔ no derived warning. A filer can rewrite the declared nominee after death (the member-app
 * nominee route checks only `withdrawn`/`anonymized`, and a Ravi-mode session IS the deceased's), so
 * both names can come from the same hand. Showing the two dates lets a District Admin SEE that;
 * this story deliberately does ⛔ not fix it, and the hazard stays recorded and open (AC10).
 */
export const NomineeNameCheckResponse = z
  .object({
    claim_case_id: z.string(),
    claim_state: z.string(),
    deceased_member_id: z.string(),
    accounts: z.array(NomineeNameCheckAccount),
    accounts_complete: z.boolean(),
    declared_nominees: z.array(NomineeNameCheckDeclaredNominee),
    nominee_declaration_token: z.string(),
    nominee_declared_at: z.string().nullable(),
    claim_filed_at: z.string(),
    /** The latest check IF it is still current; `null` when there is none **or** when it is stale. */
    current_check: NomineeNameCheckCurrent.nullable(),
    /**
     * A check WAS recorded, but it is no longer current — the accounts or the declaration moved
     * under it (D5 / `-227` cl.12).
     *
     * ⚠⚠ WITHOUT THIS FIELD THE CONSOLE TOLD A LIE (code review 2026-09-20). `current_check` is
     * `null` for BOTH "nobody has ever checked" and "somebody checked and then the details
     * changed", and the console rendered the same copy for each: *"No check has been recorded
     * yet."* Those are different facts and they call for different actions — the second means a
     * colleague DID the work and a correction invalidated it, which is the entire point of D5.
     * ⛔ It is ⛔ NOT a second copy of the check: no verdicts, no reasons, no attribution ride on it.
     */
    latest_check_is_stale: z.boolean(),
    /** Story 6.18 (AC11) — the live return, or `null` when the claim is not under correction. */
    correction_return: NomineeNameCheckReturn.nullable(),
  })
  .strict();
export type NomineeNameCheckResponse = z.output<typeof NomineeNameCheckResponse>;

// ── The write request (AC3) ─────────────────────────────────────────────────────────────────

/**
 * One account's verdict as the District Admin submits it.
 *
 * ⭐ THE BOUNDARY RULE, and it runs BOTH WAYS (`-226` cl.5 — *"District Admin cannot proceed unless
 * reason for name mismatch is selected"*):
 *   · `clerical_difference` REQUIRES a `clerical_reason`;
 *   · every other verdict FORBIDS one.
 * The second half matters as much as the first: a reason attached to `matches` would put a
 * "difference" on the record for a claim the District Admin said had none, and AC8's highlight
 * reads exactly that field.
 */
export const NomineeNameCheckEntry = z
  .object({
    account_rank: z.union([z.literal(1), z.literal(2)]),
    account_updated_at: z.string(),
    verdict: NomineeNameCheckVerdict,
    clerical_reason: NomineeNameClericalReason.optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.verdict === 'clerical_difference' && val.clerical_reason === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clerical_reason'],
        message: 'a clerical reason must be selected for a clerical difference',
      });
    }
    if (val.verdict !== 'clerical_difference' && val.clerical_reason !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clerical_reason'],
        message: 'a clerical reason is only valid for a clerical difference',
      });
    }
  });
export type NomineeNameCheckEntry = z.output<typeof NomineeNameCheckEntry>;

/**
 * `POST …/admin/claims/:claimCaseId/nominee-name-check`.
 *
 * ⭐ THE REQUEST CARRIES BOTH STALENESS TOKENS, and that is the whole concurrency design (D1): the
 * District Admin asserts WHICH accounts and WHICH declaration they looked at. The domain re-reads
 * both under the claim lock and refuses (409) if either moved, so a bank correction landing between
 * the read and the submit can ⛔ never be silently blessed by a judgement made about older data.
 *
 * ⛔ The request carries NO actor identity — the server resolves the acting District Admin and
 * snapshots their display name (the 6.11 R5 posture). `.strict()`, so a smuggled actor field is a 400.
 */
export const NomineeNameCheckRequest = z
  .object({
    nominee_declaration_token: z.string().min(1),
    accounts: z
      .array(NomineeNameCheckEntry)
      .length(2)
      // ⛔ BOTH RANKS, ⛔ NEVER THE SAME ONE TWICE (code review 2026-09-20). `[rank 1, rank 1]`
      // satisfies `.length(2)` and used to fall through to the domain's per-rank loop, surfacing as
      // a STALENESS 409 — *"the bank details changed, please look again"* — which sends a District
      // Admin off to re-read two names because of a client bug. It is a 400.
      .refine((accounts) => new Set(accounts.map((a) => a.account_rank)).size === accounts.length, {
        message: 'a verdict must be submitted for each of the two accounts, rank 1 and rank 2',
      }),
  })
  .strict();
export type NomineeNameCheckRequest = z.output<typeof NomineeNameCheckRequest>;

/** The 201 response — the check as recorded. ⛔ Carries no name and no note. */
export const NomineeNameCheckWriteResponse = z
  .object({
    claim_case_id: z.string(),
    claim_state: z.string(),
    checked_at: z.string(),
    event_version: z.number().int(),
    current_check: NomineeNameCheckCurrent,
  })
  .strict();
export type NomineeNameCheckWriteResponse = z.output<typeof NomineeNameCheckWriteResponse>;

// ── AC11 — the District Admin's CORRECTION QUEUE ──────────────────────────────────

/**
 * ONE claim waiting for the District Admin to get its bank details corrected (AC11 / `-227` cl.10).
 *
 * ⚠⚠ IT EXISTS BECAUSE A RETURNED CLAIM IS OTHERWISE INVISIBLE (code review 2026-09-20). A return
 * does ⛔ not move the claim's state, so it sits among every other `verifier_approved` claim with
 * nothing to distinguish it — and there was no District Admin list of any kind to put it on. The
 * Pariwar Admin could send a claim back and the person meant to act on it would never find out.
 *
 * ⛔ CARRIES NO NAME AND NO FILER NOTE. The holder name, the nominee name and the filer's
 * difference note stay behind `claim.view_nominee_name_check` on the per-claim route, decrypted ONE
 * CLAIM AT A TIME (Trap 4). What rides here is the Pariwar Admin's own return NOTE — staff-authored
 * text about a claim, the `verifier_rationale` posture — plus ids, states, dates and flags.
 */
export const ClaimUnderCorrectionItem = z
  .object({
    claim_case_id: z.string().uuid(),
    deceased_member_id: z.string().uuid(),
    claim_state: z.string(),
    claim_filed_at: z.string(),
    /**
     * Set iff the PARIWAR ADMIN returned it. ⛔ Null when the claim is here because the District
     * Admin's own latest check says `does_not_match` — the two halves of "under correction" are
     * kept DISTINGUISHABLE on this surface, because they tell the District Admin different things
     * about what to do next: chase the note, or act on their own recorded judgement.
     */
    returned_at: z.string().nullable(),
    returned_by_actor_display: z.string().nullable(),
    /**
     * The Pariwar Admin's note, decrypted AFTER authorization at the route (AC11's *"lists returned
     * claims with the note"*). `unreadable` on a decrypt failure — ⛔ never a silent empty string,
     * which would read as "they gave no reason".
     */
    return_note: ReadableName.nullable(),
    /** The District Admin's own latest check is CURRENT and carries a `does_not_match` (`-226` cl.6). */
    sent_back_by_check: z.boolean(),
    /** `-226` cl.7 — `false` means the claim is ALSO still waiting for its two accounts. */
    accounts_complete: z.boolean(),
  })
  .strict();
export type ClaimUnderCorrectionItem = z.output<typeof ClaimUnderCorrectionItem>;

/**
 * `GET …/admin/claims/under-correction` — the District Admin's queue.
 *
 * ⭐ SCOPE-FILTERED SERVER-SIDE: the rows are exactly the claims whose deceased member's posting
 * district the caller holds `claim.view_nominee_name_check` over — `rbac.hasPermission` per row, the
 * same predicate the per-claim district gate evaluates (it was raw `scopeContains` over every grant
 * until 2026-09-23b, which let a key-less wider grant widen the queue). A District Admin for one
 * district ⛔ never sees another's.
 */
export const ClaimsUnderCorrectionResponse = z
  .object({
    pariwar_id: z.string().uuid(),
    items: z.array(ClaimUnderCorrectionItem),
  })
  .strict();
export type ClaimsUnderCorrectionResponse = z.output<typeof ClaimsUnderCorrectionResponse>;
