// packages/contracts/src/public-pages/sahyog-vivran.ts
//
// The PUBLIC per-claim Sahyog Vivran transport DTO — Story 11b.3 (Task 3; AC3, AC4, AC6).
//
// The wire shape for
// `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:poolCanonicalIdentifier` — the THIRD route
// in the `public-pages` module. `apps/public` SSR calls it server-side; ⛔ no browser calls it
// directly, and ⛔ nothing about it is a member API.
//
// ── ⭐⭐ THE THIRD ROUTE — TWO OF THE THREE PROPERTIES STILL DO NOT HOLD, ⚠ BUT ONE NOW DOES ─────
// `routes.ts` rules in terms that the module's five controls are properties of *"an unauthenticated,
// PAGINATED, PII-BEARING public COLLECTION"*. ⚠ After the D6(b) split this route is a **single-item**
// GET on a path parameter (⛔ still not a collection) and declares `paginated: false` (⛔ still not
// paginated) — ⭐ but **Story 11b.3a MAKES IT PII-BEARING**: four ruled Tier-1 nominee-bank fields
// (`2026-08-28-165` cl.1/cl.3). ⇒ **D11(a)** (`2026-09-02-176`) ruled it states its APPLICABLE set,
// and 11b.3a MOVED that set — see `routes.ts` and the `login-wall.spec.ts` allowlist entry, ⛔ the
// only two places the count is written, and they must state the SAME one. ⛔ This file deliberately
// does not restate the list, so there is no third copy to drift.
//
// ── ⭐ WHAT THIS SHAPE DELIBERATELY DOES NOT CARRY ───────────────────────────────────────────────
// ⛔ NO IDENTIFIER: ⛔ no `member_id`, ⛔ no `deceased_member_id`, ⛔ no `claim_id`, ⛔ no `pool_id`,
// ⛔ no ciphertext, ⛔ no raw lifecycle value.
// ⛔ NO PERSON THE PANEL HAS NOT NAMED: ⛔ no deceased member's name, ⛔ no contributor name or
// count-of-named-rows, ⛔ no verifier identity. Those are **11b.3b**'s (`2026-09-02-173` / `-174`).
// ⚠⭐ AMENDED BY 11b.3a — the *"⛔ no nominee anything"* clause that stood here is now ⛔ FALSE and is
// corrected rather than deleted: the **account holder name, account number, IFSC and VPA** are
// carried, under `2026-08-28-160` cl.10 + `-165` cl.1/cl.3, WITH their four allowlist entries added
// in the SAME commit as the fields — which is the price the split's property always named.
// ⚠⛔ AND *"nominee anything"* WAS ITSELF THE WRONG PHRASE: `account_holder_name` is ⛔ NOT linked to
// a declared nominee (6.8 D1 — no FK, no rank, no match rule). It is the ACCOUNT HOLDER.
// ⚠ A public JSON route that over-returns is a leak the HTML tier-leak gate structurally CANNOT see —
// it scans rendered HTML, ⛔ not this payload — so the discipline has to live here.
//
// ── ⛔⛔ NO RUPEE FIGURE, AND ⛔ NOT BY OVERSIGHT ─────────────────────────────────────────────────
// `amountRaisedInr = confirmedCount × fixedAmount` is the SHIPPED canonical definition
// (`packages/ui/src/pool-progress/presenter.ts`, Story 9.12 Decision 3) and **D1(b)** ruled it
// CONSUMED — ⭐ but the presenter lives behind the `@twt/ui` fence this story does not lift, so the
// amount MOVES to **11b.3b**, which adds that dependency. ⛔ Re-deriving the multiplication anywhere
// is **D1(c)**, REFUSED, and a second multiplication is the defect.
// ⚠ THE INTERIM ASYMMETRY IS EXPECTED AND IS ⛔ NOT A DEFECT TO FILE: until 11b.3b merges this page
// shows a COUNT while the member app shows an AMOUNT for the same pool. ⭐ That is ORDERING, ⛔ not a
// ruling, and it is ⛔ NOT a second instance of the D7 inversion.
// ⭐ 11b.3b will need `rosterSize` and `fixedAmount` to feed the presenter — ⛔ nothing in this shape
// forbids adding them, and ⛔ adding a key is not a `.strict()` violation. ⛔ Do not pre-add them:
// a field with no render is the vacuous-leg defect wearing a forward-compatibility costume.
//
// ── ⭐ AND NO TARGET, EXPECTED TOTAL, PERCENTAGE, SHORTFALL OR COMPARISON FIGURE ─────────────────
// In any field, under any name (AC3). `classifyCycleOutcome` quarantines the target inside the domain
// read and only an opaque outcome enum leaves it; this shape is the second place that quarantine is
// enforced.
//
// ── Contracts discipline ────────────────────────────────────────────────────────────────────────
// ⛔ A contracts SOURCE file must not import `@twt/domain` (the browser-bundle rule — the domain
// barrel re-exports `encryption` → `node:async_hooks`), so the status / outcome / disposition enums
// are LOCAL wire-enums, value-aligned with the domain tuples rather than imported from them.

