// The `/sahyog-vivran/[driveToken]` pure render module — Story 11b.3 (Task 4; AC1, AC3,
// AC5, AC8).
//
// House convention (and the thing that makes `deriveFieldIds` sound): ALL display logic lives here;
// the `.astro` page is a thin wrapper. ⛔ Breaking that is a GATE EVASION before it is a style choice
// — a value computed inline in `.astro` frontmatter never enters the render model and is therefore
// INVISIBLE to the tier-leak leg. `surface-fields.ts` names that bypass as the accepted cost of
// D3(a); this file is the reason it stays theoretical.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐⭐ THIS PAGE NAMES ⛔ NOBODY, AND THAT IS THE CORRECT STATE — ⛔ NOT A BROKEN ONE
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔ Not the deceased member. ⛔ Not a contributor. ⛔ Not a verifier. ⛔ Not a nominee.
// ⭐ It is what the D6(b) split bought (`2026-09-02-182` cl.2): with ⛔ no `pii_tier: 1` field at
// `tier: public`, this surface needs ⛔ no `tier1_public_exception`, ⛔ no allowlist entry and ⛔ no
// Panel ruling — so ⛔ nothing outside this repository can block it. It is the same posture 11a.5
// defended when it DELETED five invented deceased-member names rather than making them real.
// ⇒ **11b.3b** carries the named-identity render layer (`2026-09-02-173` / `-174`) and **11b.3a** the
// nominee bank presentation (`2026-08-28-160` cl.10, `-165` cl.1/cl.3). ⛔ Do not "fill the gap".
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔⛔ FOUR PRODUCERS THE EPIC AC NAMES DO ⛔ NOT EXIST, AND THE RULED POSTURE IS TO RENDER NOTHING
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//   · *"verifier hyperlinks resolving to verifier profile pages"* — ⛔ NO SUCH PAGE EXISTS anywhere
//     in the repo. The AC's hyperlink has ⛔ no destination.
//   · the family story (Story **11b.4**) — `backlog`.
//   · the memorial visual components (Story **11b.5**) — `backlog`.
//   · `<StatCardStrip>` — **C-3**: ⛔ no producer AND ⛔ no owner.
// ⭐ THE RULED POSTURE IS 11a.5's THIRD PATH, and C-4 SURVIVED `2026-08-28-160` untouched: *"render
// the real, currently-empty source and RENDER NOTHING WHEN EMPTY — ⛔ never a fabricated row, ⛔ never
// a 'coming soon' placeholder."* ⚠ *"A silent section is the CORRECT state, ⛔ not a bug to be closed
// quickly."*
// ⛔⛔ DO NOT STUB `<StatCardStrip>`. A stub asserts an aggregate that nothing computes, and building
// any of the four re-commits **SD-1** — three attribute rows with no substrate at all, unnoticed for
// seven epics.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
// ⛔⛔ AND THERE IS ⛔ NO RUPEE FIGURE ON THIS PAGE. `amountRaisedInr = confirmedCount × fixedAmount`
// is the SHIPPED canonical definition (`packages/ui/src/pool-progress/presenter.ts`, Story 9.12
// Decision 3) and **D1(b)** ruled it CONSUMED — ⭐ but it lives behind the `@twt/ui` fence this story
// does ⛔ not lift, so the amount MOVES to **11b.3b**. ⛔⛔ RE-DERIVING THE MULTIPLICATION HERE IS
// **D1(c)**, REFUSED — a second multiplication anywhere in this diff is the defect, and the fence is
// what makes the refusal enforceable rather than aspirational.
// ⚠ THE INTERIM ASYMMETRY IS EXPECTED AND IS ⛔ NOT A DEFECT TO FILE: until 11b.3b merges, this page
// shows a COUNT while the member app shows an AMOUNT for the same pool. ⭐ ORDERING, ⛔ not a ruling,
// and ⛔ NOT a second instance of the D7 inversion.
//
// ⛔⛔ AND ⛔ NO SESSION, EVER. ⛔ No `Astro.cookies`, ⛔ no `Astro.request.headers` read for auth,
// ⛔ no `Astro.session`, ⛔ no `isAuthenticated` prop on `<AuthenticatedFragment>` — its own header
// forbids all three, because a prop *"only moves the read to the caller and puts auth-derived
// branching back into cache-safe SSR output."* ⭐ EVERY VISITOR SEES BYTE-IDENTICAL MARKUP
// ([[project_no_browser_member_token_surface]]). ⚠ SD-2 is RE-PURPOSED onto the POST-campaign masking
// state (`2026-08-28-164` A2) — ⛔ not dissolved, and the post-masking authenticated presentation is a
// SEPARATE FUTURE DECISION, ⛔ not carried and ⛔ not foreclosed.
//
// PURE: no fs, no db, no env, no clock.
import type { PublicSahyogVivranResponse } from '@twt/contracts';

