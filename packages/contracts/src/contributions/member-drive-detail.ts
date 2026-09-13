// packages/contracts/src/contributions/member-drive-detail.ts
//
// ⭐⭐ THE MEMBER'S VIEW OF **ONE** DRIVE — Story 11b.17 (Task 2; AC1, AC2, AC3, AC4, AC8, AC10).
// The response shape for `GET /api/v1/member/drive-detail/:driveToken`: everything the PUBLIC Sahyog
// Vivran page carries for that drive, ⭐ **plus the nominee's complete, UNMASKED banking coordinates**
// — which the public page, since story **A** (`11b-11`), carries ⛔ none of.
//
// ⭐ This is the story that makes `2026-09-04-190` **cl.3** true: *"a logged-in member sees the
// complete banking information."* ⚠⛔ And ⛔ **NOT** because `-189` cl.3 forces it — story A removed
// those fields from the public surface **entirely**, so *member ≥ public* is satisfied on banking **by
// construction** whatever this surface does. ⇒ ⭐ the scope is a **FREE, SEPARATE decision**, made at
// `2026-09-04-199`: **option (a)**, scope **(i)** — ⭐ **any authenticated member, any drive in their
// OWN Pariwar**.
//
// ── ⭐⭐ A **NEW CONTRACT**, AND ⛔ **NOT** A FIELD ADDED TO `MemberDriveListEntry` ───────────────
// ⚠⛔ `deferred-work.md`'s 11b-15 THIRD-pass `.strict()` additive-field item names this story **twice**:
// `MemberDriveListEntry` is `.strict()` and `api-client`'s `call` uses a throwing `schema.parse`, so
// ⛔ **one added field BLANKS THE WHOLE TAB** for every member on an installed build older than the API
// release — the full-screen error branch, indefinitely, until they update. ⭐ Its own remediation is
// *"prefer a NEW contract"*, and that is what this file is.
// ⭐ **`8-17` FIRED THAT TRIGGER FIRST** (adding `vpa` to `NomineeBankAccountView`) and discharged it
// with its **AC8**: a written deployment order — the **mobile build reaches devices FIRST, the API
// deploys SECOND**. ⇒ ⭐ that precedent exists and is recorded; ⛔ this surface does ⛔ not need it,
// because a NEW route + a NEW contract is invisible to an older build.
//
// ── Contracts discipline ────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — `pg` would leak
// into the RN Metro bundle, [[project_contracts_domain_bundle_boundary]]). Plain `z` + the `_common`
// primitives only. ALL objects `.strict()`.
//
// ── ⛔⛔ WHAT IS ⛔ NOT ON THIS WIRE, AND EACH ABSENCE IS A RULING ───────────────────────────────
//   · ⛔ **NO `vpa`**, on ⛔ any drive, in ⛔ any stage — `2026-09-10-212` **cl.2** (Trustee-ratified,
//     DR + KB) ruled the nominee's UPI ID onto the **PAYMENT screen** instead, and **`8-17`** (`done`)
//     shipped that half. ⛔ Do ⛔ not add it here.
//   · ⛔ **NO contributor names** and ⛔ no per-member amounts — 11b.1 AC5's surviving half.
//   · ⛔ **NO `spawned` drive** — `2026-09-04-196`. A `spawned` pool follows an APPROVED CLAIM before
//     contributions open ⇒ listing it would disclose the claim's underlying event, and its approval,
//     to the whole Pariwar earlier than any surface does today. That is a **DISCLOSURE CHANGE**.
//   · ⛔ **NO masked coordinate.** ⭐ Unmasked is the POINT, ⛔ not an oversight — *"a masked account#
//     cannot be transferred to"*. ⚠ The safety question is **WHO SEES IT** (`-199`), ⛔ never **how
//     much of it**.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';
import { MemberDriveFundingOutcome, MemberDriveStage } from './member-drive-list.js';
import { ContributionAccount } from './upi-intent.js';

