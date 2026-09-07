// The `/sahyog` pure render module — Story 11b.1 (Task 3 + Task 6; AC1, AC2, AC4, AC5, AC7, AC10).
//
// House convention (and the thing that makes `deriveFieldIds` sound): ALL display logic lives here;
// `sahyog.astro` is a thin wrapper. ⛔ Breaking that is a GATE EVASION before it is a style choice —
// a value computed inline in `.astro` frontmatter never enters the render model and is therefore
// invisible to the tier-leak leg.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐ THE INVARIANT THIS SURFACE EXISTS UNDER: REMEMBRANCE, NOT ANALYTICS (AC5)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The Sahyog Drive exists so that anyone — a member's family, a prospective member, a stranger —
// can verify for themselves that this trust actually moves money, and so that a drive run in
// someone's memory stays on the public record. ⛔ It is NOT a leaderboard, NOT a scoreboard, and
// NOT a way to harvest who gave what.
//
// ⛔ EXPLICITLY PROHIBITED DIRECTIONS — reject these at DESIGN time, ⛔ not at review time:
//   (a) contributor LEADERBOARDS of any kind
//   (b) RANKINGS — "top contributors", "supporter of the month", "most generous district"
//   (c) GAMIFICATION — badges, streaks, achievements, contribution milestones
//   (d) SOCIAL-PERFORMANCE METRICS — most-supportive district, public scoreboards, comparisons
//       between Pariwars, districts or people
//   (e) POPULARITY METRICS — most-viewed memorial, trending pools, view counts
//
// ✅ ACCEPTABLE DIRECTIONS: legitimate trust verification; district/date historical research;
// accessibility; performance.
//
// ⭐ THE TEST A PROPOSAL MUST PASS: *"Does this serve remembrance, transparency or claim
// discoverability?"* If the honest answer is ENGAGEMENT, RANKING or SOCIAL PERFORMANCE, the
// proposal is REJECTED at design time.
//
// ⛔⛔ AND THE SORT ORDER IS NOT A RANKING. The index orders by the drive's close/settle instant
// DESCENDING with a deterministic tie-break — ⛔ never by contribution count, ⛔ never by amount,
// and ⛔ no "most-supported" ordering is offered at any tier. ⭐ THIS IS THE PROHIBITION MOST
// LIKELY TO BE BREACHED BY ACCIDENT, because "sort by contributions" reads like a harmless table
// affordance rather than the leaderboard it builds.
// (Recorded identically in `sahyog.astro`'s header and in the abuse-rules README — this file, that
// file and the page are the three places a future author actually opens.)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
// PURE: no fs, no db, no env, no clock.
import type { PublicSahyogDriveResponse } from '@twt/contracts';
import { formatCurrency, formatCurrencyShort, isLocale, type Locale } from '@twt/i18n';

import { pageHref, PUBLIC_PAGE_HORIZON } from './pagination.js';
import type { PaginationResult } from './pagination.js';
import type { SahyogDriveRenderModel, SahyogDriveRow } from './surface-fields.js';

export const SAHYOG_ROUTE = '/sahyog';

/**
 * ⭐⭐ THE DRIVE PAGE'S ROUTE — Story 11b.10 (AC3). The segment after it is the drive's OPAQUE
 * PUBLIC ADDRESS TOKEN, ⛔ never its `P-YYYY-MM-###` (which is no longer addressable at all).
 */
export const SAHYOG_VIVRAN_ROUTE = '/sahyog-vivran';

/**
 * Build ONE drive row's href.
 *
 * ⭐⭐ THIS IS THE INBOUND PATH THE WHOLE STORY EXISTS TO CREATE, AND ⭐ SAYING WHAT IT DOES IS PART
 * OF SHIPPING IT (D3, Trap 2): **every listed drive becomes ONE CLICK from four Tier-1 fields under
 * `D8-default` FAIL-OPEN.** ⚠ Until now the index LISTED drives and ⛔ never LINKED to them — this
 * module produced exactly TWO hrefs, both pagination — so those pages were technically reachable but
 * practically un-navigated. ⇒ this story simultaneously makes the surface HARDER TO ENUMERATE and
 * MATERIALLY EASIER TO REACH, and the second half is a real change in exposure. ⭐ It is the
 * NECESSARY CONSEQUENCE of `2026-09-03-184` **(A)** + **(B)** — (A) says drives should be reachable
 * and (B) removed the only path there was — ⛔ not a fresh exposure decision smuggled alongside them.
 *
 * ⛔ THE TOKEN IS SERVER-RETURNED. It arrives on the wire row (`publicToken`); ⛔ nothing here
 * derives an address from `poolCanonicalIdentifier`, which would re-create the guessability D2
 * removed.
 *
 * ⚠ ONLY `lang` IS CARRIED FORWARD, ⛔ never the whole query string (unlike {@link pageHref}, which
 * must preserve the filters that define the page it links to). The drive page's API query schema is
 * EMPTY and `.strict()`, and dragging `district` / `from` / `to` / `poolCode` onto a single-drive URL
 * would put a FILTER SHAPE on a route that has nothing to filter — which reads as an onward
 * collection affordance on the one surface that must not appear to have one.
 *
 * ⚠ PATH-ENCODED: the token is base64url (⛔ no `+`, `/` or `=`), so this is belt-and-braces rather
 * than load-bearing — ⛔ but it stays, because the value's ALPHABET is a property of the mint and
 * this function must not silently depend on it.
 */
export function driveHref(publicToken: string, search: URLSearchParams): string {
  // ⚠ `isLocale`-GUARDED, ⛔ not the raw query value (review 2026-09-04). The page already applies
  // this exact guard before echoing `lang` into its filter form's hidden input (`sahyog.astro:380`)
  // — this was the one place that re-read the parameter straight from the URL and re-emitted it
  // into all N row links. ⇒ `/sahyog?lang=<arbitrary long string>` was reflected into every link on
  // a SHARED-CACHED page. ⛔ Not an injection (it is percent-encoded), but ⛔ nothing downstream can
  // do anything useful with a `lang` the app does not support, so carrying it is pure noise.
  // ⭐ An unsupported value now yields the UNSUFFIXED href, which is exactly what the drive page
  // does with it anyway: fall back to the default locale.
  const lang = search.get('lang');
  const base = `${SAHYOG_VIVRAN_ROUTE}/${encodeURIComponent(publicToken)}`;
  return isLocale(lang) ? `${base}?lang=${encodeURIComponent(lang)}` : base;
}

