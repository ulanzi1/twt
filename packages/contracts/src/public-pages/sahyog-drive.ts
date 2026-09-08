// packages/contracts/src/public-pages/sahyog-drive.ts
//
// The PUBLIC Sahyog Drive transport DTO — Story 11b.1 (Task 2; AC1, AC3, AC8).
//
// The wire shape for `GET /api/v1/p/:pariwarId/public-pages/sahyog-drive`: the SECOND
// collection-returning route behind an unauthenticated public page, and the first one Epic 11b
// ships. `apps/public` SSR calls it server-side; ⛔ no browser calls it directly, and ⛔ nothing
// about it is a member API.
//
// ── ⭐ WHAT THIS SHAPE DELIBERATELY DOES NOT CARRY ───────────────────────────────────────────────
// ⛔ NO `member_id`, ⛔ no `deceased_member_id`, ⛔ no `claim_id`, ⛔ no `pool_id`. ⛔ No ciphertext.
// ⛔ No raw lifecycle value. ⛔ No contributor identity at any grain. The response carries EXACTLY
// the fields classified `public` for the `sahyog-drive` surface in `public-vs-private-matrix.yaml`
// and nothing else, because a public JSON route that over-returns is a leak the HTML tier-leak gate
// structurally CANNOT see — it scans rendered HTML, not this payload.
//
// ⛔ AND THERE IS NO PER-POOL PERMALINK BY DESIGN. A per-entity identifier on a public wire is an
// enumeration primitive in its own right (11a.3, control 5), and a per-pool DETAIL surface is
// 11b.3's story, ⛔ not this one. The pool's canonical identifier and letter code are PUBLIC
// LABELS — they name a collection, ⛔ never a person — and are what the pool-code filter matches.
//
// ⛔ NO EXPORT AFFORDANCE. No `format`, no `csv`, no `all` — FR-91 forbids bulk export from the
// public side, and `.strict()` below is what makes `?format=csv` a 400 rather than an ignored
// parameter. The authorized export path is Story 10.7's scope-respecting, audit-logged library.
//
// ⛔ AND NO TARGET, EXPECTED TOTAL, PERCENTAGE, SHORTFALL OR COMPARISON FIGURE, in any field, under
// any name (AC4). `classifyCycleOutcome` quarantines the target inside the domain read and only an
// opaque outcome enum leaves it; this shape is the second place that quarantine is enforced.
//
// ── Contracts discipline ────────────────────────────────────────────────────────────────────────
// ⛔ A contracts SOURCE file must not import `@twt/domain` (the browser-bundle rule — the domain
// barrel re-exports `encryption` → `node:async_hooks`), so the status + outcome enums are LOCAL
// wire-enums, value-aligned with the domain tuples rather than imported from them.

import { z } from 'zod';

import { PUBLIC_SURFACE_PAGE_SIZE_CAP } from '../_common/pagination.js';
import { PUBLIC_DIRECTORY_PAGE_HORIZON } from './directory.js';

/**
 * ⭐ THE DEEP-PAGINATION HORIZON — SHARED with the Member Directory, ⛔ not a second constant.
 *
 * ⚠ Re-exported under this surface's own name rather than re-declared: two public surfaces with two
 * different horizons is exactly the drift a shared constant exists to prevent, and the 11a.2 lesson
 * is that a SECOND literal is how the two silently diverge. ⛔ If this surface ever needs its own
 * horizon that is an anti-enumeration change needing its own ruling — ⛔ never a quiet redeclaration.
 */
export const PUBLIC_SAHYOG_DRIVE_PAGE_HORIZON = PUBLIC_DIRECTORY_PAGE_HORIZON;

