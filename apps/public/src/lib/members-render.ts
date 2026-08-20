// The `/members` pure render module — Story 11a.2 (Task 6; AC4, AC10).
//
// House convention (and the thing that makes `deriveFieldIds` sound): ALL display
// logic lives here; `members.astro` is a thin wrapper. ⛔ Breaking that is a gate
// evasion before it is a style choice — a value computed inline in frontmatter never
// enters the render model and so is invisible to the tier-leak leg.
//
// ⭐ WHAT THIS SURFACE RENDERS AT STORY 11a.2: the shell, the FR-91 pagination
// controls, and an explicit NOT-YET-PUBLISHED empty state. ⛔ NO member data is read
// or rendered — no rows, no counts, no districts, and ⛔ NOT `member_name` (the
// Tier-1 decrypt stays behind Story 11a.3's anti-enumeration safeguards).
//
// PURE: no fs, no db, no env, no clock.
import { pageHref, type PaginationResult } from './pagination.js';
import type { MembersRenderModel } from './surface-fields.js';

export const MEMBERS_ROUTE = '/members';

/** Copy the page passes in, already resolved through `t()` with an explicit namespace. */
export interface MembersLabels {
  readonly pageTitle: string;
  readonly pageIntro: string;
  readonly notPublishedTitle: string;
  readonly notPublishedBody: string;
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
}

/**
 * Build the view for an ACCEPTED page request.
 *
 * ⚠ `hasMembers` is hard-coded `false` at this story and that is not a stub standing
 * in for a read — there IS no read. Story 11a.3 introduces the roster query, its
 * safeguards, and the classified fields together, because shipping the listing ahead
 * of its safeguards is the sequencing hazard `2026-08-19-136` cl.4 exists to prevent.
 */
export function buildMembersView(
  accepted: { page: number; limit: number },
  search: URLSearchParams,
  labels: MembersLabels,
): MembersView {
  const model: MembersRenderModel = {
    hasMembers: false,
    page: accepted.page,
    limit: accepted.limit,
  };

  const hasPrevious = model.page > 1;
  // ⛔ NO "next" link while the directory is unpublished: a next-page affordance on an
  // empty directory is an enumeration invitation — it tells a prober that more pages
  // are believed to exist. When 11a.3 has a real row count, it computes this honestly.
  const links: PaginationLink[] = [];
  if (hasPrevious) {
    links.push({
      href: pageHref(MEMBERS_ROUTE, search, model.page - 1),
      label: labels.previousPage,
      rel: 'prev',
    });
  }

  return { model, links, hasPrevious };
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