import { z } from 'zod';

/**
 * The drive's public status. ⭐ THREE labels here, ⛔ not the index's two.
 *
 * `collecting` derives from `pools.current_state = 'live'`, `active` from `'closed'` (the collection
 * window has shut; the family is not yet paid) and `archive` from `'settled'` (disbursed; terminal).
 *
 * ⚠⛔ THE THIRD LABEL IS WHY THIS ENUM IS NOT `PublicSahyogDriveStatus`. **D4(b)** (`2026-09-02-176`)
 * ruled this surface renders `live` + `closed` + `settled`, WIDER than the index's
 * `SAHYOG_DRIVE_VISIBLE_POOL_STATES`. ⛔ Do not "unify" the two enums: two surfaces, two predicates,
 * deliberately, and collapsing them would silently widen the INDEX.
 *
 * ⚠ NOTE THE INHERITED INVERSION: the drive a visitor reads as *"active"* is the one the substrate
 * calls `closed`. ⛔ Not a mistake to tidy — the internal word describes the CONTRIBUTION WINDOW, the
 * public word the DRIVE's standing in the record. ⛔ The internal tokens `spawned`, `live`, `closed`
 * and `settled` must never cross this boundary (`2026-08-21-144` cl.8).
 */
export const PublicSahyogVivranStatus = z.enum(['collecting', 'active', 'archive']);
export type PublicSahyogVivranStatus = z.output<typeof PublicSahyogVivranStatus>;

/**
 * Pool-Reality #2's outcome, as an OPAQUE ENUM — value-aligned with the domain `CycleFundingOutcome`.
 * ⭐ The whole point is that it is opaque: the totals are compared once inside `classifyCycleOutcome`
 * and ⛔ only this token leaves, so no shortfall figure can reach the copy path. ⛔ Do not add a
 * numeric companion to it, under any name.
 */
export const PublicSahyogVivranFundingOutcome = z.enum([
  'fully_funded',
  'under_funded',
  'partial',
]);
export type PublicSahyogVivranFundingOutcome = z.output<typeof PublicSahyogVivranFundingOutcome>;

/**
 * The BOUNDED, NON-PII appeal-disposition tag from Story 6.16's `claim.reversed` payload —
 * value-aligned with the domain `appealDispositionCategorySchema` / the `appeal_disposition_category`
 * pgEnum.
 *
 * ⛔⛔ THIS IS THE WHOLE OF WHAT MAY BE PUBLIC ABOUT AN APPEAL'S SUBSTANCE. The rationale TEXT and the
 * REVIEWER IDENTITY live on the `claim.appeal_stageN_reviewed` DECISION event's Tier-1 metadata row
 * and are ⛔ NEVER public — `claim.reversed` is the PUBLISH SIGNAL, ⛔ not the decision. ⛔ Do not add
 * a free-text field beside this, under any name.
 */
export const PublicSahyogVivranDispositionCategory = z.enum([
  'new_evidence_presented',
  'procedural_correction',
  'reconsideration_on_merits',
]);
export type PublicSahyogVivranDispositionCategory = z.output<
  typeof PublicSahyogVivranDispositionCategory
>;

/**
 * The *"Reversed by appeal"* lineage (AC5) — deny → appeal stage → reversal, and ⛔ nothing more.
 *
 * ⭐ DERIVED AT REQUEST TIME (**D12(a)**, `2026-09-02-176`): ⛔ no queue, ⛔ no consumer, ⛔ no
 * publication record. This surface holds ⛔ no publication STATE for a queue to advance, so a queue
 * here would be a consumer with ⛔ no effect. ⭐ Story 6.16's publish-hook obligation is DISCHARGED
 * BY THE READ — *"Closed by [edit]"*, ⛔ not *"deferred"*.
 *
 * ⚠ `null` on the parent when the claim was never reversed, and the page then renders NOTHING —
 * ⛔ no "not reversed" marker, ⛔ no placeholder. An omission that announces itself is an enumeration
 * signal, and here it would additionally publish a fact about claims that were NOT appealed.
 */