/**
 * The drive's public status. TWO labels, and ⛔ exactly two.
 *
 * ⭐ THIS ENUM SPEAKS THE PUBLIC VOCABULARY. `closed` derives from `pools.current_state = 'closed'`
 * (contributions have finished; they are being checked against bank records) and `verified` from
 * `'settled'` (every contribution checked; terminal).
 *
 * ⛔⛔ THE PREVIOUS RULE HERE IS SUPERSEDED, AND IT IS NAMED RATHER THAN OVERWRITTEN
 * ([[feedback_supersede_never_reinterpret]]). It read:
 *
 *   > *"NOTE THE DELIBERATE INVERSION: the drive a visitor reads as 'active' is the one the
 *   > substrate calls `closed`. That is not a mistake to tidy … ⛔ The internal tokens `spawned`,
 *   > `live`, `closed` and `settled` must never cross this boundary."*
 *
 * ⚠ That rule is **FALSE AS WRITTEN** from Story 11b.12 (**D1(b)**, BigDev 2026-09-04, implementing
 * Trustee-ratified `2026-09-04-190` cl.5 / `-191` cl.3 / `-193` cl.1). The public words are now
 * **Live · Closed · Verified**, and the wire is ALIGNED to them — because a wire that says `active`
 * for a drive the page labels *"Closed"* re-creates, one layer down, the exact word-means-its-
 * opposite trap the ruling exists to remove.
 *
 * ⭐⭐ SO `closed` NOW APPEARS ON BOTH SIDES OF THE BOUNDARY, AND THAT COINCIDENCE IS **RULED**,
 * ⛔ NOT A LEAK. `2026-08-21-144` cl.8 records `/members` having leaked the internal `lock-in` value
 * onto a public JSON route; the property that clause protects is *"⛔ no **UN-RULED** internal
 * vocabulary crosses"*, ⛔ **not** *"these four particular strings never appear"*. ⇒ the anti-leak
 * tests are ALLOW-lists (this enum's members, exactly), ⛔ never deny-lists.
 * ⚠⛔ **⛔ Do ⛔ NOT "fix" the overlap by reverting the wire** — read D1(b) first.
 *
 * ⚠ `spawned` remains a **PURE DENY**: it has ⛔ no public token at all and must ⛔ never cross.
 *
 * ⚠⛔⛔ **AMENDED 2026-09-07 (Story 11b.14, AC1) — `live` IS NOW A MEMBER. ⭐ The prior clause was a
 * ROUTING NOTE TO THAT STORY and it is NAMED, ⛔ never deleted**
 * ([[feedback_supersede_never_reinterpret]]). It read:
 *
 * > *"⛔ `live` is ⛔ **NOT** a member here — the index does ⛔ not list live drives (Story 11b-14)."*
 *
 * ⭐⭐ **STORY 11b-14 IS HERE.** `2026-09-04-189` **cl.2** (Trustee-ratified) rules that a collecting
 * drive **IS LISTED**, restoring **FR-76**; recorded at `2026-09-07-204`. ⚠ 11b.12 left the token out
 * deliberately (its own **AC7**: *"⛔ `live` is ⛔ NOT added to the public index enum — ⭐ that is
 * **story D**"*), so this is the ⭐ handover being taken, ⛔ not a fence being crossed.
 *
 * ⚠⛔ **AND THIS ENUM IS ⛔ NOT THE ONLY ARTEFACT** — `apps/public/src/lib/sahyog.server.ts` carries a
 * **hand-typed literal set** of these same tokens that the typecheck ⛔ CANNOT see, and getting it
 * wrong serves `/sahyog`'s **OUTAGE** page to every visitor. ⛔ Change this tuple ONLY together with
 * that guard (`apps/public/tests/sahyog-serves.test.ts` derives from `.options` and is what catches
 * the drift).
 */
export const PublicSahyogDriveStatus = z.enum(['live', 'closed', 'verified']);
export type PublicSahyogDriveStatus = z.output<typeof PublicSahyogDriveStatus>;

/**
 * Pool-Reality #2's outcome, as an OPAQUE ENUM — value-aligned with the domain
 * `CycleFundingOutcome`. ⭐ The whole point is that it is opaque: the totals are compared once
 * inside `classifyCycleOutcome` and ⛔ only this token leaves, so no shortfall figure can reach the
 * copy path. ⛔ Do not add a numeric companion to it, under any name.
 */
export const PublicSahyogDriveFundingOutcome = z.enum([
  'fully_funded',
  'under_funded',
  'partial',
]);
export type PublicSahyogDriveFundingOutcome = z.output<typeof PublicSahyogDriveFundingOutcome>;

