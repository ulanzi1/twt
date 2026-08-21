// The `/members` pure render module — Story 11a.3 (Task 7; AC3, AC4, AC5, AC9, AC11).
//
// House convention (and the thing that makes `deriveFieldIds` sound): ALL display logic lives
// here; `members.astro` is a thin wrapper. ⛔ Breaking that is a GATE EVASION before it is a style
// choice — a value computed inline in `.astro` frontmatter never enters the render model and is
// therefore invisible to the tier-leak leg. On THIS surface that matters more than anywhere else.
//
// ⭐ WHAT THIS SURFACE RENDERS AS OF STORY 11a.3: real member rows — the presentation-resolved
// name, the raw latest-posting district, and a two-label status pill — one bounded page at a time.
// ⚠ This supersedes the 11a.2 header, which said the page reads NO member data. That was true then.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐ THE INVARIANT THIS SURFACE EXISTS UNDER: A LEGITIMACY SURFACE, NOT A SOCIAL GRAPH (AC11)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The Member Directory exists to support INSTITUTIONAL LEGITIMACY and TRUST VERIFICATION — so a
// prospective member can see the trust is real, and an existing member can verify a peer. ⛔ It is
// NOT a social network, NOT a discovery tool, and NOT a growth surface.
//
// ⛔ EXPLICITLY PROHIBITED DIRECTIONS — reject these at DESIGN time, not at review time:
//   (a) friend-finder or connection suggestions
//   (b) social graphing or member-relationship visualisation
//   (c) engagement gamification — badges, streaks, leaderboards, profile-completeness scores
//   (d) "members you might know" style recommendation engines
//   (e) any feature that incentivises repeated member-discovery sessions
//
// ✅ ACCEPTABLE DIRECTIONS: tier-respecting search/filter for legitimate trust verification;
// accessibility; performance; additional fields ONLY with a trustee-attested matrix update.
//
// ⭐ THE TEST A PROPOSAL MUST PASS: *"Does this serve institutional legitimacy or trust
// verification?"* If the honest answer is ENGAGEMENT or SOCIAL DISCOVERY, the proposal is REJECTED.
// (Recorded identically in `directory-abuse-rules.yaml` and linked from COMPOSITION-CONTRACT.md —
// this file, that file, and the page header are the three places a future author actually opens.)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
// PURE: no fs, no db, no env, no clock.
import type { PublicDirectoryResponse } from '@twt/contracts';

import { pageHref, PUBLIC_PAGE_HORIZON, type PaginationResult } from './pagination.js';
import type { MemberDirectoryRow, MembersRenderModel } from './surface-fields.js';

export const MEMBERS_ROUTE = '/members';

/** Copy the page passes in, already resolved through `t()` with an explicit namespace. */
export interface MembersLabels {
  readonly pageTitle: string;
  readonly pageIntro: string;
  /** The table's accessible name. ⚠ DISTINCT from `pageIntro` — a repeat is announced twice. */
  readonly tableCaption: string;
  readonly notPublishedTitle: string;
  readonly notPublishedBody: string;
  /** The OUTAGE state — ⛔ deliberately distinct copy from the empty state. */
  readonly unavailableTitle: string;
  readonly unavailableBody: string;
  /** The PAST-THE-END state — ⛔ deliberately distinct copy from "not published yet". */
  readonly pastEndTitle: string;
  readonly pastEndBody: string;
  readonly nextPage: string;
  /** Column headers for the directory table. */
  readonly columnName: string;
  readonly columnDistrict: string;
  readonly columnStatus: string;
  /** The two ruled status-pill labels, already localised. */
  readonly statusActive: string;
  readonly statusLockIn: string;
  /** Shown in a district cell when the member has no posting row. */
  readonly districtUnknown: string;
  readonly paginationLabel: string;
  readonly previousPage: string;
  readonly invalidTitle: string;
  readonly invalidBody: string;
  readonly invalidLink: string;
  /** The valid, non-error "back to page 1" link shown on any accepted page > 1.
   *  ⛔ Deliberately NOT `invalidLink` — that copy is written for the 400-rejection
   *  state and reusing it here would silently break the moment that copy is tuned. */
  readonly backToStart: string;
}

/** One pagination control — always a REAL link, never a JS-dependent button. */
export interface PaginationLink {
  readonly href: string;
  readonly label: string;
  readonly rel: 'prev' | 'next';
}

export interface MembersView {
  /** The model whose OWN KEYS are the tier-leak snapshot's field set (ruling D3(a)). */
  readonly model: MembersRenderModel;
  readonly links: readonly PaginationLink[];
  /** True ⟺ there is a previous page to link to. */
  readonly hasPrevious: boolean;
  /** True ⟺ the REAL row count says a further page exists. ⛔ Never inferred from a full page. */
  readonly hasNext: boolean;
}