import type {
  SahyogVivranNomineeAccountRow,
  SahyogVivranRenderModel,
} from './surface-fields.js';

/** The route this surface renders at. ⚠ The identifier segment is appended by the caller. */
export const SAHYOG_VIVRAN_ROUTE_PREFIX = '/sahyog-vivran';

/**
 * ⭐ THE IST OFFSET, RE-DECLARED HERE RATHER THAN IMPORTED FROM `sahyog-render.ts`.
 *
 * ⚠ That looks like the duplication this repo normally forbids, and it is the LESSER of two evils:
 * importing it would make this pure render module depend on the INDEX's render module, which carries
 * pagination, filter and multi-row concepts this surface has none of — an import edge that exists
 * only for a constant is how an unrelated refactor over there breaks this page. ⭐ India has no DST,
 * so the value is a physical constant, not a policy: ⛔ there is nothing here that can drift into
 * being wrong while the other stays right.
 */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Copy the page passes in, already resolved through `t()` with an EXPLICIT namespace. */
export interface SahyogVivranLabels {
  readonly pageTitle: string;
  readonly pageIntro: string;
  /** The drive-facts group's accessible name (AC8 (a) — a real `role` + `aria-label`). */
  readonly factsGroupLabel: string;
  readonly labelDriveCode: string;
  readonly labelPoolLetter: string;
  readonly labelDistrict: string;
  readonly labelClosedOn: string;
  readonly labelContributions: string;
  readonly labelStatus: string;
  readonly districtUnknown: string;
  readonly statusCollecting: string;
  readonly statusActive: string;
  readonly statusArchive: string;
  /** ⭐ AC3's honest live-drive copy. ⛔ Never an estimate, ⛔ never "X% confirmed so far". */
  readonly collectingTitle: string;
  readonly collectingBody: string;
  /** Close-of-cycle framing copy, keyed by the opaque outcome enum. */
  readonly outcomeFullyFunded: string;
  readonly outcomeUnderFunded: string;
  readonly outcomePartial: string;
  /** The AC5 appeal-lineage block. */
  readonly appealTitle: string;
  readonly appealLineage: string;
  /** The `<dt>` term for the stage `<dd>` — ⛔ distinct from `appealTitle`, the section heading. */
  readonly labelAppealStage: string;
  readonly appealStage: (stage: number) => string;
  readonly appealReversedOn: string;
  readonly dispositionNewEvidence: string;
  readonly dispositionProceduralCorrection: string;
  readonly dispositionReconsideration: string;
  /** `{{count}} confirmed` — the count already interpolated by `t()`. */
  readonly contributionsCount: (count: number) => string;
  /** The OUTAGE state — ⛔ deliberately distinct copy from the 404 the page returns instead. */
  readonly outageTitle: string;
  readonly outageBody: string;
  // ── ⭐ Story 11b.3a — the nominee block, ⭐⛔ REDUCED BY STORY 11b.11 ────────────────────────────
  //
  // ⭐⛔ **SIX LABELS AND ONE VALUE-FORMATTER STOOD HERE UNTIL 11b.11, and their i18n keys are
  // RETIRED with them:** `labelAccountNumber` (`label.account_number`), `labelIfsc` (`label.ifsc`),
  // `labelVpa` (`label.vpa`), `labelBankName` (`label.bank_name`), `labelBranch` (`label.branch`),
  // `valueAccountEndingIn` (`value.account_ending_in`) and `bankMaskedNote` (`bank.masked_note`).
  // Each described a value `2026-09-04-190` cl.1 / `2026-09-04-191` cl.1 withdrew from `public`, or
  // a masked projection this surface no longer performs. ⛔ Copy that outlives what it describes is
  // the exact defect `-187` / `-188` / `-192` recorded three times in one day. ✅ Grepped: the
  // `sahyog-vivran` i18n namespace has ⛔ no other consumer.
  //
  /**
   * The block's section heading. ⚠⛔ RE-WORDED at 11b.11: it read *"Where the money goes"*, which
   * named a destination the page no longer shows. ⛔ A frame that describes deleted rows is the same
   * defect as a deleted row that stays.
   */
  readonly bankTitle: string;
  /**
   * The block's group accessible name (AC7 — a real `role` + `aria-label`). ⚠⛔ RE-WORDED at
   * 11b.11: it read *"Bank details for this drive"*, and after `-190` cl.1 that section contains
   * ⛔ no bank details at all — one name.
   */
  readonly bankGroupLabel: string;
  /**
   * ⭐ THE EQUALITY STATEMENT, and it is copy rather than a comment because a reader with two names
   * in front of them will otherwise infer a preference from the order. ⛔ Never "primary".
   * ⚠⛔ RE-WORDED AND RE-GATED at 11b.11. It read *"Either account can be used. Neither one is
   * preferred over the other."* — standing copy rendered whenever the block rendered. ⛔ Both halves
   * broke: with the coordinates withdrawn there is ⛔ no account a visitor can *use*, and a
   * one-element array is EXPLICITLY LEGAL, so on a claim where only account #1 was collected the
   * sentence sat beside ONE card and invited the reader to infer a second was being WITHHELD — on
   * the page whose whole purpose is that nothing about the money is hidden.
   * ⇒ it now speaks about the RECORD rather than about paying, and the page renders it ⛔ ONLY when
   * there is more than one name for it to be about.
   */
  readonly bankEqualNominees: string;
  /**
   * Per-account accessible name.
   * ⚠⛔⛔ **IT NO LONGER CARRIES THE ORDINAL, AND THAT IS THE FIX, ⛔ not a simplification.** It read
   * `bank.account_label` = *"Account {rank}"* ⇒ a screen reader announced *"Account 1"* / *"Account
   * 2"* while `surface-fields.ts` mapped `accountRank: null` precisely because *"rendering 'Account
   * 1' / 'Account 2' … would put an ordering that implies preference onto the page"*. ⇒ a sighted
   * visitor saw two identical unnumbered boxes; a screen-reader visitor heard the ordinal — the
   * story's stated equality contradicted by its shipped output, in the direction ⛔ only
   * assistive-tech users experience. ⚠ And because the value reached the DOM via `aria-label`
   * rather than `<MatrixField>`, the field-classification gate was STRUCTURALLY BLIND to it.
   * ⇒ the group is named by what it IS. ⛔ Do ⛔ not re-introduce a rank here.
   */
  readonly bankAccountLabel: string;
  /**
   * ⭐ The ⛔ ONLY field label left in this block, and its wording is RULED: `2026-09-04-190` cl.2
   * (Trustee-ratified) fixes the public wording at **"Nominee Name"** and forbids *"Account
   * holder"*. ⚠ The KEY is still `label.account_holder` — deliberately. The key names the DATA
   * (6.8's D1: no FK to `member_nominees`, no rank, no match rule ⇒ it IS the account holder) and
   * the VALUE is the ruled PRESENTATION. ⛔ Renaming the key would erase the distinction the ruling
   * itself draws.
   */
  readonly labelAccountHolder: string;
}

