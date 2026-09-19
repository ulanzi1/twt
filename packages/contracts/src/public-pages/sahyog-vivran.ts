// packages/contracts/src/public-pages/sahyog-vivran.ts
//
// The PUBLIC per-claim Sahyog Vivran transport DTO — Story 11b.3 (Task 3; AC3, AC4, AC6).
//
// The wire shape for
// `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:driveToken` — the THIRD route
// in the `public-pages` module. `apps/public` SSR calls it server-side; ⛔ no browser calls it
// directly, and ⛔ nothing about it is a member API.
//
// ── ⭐⭐ THE THIRD ROUTE — TWO OF THE THREE PROPERTIES STILL DO NOT HOLD, ⚠ BUT ONE NOW DOES ─────
// `routes.ts` rules in terms that the module's five controls are properties of *"an unauthenticated,
// PAGINATED, PII-BEARING public COLLECTION"*. ⚠ After the D6(b) split this route is a **single-item**
// GET on a path parameter (⛔ still not a collection) and declares `paginated: false` (⛔ still not
// paginated) — ⭐ but **Story 11b.3a MADE IT PII-BEARING**: four ruled Tier-1 nominee-bank fields
// (`2026-08-28-165` cl.1/cl.3). ⇒ **D11(a)** (`2026-09-02-176`) ruled it states its APPLICABLE set,
// and 11b.3a MOVED that set — see `routes.ts` and the `login-wall.spec.ts` allowlist entry, ⛔ the
// only two places the count is written, and they must state the SAME one. ⛔ This file deliberately
// does not restate the list, so there is no third copy to drift.
// ⭐⛔ **AMENDED BY STORY 11b.11 — THE COUNT IS **ONE**, AND THE PROPERTY IS NARROWED, ⛔ NOT REVOKED.**
// `2026-09-04-190` cl.1 (+ `-191` cl.1 for the VPA) withdraws the account number, IFSC, VPA, bank and
// branch from `public`; ⭐ `nominee_account_holder_name` STAYS (`-190` cl.2). ⇒ the route is ⛔ **no
// longer PII-bearing in the NOMINEE-BANK sense** — but it is ⛔ **still PII-bearing**: it carries the
// surviving nominee name, and 11b.3b's `deceased_member_name` exposure is untouched. ⛔ Do ⛔ not
// restore the pre-11b.3a wording anywhere; amend it.
//
// ── ⭐ WHAT THIS SHAPE DELIBERATELY DOES NOT CARRY ───────────────────────────────────────────────
// ⛔ NO IDENTIFIER: ⛔ no `member_id`, ⛔ no `deceased_member_id`, ⛔ no `claim_id`, ⛔ no `pool_id`,
// ⛔ no ciphertext, ⛔ no raw lifecycle value.
// ⛔ NO PERSON THE PANEL HAS NOT NAMED: ⛔ no deceased member's name, ⛔ no contributor name or
// count-of-named-rows, ⛔ no verifier identity. Those are **11b.3b**'s (`2026-09-02-173` / `-174`).
// ⚠⛔⛔ **AMENDED 2026-09-15 (Story 11b.3b, Task 2 unit 2) — ⛔ THE SENTENCE ABOVE IS KEPT AND ⛔ NOT
// REWRITTEN** ([[feedback_supersede_never_reinterpret]]). ⭐ **11b.3b IS HERE, AND THE PANEL HAS NOW
// NAMED ONE OF THEM:** `2026-09-02-173` rules the **deceased member's FULL NAME** onto this surface
// (unconditional per `-175`), declared in the matrix with its own `tier1_public_exception` in the
// same commit as the field (`2026-08-28-165` cl.3). ⇒ `deceasedMemberName` is CARRIED.
// ⛔⛔ **THE CLAUSE'S OTHER THREE SUBJECTS STAY FORBIDDEN AND THAT IS THE HALF THAT MATTERED:**
// ⛔ no **contributor** name and ⛔ no count-of-named-rows (`-174`'s render is 11b.3b's **Task 3**,
// which owns the pagination, ordering and bounded decrypt that list requires — ⛔ shipping rows
// without them is an unbounded unauthenticated decrypt fan-out), and ⛔ ⛔ no verifier identity,
// which ⛔ nobody has ruled at any tier.
// ⚠⭐ **AND THE NAME IS INERT ON THE DAY IT SHIPS** — `NAME_PUBLICATION_AUTHORISED` is `false` for
// every member until counsel's clause exists and is pinned (OVERDUE since 2026-09-07), so this key
// is `null` on every drive today. ⭐ That is the DESIGNED state, ⛔ not an unfinished render, and
// ⛔⛔ ⛔ no placeholder `clause_versions` row may be seeded to change it.
// ⚠⭐ AMENDED BY 11b.3a — the *"⛔ no nominee anything"* clause that stood here is now ⛔ FALSE and is
// corrected rather than deleted: the **account holder name, account number, IFSC and VPA** are
// carried, under `2026-08-28-160` cl.10 + `-165` cl.1/cl.3, WITH their four allowlist entries added
// in the SAME commit as the fields — which is the price the split's property always named.
// ⚠⛔ AND *"nominee anything"* WAS ITSELF THE WRONG PHRASE: `account_holder_name` is ⛔ NOT linked to
// a declared nominee (6.8 D1 — no FK, no rank, no match rule). It is the ACCOUNT HOLDER.
// ⭐⛔ **AMENDED AGAIN BY 11b.11 — FOUR BECAME ONE, AND ⛔ NOT BACK TO ZERO.** `2026-09-04-190` cl.1 +
// `-191` cl.1 withdraw the **account number, IFSC, VPA, bank name and branch**; ⛔ **only the account
// holder name remains**, and it is rendered under the ruled public label **"Nominee Name"** (`-190`
// cl.2). ⚠ The 6.8 D1 sentence above is about the **DATA** and it STANDS — `-190` cl.2 rules the
// **PRESENTATION** only, and ⛔ no column, field id or wire key is renamed. ⇒ the shape carries ⛔ no
// account number, ⛔ no last-4, ⛔ no IFSC, ⛔ no VPA, ⛔ no bank and ⛔ no branch — **ABSENT keys**,
// ⛔ never `null` ones.
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
// ⚠⛔⛔ **AMENDED 2026-09-15 (Story 11b.3b, AC3b) — ⛔ THE SENTENCE ABOVE IS SPENT AND ITS INVITATION
// IS WITHDRAWN. ⛔ It is KEPT as the record and ⛔ NOT rewritten** ([[feedback_supersede_never_reinterpret]]).
// ⛔⛔ **⛔ NEITHER `rosterSize` NOR `fixedAmount` MAY EVER REACH THIS WIRE.** Their PRODUCT is लक्ष्य
// (`2026-09-07-204` cl.2), which cl.3 reserves to a `super_admin` reveal and cl.8 closed
// *"BY CONSTRUCTION"* — *"the wire carries the PERCENTAGE only, ⛔ never `rosterSize`"*. ⇒ ⭐ 11b.3b
// does ⛔ NOT feed the `@twt/ui` presenter here (it takes both factors as INPUTS); the ruled figure
// `amountRaisedInr` is computed SERVER-SIDE in the domain read and crosses ALONE
// (`2026-09-04-190` cl.6). ⚠ And it crosses as a FIGURE, ⛔ never a comparison (`2026-09-15-218` cl.4).
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