/**
 * ⭐ The drive's address on this route — the OPAQUE PUBLIC TOKEN, Story 11b.10.
 *
 * ⚠⛔⛔ **THE DRIVE IS RESOLVED BY THIS AND BY ⛔ NOTHING ELSE.** `2026-09-03-184` **(B)**
 * (Trustee-ratified) made the address UNGUESSABLE precisely because `P-YYYY-MM-###`'s `sequence` is a
 * MONOTONIC per-`(pariwar, month)` counter ⇒ addressing by it made the whole surface **WALKABLE BY
 * COUNTING**. ⛔ Do ⛔ NOT add an `OR` arm for the canonical identifier, ⛔ not for old links and
 * ⛔ not "for operators" — a read accepting EITHER form has ⛔ not closed the walk, it has added a
 * lock beside an open door. ⭐ The identifier is still RETURNED and RENDERED (`-184` cl.2), just
 * ⛔ not addressable.
 *
 * ⚠ The rate-limit remedy this surface was once criticised for lacking was **EXPRESSLY REFUSED** by
 * the Panel (*"the rate-limit tier is NOT changed"*, `#decision-2026-09-03-184`) ⇒ ⛔ do ⛔ not add one
 * on that ground ([[feedback_closure_language_precision]]). ⭐ What protects this surface is
 * **authentication + session scope**, and enumeration *by a member* is what **D1(a) GRANTS**.
 */
export const MemberDriveDetailParams = z
  .object({
    driveToken: z.string().min(1).max(200),
  })
  .strict();
export type MemberDriveDetailParams = z.output<typeof MemberDriveDetailParams>;

/**
 * ⭐⭐ ONE NOMINEE BANK ACCOUNT, **COMPLETE AND UNMASKED** — `2026-09-04-190` cl.3 as scoped by
 * `-199`, with **BOTH** accounts ruled in by `2026-09-10-213` **cl.1**.
 *
 * ⛔⛔ **THE TWO ACCOUNTS ARE EQUAL PAYMENT DESTINATIONS.** `rank` is composite-PK **IDENTITY** —
 * ⛔ not a priority, ⛔ not a nominee rank, ⛔ not a 75/25 split, ⛔ not a routing instruction (6.8 D1;
 * Story 9.9's re-scope; [[project_nominee_bank_disbursement_channel]],
 * [[project_disbursement_is_money_in_routing]]). ⛔ Nothing downstream may present one as primary, and
 * there is DELIBERATELY no `primary` / `default` / `isPreferred` field.
 *
 * ⚠⛔⛔ **WHY BOTH RENDER HERE WHILE THE LIST DECRYPTS ONE — AND IT IS ⛔ NOT A REVERSAL**
 * (`-213` cl.1). The list's one-decrypt rule governs the **HOLDER NAME**, which is *"the SAME nominee"*
 * twice ⇒ a second decrypt buys ⛔ nothing there. ⚠ This surface renders `accountNumber` and `ifsc`,
 * which ⛔ **DIFFER** per account ⇒ the second decrypt returns information the first does ⛔ not carry,
 * under the purpose `-199` already granted. ⭐ And the money **can have gone to both** — the two are
 * *"EQUAL payment destinations, the **donor's choice**"* ⇒ rendering one would be **incomplete by
 * construction**. ⛔⛔ The list's and the pay screen's one-decrypt behaviour is CORRECT and is ⛔ **not**
 * to be touched.
 *
 * ⚠⛔ **TWO DIFFERING HOLDER NAMES ARE A LEGITIMATE STATE** — `#decision-2026-09-13-215`: the schema
 * carries ⛔ no FK to `member_nominees`, ⛔ no `nominee_rank` and ⛔ no holder-name-must-match validation
 * (DDL `0056`), so the accounts are a **claim-scoped payment channel**, ⛔ not one row per declared
 * nominee. ⇒ ⭐ **SURFACE BOTH, PICK NEITHER** (`-213` cl.2), and ⛔ encode ⛔ no assumption either way.
 */
