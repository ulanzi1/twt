// packages/contracts/src/contributions/member-drive-list.ts
//
// The MEMBER'S DRIVE LIST read DTO — Story 11b.15 (Task 3; AC2, AC3, AC7, AC8b). The response shape
// for `GET /api/v1/member/drive-list`: every Sahyog Drive in the member's OWN Pariwar, at
// `live` · `closed` · `settled`, paginated. Presentation only — it mutates nothing, and it
// introduces ⛔ NO predicate that gates a member's access to a benefit (AI-10-1).
//
// ── Contracts discipline ────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — `pg` would leak
// into the RN Metro bundle, [[project_contracts_domain_bundle_boundary]]). Plain `z` + the
// `_common` primitives only. ALL objects `.strict()`.
//
// ── ⭐⭐ THE FIELD SET IS A **FLOOR**, AND THE FLOOR IS THE PUBLIC INDEX ──────────────────────────
// `2026-09-04-189` **cl.3**: *"a member must see MORE than the public, and never less."* ⇒ every
// field the public Sahyog Drive index carries has a counterpart here, and the parity test
// enumerates `SAHYOG_DRIVE_ROW_FIELD_IDS` **programmatically** rather than trusting a transcribed
// list. ⚠ cl.3 is **scoped** by `2026-09-04-195` **cl.1** to the drive data class and the 11b split
// stories — ⛔ it is ⛔ NOT a universal invariant, and ⛔ must not be cited as one.
//
// ⚠⛔ **AND A FLOOR IS ⛔ NOT A LICENCE** (Trap 5). cl.3 sets a minimum; it does ⛔ **not** authorise
// showing a member anything the Panel has ⛔ not ruled public **or** member-visible. ⇒ ⛔ NO banking
// coordinates (`-190` cl.3's *"complete banking information"* is a PER-DRIVE view and belongs to
// story **F**, `11b-17`) · ⛔ no contributor names · ⛔ no per-member amounts · ⛔ no `spawned` rows.
// ⭐ The nominee's **NAME** is ⛔ not a banking coordinate and **IS** in scope — it is on the public
// index by Trustee-ratified `2026-09-07-205` cl.1.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/**
 * The three ruled PUBLIC stage words — **Live · Closed · Verified** (`2026-09-04-193` cl.1, story
 * **B**). Value-aligned with @twt/domain's `SAHYOG_DRIVE_STATUSES` and with the public index's
 * `PublicSahyogDriveStatus`; re-declared here because contracts cannot import @twt/domain.
 *
 * ⛔⛔ **THE WORDS THEMSELVES ARE ⛔ NOT MINTED HERE, AND ⛔ NOT ANYWHERE IN THIS STORY.** Story B
 * ships the ⛔ ONE shared copy source (`packages/i18n`, namespace `sahyog-shared`, keys
 * `stage.live` · `stage.closed` · `stage.verified`), and a **LIVE ASSERTION** aimed at this story
 * says so by name: `apps/mobile/tests/unit/sahyog-stage-copy-resolves.test.ts:66-73` — *"story E
 * consumes THESE keys, by name — ⛔ it may ⛔ not mint its own"*. ⭐ These are WIRE TOKENS, ⛔ never
 * rendered copy: two sources is exactly how *"Active"* came to mean two different things.
 */
export const MemberDriveStage = z.enum(['live', 'closed', 'verified']);
export type MemberDriveStage = z.output<typeof MemberDriveStage>;