// ⭐⭐ Story 11b.3b (Task 3, AC4) — THE TWO SHARED BOUNDS, ⛔ IMPORTED AND ⛔ NEVER RE-DECLARED.
// ⛔ A second literal `50`/`200` here would let the two public surfaces drift into two different
// *"the FR-91 cap"* — the exact defect the 11a.2 review found in a *"shared cap"* claim whose
// comment named a constant that did not exist. ⛔ Raising either is a ruling, ⛔ not a tuning knob.
import { PUBLIC_SURFACE_PAGE_SIZE_CAP } from '../_common/pagination.js';
import { PUBLIC_DIRECTORY_PAGE_HORIZON } from './directory.js';

/**
 * The drive's public status. ⭐ THREE labels here, ⛔ not the index's two.
 *
 * `live` derives from `pools.current_state = 'live'` (contributions are open), `closed` from
 * `'closed'` (contributions have finished; they are being checked against bank records) and
 * `verified` from `'settled'` (every contribution checked; terminal).
 * ⚠⛔ THE PREVIOUS TEXT HERE SAID *"the family is not yet paid"* / *"disbursed"*. ⛔ Both are FALSE:
 * `2026-09-04-192` establishes the trust ⛔ NEVER disburses — colleagues pay the nominee directly,
 * so a family is paid THROUGHOUT a drive, ⛔ never at a payout step (Story 11b.12, AC2).
 *
 * ⚠⛔ THE THIRD LABEL IS WHY THIS ENUM IS NOT `PublicSahyogDriveStatus`. **D4(b)** (`2026-09-02-176`)
 * ruled this surface renders `live` + `closed` + `settled`, WIDER than the index's
 * `SAHYOG_DRIVE_VISIBLE_POOL_STATES`. ⛔ Do not "unify" the two enums: two surfaces, two predicates,
 * deliberately, and collapsing them would silently widen the INDEX.
 *
 * ⛔⛔ THE PREVIOUS RULE HERE IS SUPERSEDED, AND IT IS **RETRACTED BY NAME**, ⛔ not silently
 * overwritten ([[feedback_supersede_never_reinterpret]]). It read:
 *
 *   > *"NOTE THE INHERITED INVERSION: the drive a visitor reads as 'active' is the one the substrate
 *   > calls `closed`. **⛔ Not a mistake to tidy** — the internal word describes the CONTRIBUTION
 *   > WINDOW, the public word the DRIVE's standing in the record. ⛔ The internal tokens `spawned`,
 *   > `live`, `closed` and `settled` must never cross this boundary."*
 *
 * ⚠⛔ **THE *"⛔ Not a mistake to tidy"* SENTENCE IS RETRACTED IN PARTICULAR.** It was an instruction
 * to a future reader ⛔ **not to do the thing Story 11b.12's D1(b) rules** — and leaving it standing
 * would be worse than leaving a stale word. Story 11b.12 (**D1(b)**, BigDev 2026-09-04, implementing
 * Trustee-ratified `2026-09-04-190` cl.5 / `-191` cl.3 / `-193` cl.1) rules that the inversion **IS**
 * to be aligned: the public words are **Live · Closed · Verified** and the wire says the same.
 *
 * ⭐⭐ SO `live` AND `closed` NOW APPEAR ON BOTH SIDES OF THE BOUNDARY, AND THAT COINCIDENCE IS
 * **RULED**, ⛔ NOT A LEAK. `2026-08-21-144` cl.8 records `/members` having leaked the internal
 * `lock-in` value onto a public JSON route; the property that clause protects is *"⛔ no **UN-RULED**
 * internal vocabulary crosses"*, ⛔ **not** *"these four particular strings never appear"*. ⇒ the
 * anti-leak tests are ALLOW-lists (this enum's members, exactly), ⛔ never deny-lists.
 * ⚠⛔ **⛔ Do ⛔ NOT "fix" the overlap by reverting the wire** — read D1(b) first.
 *
 * ⚠ `spawned` remains a **PURE DENY**: it has ⛔ no public token at all and must ⛔ never cross.
 */
