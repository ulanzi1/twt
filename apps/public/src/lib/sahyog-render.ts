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
  const lang = search.get('lang');
  const base = `${SAHYOG_VIVRAN_ROUTE}/${encodeURIComponent(publicToken)}`;
  return lang === null || lang === '' ? base : `${base}?lang=${encodeURIComponent(lang)}`;
}

/** Copy the page passes in, already resolved through `t()` with an EXPLICIT namespace. */
export interface SahyogLabels {
  readonly pageTitle: string;
  readonly pageIntro: string;
  /** The table's accessible name. ⚠ MUST BE DISTINCT from `pageIntro` — a screen reader announces
   *  a repeat consecutively, which is noise where a caption should orient (AC10). */
  readonly tableCaptionActive: string;
  readonly tableCaptionArchive: string;
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
  readonly columnOutcome: string;
  /** Shown in a district cell when the deceased member has no posting row. */
  readonly districtUnknown: string;
  /** Shown in a date cell when the pool's stream carries no close/settle event. */
  readonly dateUnknown: string;
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
    driveStatus: row.status === 'archive' ? labels.statusArchive : labels.statusActive,
    driveClosedAt: formatClosedAt(row.closedAt),
    district: row.district,
    confirmedContributionCount: labels.contributionsCount(row.confirmedContributionCount),
    closeOfCycleFraming: framingFor(row.fundingOutcome, labels),
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
  const activeRows: SahyogDriveRow[] = [];
  const archiveRows: SahyogDriveRow[] = [];
  if (drive !== null) {
    drive.items.forEach((item, i) => {
      const displayRow = rows[i];
      if (displayRow === undefined) return;
      if (item.status === 'archive') archiveRows.push(displayRow);
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
    sections: { active: activeRows, archive: archiveRows },
  };
}

/**
 * Split the page's rows into the two rendered sections.
 *
 * ⚠ ONE bounded page read feeds BOTH sections — ⛔ not two requests and ⛔ not two paginations.
 * The page is the unit of bounding; Active/Archive is a presentation split within it.
 */
export function splitSections(view: SahyogView): {
  active: readonly SahyogDriveRow[];
  archive: readonly SahyogDriveRow[];
} {
  // ⭐ The partition was computed in `buildSahyogView` from the WIRE ENUM and is carried on the
  // view — see {@link SahyogView.sections}. ⛔ Do not re-derive it here by comparing localised
  // display strings: that destroys the discriminant and reconstructs it from copy, and a locale
  // in which the two status labels coincide renders every drive TWICE under contradictory
  // headings (Review finding, 2026-08-27).
  return { active: view.sections.active, archive: view.sections.archive };
}

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
      a11yOf: (row) => row.driveLinkA11yLabel,
    },
  ];
  return all.filter((c) => isVisible(c.fieldId));
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