/**
 * ⭐ The deep-pagination horizon and the page-size ceiling for THIS surface.
 *
 * ⚠⛔ **RE-DECLARED HERE, ⛔ NOT IMPORTED FROM `_common/pagination.ts`'s PUBLIC pair — and the
 * reason is the same one that keeps the visible-state tuples apart.** `PUBLIC_SURFACE_PAGE_SIZE_CAP`
 * is an **FR-91 PUBLIC-surface** number (*"page-size cap per FR-91 = 50 for public surfaces;
 * authenticated queries override at the route level"*, that file's own header). ⭐ This route is
 * **authenticated and member-scoped** ⇒ it is exactly the case that file tells a consumer to
 * override, ⛔ not one it governs. Binding this surface to the public constant would mean a future
 * FR-91 change to a PUBLIC ceiling silently re-bounded a MEMBER read.
 *
 * ⚠ The numbers happen to coincide with the domain accessor's
 * `MEMBER_DRIVE_LIST_PAGE_SIZE_CAP` — ⭐ and they MUST: `clampLimit` in the domain is the real
 * enforcement, this `.max()` is what Story 1.14's forced-pagination guard can SEE on the live
 * swagger document. ⛔ Two enforcements of one bound, and a lockstep test pins them together
 * ([[feedback_gate_scope_semantic_coverage]] — a bound only one layer knows is a bound one refactor
 * can drop).
 */
export const MEMBER_DRIVE_LIST_PAGE_HORIZON = 200;
export const MEMBER_DRIVE_LIST_LIMIT_MAX = 50;

/**
 * Pool-Reality #2 as an OPAQUE ENUM — value-aligned with the public index's
 * `PublicSahyogDriveFundingOutcome` and @twt/domain's `CycleFundingOutcome`.
 *
 * ⭐ It is the **close-of-cycle FRAMING**, and it crosses as an enum precisely so that ⛔ no
 * expected-total, shortfall, percentage-of-target or comparison figure can reach a render model.
 */
export const MemberDriveFundingOutcome = z.enum(['fully_funded', 'partial', 'under_funded']);
export type MemberDriveFundingOutcome = z.output<typeof MemberDriveFundingOutcome>;

/**
 * ONE drive on the member's list.
 *
 * ⚠⛔ **`.strict()` — an unknown key is a contract violation, ⛔ not an ignored one.** That is what
 * makes the AC8 fence structural rather than advisory: a banking coordinate, a contributor name or
 * a per-member amount cannot be added to this row without failing validation.
 */
