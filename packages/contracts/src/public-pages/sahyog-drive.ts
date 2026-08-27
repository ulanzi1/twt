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
 * ⭐ THIS ENUM SPEAKS THE PUBLIC VOCABULARY, ⛔ NEVER THE INTERNAL LIFECYCLE VOCABULARY.
 * `active` derives from `pools.current_state = 'closed'` (the collection window has shut; the
 * family is not yet paid) and `archive` from `'settled'` (disbursed; terminal).
 *
 * ⚠ NOTE THE DELIBERATE INVERSION: the drive a visitor reads as *"active"* is the one the substrate
 * calls `closed`. That is not a mistake to tidy — the internal word describes the CONTRIBUTION
 * WINDOW, the public word describes the DRIVE's standing in the record. ⛔ The internal tokens
 * `spawned`, `live`, `closed` and `settled` must never cross this boundary; `2026-08-21-144` cl.8
 * records `/members` having leaked the internal `lock-in` value onto a public JSON route, and this
 * surface is built not to repeat it.
 */
export const PublicSahyogDriveStatus = z.enum(['active', 'archive']);
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
    /** The pool's letter code (Story 7.2's dual identifier) — a label for a COLLECTION. */
    poolLetterCode: z.string().min(1),
    /** `P-YYYY-MM-###`. Public, and what the pool-code filter matches EXACTLY. */
    poolCanonicalIdentifier: z.string().min(1),
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
     */
    confirmedContributionCount: z.number().int().nonnegative(),
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