/** One rendered drive row. ⛔ Every field matrix-classified `public` for `sahyog-drive`. */
export const PublicSahyogDriveEntry = z
  .object({
    /**
     * ⭐ THE DECEASED MEMBER'S NAME, CONSENT-GATED — `null` when the family has not consented, has
     * REVOKED, or the name is unresolvable. All three are the same wire value on purpose: a
     * distinguishable "withheld" marker would be an enumeration signal, and the page renders
     * NOTHING for a null — ⛔ no placeholder, ⛔ no empty span, ⛔ no comment naming the omission.
     *
     * ⛔ NULL NEVER OMITS THE ROW. Consent decides whether a drive is NAMED, ⛔ never whether it
     * EXISTS — everything below renders regardless, so the index degrades PER-POOL, never per-page.
     * ⚠ This is the DELIBERATE INVERSE of the Member Directory, which drops the row instead.
     *
     * ⚠ Tier-1 in origin, resolved server-side through `resolvePublicMemberName` in the Pariwar's
     * configured form (`full_name` is the DEFAULT, ⛔ not a constant — `2026-08-19-136` cl.1), and
     * published under the SECOND ruled `tier1_public_exception` (`2026-08-24-159` cl.2 / D1(b)).
     * ⛔ NEVER through `resolvePoolIdentity()`, which hard-codes the shielded form.
     */
    deceasedMemberName: z.string().min(1).nullable(),
    /**
     * ⭐⭐ **THE NOMINEE'S NAME** — Story 11b.14 (AC7), Trustee-ratified 2026-09-05 (Dhiraj Rahul +
     * Kalpana Bharti), recorded at `2026-09-07-205` cl.1.
     *
     * ⛔⛔ **IT RENDERS UNDER THE RULED PUBLIC LABEL "Nominee Name" — ⛔ *"Account holder"* MAY ⛔ NOT
     * BE USED** (`2026-09-04-190` **cl.2**). ⭐ **FULL name form**, ruled by the same 2026-09-05 pass
     * (cl.2 had settled the LABEL and ⛔ said nothing about the FORM) ⇒ `deferred-work.md`'s
     * `D-nominee-name-form` is **CLOSED BY RULING**.
     *
     * ⛔⛔ **THIS IS A SECOND RULING, ⛔ NOT AN INHERITANCE FROM THE DRIVE PAGE.** `-190` cl.2 ruled
     * ONE DRIVE'S PAGE, reached one drive at a time by an opaque address; this surface is a
     * paginated list of up to FIFTY rows. ⭐ The Panel was shown that **bulk-harvest** property and
     * **ACCEPTED** it (routing note §9.4) — ⛔ do ⛔ not re-litigate it, and ⛔ do ⛔ not "soften" it
     * with a name form the Panel did not rule.
     *
     * ⚠ `null` means the name is **not available** — the claim's bank details were never collected
     * (6.8 **AC3**'s absence signal), or the decrypt failed. ⛔ **NULL NEVER OMITS THE ROW**, and the
     * absence ⛔ never announces itself: ⛔ no placeholder, ⛔ no marker, ⛔ no "withheld".
     *
     * ⚠⛔ **THE VALUE IS UNVERIFIED TODAY** — ⛔ no FK and ⛔ no match rule to `member_nominees` (6.8
     * **D1** removed the linkage on purpose), and ⛔ nobody in the approval chain can read the
     * ciphertext to check it. ⭐ **Story 6.18** closes that. ⛔⛔ Do ⛔ NOT add a join or a match rule
     * here, and ⛔ do ⛔ not block on 6.18: the Panel ruled the exposure KNOWING it.
     *
     * ⛔ ⛔ **NO OTHER NOMINEE-BANK VALUE CROSSES** — ⛔ no account number, ⛔ no last-4, ⛔ no IFSC,
     * ⛔ no VPA, ⛔ no bank, ⛔ no branch. Those keys are **ABSENT**, ⛔ never `null` (the 11b.11
     * shape), and `.strict()` makes adding one a parse error rather than a silent extra field.
     */
    nomineeName: z.string().min(1).nullable(),
    /** The pool's letter code (Story 7.2's dual identifier) — a label for a COLLECTION. */
    poolLetterCode: z.string().min(1),
    /** `P-YYYY-MM-###`. Public, and what the pool-code filter matches EXACTLY. */
    poolCanonicalIdentifier: z.string().min(1),
    /**
     * ⭐⭐ THE DRIVE'S OPAQUE PUBLIC ADDRESS TOKEN — Story 11b.10 (AC3, D2/D3).
     *
     * ⭐ THIS IS WHAT MAKES THE INDEX'S PER-ROW LINK POSSIBLE, and it is the whole reason it is on
     * the wire: `/sahyog-vivran/[driveToken]` is addressed by this value and by ⛔ nothing else, so
     * a row that does not carry it cannot link to the drive it is describing. ⛔ The client
     * ⛔ NEVER derives an address from `poolCanonicalIdentifier` — that identifier is no longer
     * addressable, and reconstructing an address from it would re-create the guessability D2 removed.
     *
     * ⚠⛔ AND SAY WHAT SHIPPING IT DOES, ⛔ do not let a reviewer find it in a diff (D3, Trap 2):
     * **every listed drive becomes ONE CLICK from four Tier-1 fields under `D8-default` FAIL-OPEN.**
     * That is the NECESSARY CONSEQUENCE of `2026-09-03-184` **(A)** + **(B)** — (A) says drives
     * should be reachable and (B) removed the only path there was — ⛔ not a fresh exposure decision.
     *
     * ⛔ It is `pii_tier: 3`: an ADDRESS, ⛔ not a person, ⛔ not derived from one, and ⛔ not a
     * credential for the DATA behind it (D1 — the page answers 200 to anyone holding a valid one).
     * ⇒ it needs ⛔ no `tier1_public_exception` and ⛔ no `RULED_TIER1_PUBLIC_EXCEPTIONS` entry.
     */
    publicToken: z.string().min(1),
    status: PublicSahyogDriveStatus,
    /**
     * The drive's close/settle instant, ISO 8601. `null` when the pool's stream carries no such
     * event yet. ⛔ A date about a COLLECTION, ⛔ never a date about a person — this is not a date
     * of death and must never be sourced from one.
     */
    closedAt: z.string().datetime().nullable(),
    /** The deceased member's latest posting district, RAW. `null` when there is no posting row. */
    district: z.string().min(1).nullable(),
    /**
     * Contributions CONFIRMED as money received, reversals compensated (Story 9.5's canonical
     * financial truth). ⛔ A count, ⛔ never a sum of amounts, and ⛔ never a score: nothing orders
     * by it, and no "most-supported" view is offered at any tier (AC5).
     *
     * ⚠⛔⛔ **AMENDED 2026-09-07 (Story 11b.14, `D2`) — ⛔ THE SENTENCE ABOVE IS NARROWED, ⛔ NEVER
     * DELETED, AND ITS ORIGINAL TEXT IS KEPT VERBATIM** ([[feedback_supersede_never_reinterpret]]).
     *
     * ⭐⭐ **WHAT MOVED:** `2026-09-04-190` **cl.6** (Trustee-ratified) puts a RUPEE FIGURE on this
     * surface, and `-189` **cl.5** records that boundary as *"newly crossed … and recorded as
     * such"*. ⇒ ⭐ this row now carries **`amountRaisedInr`**, which IS a sum of amounts.
     *
     * ⭐⭐ **AND READ THE PROVENANCE BEFORE ASSUMING THE SENTENCE WAS A RULING — IT WAS ⛔ NOT.**
     * 11b.1's **AC5** — *"remembrance, not analytics"*, that story's own load-bearing commitment —
     * prohibits, in terms: **leaderboards · rankings · gamification · social-performance metrics ·
     * popularity metrics**. ⛔ It does ⛔ **not** name a sum. ⇒ *"never a sum of amounts"* was the
     * **AUTHOR'S EXTENSION** of AC5, written adjacent to the ordering clause AC5 genuinely supports.
     *
     * ⭐⭐ **THE SURVIVING HALF STAYS ENFORCED, AND IT IS THE HALF AC5 ACTUALLY RULED:** ⛔ nothing
     * orders by the count or the amount · ⛔ ⛔ no *"most-supported"* view at any tier · ⛔ no ranking
     * · ⛔ no comparison **between** drives · ⛔ no badge, streak or achievement.
     * ⚠ The amendment **NARROWS** the sentence; ⛔ it does ⛔ not repeal AC5.
     */
    confirmedContributionCount: z.number().int().nonnegative(),
    /**
     * ⭐⭐ THE PROGRESS METER'S FILL, 0-100 — Story 11b.14 (AC2), under `2026-09-04-189` **cl.2(b)**
     * (*each listed drive carries a progress bar*) and `2026-09-07-204` **cl.1**.
     *
     * ⚠⛔ **IT MEASURES CONTRIBUTORS, ⛔ NOT RUPEES.** The Trustee Panel, 2026-09-07: *"Progress bar
     * should show the % of contributor already contributed in that pool."* ⇒ it is
     * `confirmedContributionCount ÷ assignedCount`, computed SERVER-SIDE. ⚠ This **supersedes**
     * `2026-09-04-191` **cl.4** (*"the bar fills against a RUPEE target"*) — ⭐ named, ⛔ not re-read.
     *
     * ⛔⛔ **THE DENOMINATOR ITSELF ⛔ NEVER CROSSES.** `assignedCount` is ⛔ not a member of this
     * object, under any name — minimum disclosure. ⚠ ⭐ **The consequence is RECORDED, ⛔ not
     * glossed:** the confirmed count is on the same row, so the assignee count is recoverable by
     * division. ⭐ That is inherent to the ruling, and it is precisely what closed the channel that
     * used to recover the hidden rupee **target** — the division now returns a headcount.
     *
     * ⚠⛔⛔ **`null` ON `closed` AND `verified` ROWS — Trustee-ratified `2026-09-08-207` cl.1
     * (Dhiraj Rahul + Kalpana Bharti), routing note §3, RULING (A).** The figure is a **Live-row
     * datum**: the read path returns `null` unless the drive is `live`, so a visitor reading the
     * JSON route can ⛔ no longer recover an **archived** drive's roster size by division. ⭐ The
     * Live-row `82%` and its accepted recoverability (`2026-09-07-204` cl.1) are **undisturbed**;
     * ⛔ `2026-09-07-206` cl.1 is ⛔ NOT reversed. This matches
     * `public-vs-private-matrix.yaml`'s `drive_progress_percentage` description
     * (*"LIVE rows only; `null` on Closed and Verified"*), which is the ruling.
     *
     * ⚠⛔ **AND ⛔ NOTHING ORDERS BY IT** (AC5, 11b.1): ⛔ no ranking, ⛔ no "most-supported" view,
     * ⛔ no comparison between drives.
     *
     * ⚠⛔⛔ **ONE DIVERGENCE WITH A SIBLING STORY IS RECORDED HERE, ⛔ NOT SLID PAST — ⭐ and ⛔
     * NEITHER STORY KNEW OF THE OTHER.** `11b-3b` (`ready-for-dev`) **AC3b** records, for the
     * **DRIVE PAGE**: *"⛔⛔ **ONLY `amountRaisedInr` IS AUTHORISED.** The presenter also emits
     * **`confirmedPercentage`** … ⛔ **not** authorised by `D1(b)` … ⛔ **It needs its own
     * decision**."* ⇒ ⭐ the two stories hold **opposite postures on adjacent contracts.**
     * ⭐ **On THIS surface — the INDEX — the percentage is squarely `2026-09-04-189` cl.2(b)'s
     * ratified bar** (*"each carries a progress bar"*) and is ⛔ outside `11b-3b`'s scope, so
     * Story 11b.14 ships it. ⛔ It does ⛔ **not** decide `11b-3b`'s question, and ⛔ does not amend
     * that story's file — ⭐ it names the divergence from this side so ⛔ no per-story pass can miss
     * it ([[feedback_circular_deferral_between_sibling_stories]]).
     */
    confirmedPercentage: z.number().int().min(0).max(100).nullable(),
    /**
     * ⭐⭐ **लक्ष्य / *"Expected"* — THE DRIVE'S EXPECTED CONTRIBUTION, IN WHOLE RUPEES.**
     * Story 11b.14 (AC2, `D4`), Trustee-ratified 2026-09-07; recorded at `2026-09-07-204` cl.2-4.
     *
     * ⚠⛔ **OPTIONAL, AND THE KEY IS *ABSENT* RATHER THAN `null` WHEN WITHHELD** — the 11b.11 shape.
     * ⭐ It is present ⛔ ONLY when a `super_admin` has switched **`reveal_to_public`** ON for the
     * Pariwar (`2026-09-04-190` **cl.7(c)**), and ⛔ only for a pool with at least one assignee.
     * ⇒ ⛔⛔ **absent everywhere at launch**: no visibility row exists for any Pariwar and the
     * absent-row default is FAIL-CLOSED (`cl.7(b)`).
     *
     * ⭐⭐ **IT IS DERIVED — `assignedCount × pools.fixed_amount` — ⛔ NEVER A FIGURE ANYONE TYPED.**
     * *"Use the derived total."* ⇒ `2026-09-04-189` **cl.2(d)** (per-Pariwar, same for every drive)
     * is superseded **as to the VALUE** and **`-190` cl.7(a)** (the Pariwar Admin sets it) outright:
     * ⛔ **there is no setter.** ⛔ Do ⛔ not reintroduce one, and ⛔ do ⛔ not read
     * `pariwar_drive_target_schedule` to "check" it.
     *
     * ⭐ **THE BAR AND THIS FIGURE ⛔ CANNOT DISAGREE** — `amount / लक्ष्य = (confirmed × fA) /
     * (assigned × fA) = confirmed / assigned` = {@link confirmedPercentage}. ⛔ An identity, ⛔ not a
     * guard: ⛔ do ⛔ not add a reconciling check.
     *
     * ⚠⛔ **A ZERO-ASSIGNEE POOL CARRIES ⛔ NOTHING — ⭐ silence, ⛔ never `0`.** The same posture
     * `fundingOutcome` already takes: no expectation was ever set, so the surface says nothing
     * rather than something false.
     */
    driveTargetInr: z.number().int().positive().optional(),
    /**
     * ⭐⭐ **WHAT HAS REACHED THE FAMILY SO FAR, IN WHOLE RUPEES** — Story 11b.14 (AC3), under
     * Trustee-ratified `2026-09-04-190` **cl.6**, with `-189` **cl.5** recording that this
     * *"puts a RUPEE FIGURE on a public page for the first time … the boundary is newly crossed and
     * is recorded as such."*
     *
     * ⚠⛔⛔ **THIS CROSSES A SENTENCE THIS VERY FILE USED TO CARRY, AND THAT SENTENCE IS AMENDED, ⛔
     * NEVER DELETED** — see {@link confirmedContributionCount} below it. ⭐ *"⛔ never a sum of
     * amounts"* was an **AUTHOR'S EXTENSION** of 11b.1 **AC5**, which prohibits **leaderboards ·
     * rankings · gamification · social-performance metrics · popularity metrics** and ⛔ does ⛔ not
     * name a sum. ⭐ **AC5's surviving half stays ENFORCED:** ⛔ nothing orders by this figure, ⛔ no
     * *"most-supported"* view at any tier, ⛔ no ranking, ⛔ no comparison **between** drives.
     *
     * ⭐ `confirmedContributionCount × pools.fixed_amount` — 9.12 **Decision 3**'s canonical
     * identity, returned from the value the domain read ALREADY computes. ⛔ Do ⛔ not re-derive it
     * anywhere, and ⛔ **never** in `apps/public` (Story 11b.3 **D1(c)**, REFUSED in code at four
     * sites: *"a second multiplication **anywhere in this app** is the defect"*).
     *
     * ⚠⛔ **AND THE DRIVE PAGE IS ⛔ NOT THIS FIELD'S TWIN.** `sahyog-vivran`'s amount belongs to
     * **`11b-3b`** by `2026-09-02-176` **D1(b)** — a ruling three days older — which consumes
     * `derivePoolProgressCardViewModel(...).amountRaisedInr` UNCHANGED and lifts the `@twt/ui` fence
     * THERE. ⛔ Story 11b.14 renders ⛔ nothing on that page.
     */
    amountRaisedInr: z.number().int().nonnegative(),
    /**
     * ⭐ NULLABLE, AND THE NULL IS LOAD-BEARING (Review, 2026-08-27): `null` means ⛔ NO EXPECTATION
     * WAS EVER SET for this drive — the pool closed with ZERO assigned contributors, so there is
     * nothing to compare a delivery against and the surface SAYS NOTHING rather than saying
     * something false.
     *
     * ⚠ WHY THIS IS NOT A CLASSIFIER BUG: `classifyCycleOutcome` compares `deliveredTotal >=
     * expectedTotal`, and at `0 >= 0` that is VACUOUSLY TRUE ⇒ it returned `fully_funded` for a
     * drive that collected nothing, publishing *"The cycle closed with the support it needed."*
     * beside *"0 confirmed"*. ⛔ The classifier is NOT changed — it is shared with the Panchayat
     * Noticeboard and Sahyog Vivran and its union's ordering is provenance-stable. The zero-
     * expectation case is resolved BEFORE the call, by returning `null` instead of classifying.
     *
     * ⛔ `partial` was considered and REJECTED: its copy says *"Reconciliation is still in
     * progress"*, which is ⛔ not true of a drive that had nobody assigned — that trades a false
     * statement for a misleading one.
     *
     * ⭐ The page renders NOTHING for a null — the SAME *"null ⇒ NOTHING, ⛔ no placeholder"*
     * discipline `deceasedMemberName` above already uses. ⛔ NULL NEVER OMITS THE ROW.
     */
    fundingOutcome: PublicSahyogDriveFundingOutcome.nullable(),
  })
  .strict();