/** Copy the page passes in, already resolved through `t()` with an EXPLICIT namespace. */
export interface SahyogLabels {
  readonly pageTitle: string;
  readonly pageIntro: string;
  /** The table's accessible name. ⚠ MUST BE DISTINCT from `pageIntro` — a screen reader announces
   *  a repeat consecutively, which is noise where a caption should orient (AC10). */
  /**
   * ⭐ Story 11b.14 (AC1) — the LIVE section's caption and heading. ⚠ Its copy **COMPOSES** story
   * B's `sahyog-shared:stage.live` with a section noun; ⛔ the stage WORD is never restated in
   * `sahyog-drive.json` (`-193` cl.3 — *"two sources is exactly how 'Active' came to mean two
   * different things"*).
   */
  readonly tableCaptionLive: string;
  readonly tableCaptionActive: string;
  readonly tableCaptionArchive: string;
  readonly sectionLiveTitle: string;
  readonly sectionActiveTitle: string;
  readonly sectionArchiveTitle: string;
  readonly columnName: string;
  /** Header for the canonical `P-YYYY-MM-###` identifier column. */
  readonly columnPool: string;
  /** Header for the letter-code column. ⚠ DISTINCT from `columnPool` — two columns sharing one
   *  accessible name is announced identically by a screen reader (AC10). */
  readonly columnLetter: string;
  /** Header for the drive-link column (Story 11b.10). ⚠ DISTINCT from every other header above. */
  readonly columnOpen: string;
  readonly columnDistrict: string;
  readonly columnDate: string;
  readonly columnContributions: string;
  /** ⭐ Story 11b.14 — the LIVE table's meter column header. ⚠ DISTINCT from every other header. */
  readonly columnProgress: string;
  /**
   * ⭐⭐ Story 11b.14 (AC7) — THE RULED PUBLIC LABEL for the nominee's name.
   * ⛔⛔ It must resolve to **"Nominee Name"** / **"नॉमिनी का नाम"** — ⛔ *"Account holder"* MAY ⛔ NOT
   * BE USED (`2026-09-04-190` cl.2, Trustee-ratified).
   */
  readonly columnNominee: string;
  /** ⭐ Story 11b.14 (AC7) — the header over the Closed · Verified row's ruled sentence. */
  readonly columnSummary: string;
  readonly columnOutcome: string;
  /** Shown in a district cell when the deceased member has no posting row. */
  readonly districtUnknown: string;
  /** Shown in a date cell when the pool's stream carries no close/settle event. */
  readonly dateUnknown: string;
  /** ⭐ Story 11b.14 — story B's ruled **Live** word, for the status cell of a collecting drive. */
  readonly statusLive: string;
  readonly statusActive: string;
  readonly statusArchive: string;
  /** The EMPTY state — ⛔ deliberately distinct copy from the outage and past-end states. */
  readonly emptyTitle: string;
  readonly emptyBody: string;
  /** The FILTERED-empty state — "none MATCH", ⛔ never "none exist". */
  readonly emptyFilteredTitle: string;
  readonly emptyFilteredBody: string;
  /** The OUTAGE state — ⛔ deliberately distinct copy from the empty state. */
  readonly outageTitle: string;
  readonly outageBody: string;
  /** The PAST-THE-END state — ⛔ deliberately distinct copy from "no drives yet". */
  readonly pastEndTitle: string;
  readonly pastEndBody: string;
  /** The 400-REJECTION state. */
  readonly rejectedTitle: string;
  readonly rejectedBody: string;
  readonly paginationLabel: string;
  readonly previousPage: string;
  readonly nextPage: string;
  /** Close-of-cycle framing copy, keyed by the opaque outcome enum. */
  readonly outcomeFullyFunded: string;
  readonly outcomeUnderFunded: string;
  readonly outcomePartial: string;
  /** `{{count}} confirmed` — the count already interpolated by `t()`. */
  readonly contributionsCount: (count: number) => string;
  /**
   * ⭐ Story 11b.10 (AC3) — the drive link's VISIBLE text. Short, because it sits in a table cell;
   * the row's accessible name below is what carries which drive it opens.
   */
  readonly viewDrive: string;
  /**
   * ⭐ The drive link's ACCESSIBLE NAME, per drive — ⛔ never a bare "click here" (family 13).
   * `t()` interpolates the drive code, so a screen reader announces N DISTINCT destinations rather
   * than N identical ones. ⛔ Do not pass a person's name into it.
   */
  readonly driveLinkA11y: (poolCanonicalIdentifier: string) => string;
  /**
   * ⭐⭐ THE RULED LIVE-ROW SENTENCE — Story 11b.14 (AC3), Trustee-ratified 2026-09-07.
   *
   * ⚠⛔ **IT TAKES THE RAW NUMBERS, ⛔ NOT PRE-FORMATTED STRINGS**, so the ruled NUMBER FORMS live in
   * {@link formatSahyogLiveAmount} / `formatCount` where they are testable — ⛔ not in `.astro`
   * frontmatter, which no unit test can see. ⭐ Same shape as `contributionsCount` above.
   */
  readonly participationLine: (amountInr: number, contributorCount: number) => string;
  /**
   * ⭐⭐ THE RULED **ZERO-STATE** LIVE-ROW SENTENCE — `sahyog-shared:zero_line.*`, Trustee-ratified
   * (DR + KB) 2026-09-07, `2026-09-07-206` **cl.4**.
   *
   * ⚠⛔ **IT REPLACES {@link participationLine} WHEN ⛔ NO CONTRIBUTION IS YET CONFIRMED**, because
   * at zero that sentence reads *"₹ 0 and counting, by 0 colleagues—and still going strong!"* —
   * ⭐ the **ordinary state on day one of every drive**, ⛔ not an edge case (Review finding,
   * 2026-09-07). ⛔ It is ⛔ not an "empty state": the Panel ruled a sentence, ⛔ not silence.
   *
   * ⛔⛔ **IT TAKES THE FAMILY NAME AND ⛔ MUST HANDLE ITS ABSENCE — ⭐ THAT IS THE WHOLE REASON THERE
   * ARE TWO STRINGS.** `deceasedMemberName` is `null` wherever publication is not authorised, and
   * `t()` **THROWS** on an unsupplied token ⇒ resolving `zero_line.full` there would **500 the whole
   * page**, ⛔ not blank one row. ⭐ Unlike {@link indexLine} this ⛔ never returns `null`:
   * `zero_line.no_family` covers the absence **totally**, so ⛔ there is no unrenderable case.
   */
  readonly zeroLine: (familyName: string | null) => string;
  /**
   * ⭐ लक्ष्य — *"Expected: ₹50 lakh"*. ⚠ Called ⛔ ONLY where a `super_admin` has revealed the
   * figure for the Pariwar; ⭐ its amount follows a **DIFFERENT** rule from the contributed one
   * (always lakh/crore) — see {@link formatSahyogTargetAmount}. ⛔ Do ⛔ not "align" the two.
   */
  readonly driveTargetLine: (targetInr: number) => string;
  /**
   * ⭐⭐ THE RULED **CLOSED · VERIFIED** ROW SENTENCE — `sahyog-shared:index_line.*` (Story 11b.14
   * AC7). ⚠⛔ **IT RETURNS `null` WHERE ⛔ NO RATIFIED VARIANT FITS**, and the caller renders
   * nothing — ⛔ never a placeholder. See {@link selectIndexLineVariant}.
   */
  readonly indexLine: (tokens: {
    amountInr: number;
    nomineeName: string | null;
    familyName: string | null;
    districtName: string | null;
  }) => string | null;
}