export const MemberDriveNomineeAccountView = z
  .object({
    /** `1` | `2` — row IDENTITY, ⛔ never a priority. */
    rank: ContributionAccount,
    /**
     * ⚠⛔ **THE COLUMN HOLDS THE ACCOUNT HOLDER, AND THIS SHAPE MAY ⛔ NOT ASSERT A NOMINEE LINKAGE.**
     * ⭐ `2026-09-04-190` **cl.2** (Trustee-ratified) rules the RENDERED LABEL *"Nominee Name"* — and
     * ⛔ this field id, the column `account_holder_name_ciphertext`, and the schema's deliberate
     * absence of a linkage are all **UNCHANGED** ([[project_nominee_bank_disbursement_channel]]).
     * ⭐ A LABEL names a column; ⛔ it does ⛔ not make a claim about a named private person.
     *
     * ⚠ Tier-1, decrypted at the API boundary — or the DISTINCT decrypt-failed sentinel. ⛔ Never a
     * blank, which could masquerade as real data.
     */
    accountHolderName: z.string().min(1).max(200),
    /**
     * ⭐ THE **FULL** ACCOUNT NUMBER — Tier-1, decrypted, **UNMASKED**.
     * ⛔⛔ Do ⛔ not "improve" this with a masked display for safety: ⭐ that would break the ⛔ one
     * thing the field exists for (*"a masked account# cannot be transferred to"*). ⚠ The safety
     * question is **WHO SEES IT**, and `-199` answered it.
     */
    accountNumber: z.string().min(1).max(200),
    /** The IFSC — Tier-1, decrypted, UNMASKED. ⚠ DIFFERS per account, which is why both render. */
    ifsc: z.string().min(1).max(200),
    /**
     * ⭐ Tier-3 plaintext, IFSC-derived, non-identifying — ⛔ never decrypted.
     * ⚠⛔ `bank_name` is `text NOT NULL` with ⛔ **no non-empty CHECK**, so `''` is **REACHABLE** — and
     * `''` is the exact value that once **500'd the whole public transparency page** against a
     * `z.string().min(1)`. ⇒ the producer degrades it to the sentinel; ⛔ the degrade is ROW-LOCAL,
     * ⛔ never page-wide.
     */
    bankName: z.string().min(1).max(200),
    /**
     * ⭐ Tier-3 plaintext branch. ⚠⛔ **GENUINELY NULLABLE, AND ⛔ NOT SYMMETRIC WITH `bankName`** —
     * ⛔ do ⛔ not write one guard for both. `branch` is a nullable column ⇒ a `null` is an **ORDINARY
     * ABSENT OPTIONAL**, ⛔ not a fault: the surface **OMITS THE ROW**, ⛔ never a placeholder.
     */
    branch: z.string().min(1).max(200).nullable(),
    /**
     * ⛔⛔ **THERE IS DELIBERATELY ⛔ NO `vpa` AND ⛔ NO `vpaPresent` ON THIS VIEW.**
     * `2026-09-10-212` **cl.2** (Trustee-ratified, DR + KB) ruled the nominee's UPI ID onto the
     * **PAYMENT screen** — option **(D)** — and ⛔ **NOT** onto this page, on ⛔ any drive, in ⛔ any
     * stage. ⭐ That work SHIPPED at story `8-17` (`done`): `NomineeBankAccountView.vpa`, rendered by
     * `pay.tsx`, labelled `upi_intent.vpa_label`. ⇒ ⛔ do ⛔ not "complete" this shape by adding it.
     * ⚠ A fence test asserts this file carries ⛔ no `vpa` key (AC7).
     */
  })
  .strict();
export type MemberDriveNomineeAccountView = z.output<typeof MemberDriveNomineeAccountView>;

/**
 * ⭐ ONE drive, as the MEMBER sees it.
 *
 * ⚠⛔ **`.strict()` — an unknown key is a contract violation, ⛔ not an ignored one.** That is what
 * makes AC7's fence structural rather than advisory.
 */