/**
 * Map one wire row onto its DISPLAY shape.
 *
 * ⚠ The only transformation is the status LABEL: the wire carries the ruled PUBLIC machine values
 * (`active` | `waiting-period` — ⛔ never the internal `lock-in`, `2026-08-21-144` cl.4) and the
 * page renders localised copy. ⛔ The name and district are passed
 * through untouched — the name's FORM was already decided server-side by
 * `resolvePublicMemberName`, and ⛔ re-deriving it here would be the second copy of the presentation
 * policy that `-136` cl.2 forbids.
 */
function toDisplayRow(
  row: PublicDirectoryResponse['items'][number],
  labels: MembersLabels,
): MemberDirectoryRow {
  return {
    memberName: row.name,
    district: row.district,
    memberStatus: row.status === 'waiting-period' ? labels.statusLockIn : labels.statusActive,
  };
}

/**
 * Build the view for an ACCEPTED page request.
 *
 * ⭐ THE "NEXT" LINK IS NOW HONEST, derived from the REAL total. ⚠ This replaces 11a.2's blanket
 * suppression, which existed because there was no row count to be honest with. ⛔ It is NOT derived
 * from "this page came back full": a directory with exactly `limit` members would then advertise a
 * page 2 that is empty, which is both a lie and an enumeration invitation.
 *
 * ⚠ `total` counts what the ROSTER admits, and a row whose name could not be resolved is dropped
 * after that count — so a page may be shorter than `total` implies. That asymmetry is accepted
 * (a shorter page beats a blank name cell) and is why the next-link is computed from `total`
 * rather than from `rows.length`.
 */
export function buildMembersView(
  accepted: { page: number; limit: number },
  search: URLSearchParams,
  labels: MembersLabels,
  directory: PublicDirectoryResponse | null,
): MembersView {
  // ⚠ `null` is an OUTAGE, ⛔ never an empty directory. The two render as different states, and
  // conflating them would make an API failure look like a trust with no members.
  const apiUnavailable = directory === null;
  const rows = directory === null ? [] : directory.items.map((r) => toDisplayRow(r, labels));
  const total = directory?.total ?? 0;

  // ⚠ "past the end" ⟺ the roster genuinely has members (`total > 0`) but none of them landed on
  // THIS page — distinct from a directory that has never published a member at all (`total === 0`).
  // Not derived from `page > 1` alone: a request for page 5 of a 0-member roster is still honestly
  // "not published yet", not "you went too far".
  //
  // ⭐ AND `page > 1` IS REQUIRED — `2026-08-21-145`, second-round review. `total` is the ROSTER
  // count, taken BEFORE per-row name resolution; rows are dropped after it (a KMS decrypt failure,
  // or a name the presentation policy cannot shield). ⇒ without this conjunct, a transient KMS
  // fault that dropped every row on PAGE 1 of a 400-member roster rendered "You've reached the end
  // of the directory — there are no more entries past this point". ⛔ On page 1 that is simply
  // false, and it is the same class of lie the outage state exists to avoid.
  // ⚠ Page 1 with rows dropped falls through to the empty state, which claims less.
  const pastEnd = !apiUnavailable && total > 0 && rows.length === 0 && accepted.page > 1;

  const model: MembersRenderModel = {
    hasMembers: rows.length > 0,
    page: accepted.page,
    limit: accepted.limit,
    apiUnavailable,
    pastEnd,
    rows,
  };

  const hasPrevious = model.page > 1;
  // ⭐ A next page exists iff the roster holds more rows than this page's window covers
  // — AND the next page is one `parsePageParams` will actually ACCEPT.
  //
  // ⚠ THE HORIZON CLAMP IS NOT DECORATION — `2026-08-21-145`, second-round review. Without it, a
  // 5001-member roster at the default limit of 25 rendered `<a rel="next" href="?page=201">` on
  // page 200, and clicking it hit `page_above_horizon` and the 400 state. ⛔ A page must never
  // advertise a link it knows the parser will refuse; the horizon is the same constant both sides
  // read, so there is no second literal to drift.
  const hasNext =
    !apiUnavailable &&
    accepted.page * accepted.limit < total &&
    accepted.page + 1 <= PUBLIC_PAGE_HORIZON;

  const links: PaginationLink[] = [];
  if (hasPrevious) {
    links.push({
      href: pageHref(MEMBERS_ROUTE, search, model.page - 1),
      label: labels.previousPage,
      rel: 'prev',
    });
  }
  if (hasNext) {
    links.push({
      href: pageHref(MEMBERS_ROUTE, search, model.page + 1),
      label: labels.nextPage,
      rel: 'next',
    });
  }

  return { model, links, hasPrevious, hasNext };
}