export type PublicSahyogDriveEntry = z.output<typeof PublicSahyogDriveEntry>;

/**
 * ⭐⭐ **cl.1's CONDITIONAL HALF, SAID ONCE — Story 11b.14, FOURTH review pass (2026-09-08).**
 *
 * ⚠⛔⛔ **THE GAP THIS CLOSES (AI-6-5 family 4).** `2026-09-08-207` cl.1 is a **conditional**
 * invariant — *"`null` **unless** the drive is `live`"* — but the field above can only express its
 * UNCONDITIONAL half (`.nullable()`, *"a number or null"*). ⇒ the producer enforced the condition
 * (`public-read.ts`, gated on `currentState === 'live'`), the public consumer enforced it again by
 * hand (`apps/public/src/lib/sahyog.server.ts`), and ⛔ **nothing shared expressed it** — so the two
 * enforcements drifted apart within one commit and the drift was a 100%-visitor outage.
 *
 * ⭐⭐ **IT IS A PREDICATE, ⛔ NOT A `superRefine` ON THE ENTRY — and that is deliberate.** Attaching
 * it to {@link PublicSahyogDriveEntry} would make an archived row carrying a number a **contract
 * violation**, which is exactly the strictness BigDev ruled OUT: a pre-cl.1 `apps/api` emits that
 * shape, and rejecting it breaks the *"unless the public consumer handles BOTH shapes"* escape the
 * deploy ruling turns on. ⇒ ⭐ the contract stays TOLERANT (both shapes parse), and this predicate
 * names the invariant for the one side that must GUARANTEE it — the producer — plus any test that
 * wants to assert the pairing without restating it.
 *
 * ⛔ **DO ⛔ NOT use this to gate an inbound body.** Its only correct uses are (a) asserting a
 * producer's output and (b) documenting the pairing in one place instead of three.
 */