export interface SahyogVivranView {
  /** The model whose OWN KEYS are the tier-leak snapshot's field set. */
  readonly model: SahyogVivranRenderModel;
}

/**
 * Format the close/settle instant in IST.
 *
 * ⭐ Latin numerals + a Gregorian date — the OPERATIONAL register (UX-DR73), and the microcopy gate's
 * numeral discipline bites a Devanagari operational digit even under `hi`.
 * ⚠ Returns `null` for a null or unparseable instant, and the page then renders NOTHING — ⛔ never an
 * "Invalid Date" string, which is what a bare `new Date(x).toLocaleDateString()` produces.
 */
function formatClosedAt(iso: string | null): string | null {
  if (iso === null) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // Shift the instant by IST's fixed offset, then read the UTC parts — India has no DST, so a fixed
  // offset is exact and needs no `Intl` timezone database at render time.
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const yyyy = String(ist.getUTCFullYear()).padStart(4, '0');
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(ist.getUTCDate()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Map the opaque funding-outcome token onto its localised framing copy.
 *
 * ⭐ THE TARGET IS ALREADY GONE BY THE TIME THIS RUNS, and that is the whole design:
 * `classifyCycleOutcome` compares the totals once, inside the domain read, and ⛔ only this token
 * leaves. ⇒ a shortfall figure PHYSICALLY CANNOT reach the copy path. ⛔ Do not add a numeric
 * parameter to any of these labels, under any name, and ⛔ do not pass a target into this module.
 *
 * ⚠ `null` ⇒ `null` ⇒ the page renders NOTHING. Two causes, one output: the drive is still
 * COLLECTING, or ⛔ no expectation was ever set (zero assignees). ⛔ `partial` is ⛔ NOT reused for
 * either — its copy says *"Reconciliation is still in progress"*, which is not true of a drive nobody
 * was assigned to, and trading a false statement for a misleading one is not a fix.
 *
 * ⛔ EXHAUSTIVE with a `never` guard: an unknown token is an upstream defect, and the fetch client
 * already refuses one — this is the second, structural place it cannot pass.
 */
function framingFor(
  outcome: PublicSahyogVivranResponse['drive']['fundingOutcome'],
  labels: SahyogVivranLabels,
): string | null {
  if (outcome === null) return null;
  switch (outcome) {
    case 'fully_funded':
      return labels.outcomeFullyFunded;
    case 'under_funded':
      return labels.outcomeUnderFunded;
    case 'partial':
      return labels.outcomePartial;
    default: {
      const _never: never = outcome;
      throw new Error(`[sahyog-vivran-render] unhandled funding outcome: ${String(_never)}`);
    }
  }
}

/** The public status token → its localised label. ⛔ THREE labels, ⛔ not the index's two (D4(b)). */
function statusLabel(
  status: PublicSahyogVivranResponse['drive']['driveStatus'],
  labels: SahyogVivranLabels,
): string {
  // ⚠ Story 11b.12 — the CASES are the ruled wire tokens (`live`/`closed`/`verified`); the LABEL
  // FIELDS keep their historical names by D3 (the ban is on rendered VALUES, ⛔ not identifiers).
  switch (status) {
    case 'live':
      return labels.statusCollecting;
    case 'closed':
      return labels.statusActive;
    case 'verified':
      return labels.statusArchive;
    default: {
      const _never: never = status;
      throw new Error(`[sahyog-vivran-render] unhandled drive status: ${String(_never)}`);
    }
  }
}

/**
 * The BOUNDED disposition tag → its localised label.
 *
 * ⛔⛔ THE TAG IS TRANSLATED, ⛔ NEVER ECHOED. Echoing the wire token would put an internal
 * vocabulary word on a public page, and — worse — would be the mechanism by which an unbounded
 * string could ever reach one. ⭐ Both the domain read and the fetch client already refuse an
 * unrecognised tag; this exhaustive switch is the third place it cannot pass.
 */
function dispositionLabel(
  category: NonNullable<
    PublicSahyogVivranResponse['drive']['appealReversal']
  >['dispositionCategory'],
  labels: SahyogVivranLabels,
): string {
  switch (category) {
    case 'new_evidence_presented':
      return labels.dispositionNewEvidence;
    case 'procedural_correction':
      return labels.dispositionProceduralCorrection;
    case 'reconsideration_on_merits':
      return labels.dispositionReconsideration;
    default: {
      const _never: never = category;
      throw new Error(`[sahyog-vivran-render] unhandled disposition category: ${String(_never)}`);
    }
  }
}

/**
 * ⭐ MAP ONE WIRE ACCOUNT ONTO ITS RENDER ROW — Story 11b.3a (AC2, AC4, AC7),
 * ⭐⛔ **REDUCED TO ONE FIELD BY STORY 11b.11.**
 *
 * ⛔⛔ THIS FUNCTION DOES ⛔ NOT MASK ANYTHING, AND IT MUST NEVER LEARN HOW. ⭐ That was already
 * true and it is now true for a second reason: there is nothing left on this surface to mask.
 * `2026-09-04-190` cl.1 (Trustee-ratified) withdrew the account number, IFSC, bank name and branch
 * from `public`; `2026-09-04-191` cl.1 withdrew the VPA; `-190` cl.2 KEPT the account-holder name.
 * ⚠⛔ *"Mask it in CSS/JS"* and *"send it and hide it"* stay ruled out by AC4, and this module still
 * has nothing to hide.
 *
 * ⭐⛔ **WHAT STOOD HERE, kept as the record.** The wire was a `z.discriminatedUnion('masked', …)`
 * and this function branched on it: the masked arm mapped `accountNumberLast4` through
 * `labels.valueAccountEndingIn` into one coherent phrase — so assistive tech announced a single
 * field rather than reading a truncated string digit by digit — and set `nomineeAccountHolderName`
 * and `nomineeVpa` to `null` because cl.10(e)'s RETENTION list did not name them. ⚠ `2026-09-04-191`
 * **cl.2** then ruled the masked projection must ⛔ NOT drop the nominee name, which AMENDS THE
 * READING of cl.10(e)'s list — that list was written when the masked view still carried account
 * coordinates and therefore had something else to retain. ⛔ cl.10(e) is ⛔ not restated as if it had
 * always said this. ⇒ both arms reduced to the same single name and 11b.11's **D1(b)** collapsed the
 * public wire; ⛔ there is no `masked` discriminator left to branch on.
 * ⛔⛔ **MASKING WAS ⛔ NOT DELETED** (`-190` cl.4) — the machinery is intact in
 * `packages/domain/src/claim/nominee-bank-masking*.ts`; it has ⛔ NO PUBLIC CONSUMER.
 *
 * ⛔ EVERY KEY IS PRESENT ON EVERY ROW, INCLUDING ITS NULLS. `deriveFieldIds` reads keys, and a key
 * omitted when its value is absent would shrink the classified field set on exactly the pages nobody
 * checks. ⛔ Never conditionally spread a key into this object.
 */
function nomineeAccountRow(
  account: PublicSahyogVivranResponse['drive']['nomineeBankAccounts'][number],
): SahyogVivranNomineeAccountRow {
  return {
    accountRank: account.accountRank,
    // ⚠ THE ACCOUNT HOLDER in the DATA — 6.8's D1 removed the nominee linkage deliberately and that
    // reasoning STANDS. ⭐ The rendered LABEL is *"Nominee Name"*, ruled at `2026-09-04-190` cl.2:
    // the Panel ruled the PRESENTATION, ⛔ not the schema. ⛔ Do not rename the key.
    nomineeAccountHolderName: account.accountHolderName,
  };
}

/**
 * Build the view for a drive that WAS found.
 *
 * ⚠ There is deliberately ⛔ NO "empty" arm here. A drive that is not on the public record does not
 * reach this function at all — the page returns the shell's 404 before calling it. ⭐ That is what
 * keeps *"does not exist"*, *"not visible"* and *"this Pariwar is switched off"* byte-identical to a
 * prober (AC1).
 *
 * ⭐⛔ AND THE MODEL IS BUILT WITH EVERY KEY PRESENT, INCLUDING ITS NULLS. `deriveFieldIds` reads the
 * model's OWN KEYS, so a key omitted when its value is absent would shrink the classified field set
 * on exactly the pages where nobody would look — the vacuous-leg defect, per-request. ⛔ Never
 * conditionally spread a key into this object.
 */
export function buildSahyogVivranView(
  response: PublicSahyogVivranResponse,
  labels: SahyogVivranLabels,
): SahyogVivranView {
  const drive = response.drive;
  const reversal = drive.appealReversal;

  return {
    model: {
      apiUnavailable: false,
      // ⚠⛔ D3, STATED HERE SO IT IS ⛔ NOT REDISCOVERED AS A DEFECT: the field is `isCollecting`
      // and the token is `'live'`. ⭐ The code says one word, the wire and the page say another —
      // a KNOWING, RULED trade (Story 11b.12 D3), ⛔ not an oversight. ⛔ Do not "fix" the name here
      // and ⛔ do not re-file it; a rename is a tidy-up story across four render files and six test
      // files, ⛔ never a silent edit.
      isCollecting: drive.driveStatus === 'live',
      wasReversedByAppeal: reversal !== null,
      poolLetterCode: drive.poolLetterCode,
      poolCanonicalIdentifier: drive.poolCanonicalIdentifier,
      driveStatus: statusLabel(drive.driveStatus, labels),
      driveClosedAt: formatClosedAt(drive.closedAt),
      district: drive.district,
      // ⛔ A COUNT, ⛔ never a sum and ⛔ never a score. ⭐ And it is the EVENT count, ⛔ never a row
      // count: RTBF omits a contributor's ROW entirely while the omitted contributor STILL COUNTS
      // here (`2026-08-30-169`). ⇒ at 11b.3b this page reads "N confirmed" beside FEWER than N named
      // rows BY DESIGN, and ⛔ neither surface's copy may claim the list is complete.
      // ⚠ Interpolated THROUGH `t()`, ⛔ never by local string surgery — the 11a.2 `{{max}}` vs
      // `{max}` defect threw on EVERY request and no test caught it, because every test bypassed `t()`.
      confirmedContributionCount: labels.contributionsCount(drive.confirmedContributionCount),
      closeOfCycleFraming: framingFor(drive.fundingOutcome, labels),
      appealReversalStage: reversal === null ? null : labels.appealStage(reversal.reversedAtStage),
      appealDispositionCategory:
        reversal === null ? null : dispositionLabel(reversal.dispositionCategory, labels),
      appealReversalAt: reversal === null ? null : formatClosedAt(reversal.reversedAt),
      // ⭐ Story 11b.3a. ⛔ The order is the substrate's (`#1` then `#2`) — ⛔ never a preference,
      // and ⛔ never re-sorted here: the two are EQUAL payment destinations (Story 9.9).
      nomineeAccounts: drive.nomineeBankAccounts.map((a) => nomineeAccountRow(a)),
    },
  };
}

/**
 * Build the OUTAGE view — the API could not be reached.
 *
 * ⭐⛔ THIS IS ⛔ NOT THE 404, AND THE TWO MUST NEVER COLLAPSE. *"We could not load this just now"* is
 * a statement about THIS REQUEST'S luck; *"there is no such drive"* is a statement about the public
 * record. ⚠ Rendering the second on the first's evidence is the single most misleading thing this
 * surface could say about a family's drive — and rendering the first on the second's evidence reports
 * an ordinary 404 to every crawler and uptime monitor as a server fault.
 *
 * ⭐ THE MODEL STILL CARRIES EVERY KEY, so the tier-leak snapshot is the SAME field set on an outage
 * page as on a rendered one. ⛔ A degraded page that quietly declares fewer classified fields is a
 * leg that goes partly vacuous exactly when something is already wrong.
 *
 * ⚠ IT TAKES ⛔ NO `labels`, deliberately: the outage COPY is chrome the page renders directly, and
 * ⛔ none of the model's fields carries a value on this arm. A `labels` parameter here would be an
 * unused dependency that the next author fills in — which is how outage copy acquires a fabricated
 * drive fact.
 *
 * ⚠⭐ AND IT TAKES ⛔ NO ARGUMENT AT ALL SINCE STORY 11b.10 — ⛔ AN AMENDMENT, ⛔ not a tidy-up.
 * It used to accept the `poolCanonicalIdentifier` and echo it, on the ground that *"the visitor
 * supplied it and it is already in their URL bar"*. ⭐ THAT GROUND IS GONE: the URL now carries an
 * OPAQUE ADDRESS TOKEN, and the drive code it names is one of the things the failed read did ⛔ not
 * tell us. ⇒ echoing the URL segment would print an ADDRESS into the `pool_canonical_identifier`
 * field — a fabricated drive fact of exactly the kind the paragraph above forbids, and a live public
 * address rendered into a classified field on a degraded page. ⛔ Do ⛔ not "restore" the echo.
 */
export function buildSahyogVivranOutageView(): SahyogVivranView {
  return {
    model: {
      apiUnavailable: true,
      isCollecting: false,
      wasReversedByAppeal: false,
      // ⛔ NOTHING IS INVENTED — every field is null or empty, because nothing is known. ⚠ That now
      // includes the drive code: the URL carries an opaque ADDRESS, ⛔ not an identifier, so there is
      // no identifier to echo and printing the address here would be a fabricated drive fact.
      poolLetterCode: '',
      poolCanonicalIdentifier: '',
      driveStatus: '',
      driveClosedAt: null,
      district: null,
      confirmedContributionCount: '',
      closeOfCycleFraming: null,
      appealReversalStage: null,
      appealDispositionCategory: null,
      appealReversalAt: null,
      // ⛔ EMPTY, and ⛔ never a fabricated account: nothing is known on this arm. ⭐ The CLASSIFIED
      // FIELD SET is unaffected — the per-row ids come from a representative shape, so an outage
      // page declares the SAME set a rendered one does (`surface-fields.ts`).
      nomineeAccounts: [],
    },
  };
}