/** One rendered directory column: its matrix field id, its header, and how to read its value. */
export interface DirectoryColumn {
  /** The snake_case matrix field id — what `getVisibility()` is asked about. */
  readonly fieldId: string;
  readonly headerLabel: string;
  readonly valueOf: (row: MemberDirectoryRow) => string;
}

/**
 * The directory's columns, IN RENDER ORDER, filtered to those the matrix says are visible.
 *
 * ⭐ WHY THIS EXISTS — AC5, `2026-08-21-145`, second-round review. `<MatrixField>` correctly
 * renders NOTHING for a not-visible verdict, but the `<td>` wrapping it and the `<th>` labelling
 * its column sat OUTSIDE the component and were unconditional. ⇒ a not-visible field produced an
 * empty `<td>` in every row under a still-labelled header — which is precisely the thing AC5
 * forbids: *"An omission that announces itself is an ENUMERATION SIGNAL: a scraper diffing renders
 * learns exactly which fields exist."* The component honoured the rule; the table around it did not.
 *
 * ⭐ THE FIX IS HERE, ⛔ NOT IN `<MatrixField>`. AC5 forbids modifying the component to fit a call
 * site, and nothing about it needed to change — the defect was the table's shape. This also keeps
 * the decision in pure `.ts` where it is unit-testable, per Task 7 (display logic in the render
 * module, ⛔ never in the `.astro` file, which on this surface is a gate evasion before it is a
 * style choice).
 *
 * ⚠ `isVisible` is INJECTED rather than imported: this module must stay free of `matrix.server.ts`,
 * which inlines the matrix YAML via a Vite `?raw` specifier and cannot load in a plain unit test.
 * ⛔ It is not a seam for a second visibility rule — pass `visibilityOf(...).visible` and nothing else.
 */
export function visibleDirectoryColumns(
  labels: MembersLabels,
  isVisible: (fieldId: string) => boolean,
): DirectoryColumn[] {
  const all: DirectoryColumn[] = [
    {
      fieldId: 'member_name',
      headerLabel: labels.columnName,
      valueOf: (row) => row.memberName,
    },
    {
      fieldId: 'district',
      headerLabel: labels.columnDistrict,
      // ⚠ The "not recorded" fallback lives HERE, ⛔ not in the template. It was computed inline in
      // `members.astro` as `row.district ?? labels.districtUnknown`, which put a display decision
      // outside the pure module — the exact pattern Trap 7 names.
      valueOf: (row) => row.district ?? labels.districtUnknown,
    },
    {
      fieldId: 'member_status',
      headerLabel: labels.columnStatus,
      valueOf: (row) => row.memberStatus,
    },
  ];
  return all.filter((c) => isVisible(c.fieldId));
}

/**
 * The 400-shaped state for a REJECTED page request.
 *
 * ⛔ Not a redirect to page 1, and ⛔ not a successful render of a different page than
 * was asked for. Both would answer a probe with a normal-looking page, which is the
 * silent-clamp behaviour FR-91's rejection exists to replace.
 *
 * ⭐ IT TAKES NO `rejection` ARGUMENT, AND THAT IS THE POINT — the rendered state is
 * REJECTION-INVARIANT. `?page=all`, `?limit=99999`, `?page=-1` and `?page=1.5` all
 * produce byte-identical output, so a prober learns nothing about WHICH bound it hit
 * or where the boundary sits. The decidable reason lives on the parser's verdict for
 * logs and tests; ⛔ it never reaches the DOM. An earlier draft threaded the rejection
 * in and never used it — the unused parameter was the design telling on itself.
 */
export interface MembersRejectionView {
  readonly title: string;
  readonly body: string;
  readonly linkLabel: string;
  readonly linkHref: string;
  readonly status: 400;
}

export function buildMembersRejectionView(labels: MembersLabels): MembersRejectionView {
  return {
    title: labels.invalidTitle,
    // ⛔ The engine's `message` is developer/log copy and names the probe back to the
    // prober. The member-facing body is i18n'd and says only what a person needs. The
    // cap is already interpolated by `t()` at the page (single-brace `{max}` token) —
    // this function does no string surgery of its own.
    body: labels.invalidBody,
    linkLabel: labels.invalidLink,
    linkHref: MEMBERS_ROUTE,
    status: 400,
  };
}

/** Re-exported so the page never re-derives the reason for logging. */
export type { PaginationResult };