export const PublicSahyogVivranAppealReversal = z
  .object({
    /** Which appeal stage reversed the denial. ⛔ A bounded literal union, ⛔ never a free number. */
    reversedAtStage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    dispositionCategory: PublicSahyogVivranDispositionCategory,
    /** The reversal instant, ISO 8601 — the `claim.reversed` event's own `occurred_at`. */
    reversedAt: z.string().datetime(),
  })
  .strict();
export type PublicSahyogVivranAppealReversal = z.output<typeof PublicSahyogVivranAppealReversal>;

/**
 * ⭐⭐ THE PROHIBITED KEYS — THE CONFIRMED-ONLY INVARIANT ENCODED AS A **SHAPE** (AC4).
 *
 * Exported so the shape test asserts the prohibition rather than restating it, mirroring
 * `contributions/pool-contributor-list.ts`'s existing teeth: *"There is DELIBERATELY NO `status` /
 * `yellow` / `attested` / `utr` / `pending`-member-identity field anywhere in this shape … Adding any
 * of them is the one change this contract exists to forbid."*
 *
 * ⚠⛔ NOTE `status` IS ON THIS LIST, AND THAT IS WHY THE DRIVE'S LIFECYCLE FIELD IS NAMED
 * `driveStatus` AND ⛔ NOT `status` — a deliberate divergence from `PublicSahyogDriveEntry.status`.
 * A key called `status` on a surface whose subject is CONTRIBUTIONS reads as a contribution status
 * pill, which is exactly the yellow/attested door 8.3 and 9.5 closed structurally. ⭐ `driveStatus`
 * also matches the matrix field id (`drive_status`) on both surfaces, so the divergence costs
 * nothing. ⛔ Do not "harmonise" it back.
 */
export const SAHYOG_VIVRAN_PROHIBITED_KEYS = [
  'status',
  'yellow',
  'attested',
  'utr',
  'estimated',
  'projected',
] as const;


/**
 * ⭐⭐ ONE NOMINEE BANK ACCOUNT, AT THE `public` TIER — Story 11b.3a (AC2, AC4).
 *
 * Governance: `2026-08-28-160` **cl.10(a)** (complete details MAY be publicly displayed during an
 * active campaign) · **cl.10(e)** (the masked projection, DEFINED rather than delegated) ·
 * `2026-08-28-165` **cl.1** (all four fields in scope on `sahyog-vivran`) · **cl.2** (masking is
 * presentation — the fields stay **Tier-1 in every state**).
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * ⭐⭐ A DISCRIMINATED UNION, AND THE MASKED ARM MAKES THE FULL NUMBER **UNREPRESENTABLE**
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * AC4 requires that *"the full value never crosses the wire once masked"*. ⛔ A single shape with
 * `accountNumber` beside `accountNumberLast4` would make that a CONVENTION — one a handler bug
 * breaks silently, on the one surface where the failure is a published bank account number. ⇒ the
 * masked arm has ⛔ **NO `accountNumber` KEY AT ALL**, and `.strict()` is what makes populating one a
 * parse error rather than an ignored extra field.
 * ⛔ Do ⛔ **not** "simplify" this into one object with nullable fields. That is the change this
 * construct exists to forbid.
 *
 * ⚠ **AND THE MASKED ARM ALSO DROPS `accountHolderName` AND `vpa`, deliberately.** cl.10(e) is a
 * RETENTION list — *"retain the **last 4 digits** of the account plus the **bank / branch / IFSC**
 * identification needed for verification"* — and a retention list is exhaustive: what it does not
 * name is not retained. ⛔ Do not add either back on the ground that they are "less sensitive".
 *
 * ⚠⛔ **AND MASKING DOES ⛔ NOT CREATE A SECOND TIER.** `-165` cl.2, verbatim: *"Do not create a
 * separate Tier-1 classification merely because the public projection is masked. The underlying
 * account fields remain Tier-1."* ⇒ the four `RULED_TIER1_PUBLIC_EXCEPTIONS` entries cover **BOTH**
 * arms and the masked arm needs ⛔ none of its own. ⭐ The argument *"the masked view is only last-4,
 * so it isn't really Tier-1"* is **FORECLOSED**.
 *
 * ⛔⛔ **THE TWO ACCOUNTS ARE EQUAL PAYMENT DESTINATIONS.** `accountRank` is composite-PK IDENTITY —
 * ⛔ not a priority, ⛔ not a nominee rank, ⛔ not the 75/25 split, ⛔ not a routing instruction
 * (Story 9.9's re-scope). ⛔ Nothing may present one as primary, and ⛔ no ordering here implies
 * preference.
 *
 * ⚠⛔ **AND `accountHolderName` IS ⛔ NOT LABELLED "NOMINEE".** 6.8's **D1** deliberately removed the
 * linkage: the accounts are a CLAIM-SCOPED payment channel with ⛔ no FK to `member_nominees`, ⛔ no
 * rank and ⛔ no match rule. The key is named for what the column HOLDS — the account holder — ⛔ never
 * for what a reader assumes it holds. ⚠ `contracts/src/contributions/nominee-accounts.ts:18` calls it
 * *"the NOMINEE name"* and is WRONG; the schema is the authority and that contradiction is routed,
 * ⛔ not swept (`deferred-work.md`, Story 11b.3a).
 *
 * ⚠ EVERY VALUE IS NULLABLE, and `null` means the page renders **NOTHING** for it — ⛔ no placeholder,
 * ⛔ no *"not provided"* marker. Two causes: `vpa` is null for every nominee today (Story 8.4 shipped
 * the resolver seam ABSENT), and a decrypt that fails degrades that ONE field rather than the page.
 */