export function satisfiesLiveRowPercentagePairing(entry: PublicSahyogDriveEntry): boolean {
  return entry.status === 'live'
    ? typeof entry.confirmedPercentage === 'number'
    : entry.confirmedPercentage === null;
}

/**
 * The query. ⛔ `.strict()` — an unknown parameter is a 400, ⛔ not an ignored one. That is what
 * makes `?format=csv`, `?all=1` and `?name=…` refusals rather than no-ops.
 *
 * ⭐ THE THREE RULED SEARCH DIMENSIONS (D2(a)), and ⛔ THERE IS NO FOURTH. All three are answerable
 * WITHOUT a single decrypt, which is precisely why they are the three.
 *
 * ⛔⛔ THERE IS NO `name` PARAMETER, AND ADDING ONE IS NOT A SMALL FEATURE. `member_kyc_profiles`
 * carries ⛔ no blind index and envelope encryption gives every name its OWN DEK, so two members
 * with the same name have unrelated ciphertext — there is nothing to `WHERE` on. The workaround
 * that suggests itself — decrypt the roster and filter in JS — is the exact amplification
 * `DIRECTORY_DECRYPT_CONCURRENCY` exists to close, one order of magnitude worse: a page decrypt is
 * 50 rows per request; a name search is the WHOLE ROSTER, per request, per keystroke, with the
 * cache structurally unable to help (every query string is a fresh key).
 * ⚠ Name search is DEFERRED — Resolved via explicit deferral, ⛔ not closed — on a `name_blind_index`
 * substrate story. ⭐ And note a RENDERED name is still ⛔ NOT a SEARCHABLE one: rendering reads one
 * row you already selected; searching needs a predicate over every row you have not.
 *
 * ⚠ `limit` carries `.max(PUBLIC_SURFACE_PAGE_SIZE_CAP)` so Story 1.14's forced-pagination guard —
 * which walks the LIVE in-process swagger document, ⛔ not `openapi/v1.yaml` — SEES a bound on this
 * route. That is the second, independent FR-91 enforcement.
 */