export const PublicSahyogVivranStatus = z.enum(['live', 'closed', 'verified']);
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
 * ⭐⭐ ONE NOMINEE BANK ACCOUNT, AT THE `public` TIER — ⛔ **AND AFTER STORY 11b.11 IT CARRIES THE
 * NOMINEE'S NAME AND ⛔ NOTHING ELSE.**
 *
 * Governance: [`2026-09-04-190`](../../../../.decision-log.md#decision-2026-09-04-190) **cl.1**
 * (Trustee-ratified — Dhiraj Rahul, Kalpana Bharti) removes `nominee_account_number`,
 * `nominee_ifsc`, `nominee_bank_name` and `nominee_branch` from `public`; **cl.2** keeps
 * `nominee_account_holder_name` at `public` under the wording **"Nominee Name"**.
 * [`2026-09-04-191`](../../../../.decision-log.md#decision-2026-09-04-191) **cl.1** (separately
 * Trustee-ratified) supplies the **FIFTH** field — `nominee_vpa` — which `-190` cl.1 does ⛔ **NOT**
 * name. ⇒ ⛔ do ⛔ not key the `vpa` removal to `-190`; without `-191` its own *"FOUR pairs → ONE"*
 * arithmetic does ⛔ not close.
 *
 * ⭐⛔ **`2026-08-28-165` cl.1–2 ARE SUPERSEDED IN PART** (four ruled `(surface, field)` Tier-1 pairs
 * → **one**). ⛔ `-165` is Trustee-ratified and is ⛔ **NOT edited in place**; its **cl.3–4** —
 * *masking is a presentation/projection policy; the underlying fields stay Tier-1 in every state* —
 * ⛔ **STAND UNCHANGED**, and the surviving entry rests on them.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * ⭐⭐ WHAT WAS HERE: A `z.discriminatedUnion('masked', […])`. ⛔ MASKING WAS ⛔ NOT DELETED
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * Until 11b.11 this shape was a **two-arm discriminated union on a `masked` literal**. The
 * **unmasked** arm carried `bankName` · `branch` · `accountHolderName` · `accountNumber` · `ifsc` ·
 * `vpa`; the **masked** arm carried `bankName` · `branch` · `accountNumberLast4` · `ifsc` and
 * deliberately **DROPPED** `accountHolderName` and `vpa`, so that *"the full value never crosses the
 * wire once masked"* was **UNREPRESENTABLE** rather than a convention (`-165` cl.1; `2026-08-28-160`
 * cl.10(e)).
 *
 * ⭐ **WHY IT COLLAPSED.** `-190` cl.1 + `-191` cl.1 take the five coordinates off the public surface
 * and `-191` **cl.2** rules the masked projection must ⛔ **NOT** drop the nominee name — ⛔ otherwise
 * a masked drive would render an **EMPTY** bank block. ⇒ both arms reduce to `accountHolderName`
 * (+ `rank`) and become **IDENTICAL**, leaving `masked` an **INERT discriminator**. Story 11b.11
 * **D1(b)** ruled the public wire collapses to a single `.strict()` object: ⛔ **the wire may not
 * advertise a control it no longer exercises.**
 *
 * ⛔⛔ **THE MASKING MACHINERY IS ⛔ NOT DELETED — `-190` cl.4 forbids it** (*"we may use it in
 * future"*). It lives, whole, at `packages/domain/src/claim/nominee-bank-masking-policy.ts` and
 * `nominee-bank-masking.ts`, with the `pariwar_nominee_bank_masking_schedule` table, its permission
 * key, its admin surface and every one of its tests. ⚠⛔ **What changed is its STATUS: after 11b.11
 * it has ⛔ NO PUBLIC CONSUMER.** The public read no longer **CALLS** the predicate — ⛔ never compute
 * a verdict and discard it — and ⛔ nothing Trustee-facing may describe it as a live safeguard until
 * it has a consumer again.
 *
 * ⭐ **AND THE COLLAPSED SHAPE CARRIES ⛔ NO CIPHERTEXT IT DOES NOT USE.** The old read model returned
 * `masked: boolean` **alongside** the complete `accountNumberCiphertext` / `accountHolderNameCiphertext`
 * / `ifscCiphertext` / `vpaCiphertext` of every account, with ⛔ nothing in the **TYPE** changing when
 * `masked === true` — the guarantee was a downstream promise, ⛔ not a structural property. ⇒ the
 * public read now selects and decrypts **`account_holder_name_ciphertext` ONLY**. ⛔ Do ⛔ not
 * re-introduce a flag beside the payload it is meant to govern.
 *
 * ⛔⛔ **THE TWO ACCOUNTS ARE EQUAL PAYMENT DESTINATIONS.** `accountRank` is composite-PK IDENTITY —
 * ⛔ not a priority, ⛔ not a nominee rank, ⛔ not the 75/25 split, ⛔ not a routing instruction
 * (Story 9.9's re-scope). ⛔ Nothing may present one as primary, and ⛔ no ordering here implies
 * preference.
 *
 * ⭐⚠ **THE PUBLIC LABEL IS "NOMINEE NAME" — AND THE COLUMN IS ⛔ NOT RENAMED.** 6.8's **D1**
 * deliberately removed the nominee linkage: the accounts are a CLAIM-SCOPED payment channel with ⛔ no
 * FK to `member_nominees`, ⛔ no rank and ⛔ no match rule, and the key is named for what the column
 * HOLDS — the account holder. ⚠⛔ **That reasoning is about the DATA and it STANDS.** `-190` cl.2 is
 * Trustee-ratified and rules the **PUBLIC WORDING** only: the field id `nominee_account_holder_name`,
 * this wire key `accountHolderName` and the column `account_holder_name_ciphertext` are **UNCHANGED**.
 * ⇒ this file's previous claim that `contracts/src/contributions/nominee-accounts.ts:18` calling it
 * *"the NOMINEE name"* **is WRONG** was a claim about the **schema**, ⛔ not about the page — it is
 * amended, ⛔ not deleted, and `deferred-work.md`'s `D5-subject(i)` is ⛔ **NOT** resolved by adding a
 * join or a match rule.
 * ⚠⛔ **AND THE RESIDUAL IS STATED, because the page now asserts this to the internet:** the account
 * holder **may not be the nominee**, and per `D5-subject(ii)` ⛔ no verifier, ⛔ no state trustee and
 * ⛔ no correcting admin can **READ** this name (the only read-back is a **presence** view). ⇒ the one
 * field that survives the withdrawal is both **unverified** and, today, **unverifiable**. ⛔ Recorded,
 * ⛔ not hidden, and ⛔ not 11b.11's to fix — it is a Story 6.10-family change, already routed.
 *
 * ⚠ `accountHolderName` IS NULLABLE, and `null` means the page renders **NOTHING** for it — ⛔ no
 * placeholder, ⛔ no *"not provided"* marker. ⭐ **ONE cause remains** — a decrypt that fails degrades
 * that ONE field rather than the page. ⚠⛔ **The other cause named here until 11b.11 is GONE with the
 * field it described:** *"`vpa` is null for every nominee today (Story 8.4 shipped the resolver seam
 * ABSENT)"*. Its **REASON was wrong** and `-191` **cl.5** ordered the correction — **8.4 deferred VPA
 * collection; ⭐ 8.13 BUILT it** (column `vpa_ciphertext`, migration 0080; a real optional input on
 * each account; 11 of 558 accounts carry one). ⇒ a null VPA is a nominee who ⛔ did not fill in an
 * **optional** field — a **PERMANENT** property, ⛔ never a pending one. It is recorded here because
 * the VPA still exists on the **member** payment path; it is only the **public** arm that is gone.
 * ⚠ **NARROWED AT STORY 8.17, and ⛔ only on the member side:** `#decision-2026-09-10-212` cl.2
 * (Trustee-ratified) now carries the VPA on the member payment **WIRE** and renders it on the payment
 * screen — where, until 8.17, it was consumed server-side only. ⛔ **NOTHING HERE CHANGES:** the public
 * arm stays withdrawn under `-190` cl.1 / `-191` cl.1 (a **MEMBER** field, ⛔ not a public one), and cl.2
 * rules the payment screen ⛔ ONLY. ⛔ No sweep may read 8.17 as re-opening the public projection.
 */
const NomineeAccountRank = z.union([z.literal(1), z.literal(2)]);

export const PublicSahyogVivranNomineeAccount = z
  .object({
    accountRank: NomineeAccountRank,
    /**
     * ⭐ The ⛔ ONLY nominee-bank value at `public` — `-190` cl.2. Rendered under the label
     * **"Nominee Name"**, ⛔ never *"Account holder"*.
     * ⚠⛔ `.strict()` above is load-bearing: it is what makes `accountNumber`, `accountNumberLast4`,
     * `ifsc`, `vpa`, `bankName` and `branch` **parse errors** rather than silently-ignored extras.
     * ⛔ The keys are **ABSENT**, ⛔ never `null` — the same discipline `-165` established for the
     * masked arm, and for the same reason.
     */
    accountHolderName: z.string().min(1).nullable(),
  })
  .strict();
export type PublicSahyogVivranNomineeAccount = z.output<
  typeof PublicSahyogVivranNomineeAccount
>;

/**
 * One drive's Sahyog Vivran.
 *
 * ⚠⭐ AMENDED BY STORY 11b.3a — the *"every one of them is `pii_tier: 3`"* claim that stood here was
 * TRUE AT 11b.3 and went FALSE at 11b.3a, which declared **FOUR `pii_tier: 1` fields** at
 * `tier: public` under `2026-08-28-165` cl.1.
 * ⭐⛔ **AMENDED AGAIN BY STORY 11b.11 — THE COUNT IS NOW **ONE**.** `2026-09-04-190` cl.1 (+ `-191`
 * cl.1 for `nominee_vpa`) supersedes `-165` cl.1–2 **IN PART**: `nomineeBankAccounts` carries
 * **ONE** `pii_tier: 1` field at `tier: public` — `nominee_account_holder_name`, with its
 * `tier1_public_exception` block and its single `RULED_TIER1_PUBLIC_EXCEPTIONS` entry, re-keyed to
 * `-190` cl.2.
 * ⛔ Both prior claims are amended rather than deleted — the next reader will look for each.
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
     * `P-YYYY-MM-###` — ⭐⛔ **RENDERED, ⛔ NO LONGER ADDRESSABLE** (Story 11b.10, AC1).
     *
     * ⚠⛔ IT IS SEQUENTIAL AND THEREFORE ENUMERABLE, which is why it stopped being the route
     * parameter: `PublicSahyogVivranParams` now takes an opaque token, and `D4-linkage`'s residual
     * — *"`limits.search` is the only bound on walking it"* — is **CLOSED by that change**, ⛔ not by
     * anything on this line.
     * ⭐ It is RETAINED here deliberately (`2026-09-03-184` cl.2): it is the operational/audit key a
     * family or an operator quotes to the helpline, and the page shows it. ⛔ Do not delete it, and
     * ⛔ do not make it addressable again.
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
     * ⭐⭐ THE DECEASED MEMBER'S NAME — Story 11b.3b, `2026-09-02-173` (Trustee Panel: Kalpana
     * Bharti, Dhiraj Rahul), **YES at the FULL NAME**, unconditional per `2026-09-02-175`.
     *
     * ⭐ **ONE RESOLVED STRING**, the output of `resolvePublicMemberName(mode, storedName)` under the
     * Pariwar's STORED presentation mode. ⛔ It is ⛔ never decomposed, and the boundary ⛔ never calls
     * `splitFirstNameLastInitial` — that produces the **SHIELDED** form, on the one surface the
     * Panel ruled **FULL NAME**, with every test still green. ⛔ And ⛔ never a literal `full_name`:
     * `2026-08-19-136` cl.1 — *"a build in which the public name form cannot be changed without a
     * code change FAILS this clause"*.
     *
     * ⚠⛔⛔ **`null` ON EVERY DRIVE TODAY, BY DESIGN.** `NAME_PUBLICATION_AUTHORISED` requires a
     * pinned `clause_versions` row for `niy.public-disclosure.member-information`; counsel's written
     * clause is still owed and there is ⛔ no migration, ⛔ no seed and ⛔ no writer for it. ⇒ the
     * gate is FAIL-CLOSED for every member and the page renders ⛔ no name — ⭐ INERT, ⛔ not broken
     * (`2026-09-08-209` cl.2). ⛔⛔ ⛔ Do ⛔ not seed a placeholder row to make it look alive.
     *
     * ⭐ **`null` OMITS THE NAME, ⛔ NEVER THE PAGE** — the sibling index's shipped rule
     * (`public-pages/handlers.ts`), and the deceased member's arm of AC3's per-subject omission
     * ruling. ⭐ Since `2026-09-16-219` cl.1 the CONTRIBUTOR arm agrees: an unrenderable name keeps
     * its ROW and renders the placeholder. ⚠ It was the opposite until then (*"omits the ROW, which
     * exists only to carry it"* — SUPERSEDED, quoted ⛔ not deleted); the two subjects still differ in
     * what fills the gap — the deceased name renders ⛔ nothing, a contributor row renders `A contributor`.
     *
     * ⚠ FOUR CAUSES REACH THIS `null` IDENTICALLY and that is intended, because ⛔ none of them
     * authorises a render: ⛔ no authorising basis · ⛔ no KYC profile row · a failed decrypt · an
     * unresolvable name (a **MONONYM** under `shielded_name`, which `resolvePublicMemberName`
     * returns `''` for — `2026-08-21-145` cl.3). ⛔ There is ⛔ no per-cause signal on the wire: one
     * would be an enumeration oracle over which members have accepted which T&C version.
     *
     * ⚠⛔ `.min(1)` IS LOAD-BEARING — the boundary normalises with **`.trim() || null`, ⛔ never
     * `=== ''`** (Review finding 2026-09-08, already fixed on the sibling). A whitespace-only stored
     * name would otherwise arrive TRUTHY and render a blank where a person's name belongs.
     */
    deceasedMemberName: z.string().min(1).nullable(),
    /**
     * Contributions CONFIRMED as money received, reversals compensated (Story 9.5's canonical
     * financial truth). ⛔ A count, ⛔ never a sum of amounts, and ⛔ never a score.
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
     *
     * ⚠⛔⛔ **AND ⛔ NOTHING ON *THIS* SURFACE CHANGES IN STORY 11b.14 — ⭐ THE AMENDMENT REACHES THE
     * SENTENCE, ⛔ NOT THE RENDER.** `D2` rules the amount onto **both** the index and the drive
     * page, ⛔ but the drive page's figure belongs to **`11b-3b`** by `2026-09-02-176` **D1(b)** — a
     * ruling three days older — whose **AC3b** consumes
     * `derivePoolProgressCardViewModel(...).amountRaisedInr` **UNCHANGED** and lifts the `@twt/ui`
     * fence THERE. ⇒ ⭐ 11b.14 amends this comment and renders ⛔ **nothing** here.
     * ⚠⛔ **AMENDED 2026-09-15 (Story `11b-3b`, AC11(c)) — ⛔ THE MECHANISM ABOVE IS SUPERSEDED; the
     * sentence is KEPT as the record and ⛔ not rewritten** ([[feedback_supersede_never_reinterpret]]).
     * ⛔ **11b.3b does ⛔ NOT consume the `@twt/ui` presenter here, and ⛔ does not lift that fence for
     * the amount.** ⭐ The presenter takes **`rosterSize` and `fixedAmount` as INPUTS**, and
     * `2026-09-07-204` **cl.3** and **cl.8** reserve that pair to a `super_admin` reveal ⇒ consuming it on
     * a PUBLIC surface would put **both factors** on this wire, which `:60-61` forbids *"in any field,
     * under any name"*. ⇒ ⭐ the amount is taken **SERVER-SIDE** from the domain read's own
     * `deliveredTotal` and published as **`amountRaisedInr`** (`2026-09-04-190` **cl.6**, with
     * `-189` **Consequence 5** recording the rupee boundary as NEWLY CROSSED).
     * ⭐ **`D1(c)` is UNCHANGED and still REFUSED** — the arithmetic happens exactly ONCE, in the
     * domain read; ⛔ nothing is re-derived in `apps/public`.
     * ⛔⛔ **AND ⛔ DO ⛔ NOT COMPUTE IT LOCALLY WHEN THAT STORY LANDS** — `D1(c)` is REFUSED in code
     * at four `apps/public` sites: *"a second multiplication **anywhere in this app** is the
     * defect"* ([[project_amount_raised_canonical_producer]]).
     *
     * ⭐⛔ IT IS THE **EVENT** COUNT, ⛔ NEVER A ROW COUNT, AND THE TWO ARE DESIGNED TO DISAGREE:
     * an RTBF invocation withholds a contributor's NAME (on this page the row stays and renders the
     * placeholder — `2026-09-16-219` cl.1) while the erased contributor STILL COUNTS here
     * (`2026-08-30-169`). ⇒ ⛔ never derive this from the LENGTH of a
     * contributor list — at **11b.3b** this page will read *"N confirmed"* beside FEWER than N named
     * rows BY DESIGN, and ⛔ neither surface's copy may claim the list is complete.
     */
    confirmedContributionCount: z.number().int().nonnegative(),
    /**
     * ⭐⭐ THE RULED PUBLIC RUPEE FIGURE — Story 11b.3b (AC3b). `2026-09-04-190` **cl.6**, with
     * `2026-09-04-189` **Consequence 5** recording the rupee boundary as NEWLY CROSSED.
     *
     * ⭐ Computed SERVER-SIDE in the domain read as `confirmedContributionCount × pools.fixed_amount`
     * — ⛔ ONCE, clamped at 0 — and it is the SAME binding `classifyCycleOutcome` consumes as its
     * `deliveredTotal`. ⛔⛔ **A SECOND `× fixedAmount` ANYWHERE IS THE DEFECT** (Story 11b.3's
     * **D1(c)**, REFUSED), and `scripts/sahyog-vivran-financial-truth` mechanizes the refusal.
     *
     * ⛔⛔ **IT IS A FIGURE, ⛔ NEVER A COMPARISON** (`2026-09-15-218` **cl.4**). ⛔ It may ⛔ not be
     * paired with, divided by or captioned against a target, an expected total or a roster size:
     * their ratio IS the completion percentage cl.1 refuses, and reconstructing it by hand re-opens
     * the channel `2026-09-07-204` cl.8 closed. ⚠ `:60-61`'s fence is UNCHANGED and still binds.
     *
     * ⚠ `.nonnegative()` IS LOAD-BEARING, ⛔ not decoration: `pools.fixed_amount` has ⛔ no DB
     * positivity CHECK, so an unclamped negative would fail HERE — as a 500 on the whole page. The
     * clamp lives in the domain read; this is the second line of that defence.
     */
    amountRaisedInr: z.number().int().nonnegative(),
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
 * ⭐⭐ ONE CONFIRMED CONTRIBUTOR, AT THE `public` TIER — Story 11b.3b (Task 3, AC3/AC4).
 *
 * Governance: [`2026-09-02-174`](../../../../.decision-log.md#decision-2026-09-02-174) (Trustee
 * Panel) — the contributor's name MAY appear on this page, at the **FULL NAME**; made
 * **UNCONDITIONAL** by `2026-09-02-175` (cl.3's apparent condition was CORRECTED away, ⛔ not met).
 * ⭐ The basis is `2026-09-16-219` **cl.6**: MEMBERSHIP ITSELF — contributing is a public act.
 * ⚠⛔ **BASIS CORRECTED 2026-09-18 (fourth review pass)** — this cited *"the member's OWN acceptance of
 * the membership T&C (`2026-08-28-160` cl.7)"*, which does ⛔ not reach a LIVING subject; `-219` cl.6
 * forbids re-citing it. ⛔ Missed by both earlier sweeps.
 *
 * ⛔⛔ **ONE FIELD, AND THE SHAPE IS THE FENCE.** `.strict()` over a single `name` makes every
 * anti-leaderboard prohibition a PARSE ERROR rather than a convention:
 *   · ⛔ ⛔ no per-contributor AMOUNT — ⛔ not a sum, ⛔ not a share, ⛔ not a count. 11b.1 **AC5**
 *     forbids leaderboards, rankings, gamification and social-performance metrics, and a
 *     per-person figure is the shortest path to all four.
 *   · ⛔ ⛔ no RANK, ⛔ no position, ⛔ no ordinal, ⛔ no "top contributor" anything.
 *   · ⛔⛔ **⛔ NO ROW KEY** — `D10-rowkey`(a), RULED at `2026-09-02-177` cl.3: ⛔ not an `index`,
 *     ⛔ not a `member_id`, ⛔ not a token. Astro SSR emits static HTML with ⛔ no reconciler, so
 *     there is nothing for a key to serve — and a per-member identifier beside a name is a
 *     PERMALINK, which is an enumeration primitive in its own right (11a.3, control 5).
 *
 * ⭐ **ONE RESOLVED STRING** — the output of `resolvePublicMemberName(mode, storedName)` under the
 * Pariwar's stored mode. ⛔ It is ⛔ never decomposed and the boundary ⛔ never calls
 * `splitFirstNameLastInitial`: that is the SHIELDED form, which is what the MEMBER surface renders
 * and is ⛔ NOT what `-174` ruled here.
 * ⚠⛔ **THAT DIVERGENCE IS THE `-195` cl.1 INVERSION** — carried under `2026-09-02-177` **cl.2**
 * (`D9-inversion`(a)), ⛔ BUT THAT CLAUSE IS **SUPERSEDED** by `2026-09-04-189` cl.3, which says the
 * inversion MUST BE CLOSED (`2026-09-18-221` cl.2) ⇒ this is a breach of a STANDING ruling being
 * carried, ⛔ not an accepted trade. On merge the PUBLIC sees MORE of a contributor's name than a
 * MEMBER does. ⛔ Do ⛔ not "fix" it here: the discharge is the MEMBER-SURFACE story `11b-21`, which
 * raises the member side. See the story's AC10, which STATES the non-compliance rather than curing it.
 * ⚠ ANNOTATED 2026-09-19 — DISCHARGED by Story 11b.21 (`#decision-2026-09-19-224`): the member wire is now
 * `{ name: string | null }`, MODE-RESOLVED over the SAME cleaned tokens this route uses, so the member form
 * equals or exceeds the public form for every stored name and mode. The paragraph above is the record.
 *
 * ⚠ `.min(1)` IS LOAD-BEARING — the boundary normalises with **`normalisePublicName`** (trim PLUS the
 * zero-width strip), ⛔ never `=== ''`. An empty or whitespace-only name is ⛔ not a name.
 *
 * ⭐⭐ **`name` IS NULLABLE FROM 2026-09-16 — `#decision-2026-09-16-219` cl.1 (Trustee-ratified),
 * OPTION (E): THE ROW IS KEPT AND RENDERED AS A PLACEHOLDER, ⛔ NO LONGER DROPPED.** `null` means
 * *"a confirmed contributor stands here and this surface is ⛔ not naming them"* — ⛔ it does ⛔ NOT
 * mean "no contributor".
 * ⚠⛔⛔ **⛔ NO COPY CROSSES THIS WIRE, AND THAT IS THE WHOLE REASON `null` IS THE CARRIER.** The
 * placeholder word is **copy** and is resolved at the RENDER layer from the page's own locale
 * (`sahyog-vivran.json` → `value.contributor_unnamed`). ⛔ The API must ⛔ never emit the literal: it
 * has ⛔ no locale, and a copy string on the wire is a second source for a ruled word
 * ([[feedback_stub_must_call_not_transcribe]]).
 * ⚠⛔ **AND `null` CARRIES ⛔ NO CAUSE.** Five different things land here — RTBF erasure, the erasure
 * sentinel, an unresolvable name, a MONONYM under `shielded_name`, a failed decrypt — and `-219`
 * cl.3 ratifies that ⛔ **NOTHING may disclose WHICH**: ⛔ not a second field, ⛔ not an attribute,
 * ⛔ not a variant of the word. A cause on this wire would convert a derivable count into a LABELLED
 * disclosure that a named position exercised RTBF, which is strictly worse than the state (E)
 * replaces.
 * ⚠ `-219` cl.2 superseded `2026-08-30-169` cl.1 (D5)'s placeholder prohibition for this PUBLIC
 * surface; ⭐ `2026-09-18-222` (Trustee-ratified) extends that to the MEMBER contributor list, in the
 * SAME words. ⚠ Until story `11b-21` builds it, `packages/ui/src/contribution-list` still OMITS the
 * row — a SHIPPED gap against `-222`, ⛔ no longer a ruled difference.
 * ⚠ ANNOTATED 2026-09-19 — BUILT by Story 11b.21: the member list keeps the row and renders the same word
 * from THIS surface's key (`sahyog-vivran` → `value.contributor_unnamed`, `-224` D1 — one key, ⛔ no second).
 */
export const PublicSahyogVivranContributor = z
  .object({
    name: z.string().min(1).nullable(),
  })
  .strict();
export type PublicSahyogVivranContributor = z.output<typeof PublicSahyogVivranContributor>;

/**
 * The path parameter — ⭐⭐ **THE OPAQUE PUBLIC ADDRESS TOKEN**, Story 11b.10 (AC1, `2026-09-03-184`
 * **(B)**, Trustee-ratified).
 *
 * ⛔⛔ **THERE IS EXACTLY ONE PUBLIC ADDRESS FORM, AND THIS IS IT.** The route used to take
 * `poolCanonicalIdentifier` — `P-YYYY-MM-###`, whose `sequence` is a MONOTONIC per-(pariwar, month)
 * counter (`2026-09-04-185`) — so the entire surface could be WALKED by COUNTING, and since Story
 * 11b.3a that walk reached FOUR DECRYPTED TIER-1 BANK FIELDS rendered in full under `D8-default`
 * FAIL-OPEN. `limits.search` bounded the RATE of that walk, ⛔ never its POSSIBILITY.
 * ⭐⛔ **AMENDED BY 11b.11 — IT IS NOW **ONE** DECRYPTED TIER-1 FIELD** (the nominee's name,
 * `2026-09-04-190` cl.1–2 + `-191` cl.1). ⚠ And it is ⛔ no longer *decrypted under a FAIL-OPEN
 * masking verdict*: the public read no longer **CALLS** the masking predicate at all (11b.11 D1(b)).
 * ⛔ The `D8-default` FAIL-OPEN ruling itself (`2026-09-02-179` cl.1) is **UNCHANGED** — what changed
 * is that this surface no longer has a masking decision for it to govern. ⛔ The reduction is ⛔ not a
 * reason to re-admit the canonical identifier: this paragraph records why the token exists, and the
 * token's ground was ENUMERABILITY, ⛔ not the size of the payload.
 *
 * ⛔⛔ **DO ⛔ NOT RE-ADMIT THE CANONICAL IDENTIFIER HERE**, ⛔ not as an alternative, ⛔ not as a
 * fallback, ⛔ not "for old links". A route accepting EITHER form has ⛔ **not** closed the walk — it
 * has added a lock beside an open door. ⭐ The identifier is RETAINED (`-184` cl.2) as the
 * operational/audit key and is still RENDERED in the response body below; what it may not be is
 * ADDRESSABLE.
 *
 * ⚠ Bounded and `.strict()` so a malformed address is a 400 at the schema boundary rather than a
 * database round-trip. ⛔ It is ⛔ NOT pattern-matched against the token's own shape either: a regex
 * here would split the refusal surface into *"wrong shape"* (400) and *"no such drive"* (404), and
 * that difference is itself an ENUMERATION ORACLE — the one property AC1 exists to remove. The
 * read's exact-equality lookup is what refuses an unknown address, and it refuses it as a **404**
 * BYTE-IDENTICAL to every other *"nothing to show"* case.
 *
 * ⛔ THE TOKEN BOUNDS **DISCOVERY**, ⛔ NOT **AUTHORISATION** (D1). Presenting a valid address is
 * enough — ⛔ no session, and ⛔ no branch on the reader's membership standing of any kind.
 */
export const PublicSahyogVivranParams = z
  .object({
    pariwarId: z.string().uuid(),
    driveToken: z.string().trim().min(1).max(64),
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
 * ⭐⛔ **11b.11 NARROWS THAT PROPERTY, ⛔ IT DOES NOT REVOKE IT.** With the five coordinates withdrawn
 * the route is ⛔ no longer PII-bearing **in the nominee-bank sense**, ⚠ but it still carries the
 * surviving nominee name and 11b.3b's deceased-member exposure ⇒ ⛔ the property stays declared, and
 * controls 2 and 3 stay structurally N/A **with 11b.3b's expiry intact**.
 *
 * ⛔ NO EXPORT AFFORDANCE. No `format`, no `csv`, no `all` — FR-91 forbids bulk export from the
 * public side, and `.strict()` is what makes `?format=csv` a 400 rather than an ignored parameter.
 */
/**
 * ⚠⛔⛔ **AMENDED 2026-09-15 (Story 11b.3b, Task 3, AC4) — ⛔ THE EMPTY SHAPE ABOVE IS SPENT AND ITS
 * TEXT IS KEPT AS THE RECORD** ([[feedback_supersede_never_reinterpret]]). The paragraphs above
 * describe an UNPAGINATED single-item GET and record controls 2 and 3 as structurally N/A **with
 * 11b.3b's expiry intact**. ⭐ **THE EXPIRY HAS FIRED**: this story adds the contributor list, the
 * route becomes PAGINATED, and **both controls are RESTORED** — here, in
 * `sahyog-vivran-controls.ts` (ordinals 2 and 3) and in `login-wall.spec.ts`, in one commit.
 *
 * ⛔⛔ **WHAT DOES ⛔ NOT CHANGE, AND IT IS MOST OF IT.** ⭐ The shape is STILL `.strict()`, so
 * ⛔ `?format=csv`, ⛔ `?all=1`, ⛔ `?district=`, ⛔ `?sort=amount` and every other parameter are STILL
 * a **400**. ⇒ ⭐ the *"⛔ NO EXPORT AFFORDANCE"* paragraph above is **UNCHANGED and still binds** —
 * FR-91 forbids bulk export from the public side, and ⛔ two bounded paging parameters are ⛔ not an
 * export affordance. ⛔ ⛔ No `sort`, ⛔ no `order`, ⛔ no `filter`: the contributor ordering is RULED
 * (earliest live confirmation) and a caller may ⛔ not choose it — a sort parameter over a name list
 * is a leaderboard control in the query string.
 *
 * ⭐ **THE TWO BOUNDS ARE THE SHARED CONSTANTS, ⛔ never re-declared** — the same discipline
 * `sahyog-drive.ts` follows, so the two public surfaces cannot drift into two different *"the FR-91
 * cap"*. ⚠ `.max()` on `limit` is ALSO what makes Story 1.14's forced-pagination guard — which walks
 * the LIVE in-process swagger document — SEE a bound on this route; that is the second, independent
 * FR-91 enforcement and it is the reason the response names its array `items` (see below).
 */
export const PublicSahyogVivranQuery = z
  .object({
    page: z.coerce.number().int().positive().max(PUBLIC_DIRECTORY_PAGE_HORIZON).optional(),
    limit: z.coerce.number().int().positive().max(PUBLIC_SURFACE_PAGE_SIZE_CAP).optional(),
  })
  .strict();
export type PublicSahyogVivranQuery = z.output<typeof PublicSahyogVivranQuery>;

/**
 * The response — ONE drive, ⛔ not a collection.
 *
 * ⚠⛔ THERE IS DELIBERATELY NO `items` KEY. Story 1.14's forced-pagination guard recognises a
 * collection GET by a top-level array OR that literal key, so naming anything here `items` would
 * make an UNPAGINATED single-item route look like an unbounded collection to the guard — the exact
 * inverse of the mistake `sahyog-drive.ts` documents on the other side.
 *
 * ⚠⛔⛔ **AMENDED 2026-09-15 (Story 11b.3b, Task 3, AC4) — ⛔ THE PARAGRAPH ABOVE IS KEPT AND ⛔ NOT
 * REWRITTEN, AND ITS REASONING IS WHAT INVERTS IT** ([[feedback_supersede_never_reinterpret]]).
 * ⭐ Its premise is *"an **UNPAGINATED** single-item route"*. ⛔ That premise is spent: this route
 * now serves a PAGINATED contributor list under `2026-09-02-174`, and `PublicSahyogVivranQuery`
 * declares both bounds. ⇒ ⭐ **`items` is now the CORRECT name and the guard becomes an ASSET**: it
 * SEES a collection here, demands a bounded `limit`, and finds one. ⛔ Renaming it to `contributors`
 * would make this route invisible to the guard — ⭐ the very mistake the paragraph above warns of,
 * committed in the other direction.
 *
 * ⛔⛔ **`items` IS THE CONTRIBUTOR PAGE, ⛔ NOT A LIST OF DRIVES.** ⭐ `drive` stays singular and
 * beside it: this is ONE drive plus a page of ITS contributors, ⛔ never a collection of drives.
 *
 * ⚠⛔⛔ **`total` IS THE CONFIRMED-CONTRIBUTOR SET SIZE — ⛔ NOT THE NUMBER OF *NAMED* ROWS, AND THE
 * TWO DIFFER BY DESIGN.** Five things leave a row UNNAMED (`name: null`), all of them resolved AFTER
 * paging: RTBF erasure (`2026-08-30-169`), the erasure sentinel, an unresolvable name, a MONONYM
 * under `shielded_name` (`2026-08-21-145` cl.3), a failed decrypt.
 * ⇒ ⭐ this page reads *"Contributors: N"* (the set size's own wording since Story 11b.22, `-225`) beside
 * FEWER than N **NAMED** rows **BY DESIGN**, and ⛔ ⛔ NO copy anywhere may claim the list is complete.
 * ⚠⛔ **ROW COUNT vs NAMED COUNT — ⛔ DO ⛔ NOT CONFLATE THEM AGAIN.** Until `-219` this sentence read
 * *"`items.length` can be FEWER than `min(limit, total - offset)`"*, which was true while omitted
 * rows were DROPPED. ⭐ Since cl.1 the row is KEPT, so `items.length` **DOES** equal
 * `min(limit, total - offset)`; what is fewer is the count of rows whose `name` is ⛔ not `null`.
 * ⚠⛔⛔ **AMENDED IN PLACE 2026-09-16 BY `#decision-2026-09-16-219` cl.4 — ⛔ NOT appended to, and
 * the superseded sentence is QUOTED rather than deleted** ([[feedback_closure_language_precision]]).
 * ⛔ THIS USED TO READ: *"AND THERE IS ⛔ NO OMISSION COUNT, EVER. ⛔ Not a tally, ⛔ not a 'some
 * names withheld' line, ⛔ not a per-row marker."* ⇒ ⛔ that is ⛔ no longer true of THIS surface, and
 * ⛔ pretending otherwise would leave the fence describing code that does the opposite.
 *
 * ⭐⭐ **WHAT IS TRUE NOW, IN THREE PARTS:**
 *   (a) ⭐ **THE UNNAMED ROWS ARE VISIBLE BY DESIGN.** `-219` cl.1 ruled option (E): a row whose
 *       `name` is `null` is KEPT and rendered as a placeholder, so `items.length` now equals
 *       `min(limit, total - offset)` and a page is ⛔ never short.
 *   (b) ⚠ **THEIR COUNT IS THEREFORE KNOWABLE, AND THAT WAS RATIFIED KNOWINGLY.** cl.1 records in
 *       terms that (E) **WIDENS** disclosure — it is ratified on the **FAIRNESS** ground, ⛔ NOT the
 *       privacy one, because today only a reader who does the arithmetic learns the list is
 *       incomplete while an ordinary visitor assumes it is complete. ⛔⛔ **⛔ NEVER write an AC, a
 *       comment or a test name saying the placeholder CLOSES the omission-count leak. It does ⛔ not.
 *       It shares it, equally and openly.**
 *   (c) ⛔⛔ **⛔ NOTHING MAY DISCLOSE *WHICH* OF THE FIVE CAUSES APPLIES** — ⛔ not a second field,
 *       ⛔ not an attribute, ⛔ not a per-cause variant of the word, ⛔ not an ordering. ⭐ **THIS is
 *       the clause that still carries `2026-08-30-169` cl.1's ground** (the erased person must ⛔ not
 *       be *"identifiable or correlatable"*), and it is the half that did ⛔ not move.
 * ⚠ The sibling index (`sahyog-drive`) states the OLD prohibition in the same words and is ⛔ NOT in
 * scope — it has ⛔ no contributor list. ⛔ Do ⛔ not "harmonise" it.
 * ⚠ `total` is ALSO ⛔ not `drive.confirmedContributionCount`: that is the EVENT count from the
 * canonical stream, this is the size of the ordered CONTRIBUTOR set. ⛔ Do ⛔ not add a reconciling
 * check between them — they answer different questions and a guard would invent a third.
 */
export const PublicSahyogVivranResponse = z
  .object({
    drive: PublicSahyogVivranEntry,
    items: z.array(PublicSahyogVivranContributor),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  })
  .strict();
export type PublicSahyogVivranResponse = z.output<typeof PublicSahyogVivranResponse>;