const NomineeAccountRank = z.union([z.literal(1), z.literal(2)]);

export const PublicSahyogVivranNomineeAccount = z.discriminatedUnion('masked', [
  z
    .object({
      /** ⭐ The FULL projection — cl.10(a), during an active campaign or before the window elapses. */
      masked: z.literal(false),
      accountRank: NomineeAccountRank,
      /** Tier-3 PLAINTEXT — public, IFSC-derived, non-identifying. ⛔ Nothing is decrypted for it. */
      bankName: z.string().min(1),
      branch: z.string().min(1).nullable(),
      /** ⚠ THE ACCOUNT HOLDER, ⛔ not "the nominee" — see the doc-block above. */
      accountHolderName: z.string().min(1).nullable(),
      accountNumber: z.string().min(1).nullable(),
      ifsc: z.string().min(1).nullable(),
      /** ⚠ NULL for every nominee today (Story 8.4). ⛔ Not an error, ⛔ not a gap. */
      vpa: z.string().min(1).nullable(),
    })
    .strict(),
  z
    .object({
      /** ⭐ cl.10(e)'s DEFINED masked projection. ⛔ Note the keys that are ABSENT. */
      masked: z.literal(true),
      accountRank: NomineeAccountRank,
      bankName: z.string().min(1),
      branch: z.string().min(1).nullable(),
      /**
       * ⭐ EXACTLY FOUR DIGITS, or `null`. ⛔ `null` when the stored value carries four or fewer
       * digits — at exactly four, *"the last four"* IS the complete account number, and cl.10(e)
       * says the complete number is ⛔ NOT exposed after masking.
       * ⚠ The DIGITS ALONE, ⛔ never a pre-formatted `••••1234`: the framing is the render layer's
       * localised copy, which is what lets assistive tech announce it as ONE coherent field instead
       * of reading a bare truncated string digit by digit (AC4, AC7).
       */
      accountNumberLast4: z.string().regex(/^\d{4}$/).nullable(),
      ifsc: z.string().min(1).nullable(),
    })
    .strict(),
]);
export type PublicSahyogVivranNomineeAccount = z.output<
  typeof PublicSahyogVivranNomineeAccount
>;

/**
 * One drive's Sahyog Vivran.
 *
 * ⚠⭐ AMENDED BY STORY 11b.3a — the *"every one of them is `pii_tier: 3`"* claim that stood here was
 * TRUE AT 11b.3 and is ⛔ **FALSE NOW**: `nomineeBankAccounts` carries **FOUR `pii_tier: 1` fields**
 * declared at `tier: public` under `2026-08-28-165` cl.1, each with its `tier1_public_exception`
 * block and its `RULED_TIER1_PUBLIC_EXCEPTIONS` entry, added in the SAME commit as the fields.
 * ⛔ Amended rather than deleted — the next reader will look for the claim.
 * ⭐ Every OTHER field on this shape is still matrix-classified `public` at `pii_tier: 3`.
 */