export const MemberDriveDetailResponse = z
  .object({
    // ── Identity ──────────────────────────────────────────────────────────────────────────────
    /** The member-facing pool letter code (bijective base-26 of `pool_index`). */
    poolLetterCode: z.string().min(1),
    /**
     * ⭐ `P-YYYY-MM-###` (Story 7.2) — the operational/audit key, and one of the public DETAIL page's
     * own field ids (`pool_canonical_identifier`). ⚠ Story **E** carries it on the member wire and
     * renders it ⛔ nowhere; **AC8** puts it on a screen here.
     */
    poolCanonicalIdentifier: z.string().min(1),
    /**
     * ⭐ THE DRIVE'S OPAQUE PUBLIC ADDRESS TOKEN — the public index's `drive_href` field id, echoed
     * back so this surface can offer the drive's own public page (**AC8**).
     *
     * ⚠⛔⛔ **A DELIBERATE ASYMMETRY WITH AC5, RECORDED SO IT IS ⛔ NOT RE-DISCOVERED.** AC5 refuses to
     * put a token in the **durable audit chain** because that *"would additionally write a live public
     * ADDRESS into the durable audit chain"* — while this key puts that same token **on a member's
     * screen**, where Trap 2's screenshottable/forwardable logic applies. ⭐ The rule fenced there is
     * *"⛔ not in the DURABLE AUDIT CHAIN"*, ⛔ **not** *"⛔ nowhere"*. ⭐ Survivable because
     * `rotatePoolPublicToken` exists and `publicToken` is the ⛔ ONLY address form. ⇒ ⛔ do ⛔ not
     * "fix" one of these to satisfy the other.
     * ⚠ ⛔ The client ⛔ NEVER derives an address from `poolCanonicalIdentifier` — that would re-create
     * the guessability 11b.10 D2 removed.
     */
    publicToken: z.string().min(1),

    // ── The public page's facts, at least ─────────────────────────────────────────────────────
    /**
     * ⭐ The deceased family's name, in the Pariwar's **CONFIGURED** presentation form
     * (`2026-09-04-197`; `-198` **cl.1** — the FORM, ⛔ not the publication BASIS). `null` when
     * unresolvable.
     * ⚠⛔⛔ **`null` OMITS THE NAME AND ⛔ NEVER THE DRIVE.** ⭐ Resolved through
     * `resolveMemberFacingDeceasedName` and ⛔ **NEVER** `resolvePublicMemberName`: the two differ
     * ⛔ only in ABSENCE behaviour, and the public one fails **CLOSED** on a mononym under
     * `shielded_name` ⇒ reusing it would **DROP A MEMBER'S OWN DRIVE**.
     * ⚠⛔ **AND THE RESIDUAL ASYMMETRY IS A RULED DECISION, ⛔ NOT A DEFECT** (`2026-09-08-209` cl.2):
     * the public name gate is **PROVISIONING-INERT**, so on a Pariwar in the default `full_name` mode
     * a member sees a name ⛔ nobody can see publicly. ⛔ Do ⛔ not "correct" it, and ⛔ do ⛔ not offer
     * the retired justification (*"the same name anyone can already see on the public page"*) —
     * `-209` cl.3 rules it **false for every drive** and forbids the paraphrase.
     */
    deceasedMemberName: z.string().min(1).nullable(),
    /**
     * ⭐⭐ The NOMINEE'S **FULL NAME** — Trustee-ratified `2026-09-07-205` **cl.1**, `pii_tier: 1`.
     * `null` when the claim's bank details were ⛔ never collected (6.8 AC3's absence signal).
     * ⚠⛔⛔ **IT CARRIES ⛔ NO GATE, AND THAT IS RULED** — `-190` cl.2 published the nominee name and
     * `-205` **cl.9** records that narrowing it by claim OUTCOME would be a NEW suppression rule
     * ⛔ nobody has ruled. ⇒ ⭐ on this field the member and public surfaces are **SYMMETRIC**, so the
     * `member ≥ public` comparison test **MUST compare it** — ⛔ a carve-out there would suppress a
     * real failure on the one field this whole story exists to surface.
     * ⚠ The **FULL** form is ruled ⇒ the per-Pariwar `public_name_presentation_mode` has ⛔ **no
     * subject** for a claim-scoped value.
     */
    nomineeName: z.string().min(1).nullable(),
    /** **Live · Closed · Verified** — story B's ruled WIRE vocabulary (`2026-09-04-193` cl.1). */
    status: MemberDriveStage,
    /**
     * The drive's close/settle instant, ISO 8601. `null` while the pool's stream carries no such
     * event — the ordinary state of the drive collecting **now**.
     * ⛔ A date about a COLLECTION, ⛔ never a date about a person.
     */
    closedAt: Iso8601Datetime.nullable(),
    /** The deceased member's latest posting district, RAW. `null` when there is no posting row. */
    district: z.string().min(1).nullable(),
    /**
     * Contributions CONFIRMED as money received, reversals compensated (Story 9.5's canonical
     * financial truth). ⛔ A count, ⛔ never a score — ⛔ nothing orders by it and there is ⛔ no
     * comparison BETWEEN drives (11b.1 AC5's surviving half).
     */
    confirmedContributionCount: z.number().int().nonnegative(),
    /**
     * The meter's fill, 0-100. ⚠⛔ **`null` UNLESS `status === 'live'`** — Trustee-ratified
     * `2026-09-08-207` **cl.1** closed the roster-size-by-division channel on archived rows
     * (`confirmedContributionCount ÷ confirmedPercentage` recovers the roster).
     * ⚠⛔ ⛔ **NOT suppressed at zero** — the public meter renders at 0 too, so hiding it would put the
     * member BELOW the public and break `-189` cl.3 in the other direction.
     */
    confirmedPercentage: z.number().int().min(0).max(100).nullable(),
    /**
     * ⭐⭐ **लक्ष्य — THE DRIVE'S EXPECTED CONTRIBUTION, IN WHOLE RUPEES.**
     *
     * ⚠⛔ **OPTIONAL, AND THE KEY IS *ABSENT* RATHER THAN `null` WHEN WITHHELD** — the 11b.11 shape
     * (`-205` cl.9), mirroring the member list and the public index exactly.
     *
     * ⛔⛔ **`live` DRIVES ONLY — `2026-09-10-212` cl.1, Trustee-ratified (DR + KB).** ⛔ Not on
     * `closed`, ⛔ not on `settled`. ⭐ It mirrors the member LIST exactly and occupies `-204`
     * **cl.12**'s ruled slot (*"right of the progress bar, on a LIVE row"*).
     * ⚠⛔ `-212` cl.1 grounds that slot on `-204` **cl.2**; ⭐ cl.2 is *"लक्ष्य IS THE DERIVED TOTAL"*
     * and the SLOT quote is **cl.12**'s 2026-09-08 correction table. ⇒ ⭐ **BUILD to cl.12's slot**;
     * ⛔ a story file ⛔ cannot correct a ratified clause, so the correction is ROUTED, ⛔ not applied
     * ([[feedback_supersede_never_reinterpret]]).
     *
     * ⛔⛔ **THE GATE IS `reveal_to_members`, ⛔ NOT `reveal_to_public`** (`-211` **cl.2**), resolved
     * through **`resolveDriveTargetVisibility`** and ⛔ **NEVER** `getDriveTargetVisibilityRow` —
     * *"a caller interpreting it is exactly how a fail-closed default becomes fail-open"* (cl.3).
     * ⚠⛔ A regression here is a **DISCLOSURE defect**, ⛔ not a UI defect (`-211` Consequence 4).
     *
     * ⭐⭐ **IT IS DERIVED — `assignedCount × pools.fixed_amount` — ⛔ NEVER A FIGURE ANYONE TYPED**
     * (`-204` cl.2 supersedes `-190` cl.7(a): ⛔ there is ⛔ no setter, and ⛔ nothing may read
     * `pariwar_drive_target_schedule` to "check" it).
     *
     * ⚠⛔ **ABSENT EVERYWHERE AT LAUNCH, AND THAT IS CORRECT — ⛔ NOT A GAP.** ⛔ No
     * `pariwar_drive_target_visibility` row exists for any Pariwar and the absent-row default is
     * FAIL-CLOSED (`-190` cl.7(b)). ⚠ A zero-assignee pool carries ⛔ nothing either — silence,
     * ⛔ never `0`.
     */
    driveTargetInr: z.number().int().positive().optional(),
    /**
     * ⭐ **WHAT HAS REACHED THE FAMILY SO FAR, IN WHOLE RUPEES** — `2026-09-04-190` cl.6.
     * ⭐ `confirmedContributionCount × pools.fixed_amount`, 9.12 **Decision 3**'s canonical identity,
     * returned from the value the domain read ALREADY computes. ⛔⛔ Do ⛔ not re-derive it anywhere
     * ([[project_amount_raised_canonical_producer]]): a second multiplication IS the defect.
     */
    amountRaisedInr: z.number().int().nonnegative(),
    /**
     * Pool-Reality #2 as an OPAQUE ENUM — the close-of-cycle FRAMING. ⭐ It crosses as an enum
     * precisely so that ⛔ no expected-total, shortfall or comparison figure can reach a render model.
     * ⚠ `null` ⇒ ⛔ NO expectation was ever set (zero assigned contributors, or a non-positive
     * `fixed_amount`) — the surface then **SAYS NOTHING** rather than something false. ⛔ `null` NEVER
     * omits the drive.
     */
    fundingOutcome: MemberDriveFundingOutcome.nullable(),

    // ── ⭐⭐ WHAT THE PUBLIC PAGE NO LONGER CARRIES ────────────────────────────────────────────
    /**
     * ⭐⭐ **THE NOMINEE'S COMPLETE BANKING COORDINATES** — `2026-09-04-190` **cl.3**, scoped by
     * `-199` to **any member of the drive's own Pariwar**, with **BOTH** accounts ruled in by `-213`
     * **cl.1**.
     *
     * ⚠ `[]` is a **FIRST-CLASS STATE** — the claim's bank details were ⛔ never collected (6.8 AC3's
     * absence signal) — and the surface then renders **NOTHING**, ⛔ never a placeholder and ⛔ never a
     * throw.
     *
     * ⛔⛔ **THE BOUNDARY IS ENFORCED SERVER-SIDE, ⛔ NEVER BY HIDING A FIELD THE RESPONSE ALREADY
     * CARRIED** (AC3). ⭐ A drive outside the member's Pariwar is ⛔ **not addressable** at all: member
     * routes carry ⛔ no `:pariwarId` (it comes from the session) and `claim_nominee_bank_accounts`
     * runs RLS **FORCE**d under `SET LOCAL app.pariwar_id` ⇒ the response is a **404**, ⛔ not a 200
     * with absent keys ([[feedback_trace_reachability_before_escalating]]).
     */
    nomineeAccounts: z.array(MemberDriveNomineeAccountView).max(2),
  })
  .strict();