/**
 * ⭐⭐ **WHICH `index_line.*` VARIANT A ROW TAKES — or `null` for NONE.** Story 11b.14 (AC7);
 * `2026-09-07-205` **cl.6**.
 *
 * ⭐ 11b.12's ruling **3**: *"an absent token **DROPS ITS CLAUSE** — ⛔ no combinatorial
 * cross-product"*, shipped as **FOUR** strings, each naming **ONE** absent token.
 *
 * ⚠⛔⛔ **TWO COMBINATIONS HAVE ⛔ NO VARIANT AT ALL, AND BOTH ARE DEFAULT-SHAPED:**
 *
 * | Absent together | Why nothing fits |
 * |---|---|
 * | **nominee + family**   | `no_nominee` needs `{family_name}`; `no_family` needs `{nominee_name}` |
 * | **nominee + district** | `no_nominee` needs `{district_name}`; `no_family`/`no_district` need the nominee |
 *
 * ⇒ `family_name` is `null` whenever publication is not authorised (the fail-closed day-one
 * posture) and `nominee_name` is `null` when bank details were never collected (6.8 **AC3**'s
 * absence signal) — so **a drive with no bank details for a family that has not authorised
 * publication has ⛔ no renderable line today.**
 *
 * ⛔⛔ **AND THE FAILURE MODE IS A 500 FOR THE WHOLE PAGE, ⛔ NOT A BLANK ROW** — `t()` **THROWS** on
 * an unsupplied interpolation param, so one such row would take `/sahyog` down for everyone.
 *
 * ⭐⭐ **RULED: RETURN `null` AND RENDER ⛔ NOTHING — SILENCE.** ⛔ No placeholder, ⛔ no partial
 * sentence, ⛔ no marker naming what is missing — the posture this surface already takes for a
 * withheld deceased-member name, and for the same reason: *an omission that announces itself is an
 * **ENUMERATION SIGNAL***. ⭐ The row keeps every column it had.
 * ⛔⛔ **DO ⛔ NOT "FIX" THIS BY MINTING A FIFTH STRING HERE.** Extending the variant set is a **COPY
 * ACT on Trustee-ratified text** and needs a Panel ruling; inventing one at a render site is the
 * exact two-source defect `2026-09-04-193` cl.3 exists to close.
 */
export function selectIndexLineVariant(tokens: {
  nomineeName: string | null;
  familyName: string | null;
  districtName: string | null;
}): 'full' | 'no_nominee' | 'no_family' | 'no_district' | null {
  const { nomineeName, familyName, districtName } = tokens;
  if (nomineeName !== null && familyName !== null && districtName !== null) return 'full';
  // ⚠ `no_family` DROPS THE DISTRICT CLAUSE TOO, and that is ⛔ NOT a bug: *"who served in
  // {district_name} district"* modifies the DECEASED MEMBER, so keeping it while dropping the
  // family name would attribute the posting district to the NOMINEE — a factual claim about a
  // named private individual the data does ⛔ not support. ⇒ it needs the nominee ONLY.
  if (nomineeName !== null && familyName === null) return 'no_family';
  if (nomineeName !== null && familyName !== null && districtName === null) return 'no_district';
  if (nomineeName === null && familyName !== null && districtName !== null) return 'no_nominee';
  return null;
}

/** One pagination control — always a REAL link, ⛔ never a JS-dependent button. */
export interface PaginationLink {
  readonly href: string;
  readonly label: string;
  readonly rel: 'prev' | 'next';
}

export interface SahyogView {
  /** The model whose OWN KEYS are the tier-leak snapshot's field set. */
  readonly model: SahyogDriveRenderModel;
  readonly links: readonly PaginationLink[];
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
  /**
   * ⭐ THE ACTIVE/ARCHIVE PARTITION, COMPUTED FROM THE WIRE ENUM (Review finding, 2026-08-27).
   *
   * ⚠ IT IS COMPUTED HERE, ⛔ NOT RECOVERED FROM THE RENDERED ROWS. `toDisplayRow` collapses
   * `status` into a LOCALISED display string, and `splitSections` used to recover the partition by
   * string-comparing those strings back against the same labels — destroying the discriminant and
   * reconstructing it from copy. ⛔ If a translator (or a copy edit) ever made `status.active` and
   * `status.archive` identical in one locale, BOTH filters matched EVERY row and every drive
   * rendered TWICE, under two headings making contradictory claims about whether the family had
   * been paid. ⛔ No test could catch it: the render fixture uses two distinct labels and the copy
   * test never compares the two keys.
   *
   * ⚠ Carried on the VIEW rather than on `SahyogDriveRow` deliberately — adding a key to that
   * interface is a MATRIX ACT (`deriveFieldIds` throws in both directions), and this token is a
   * routing fact, ⛔ not a rendered field.
   */
  readonly sections: {
    /**
     * ⭐ Story 11b.14 (AC1) — drives still COLLECTING. ⛔ Empty until `2026-09-04-189` cl.2's
     * widening reaches production data; ⛔ never merged into `active`.
     */
    readonly live: readonly SahyogDriveRow[];
    readonly active: readonly SahyogDriveRow[];
    readonly archive: readonly SahyogDriveRow[];
  };
}

/**
 * Map the opaque funding-outcome token onto its localised framing copy.
 *
 * ⭐ THE TARGET IS ALREADY GONE BY THE TIME THIS RUNS, and that is the whole design:
 * `classifyCycleOutcome` compares the totals once, inside the domain read, and ⛔ only this token
 * leaves. ⇒ a shortfall figure PHYSICALLY CANNOT reach the copy path. ⛔ Do not add a numeric
 * parameter to any of these labels, under any name, and ⛔ do not pass a target into this module.
 *
 * ⚠ Note the copy is deliberately NOT a comparison to a target — `microcopy.yaml`'s
 * `pool-reality-comparison` tone rule bites `fell short`, `shortfall`, `\d+% of the target` and
 * their Hindi equivalents at PR time, so a comparison frame fails the gate before it fails review.
 */