export const PublicSahyogVivranEntry = z
  .object({
    /**
     * The drive's letter code (Story 7.2's dual identifier). A label for a COLLECTION, ⛔ never a
     * person, and non-PII by construction.
     *
     * ⚠⛔ THE CURATED REGISTRY NAME IS DELIBERATELY **NOT** RESOLVED HERE, mirroring `/sahyog`.
     * `resolveCuratedPoolName` re-derives it by calling `reserveNames`, which RESERVES rows — ⛔ a
     * write path, and ⛔ not something an unauthenticated public GET may trigger. TWT-Bihar's
     * registry is EMPTY BY DESIGN (the UX amendment vetoed the culture-name overlay), so the letter
     * code is the committed, tested launch behaviour on every public surface. ⛔ Do not "add the
     * Mahabharata name" here without a read path that does not reserve.
     */
    poolLetterCode: z.string().min(1),
    /**
     * `P-YYYY-MM-###` — and on THIS surface also the route parameter.
     * ⚠⛔ IT IS SEQUENTIAL AND THEREFORE ENUMERABLE. `D4-linkage` is OPEN, D11(a) left
     * `limits.search` the only (unstated) bound on walking it, and **11b.3a** puts four DECRYPTED
     * Tier-1 fields behind this same identifier — routed to that story's AC2 by name.
     */
    poolCanonicalIdentifier: z.string().min(1),
    /** ⚠ `driveStatus`, ⛔ NOT `status` — see {@link SAHYOG_VIVRAN_PROHIBITED_KEYS}. */
    driveStatus: PublicSahyogVivranStatus,
    /**
     * The drive's close/settle instant, ISO 8601 — AC3's settlement-state source, from the
     * `pool.closed` / `pool.settled` event stream and ⛔ nothing else. `null` while the drive is
     * still collecting, and the page renders NOTHING for it rather than estimating.
     * ⛔ A date about a COLLECTION, ⛔ never a date about a person — ⛔ never sourced from one.
     */
    closedAt: z.string().datetime().nullable(),
    /** The claim subject's latest posting district, RAW. `null` when there is no posting row. */
    district: z.string().min(1).nullable(),
    /**
     * Contributions CONFIRMED as money received, reversals compensated (Story 9.5's canonical
     * financial truth). ⛔ A count, ⛔ never a sum of amounts, and ⛔ never a score.
     *
     * ⭐⛔ IT IS THE **EVENT** COUNT, ⛔ NEVER A ROW COUNT, AND THE TWO ARE DESIGNED TO DISAGREE:
     * an RTBF invocation removes a contributor from any rendered list ENTIRELY while the omitted
     * contributor STILL COUNTS here (`2026-08-30-169`). ⇒ ⛔ never derive this from the LENGTH of a
     * contributor list — at **11b.3b** this page will read *"N confirmed"* beside FEWER than N named
     * rows BY DESIGN, and ⛔ neither surface's copy may claim the list is complete.
     */
    confirmedContributionCount: z.number().int().nonnegative(),
    /**
     * ⭐ NULLABLE IN TWO CASES, both load-bearing, and the page says NOTHING for either:
     *   (a) the drive is still COLLECTING — AC3's honest copy is *"final outcome will appear after
     *       reconciliation settles"*, ⛔ never an estimate, ⛔ never an "X% confirmed so far" frame;
     *   (b) ⛔ NO EXPECTATION WAS EVER SET — zero assigned contributors. `classifyCycleOutcome`
     *       compares `deliveredTotal >= expectedTotal`, and at `0 >= 0` that is VACUOUSLY TRUE ⇒ it
     *       returned `fully_funded` for a drive that collected nothing (the 11b.1 review finding).
     * ⛔ The classifier is NOT changed — it is shared with the Panchayat Noticeboard and `/sahyog`
     * and its union's ordering is provenance-stable. ⛔ `partial` was considered and REJECTED: its
     * copy says *"Reconciliation is still in progress"*, ⛔ not true of a drive nobody was assigned
     * to — that trades a false statement for a misleading one.
     */
    fundingOutcome: PublicSahyogVivranFundingOutcome.nullable(),
    /** The appeal lineage, or `null` when the claim was never reversed. */
    appealReversal: PublicSahyogVivranAppealReversal.nullable(),
    /**
     * ⭐ THE NOMINEE BANK ACCOUNTS — Story 11b.3a. **At most TWO**, ordered `#1` then `#2`, and that
     * is an ORDER, ⛔ not a ranking: they are EQUAL payment destinations (Story 9.9).
     *
     * ⚠ `[]` when the claim's bank details were never collected (the 6.8 AC3 absence signal), and
     * the page then renders NOTHING — ⛔ no *"not recorded"* marker.
     *
     * ⭐ `.max(2)` is the SHAPE of the ruled substrate, ⛔ not a page size: the composite PK
     * `(claim_case_id, account_rank)` plus the `{1, 2}` CHECK make three accounts impossible, so a
     * third here means the read is not describing this substrate. ⛔ It is ⛔ NOT a pagination
     * affordance and does ⛔ not make this route a collection — see `PublicSahyogVivranResponse`.
     */
    nomineeBankAccounts: z.array(PublicSahyogVivranNomineeAccount).max(2),
  })
  .strict();