export const PublicSahyogDriveQuery = z
  .object({
    page: z.coerce.number().int().positive().max(PUBLIC_SAHYOG_DRIVE_PAGE_HORIZON).optional(),
    limit: z.coerce.number().int().positive().max(PUBLIC_SURFACE_PAGE_SIZE_CAP).optional(),
    /** Exact district match. ⛔ Not a prefix — a prefix filter is an enumeration primitive. */
    district: z.string().trim().min(1).max(120).optional(),
    /** Inclusive lower bound on the drive's close/settle instant, ISO 8601. */
    closedFrom: z.string().datetime().optional(),
    /** Inclusive upper bound on the drive's close/settle instant, ISO 8601. */
    closedTo: z.string().datetime().optional(),
    /** The pool's canonical identifier or letter code. EXACT match, ⛔ never a prefix scan. */
    poolCode: z.string().trim().min(1).max(64).optional(),
  })
  .strict();
export type PublicSahyogDriveQuery = z.output<typeof PublicSahyogDriveQuery>;

/**
 * The response.
 *
 * ⚠ `total` is INDEX SIZE — the count of drives the listing predicate admits — ⛔ not a promise
 * about how many rows rendered. ⭐ BUT NOTE THE REASON DIFFERS FROM THE MEMBER DIRECTORY'S, and
 * this is the seam where "mirror the directory in every respect" stops: there, an unresolvable name
 * suppresses the ROW, so a page really can come up short of `total`. HERE an unconsented or
 * unresolvable name omits the NAME and the ROW SURVIVES — so rendered rows and `total` agree except
 * for pagination and the publication switch. A NAMELESS row still counts.
 * ⛔ Still never describe `total` as a rendered count, and ⛔ never add an omission count: a
 * per-row "name withheld" tally is exactly the enumeration signal this surface forbids announcing.
 */
export const PublicSahyogDriveResponse = z
  .object({
    /**
     * ⭐ NAMED `items`, AND THAT IS LOAD-BEARING, ⛔ not a style choice — Story 1.14's
     * forced-pagination guard recognises a collection GET by a top-level array OR literally this
     * key. Renaming it leaves the route INVISIBLE to the guard while the AC's claim of a second,
     * independent FR-91 enforcement stays in the comments, false.
     */
    items: z.array(PublicSahyogDriveEntry),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  })
  .strict();
export type PublicSahyogDriveResponse = z.output<typeof PublicSahyogDriveResponse>;