function framingFor(
  outcome: PublicSahyogDriveResponse['items'][number]['fundingOutcome'],
  labels: SahyogLabels,
): string {
  // ⭐⛔ NO EXPECTATION WAS EVER SET ⇒ SAY NOTHING (Review finding, 2026-08-27; ✅ RULED BigDev
  // 2026-08-27). `null` means the drive closed with ZERO assigned contributors, so there is
  // nothing to compare a delivery against. ⚠ Before this, the domain classified `0 >= 0` as
  // `fully_funded` and the row published *"The cycle closed with the support it needed."* beside
  // *"0 confirmed"* — a false statement about money on the one surface built to make checkable
  // ones. ⛔ Do not substitute a placeholder, an em-dash or a "not recorded" string: the honest
  // render for "we have nothing to say about this" is an EMPTY cell.
  if (outcome === null) return '';
  switch (outcome) {
    case 'fully_funded':
      return labels.outcomeFullyFunded;
    case 'under_funded':
      return labels.outcomeUnderFunded;
    case 'partial':
      return labels.outcomePartial;
    default: {
      // Exhaustiveness guard — a new outcome without a branch is a compile-time error here, and a
      // runtime throw if an out-of-union value is forced past the type system.
      const _never: never = outcome;
      throw new Error(`[sahyog-render] unhandled funding outcome: ${String(_never)}`);
    }
  }
}