export const MemberDriveListEntry = z
  .object({
    /**
     * ⭐ The deceased family's name, in the Pariwar's **CONFIGURED** presentation form
     * (`2026-09-04-197`; `2026-09-02-181` cl.1). `null` when unresolvable.
     *
     * ⚠⛔⛔ **`null` OMITS THE NAME AND ⛔ NEVER THE ROW.** The public index keeps a nameless row
     * (its own AC2), so a member list that DROPPED such a row would show a member **less** than a
     * stranger — the `-189` cl.3 inversion this story exists to prevent. ⭐ It is also the deliberate
     * INVERSE of the Yogdaan Bahi, which omits a row whose identity is unresolvable: there a row
     * with no name has no purpose, here it still carries the drive.
     *
     * ⚠⛔ **THE FORM, ⛔ NOT THE PUBLICATION BASIS** — `2026-09-04-198` **cl.1** (FORM ONLY), live at
     * `notifications/pool-identity.ts:63-66`. ⇒ ⭐ a member sees a name **always**, including on a
     * drive where the basis is unsatisfied and the public page names nobody.
     *
     * ⚠⛔ **AND THE RESIDUAL ASYMMETRY IS A RULED DECISION, ⛔ NOT A DEFECT** (`2026-09-08-209`
     * cl.2): the public name gate is INERT, so on a Pariwar in the default `full_name` mode a member
     * sees a full legal name that ⛔ nobody can see publicly. ⛔ Do ⛔ not "correct" it, and ⛔ do
     * ⛔ not offer the retired justification (*"the same name anyone can already see on the public
     * page"*) — `-209` cl.3 rules it **false for every drive** and forbids the paraphrase.
     */
    deceasedMemberName: z.string().min(1).nullable(),
    /**
     * ⭐⭐ The NOMINEE'S FULL NAME — Trustee-ratified `2026-09-07-205` cl.1, `pii_tier: 1`.
     * `null` when the claim's bank details were ⛔ never collected (6.8 AC3's absence signal).
     *
     * ⭐ **A NAME IS ⛔ NOT A BANKING COORDINATE**, so Trap 5's *"no banking coordinates"* exclusion
     * does ⛔ not reach it — and because it is on the PUBLIC index, cl.3 makes it a **floor**.
     * ⛔⛔ **AND ⛔ NO OTHER NOMINEE-BANK VALUE IS ON THIS ROW, UNDER ANY NAME** — ⛔ no account
     * number, ⛔ no last-4, ⛔ no IFSC, ⛔ no VPA, ⛔ no bank, ⛔ no branch. Those are story **F**'s
     * per-drive view (`-190` cl.3); ⛔ do ⛔ not "restore" one here.
     */
    nomineeName: z.string().min(1).nullable(),
    /** The member-facing pool letter code (bijective base-26 of `pool_index`). */
    poolLetterCode: z.string().min(1),
    /** `P-YYYY-MM-###` (Story 7.2) — the operational/audit key. */
    poolCanonicalIdentifier: z.string().min(1),
    /**
     * ⭐ THE DRIVE'S OPAQUE PUBLIC ADDRESS TOKEN — Story 11b.10.
     *
     * ⚠ It is on this wire because **AC3's floor includes `drive_href`**: the public index links
     * every row to `/sahyog-vivran/[driveToken]`, and a member row without the token could ⛔ not
     * build that link ⇒ the member would have **less** than the public. ⛔ The client ⛔ NEVER
     * derives an address from `poolCanonicalIdentifier` — that identifier is no longer addressable,
     * and reconstructing an address from it would re-create the guessability 11b.10 D2 removed.
     */
    publicToken: z.string().min(1),
    status: MemberDriveStage,
    /**
     * The drive's close/settle instant, ISO 8601. `null` while the pool's stream carries no such
     * event — which is the ordinary state of the drive collecting **now**.
     * ⛔ A date about a COLLECTION, ⛔ never a date about a person: this is not a date of death and
     * must ⛔ never be sourced from one.
     */
    closedAt: Iso8601Datetime.nullable(),
    /** The deceased member's latest posting district, RAW. `null` when there is no posting row. */
    district: z.string().min(1).nullable(),
    /**
     * Contributions CONFIRMED as money received, reversals compensated (Story 9.5's canonical
     * financial truth). ⛔ A count, ⛔ never a score.
     *
     * ⛔ **11b.1 AC5's SURVIVING HALF BINDS THIS SURFACE TOO:** ⛔ nothing orders by this figure,
     * ⛔ no *"most-supported"* view at any tier, ⛔ no ranking, ⛔ no comparison **between** drives,
     * ⛔ no badge, streak or achievement.
     */
    confirmedContributionCount: z.number().int().nonnegative(),
    /**
     * The meter's fill, 0-100.
     *
     * ⚠⛔⛔ **`null` UNLESS `status === 'live'` — MIRRORING THE PUBLIC WIRE, DELIBERATELY.**
     * Trustee-ratified `2026-09-08-207` **cl.1** made it `null` on `closed`/`verified` PUBLIC rows,
     * to close the roster-size-by-division channel on archived drives
     * (`confirmedContributionCount ÷ confirmedPercentage` recovers the roster).
     * ⭐ AC3 is a **FLOOR**: the public is `null` off-Live, so `null` here satisfies *member ≥
     * public* **exactly**. ⛔ Putting a number here instead would show a member MORE than the Panel
     * ruled — Trap 5, and it would re-open on the member wire the very channel cl.1 closed.
     */
    confirmedPercentage: z.number().int().min(0).max(100).nullable(),
    /**
     * ⭐⭐ **लक्ष्य — THE DRIVE'S EXPECTED CONTRIBUTION, IN WHOLE RUPEES**
     * (`#decision-2026-09-09-211`; Story 11b.15 AC8b).
     *
     * ⚠⛔ **OPTIONAL, AND THE KEY IS *ABSENT* RATHER THAN `null` WHEN WITHHELD** — the 11b.11 shape,
     * mirroring the public index's `driveTargetInr` exactly.
     *
     * ⛔⛔ **THE GATE IS `reveal_to_members`, ⛔ NOT `reveal_to_public` — ⭐ A CHOICE, ⛔ NOT A
     * TRANSCRIPTION** (`-211` **cl.2**). The routing note's §13.3 said *"on that same condition"*,
     * which read literally is the PUBLIC switch; cl.2 reads the MEMBER axis on three grounds —
     * `-190` cl.7(c) authorises the axes **separately**; the DB CHECK
     * `NOT (reveal_to_public AND NOT reveal_to_members)` makes public-on **imply** member-on so
     * `-189` cl.3 holds either way; and reading the public axis would ship an **INERT** member
     * switch. ⛔ Do ⛔ not reverse it silently.
     *
     * ⭐⭐ **IT IS DERIVED — `assignedCount × pools.fixed_amount` — ⛔ NEVER A FIGURE ANYONE TYPED.**
     * `-204` cl.2 supersedes `-190` cl.7(a): ⛔ **there is no setter**, and ⛔ nothing may read
     * `pariwar_drive_target_schedule` to "check" it.
     *
     * ⚠⛔ **ABSENT EVERYWHERE AT LAUNCH, AND THAT IS CORRECT — ⛔ NOT A GAP.** No
     * `pariwar_drive_target_visibility` row exists for any Pariwar and the absent-row default is
     * FAIL-CLOSED (`-190` cl.7(b)). ⚠ A zero-assignee pool carries ⛔ nothing either — silence,
     * ⛔ never `0`.
     */
    driveTargetInr: z.number().int().positive().optional(),
    /**
     * ⭐ **WHAT HAS REACHED THE FAMILY SO FAR, IN WHOLE RUPEES** — `2026-09-04-190` cl.6, with
     * `-189` cl.5 recording that rupee boundary as newly crossed on the public page.
     *
     * ⭐ `confirmedContributionCount × pools.fixed_amount` — 9.12 **Decision 3**'s canonical
     * identity, returned from the value the domain read ALREADY computes. ⛔⛔ Do ⛔ not re-derive it
     * anywhere ([[project_amount_raised_canonical_producer]]): a second multiplication is the defect.
     */
    amountRaisedInr: z.number().int().nonnegative(),
    /**
     * ⭐ NULLABLE, AND THE NULL IS LOAD-BEARING: `null` means ⛔ NO EXPECTATION WAS EVER SET — the
     * pool closed with ZERO assigned contributors (or a non-positive `fixed_amount`), so there is
     * nothing to compare a delivery against and the surface **SAYS NOTHING** rather than something
     * false. ⛔ `null` NEVER omits the row.
     */
    fundingOutcome: MemberDriveFundingOutcome.nullable(),
  })
  .strict();