export type MemberDriveDetailResponse = z.output<typeof MemberDriveDetailResponse>;

/**
 * ⭐ The producer-side pairing this response cannot express on its own — the member LIST's
 * `satisfiesMemberDriveLiveRowPairing`, restated for the DETAIL because the two shapes are different
 * objects and a shared predicate would couple them.
 *
 * ⚠⛔ **WHY A PREDICATE AND ⛔ NOT A `superRefine`** — the list's and the public index's precedent, for
 * the same reason: attaching it to the response would make a payload carrying the wrong shape a
 * CONTRACT violation, and the contract must stay tolerant so a consumer can handle both shapes across
 * a deploy. ⇒ the contract parses both; this names the invariant for the one side that must GUARANTEE
 * it — the producer — plus any test that wants to assert the pairing without restating it.
 *
 * ⭐ It covers **BOTH** stage-gated values in one predicate, because they are gated by the SAME
 * condition for two DIFFERENT reasons: `confirmedPercentage` by `2026-09-08-207` cl.1 (closing the
 * roster-recovery channel) and `driveTargetInr` by `-212` cl.1 + `-204` cl.12's ruled slot. ⛔ Do
 * ⛔ not collapse those two grounds into one comment elsewhere.
 *
 * ⚠⛔ **THE ASSERTION IS IN THE WIRE-TOKEN VOCABULARY** — `live` / `closed` / **`verified`**. ⛔ A wire
 * assertion written against `settled` matches ⛔ **nothing** (that is a POOL STATE).
 *
 * ⛔ **DO ⛔ NOT use this to gate an inbound body.**
 */
export function satisfiesMemberDriveDetailLivePairing(
  detail: Pick<
    MemberDriveDetailResponse,
    'status' | 'confirmedPercentage' | 'driveTargetInr'
  >,
): boolean {
  const percentageOk =
    detail.status === 'live'
      ? typeof detail.confirmedPercentage === 'number'
      : detail.confirmedPercentage === null;
  const targetOk = detail.status === 'live' ? true : detail.driveTargetInr === undefined;
  return percentageOk && targetOk;
}