/**
 * Format the drive's close/settle instant.
 *
 * ⚠ LATIN NUMERALS + GREGORIAN DATES on this surface (operational register, UX-DR73) — ⛔ never
 * Devanagari digits, even under `hi`. A drive code and a date are operational facts a person may
 * need to quote back to the helpline.
 *
 * ⭐⛔ AND IT IS RENDERED IN **IST**, ⛔ NOT UTC (Review finding, 2026-08-27). The numerals rule
 * above is argued from *"a date a person may need to quote back to the helpline"* — and that
 * argument decides the TIME ZONE too, which the original said nothing about. IST is UTC+5:30, so
 * a drive closed between 00:00 and 05:30 IST rendered as the PREVIOUS DAY: a family quoting
 * 1 August to an operator whose internal view says 2 August. ⭐ The repo already scopes facts to
 * IST elsewhere (`packages/validity-service/src/producer.ts` — "the current IST calendar year"),
 * so this is the established convention, ⛔ not a new one.
 *
 * ⚠ `sahyog.astro` widens the `<input type="date">` filter bounds to the same IST day boundary —
 * ⛔ the two must not drift, or a date a visitor can SEE becomes a date they cannot FILTER for.
 */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function formatClosedAt(iso: string | null): string | null {
  if (iso === null) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // Shift the instant by IST's fixed offset, then read the UTC parts — India has no DST, so a
  // fixed offset is exact and needs no `Intl` timezone database at render time.
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const yyyy = String(ist.getUTCFullYear()).padStart(4, '0');
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(ist.getUTCDate()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Map one wire row onto its DISPLAY shape.
 *
 * ⭐⛔ THE NAME IS PASSED THROUGH UNTOUCHED, INCLUDING ITS `null`. Its FORM was already decided
 * server-side by `resolvePublicMemberName` under the Pariwar's configured mode, and ⛔ re-deriving
 * or re-shortening it here would be the second copy of the presentation policy that `-136` cl.2
 * forbids. ⛔ And a `null` must ⛔ NEVER be replaced with a placeholder, an em-dash, "withheld", or
 * any other marker: *an omission that announces itself is an ENUMERATION SIGNAL.*
 */
function toDisplayRow(
  row: PublicSahyogDriveResponse['items'][number],
  labels: SahyogLabels,
  search: URLSearchParams,
): SahyogDriveRow {
  return {
    deceasedMemberName: row.deceasedMemberName,
    poolLetterCode: row.poolLetterCode,
    poolCanonicalIdentifier: row.poolCanonicalIdentifier,
    // ⭐ Story 11b.10 (AC3) — the drive link. See {@link driveHref} for what shipping it does.
    driveHref: driveHref(row.publicToken, search),
    // ⭐⛔ THE ACCESSIBLE NAME IDENTIFIES **WHICH DRIVE** IT OPENS — ⛔ never a bare "click here"
    // (family 13). ⚠ A table of N rows whose links all announce the same string is a screen-reader
    // list of N identical destinations; the drive code is what disambiguates them, and it is the
    // one label on this row that is stable, operational and non-PII. ⛔ Do ⛔ NOT build it from
    // `deceasedMemberName`: that is Tier-1, consent-gated and `null` for any unconsented family —
    // it would make the accessible name VANISH on exactly the rows that still need one.
    driveLinkA11yLabel: labels.driveLinkA11y(row.poolCanonicalIdentifier),
    // ⚠ Story 11b.12 — `'verified'` is the wire token, `labels.statusArchive` the FIELD NAME.
    // ⛔ The field is deliberately NOT renamed (D3: the ban is on rendered VALUES, ⛔ not on
    // identifiers a member never reads); its VALUE now resolves to the shared **Verified** copy.
    // ⚠⛔⛔ **Story 11b.14 (AC1) ADDED THE THIRD ARM, AND IT IS THE HALF THAT FAILS SILENTLY.** This
    // was a TWO-WAY ternary whose `else` swept everything non-`verified` into **Closed** — so a
    // `live` row admitted by the widened predicate would have rendered under the ruled word for a
    // drive whose window has SHUT. ⛔ There was ⛔ no typecheck and ⛔ no test standing between that
    // and production. ⭐ Pinned now by `sahyog-live-section.test.ts`.
    driveStatus:
      row.status === 'live'
        ? labels.statusLive
        : row.status === 'verified'
          ? labels.statusArchive
          : labels.statusActive,
    driveClosedAt: formatClosedAt(row.closedAt),
    district: row.district,
    confirmedContributionCount: labels.contributionsCount(row.confirmedContributionCount),
    closeOfCycleFraming: framingFor(row.fundingOutcome, labels),
    // ⭐⭐ STORY 11b.14 — THE METER, ⛔ LIVE ROWS ONLY.
    //
    // ⚠⛔ THE STAGE GUARD IS HERE, ⛔ NOT ONLY IN THE COLUMN LIST, and both are deliberate. The
    // column list decides what the TABLE shows; this decides what the render MODEL carries — and the
    // tier-leak scrape reads the model. ⇒ a closed row must carry ⛔ no fill and ⛔ no sentence even
    // if a future template rendered the meter column somewhere it should not.
    driveProgressPercentage: row.status === 'live' ? row.confirmedPercentage : null,
    // ⛔ ⛔ `t()` THROWS on an unsupplied token, so BOTH numbers are always supplied together.
    //
    // ⭐⭐ AND A DRIVE WITH ⛔ NO CONFIRMED CONTRIBUTION TAKES THE **ZERO-STATE** SENTENCE INSTEAD —
    // `2026-09-07-206` cl.4. ⚠ At zero the ruled participation line reads *"₹ 0 and counting, by 0
    // colleagues—and still going strong!"*, which is ⛔ what **day one of every drive** would have
    // published (Review finding, 2026-09-07). ⛔ The branch is on the COUNT, ⛔ not on the amount:
    // the count is the sentence's own subject, and a zero amount with a nonzero count is a state
    // this surface does ⛔ not model.
    driveParticipationLine:
      row.status === 'live'
        ? row.confirmedContributionCount === 0
          ? labels.zeroLine(row.deceasedMemberName)
          : labels.participationLine(row.amountRaisedInr, row.confirmedContributionCount)
        : null,
    // ⚠⛔ `driveTargetInr` is ABSENT on the wire unless a `super_admin` revealed it for the Pariwar
    // (⛔ never `null` — the 11b.11 shape) ⇒ this is `null` for every Pariwar at launch. ⭐ Read the
    // field's doc-block before making it non-null anywhere: it re-opens Pool-Reality #2.
    driveTargetLine:
      row.status === 'live' && row.driveTargetInr !== undefined
        ? labels.driveTargetLine(row.driveTargetInr)
        : null,
    // ⭐⭐ STORY 11b.14 (AC7) — THE NOMINEE'S NAME, under the ruled label "Nominee Name".
    // ⛔ ⛔ *"Account holder"* may ⛔ NOT be used (`2026-09-04-190` cl.2). ⚠ A `null` renders NOTHING.
    nomineeName: row.nomineeName,
    // ⭐⭐ THE CLOSED · VERIFIED SENTENCE (`D5`'s stage split) — ⛔ never on a Live row, which takes
    // the participation sentence instead. ⚠⛔ `null` ALSO where ⛔ no ratified variant fits: ⭐ the
    // row renders no sentence at all, ⛔ never a placeholder (`2026-09-07-205` cl.6).
    driveIndexLine:
      row.status === 'live'
        ? null
        : labels.indexLine({
            amountInr: row.amountRaisedInr,
            nomineeName: row.nomineeName,
            // ⭐ `{family_name}` IS the deceased member's name — the same consent-gated value the
            // row already carries. ⛔ Do ⛔ not source it from anywhere else.
            familyName: row.deceasedMemberName,
            districtName: row.district,
          }),
  };
}

/**
 * Build the view for an ACCEPTED page request.
 *
 * ⚠ `drive === null` is an OUTAGE, ⛔ never an empty index. On THIS surface the conflation is at
 * its most damaging: the page exists so a stranger can check whether this trust moves money, so
 * rendering "no drives" during an upstream blip is the single most misleading thing it could say.
 *
 * ⭐ THE "NEXT" LINK IS DERIVED FROM THE REAL TOTAL, ⛔ never from "this page came back full" — an
 * index with exactly `limit` drives would then advertise a page 2 that is empty, which is both a
 * lie and an enumeration invitation.
 */
export function buildSahyogView(
  accepted: { page: number; limit: number },
  search: URLSearchParams,
  labels: SahyogLabels,
  drive: PublicSahyogDriveResponse | null,
  opts: { readonly filtered: boolean } = { filtered: false },
): SahyogView {
  const apiUnavailable = drive === null;
  const rows = drive === null ? [] : drive.items.map((r) => toDisplayRow(r, labels, search));
  const total = drive?.total ?? 0;

  // ⭐ THE PARTITION IS TAKEN FROM THE WIRE ENUM, HERE, WHILE IT STILL EXISTS — see
  // {@link SahyogView.sections}. `toDisplayRow` collapses `status` into localised copy, so this is
  // the LAST point at which the discriminant is still a token. ⛔ Never recover it downstream by
  // string-comparing display labels.
  // ⚠ Indices are zipped against `drive.items` rather than re-mapping, so a row appears in EXACTLY
  // one section by construction — ⛔ not by two independent filters that could both match.
  const liveRows: SahyogDriveRow[] = [];
  const activeRows: SahyogDriveRow[] = [];
  const archiveRows: SahyogDriveRow[] = [];
  if (drive !== null) {
    drive.items.forEach((item, i) => {
      const displayRow = rows[i];
      if (displayRow === undefined) return;
      // ⛔⛔ THE PARTITION LITERAL. ⚠ Story 11b.12 renamed it `'archive'` → `'verified'`. Get it
      // wrong and EVERY drive lands in one section — or, as `:178-184` records actually happening,
      // renders TWICE under two headings making contradictory claims. ⭐ Pinned by the
      // both-tokens-present `splitSections` test, ⛔ not by the label test.
      // ⚠⛔⛔ **Story 11b.14 (AC1) MADE IT THREE-WAY.** It was `if (verified) archive; else active;`
      // — a two-way split whose `else` swept **everything non-`verified`** into "Closed drives".
      // ⇒ admitting `live` upstream without this edit renders every collecting drive under the
      // Closed heading, labelled Closed, with ⛔ a green typecheck and ⛔ a green suite.
      // ⭐ It is now an explicit three-arm switch: ⛔ no `else` catch-all, so a FOURTH token added
      // to the wire enum lands nowhere and is visible, ⛔ rather than being absorbed.
      if (item.status === 'live') liveRows.push(displayRow);
      else if (item.status === 'verified') archiveRows.push(displayRow);
      else activeRows.push(displayRow);
    });
  }

  // ⚠ "past the end" ⟺ the index genuinely HAS drives (`total > 0`) but none landed on THIS page.
  // ⛔ Distinct from an index that has never published a drive (`total === 0`), which is honestly
  // "nothing yet" rather than "you went too far".
  //
  // ⭐ NOTE THE `page > 1` CONJUNCT IS KEPT even though this surface's rows-vs-total asymmetry is
  // WEAKER than `/members`'. There, a KMS failure drops ROWS after the count is taken, so page 1
  // could come up empty against a non-zero total. HERE a failed decrypt drops only the NAME and
  // the row survives — so that specific mismatch cannot arise. ⛔ The conjunct stays anyway: it
  // costs nothing, and "you have reached the end" on page 1 would be false under ANY future cause.
  const pastEnd = !apiUnavailable && total > 0 && rows.length === 0 && accepted.page > 1;

  const model: SahyogDriveRenderModel = {
    hasDrives: rows.length > 0,
    page: accepted.page,
    limit: accepted.limit,
    apiUnavailable,
    pastEnd,
    filtered: opts.filtered,
    rows,
  };

  const hasPrevious = model.page > 1;
  // ⭐ A next page exists iff the index holds more rows than this page's window covers — AND the
  // next page is one `parsePageParams` will actually ACCEPT.
  // ⚠ THE HORIZON CLAMP IS NOT DECORATION: without it a large index advertises
  // `<a rel="next" href="?page=201">` on page 200, and clicking it hits the 400 state. ⛔ A page
  // must never advertise a link it knows the parser will refuse.
  const hasNext =
    !apiUnavailable &&
    accepted.page * accepted.limit < total &&
    accepted.page + 1 <= PUBLIC_PAGE_HORIZON;

  const links: PaginationLink[] = [];
  if (hasPrevious) {
    links.push({
      href: pageHref(SAHYOG_ROUTE, search, model.page - 1),
      label: labels.previousPage,
      rel: 'prev',
    });
  }
  if (hasNext) {
    links.push({
      href: pageHref(SAHYOG_ROUTE, search, model.page + 1),
      label: labels.nextPage,
      rel: 'next',
    });
  }

  return {
    model,
    links,
    hasPrevious,
    hasNext,
    sections: { live: liveRows, active: activeRows, archive: archiveRows },
  };
}

/**
 * Split the page's rows into the three rendered sections.
 *
 * ⚠ ONE bounded page read feeds ALL THREE sections — ⛔ not three requests and ⛔ not three
 * paginations. The page is the unit of bounding; Live/Closed/Verified is a presentation split
 * within it. ⚠ Story 11b.14 (AC1) added the third; it was *"the two rendered sections"*.
 */
export function splitSections(view: SahyogView): {
  live: readonly SahyogDriveRow[];
  active: readonly SahyogDriveRow[];
  archive: readonly SahyogDriveRow[];
} {
  // ⭐ The partition was computed in `buildSahyogView` from the WIRE ENUM and is carried on the
  // view — see {@link SahyogView.sections}. ⛔ Do not re-derive it here by comparing localised
  // display strings: that destroys the discriminant and reconstructs it from copy, and a locale
  // in which the two status labels coincide renders every drive TWICE under contradictory
  // headings (Review finding, 2026-08-27).
  return {
    live: view.sections.live,
    active: view.sections.active,
    archive: view.sections.archive,
  };
}

/**
 * ⭐⭐ **THE CONTRIBUTED AMOUNT'S RULED FORM — exact below ₹10 lakh, CUT OFF at and above it.**
 * Story 11b.14 (AC3), Trustee-ratified 2026-09-07: *"Begin cutting off only if amount contributed
 * exceeds 10 lakh, till then show exact number — this applies to Live drive. For Closed, verified
 * shows exact figure."*, amended the same day by *"Cut off at **Exactly** ten lakh"*.
 *
 * ⇒ ⛔ **THE TEST IS `>=`, ⛔ NOT `>`** — the later wording moved the boundary, and ₹10,00,000 renders
 * `₹ 10 lakh` where the earlier wording would have kept it exact. ⚠ A visitor watching a drive
 * therefore sees the figure **change form** as it crosses the line; ⭐ that is intended.
 *
 * ⚠⛔ **CLOSED AND VERIFIED ROWS ARE ⛔ ALWAYS EXACT** — the short form is scoped to Live. ⭐ Their
 * `index_line.*` `{amount}` takes the exact form too.
 *
 * ⭐ LATIN numerals in both locales for the exact arm (`formatCurrency(…, 'en')`) — money is
 * **OPERATIONAL** data (amendment-A2). ⛔ Never the `'hi'` Devanagari arm, which exists only for
 * ceremonial prose.
 */
export function formatSahyogLiveAmount(
  amountInr: number,
  locale: Locale,
  stage: SahyogSectionStage,
): string {
  const CUT_OFF_INR = 1_000_000;
  if (stage === 'live' && amountInr >= CUT_OFF_INR) return formatCurrencyShort(amountInr, locale);
  return formatCurrency(amountInr, 'en');
}

/**
 * ⭐⭐ **लक्ष्य's RULED FORM — ⛔ ALWAYS lakh or crore.** Trustee-ratified 2026-09-07:
 * *"Expected figure always in Lakh or Crore."*
 *
 * ⚠⛔⛔ **THE ₹10-LAKH CUT-OFF DOES ⛔ NOT APPLY HERE.** A ₹8,00,000 target renders **`₹ 8 lakh`**,
 * ⛔ never `₹ 8,00,000`. ⇒ ⭐ **TWO DIFFERENT RULES ON ONE ROW, AND THAT IS DELIBERATE:** the
 * *contributed* amount is exact below ten lakh; the *target* never is. ⛔ Do ⛔ not "align" them —
 * the divergence is the ruling, ⛔ not an oversight.
 */
export function formatSahyogTargetAmount(targetInr: number, locale: Locale): string {
  return formatCurrencyShort(targetInr, locale);
}

/**
 * ⭐ Which rendered SECTION a column list is being built for — Story 11b.14 (AC1, Trap 4).
 *
 * ⚠ It is the **PUBLIC WIRE TOKEN**, ⛔ never a display label: recovering a section's identity by
 * comparing localised strings is the defect `SahyogView.sections` exists to prevent.
 */
export type SahyogSectionStage = 'live' | 'closed' | 'verified';

/** One rendered drive column: its matrix field id, its header, and how to read its value. */
export interface SahyogColumn {
  /** The snake_case matrix field id — what `getVisibility()` is asked about. */
  readonly fieldId: string;
  readonly headerLabel: string;
  /**
   * ⚠ Returns `null` to mean *render NOTHING in this cell* — ⛔ not an empty string, ⛔ not a dash.
   * The template must emit an EMPTY cell for a null, with ⛔ no placeholder text of any kind.
   */
  readonly valueOf: (row: SahyogDriveRow) => string | null;
  /**
   * ⭐ Story 11b.10 (AC3) — present ONLY on the drive-link column. When set, the template wraps the
   * cell's value in an `<a href>` and gives it `aria-label={a11yOf(row)}`.
   *
   * ⚠⛔ IT RIDES THE COLUMN LIST DELIBERATELY, ⛔ not a bespoke branch in the template. The whole
   * point of `visibleSahyogColumns` is that the `<th>`/`<td>` pair is suppressed TOGETHER — a link
   * column added outside it would emit a labelled header over empty cells if the matrix ever
   * suppressed `drive_href`, which is the announced-omission defect this function exists to prevent.
   *
   * ⛔ It is ⛔ NOT a general "make any column a link" seam. Exactly one column sets it; a second
   * link on this row would be a second onward affordance on a surface whose control 5 is *"the
   * absence of any detail or export affordance"* beyond this one.
   */
  readonly hrefOf?: (row: SahyogDriveRow) => string;
  /** The link's accessible name — ⛔ never a bare "click here" (family 13). Set iff `hrefOf` is. */
  readonly a11yOf?: (row: SahyogDriveRow) => string;
  /**
   * ⭐⭐ STORY 11b.14 (AC2) — THE PROGRESS-METER CELL. ⚠ **Exactly ONE column sets it, and only in
   * the LIVE list**; it rides the column list for the same reason `hrefOf` does — so the `<th>` and
   * the `<td>` are suppressed **TOGETHER** if the matrix ever hides the field.
   *
   * ⛔ It is ⛔ NOT a general "put extra markup in a cell" seam. A second meter on this row would be
   * a second comparison affordance on a surface whose whole posture is *remembrance, not analytics*.
   */
  readonly meter?: {
    /**
     * The bar's fill, 0-100 — or `null` for a row that carries ⛔ no bar.
     *
     * ⚠⛔ **THE TEMPLATE RENDERS IT `aria-hidden`, AND THAT IS A RULING, ⛔ not a styling choice.**
     * `D6` removed the shipped *"{confirmed} of {total} contributions confirmed"* label because it
     * **names its denominator**; its screen-reader twin carries the identical shape and would name
     * that denominator to assistive tech. ⇒ ⭐ the bar is decorative to a screen reader and the ruled
     * sentence beside it carries the meaning — ⛔ nothing is announced twice, and ⛔ no new a11y
     * string is minted that would name a hidden figure.
     */
    readonly fillOf: (row: SahyogDriveRow) => number | null;
    /** लक्ष्य's own matrix field id — it is a SECOND governed value in the same cell. */
    readonly targetFieldId: string;
    /** लक्ष्य's line, or `null` — ⛔ `null` unless a `super_admin` revealed it for the Pariwar. */
    readonly targetOf: (row: SahyogDriveRow) => string | null;
  };
}

/**
 * The drive index's columns, IN RENDER ORDER, filtered to those the matrix says are visible.
 *
 * ⭐ WHY THIS EXISTS — the 11a.3 finding, inherited rather than rediscovered: `<MatrixField>`
 * correctly renders NOTHING for a not-visible verdict, but the `<td>` wrapping it and the `<th>`
 * labelling its column sit OUTSIDE the component. An unconditional pair produces an empty `<td>`
 * in every row under a still-labelled header — which is precisely what AC5 forbids: *"An omission
 * that announces itself is an ENUMERATION SIGNAL: a scraper diffing renders learns exactly which
 * fields exist."* ⇒ the `<th>`/`<td>` pair is suppressed TOGETHER, here.
 *
 * ⚠ `isVisible` is INJECTED rather than imported: this module must stay free of `matrix.server.ts`,
 * which inlines the matrix YAML via a Vite `?raw` specifier and cannot load in a plain unit test.
 * ⛔ It is not a seam for a second visibility rule — pass `visibilityOf(...).visible` and nothing else.
 *
 * ⛔ THERE IS NO SORT AFFORDANCE ON ANY COLUMN, and its absence is the AC5 prohibition in code: a
 * "sort by contributions" header link is a leaderboard wearing a table affordance.
 */
export function visibleSahyogColumns(
  labels: SahyogLabels,
  isVisible: (fieldId: string) => boolean,
  stage: SahyogSectionStage = 'closed',
): SahyogColumn[] {
  const all: SahyogColumn[] = [
    {
      fieldId: 'deceased_member_name',
      headerLabel: labels.columnName,
      // ⭐⛔ A NULL NAME RENDERS NOTHING — ⛔ no placeholder, ⛔ no "withheld", ⛔ no em-dash.
      // ⚠ Note this DIFFERS from the district/date columns below, which DO carry a "not recorded"
      // fallback, and the difference is deliberate: a missing district is an incomplete RECORD,
      // while a missing name is a family's CHOICE — and announcing a choice is what turns the
      // omission into a signal a scraper can diff.
      valueOf: (row) => row.deceasedMemberName,
    },
    {
      fieldId: 'pool_canonical_identifier',
      headerLabel: labels.columnPool,
      valueOf: (row) => row.poolCanonicalIdentifier,
    },
    {
      fieldId: 'pool_letter_code',
      headerLabel: labels.columnLetter,
      valueOf: (row) => row.poolLetterCode,
    },
    {
      fieldId: 'district',
      headerLabel: labels.columnDistrict,
      // ⚠ The "not recorded" fallback lives HERE, ⛔ not in the template — a display decision in
      // `.astro` frontmatter never enters the render model and is invisible to the tier-leak leg.
      valueOf: (row) => row.district ?? labels.districtUnknown,
    },
    {
      fieldId: 'drive_closed_at',
      headerLabel: labels.columnDate,
      valueOf: (row) => row.driveClosedAt ?? labels.dateUnknown,
    },
    {
      fieldId: 'confirmed_contribution_count',
      headerLabel: labels.columnContributions,
      valueOf: (row) => row.confirmedContributionCount,
    },
    {
      // ⭐⭐ STORY 11b.14 (AC7) — THE NOMINEE'S NAME, under its RULED public label.
      // ⛔⛔ `labels.columnNominee` must resolve to "Nominee Name" / "नॉमिनी का नाम" — ⛔ *"Account
      // holder"* may ⛔ NOT be used (`2026-09-04-190` cl.2, Trustee-ratified).
      // ⚠ A `null` renders NOTHING — ⛔ no placeholder, ⛔ no marker, ⛔ no "withheld" — and ⛔ never
      // removes the row. Same discipline as `deceased_member_name` above, for the same reason:
      // *an omission that announces itself is an ENUMERATION SIGNAL.*
      fieldId: 'nominee_account_holder_name',
      headerLabel: labels.columnNominee,
      valueOf: (row) => row.nomineeName,
    },
    {
      // ⭐⭐ STORY 11b.14 (AC7) — THE RULED CLOSED · VERIFIED SENTENCE. ⚠ Filtered OUT of the Live
      // column set below, which carries the participation sentence in the meter cell instead.
      fieldId: 'drive_index_line',
      headerLabel: labels.columnSummary,
      valueOf: (row) => row.driveIndexLine,
    },
    {
      // ⭐⭐ STORY 11b.14 (AC2, AC3) — THE PROGRESS METER. ⚠ **LIVE ROWS ONLY** — it is filtered out
      // of the other two stage lists below, header and cells TOGETHER.
      // ⚠ The cell's PRIMARY governed value is the ruled SENTENCE, ⛔ not the percentage: the
      // percentage never renders as text (it is the bar's width) and लक्ष्य is a second governed
      // value carried by `meter.targetFieldId`. ⭐ All three are declared in the matrix.
      fieldId: 'drive_participation_line',
      headerLabel: labels.columnProgress,
      valueOf: (row) => row.driveParticipationLine,
      meter: {
        fillOf: (row) => row.driveProgressPercentage,
        targetFieldId: 'drive_target',
        targetOf: (row) => row.driveTargetLine,
      },
    },
    {
      fieldId: 'close_of_cycle_framing',
      headerLabel: labels.columnOutcome,
      valueOf: (row) => row.closeOfCycleFraming,
    },
    {
      // ⭐⭐ STORY 11b.10 (AC3) — THE INBOUND PATH. ⚠ LAST in render order deliberately: it is an
      // ACTION, and a table that opens with one reads as a call to act rather than a public record
      // to read. ⛔ "Remembrance, not analytics" governs the ordering of this table too.
      // ⚠⛔ AND SAY WHAT IT DOES: every listed drive is now ONE CLICK from four Tier-1 fields under
      // `D8-default` FAIL-OPEN — the NECESSARY CONSEQUENCE of `2026-09-03-184` (A)+(B) (D3), ⛔ not
      // a fresh exposure decision, and ⛔ not something a reviewer should first meet in a diff.
      fieldId: 'drive_href',
      headerLabel: labels.columnOpen,
      valueOf: () => labels.viewDrive,
      hrefOf: (row) => row.driveHref,
      // ⚠⛔ THE ACCESSIBLE NAME IS MATRIX-GATED TOO (review 2026-09-04) — ⛔ it was ⛔ NOT, and that
      // was a hole in the "⛔ EVERY value goes through `<MatrixField>`" rule. The `aria-label` is
      // interpolated STRAIGHT INTO THE DOM by the template (it cannot be a `<MatrixField>` — it is
      // an attribute, not a cell), and it is mapped to `null` in `SAHYOG_DRIVE_ROW_FIELD_IDS`, so
      // ⛔ neither the surface-field derivation nor the scrape leg can see it. Its CONTENT is
      // `poolCanonicalIdentifier` — a matrix-GOVERNED field. ⇒ if the matrix ever suppressed
      // `pool_canonical_identifier` at `public`, the `<td>` would render empty while the
      // `aria-label` announced the drive code anyway: the field suppressed for sighted readers and
      // ⛔ disclosed to screen-reader users.
      //
      // ⭐ THE TRADE-OFF IS DELIBERATE AND STATED. Under suppression the label falls back to the
      // plain visible text, so N links share one accessible name — the defect the code-bearing
      // label exists to avoid. ⛔ That is accepted as the LESSER harm: an ambiguous link is a
      // usability cost, whereas announcing a field the matrix suppressed is a DISCLOSURE. ⚠ If the
      // matrix ever does suppress the identifier, this fallback is the thing to revisit — a
      // per-row non-governed discriminator (the letter code) would be the better answer then.
      // ⭐ Unreachable today: `pool_canonical_identifier` is visible at `public`.
      a11yOf: isVisible('pool_canonical_identifier')
        ? (row) => row.driveLinkA11yLabel
        : () => labels.viewDrive,
    },
  ];
  // ⛔⛔ TWO COLUMNS HAVE ⛔ NO MEANING FOR A DRIVE THAT HAS ⛔ NOT CLOSED — Story 11b.14, Trap 4.
  //
  // ⚠ `drive_closed_at` is NULLABLE and means *"⛔ no close event yet"*, which is true of EVERY
  // `live` row by construction. ⚠ And the fallback above (`?? labels.dateUnknown`) is the SHIPPED
  // DEFAULT — so leaving the column in would render **"Not recorded" / "दर्ज नहीं"** down the whole
  // Live section: ⛔ precisely the *announced-omission* shape AC5 forbids and that this very
  // function exists to prevent. ⛔ It is ⛔ not a missing record; there is nothing to record yet.
  //
  // ⚠ `close_of_cycle_framing` is Pool-Reality #2's **CLOSE-OF-CYCLE** sentence. Its producer is
  // `fundingOutcome`, which is `null` mid-drive ⇒ it would render a closing statement over a
  // running one. ⛔ Decided WITH the date column, ⛔ not separately.
  //
  // ⭐ The `<th>`/`<td>` pair goes TOGETHER, exactly as it does under a matrix suppression — ⛔ the
  // Live table has one fewer column, ⛔ not a column of blanks under a labelled header.
  //
  // ⭐⭐ AND THE CONVERSE — **THE METER IS LIVE-ONLY.** `-189` cl.2(b) rules a progress bar for a
  // drive that is COLLECTING; a bar on a closed drive would be a comparison against a cycle that has
  // already ended, and its ruled sentence (*"…and counting"*) would be false in terms.
  // ⭐ And `drive_index_line` is the CONVERSE of the meter — Closed · Verified only (`D5`'s stage
  // split): the index line was ratified against an index listing `closed` + `settled` ONLY, and it
  // occupies the CLOSE-OF-CYCLE slot, which is structurally null for a drive that has not closed.
  const forStage =
    stage === 'live'
      ? all.filter(
          (c) =>
            c.fieldId !== 'drive_closed_at' &&
            c.fieldId !== 'close_of_cycle_framing' &&
            c.fieldId !== 'drive_index_line',
        )
      : all.filter((c) => c.meter === undefined);
  return forStage.filter((c) => isVisible(c.fieldId));
}

/**
 * The 400-shaped state for a REJECTED page request.
 *
 * ⛔ Not a redirect to page 1, and ⛔ not a successful render of a different page than was asked
 * for. Both would answer a probe with a normal-looking page, which is the silent-clamp behaviour
 * FR-91's rejection exists to replace.
 *
 * ⭐ IT TAKES NO `rejection` ARGUMENT, AND THAT IS THE POINT — the rendered state is
 * REJECTION-INVARIANT. `?page=all`, `?limit=99999` and `?page=-1` all produce byte-identical
 * output, so a prober learns ⛔ nothing about WHICH bound it hit or where the boundary sits. The
 * decidable reason lives on the parser's verdict for logs and tests; ⛔ it never reaches the DOM.
 *
 * ⚠ ⛔ `?format=csv` WAS NAMED HERE AND DID NOT BELONG (Review finding, 2026-08-27). This
 * doc-block asserted it produced the same byte-identical rejection — it did ⛔ not.
 * `parsePageParams` examines ONLY `page` and `limit`, so an unknown parameter fell through
 * unexamined and rendered a normal **200**. ⭐ The `.strict()` refusal that makes `?format=csv` a
 * 400 lives on the API DTO and is only ever reached for the four parameters the page forwards.
 * ⇒ the page now REFUSES an unrecognised parameter itself (see `sahyog.astro`), which is what
 * makes this sentence true rather than aspirational — and which also closes the unbounded
 * shared-cache key space an arbitrary `?x=<n>` otherwise minted on an `edge_cacheable` surface.
 */
export interface SahyogRejectionView {
  readonly title: string;
  readonly body: string;
  readonly linkLabel: string;
  readonly linkHref: string;
  readonly status: 400;
}

export function buildSahyogRejectionView(labels: SahyogLabels): SahyogRejectionView {
  return {
    title: labels.rejectedTitle,
    body: labels.rejectedBody,
    linkLabel: labels.pageTitle,
    linkHref: SAHYOG_ROUTE,
    status: 400,
  };
}

/** Re-exported so the page never re-derives the reason for logging. */
export type { PaginationResult };