export type MemberDriveListEntry = z.output<typeof MemberDriveListEntry>;

/**
 * ⭐ The producer-side pairing `MemberDriveListEntry` cannot express on its own.
 *
 * ⚠⛔ **WHY A PREDICATE AND ⛔ NOT A `superRefine`** — the public index's
 * `satisfiesLiveRowPercentagePairing` precedent, for the same reason: attaching it to the entry
 * would make a row carrying the wrong shape a CONTRACT violation, and the contract must stay
 * tolerant so a consumer can handle both shapes across a deploy. ⇒ the contract parses both; this
 * names the invariant for the one side that must GUARANTEE it — the producer — plus any test that
 * wants to assert the pairing without restating it in three places.
 *
 * ⭐ It covers **BOTH** stage-gated values in one predicate, because they are gated by the SAME
 * condition for two DIFFERENT reasons: `confirmedPercentage` by `2026-09-08-207` cl.1 (closing the
 * roster-recovery channel) and `driveTargetInr` by `-204` cl.2's ruled slot (*"right of the progress
 * bar, on a LIVE row"*). ⛔ Do ⛔ not collapse those two grounds into one comment elsewhere.
 *
 * ⛔ **DO ⛔ NOT use this to gate an inbound body.**
 *
 * [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09), THIRD pass.
 * ⚠⛔ **THE PARAMETER IS NARROWED TO THE THREE FIELDS THIS PREDICATE ACTUALLY READS**, and that is a
 * safety property, ⛔ not tidiness. It used to take a whole `MemberDriveListEntry`, so its ⛔ only
 * producer-side caller had to build a 3-field literal and cast it `as MemberDriveListEntry` — which
 * defeated the ⛔ ONE type check tying the guard to the shape it guards. ⇒ if this predicate ever
 * reads a FOURTH field, that cast would have silently supplied `undefined` and the guard would
 * mis-fire with ⛔ no compile error — on a guard whose whole purpose is catching the
 * `2026-09-08-207` cl.1 roster-size-recovery channel reopening. ⭐ With `Pick`, adding a field here
 * BREAKS THE BUILD at every call site instead. ⛔ Do ⛔ not widen it back to the full entry.
 */