export type PublicSahyogVivranEntry = z.output<typeof PublicSahyogVivranEntry>;

/**
 * The path parameter.
 *
 * ⚠ Bounded and `.strict()` so a malformed identifier is a 400 at the schema boundary rather than a
 * database round-trip. ⛔ It is NOT pattern-matched against `P-YYYY-MM-###` here: the canonical format
 * is per-Pariwar configurable (`DEFAULT_POOL_CANONICAL_IDENTIFIER_FORMAT`), and a format regex in the
 * contract would silently 400 a legitimate Pariwar whose format differs. The read's exact-equality
 * lookup is what refuses an unknown identifier, and it refuses it as a 404 — ⛔ never as a
 * distinguishable "malformed" error, which would be an enumeration oracle.
 */
export const PublicSahyogVivranParams = z
  .object({
    pariwarId: z.string().uuid(),
    poolCanonicalIdentifier: z.string().trim().min(1).max(64),
  })
  .strict();
export type PublicSahyogVivranParams = z.output<typeof PublicSahyogVivranParams>;

/**
 * The query. ⛔ EMPTY and `.strict()` — there is nothing to filter, nothing to page and nothing to
 * export, so EVERY query parameter is a 400.
 *
 * ⭐⛔ THAT EMPTINESS IS WHY CONTROLS 2 AND 3 ARE STRUCTURALLY N/A (D11(a)): there is ⛔ no `limit`
 * for `PUBLIC_SURFACE_PAGE_SIZE_CAP` to bound and ⛔ no `page` for `PUBLIC_DIRECTORY_PAGE_HORIZON` to
 * bound. ⚠⛔ AND THEY COME BACK: **11b.3b** adds the contributor list, which makes this route
 * paginated — ⇒ it must restore both controls AND update `routes.ts`'s written defence AND the
 * `login-wall.spec.ts` allowlist entry, in its own commit. ⛔ A bare *"not applicable"* with no expiry
 * is how the two controls quietly never come back.
 * ⚠⛔ AND 11b.3a's `nomineeBankAccounts` IS ⛔ NOT A COLLECTION AFFORDANCE. Its `.max(2)` is the
 * shape of a substrate whose composite PK admits exactly `{1, 2}` — ⛔ there is nothing to page,
 * nothing to filter and nothing to walk, so it restores ⛔ neither control. ⭐ What 11b.3a DOES
 * restore is the route's **PII-BEARING** property, which is a different obligation on the same two
 * documents. ⛔ Neither sibling may restore a property and leave those two saying what they said.
 *
 * ⛔ NO EXPORT AFFORDANCE. No `format`, no `csv`, no `all` — FR-91 forbids bulk export from the
 * public side, and `.strict()` is what makes `?format=csv` a 400 rather than an ignored parameter.
 */
export const PublicSahyogVivranQuery = z.object({}).strict();
export type PublicSahyogVivranQuery = z.output<typeof PublicSahyogVivranQuery>;

/**
 * The response — ONE drive, ⛔ not a collection.
 *
 * ⚠⛔ THERE IS DELIBERATELY NO `items` KEY. Story 1.14's forced-pagination guard recognises a
 * collection GET by a top-level array OR that literal key, so naming anything here `items` would
 * make an UNPAGINATED single-item route look like an unbounded collection to the guard — the exact
 * inverse of the mistake `sahyog-drive.ts` documents on the other side.
 */
export const PublicSahyogVivranResponse = z
  .object({ drive: PublicSahyogVivranEntry })
  .strict();
export type PublicSahyogVivranResponse = z.output<typeof PublicSahyogVivranResponse>;