export function satisfiesMemberDriveLiveRowPairing(
  entry: Pick<MemberDriveListEntry, 'status' | 'confirmedPercentage' | 'driveTargetInr'>,
): boolean {
  const percentageOk =
    entry.status === 'live'
      ? typeof entry.confirmedPercentage === 'number'
      : entry.confirmedPercentage === null;
  const targetOk = entry.status === 'live' ? true : entry.driveTargetInr === undefined;
  return percentageOk && targetOk;
}

/**
 * The query. ⛔ `.strict()` — an unknown parameter is a 400, ⛔ not an ignored one.
 *
 * ⚠⛔⛔ **THERE IS ⛔ NO `pariwarId` PARAMETER, AND ADDING ONE WOULD BE THE DEFECT.** AC2 scopes this
 * list to the member's **OWN** Pariwar **from the session**, ⛔ never from a client-supplied id
 * (family 12). ⇒ the scope is ⛔ not expressible in this query by construction.
 *
 * ⚠⛔ **AND THERE ARE ⛔ NO SEARCH FILTERS.** `2026-09-04-196` gives this surface three states and
 * ⛔ nothing else. The public index's three ruled dimensions (`district`, the close-date range,
 * `poolCode`) were ruled for **that** surface (11b.1 D2(a)); ⛔ they are ⛔ not inherited by
 * symmetry, and a filter here needs its own ruling.
 *
 * ⚠ `limit` carries `.max(...)` so Story 1.14's forced-pagination guard — which walks the LIVE
 * in-process swagger document — SEES a bound on this route. That is the second, independent FR-91
 * enforcement; the first is `clampLimit` in the domain accessor.
 */
export const MemberDriveListQuery = z
  .object({
    page: z.coerce.number().int().positive().max(MEMBER_DRIVE_LIST_PAGE_HORIZON).optional(),
    limit: z.coerce.number().int().positive().max(MEMBER_DRIVE_LIST_LIMIT_MAX).optional(),
  })
  .strict();
export type MemberDriveListQuery = z.output<typeof MemberDriveListQuery>;

/**
 * The response.
 *
 * ⚠ `total` is LIST SIZE — the count of drives the listing predicate admits. ⭐ Here it agrees with
 * the rendered row count, because an unresolvable name omits the NAME and ⛔ never the ROW.
 * ⛔ Never add an omission count: a per-row *"name withheld"* tally is an enumeration signal.
 */
export const MemberDriveListResponse = z
  .object({
    items: z.array(MemberDriveListEntry),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  })
  .strict();
export type MemberDriveListResponse = z.output<typeof MemberDriveListResponse>;
