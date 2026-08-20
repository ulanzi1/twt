// The `/members` render module — Story 11a.2 (Task 6; AC4, AC10).
//
// ⚠ The most important assertion in this file is a NEGATIVE one: the render model
// carries no member data, so the surface's tier-leak field set is EMPTY. That empty
// set is real, and it is the reason the `member-directory` leg is vacuous today.
// ⛔ A future change that quietly adds a member field here without classifying it
// must break — which is what `deriveFieldIds`' bidirectional throw is for.
import { describe, expect, it } from 'vitest';

import {
  buildMembersRejectionView,
  buildMembersView,
  MEMBERS_ROUTE,
  type MembersLabels,
} from '../src/lib/members-render.js';
import { PUBLIC_PAGE_SIZE_MAX, parsePageParams } from '../src/lib/pagination.js';
import { MEMBERS_FIELD_IDS, membersSurfaceFieldIds } from '../src/lib/surface-fields.js';

const LABELS: MembersLabels = {
  pageTitle: 'Member Directory',
  pageIntro: 'The member directory for this family.',
  notPublishedTitle: 'not published yet',
  notPublishedBody: 'being prepared',
  paginationLabel: 'Directory pages',
  previousPage: 'Previous page',
  invalidTitle: 'could not be shown',
  // Pre-interpolated, matching what `t()` produces at the real call site (single-brace
  // `{max}` token, interpolated before it ever reaches this module).
  invalidBody: `at most ${PUBLIC_PAGE_SIZE_MAX} entries are shown at a time`,
  invalidLink: 'Open the directory',
  backToStart: 'Back to the first page',
};

const q = (search: string) => new URLSearchParams(search);
const accept = (search: string) => {
  const r = parsePageParams(q(search));
  if (!r.ok) throw new Error('fixture expected an accepted page request');
  return r;
};

describe('AC4 — ⛔ NO member data is read or rendered at Story 11a.2', () => {
  it('the render model carries hasMembers/page/limit and NOTHING else', () => {
    const { model } = buildMembersView(accept(''), q(''), LABELS);
    expect(Object.keys(model).sort()).toEqual(['hasMembers', 'limit', 'page']);
  });

  it('⛔ hasMembers is false — the directory is not published, and there is no read', () => {
    expect(buildMembersView(accept('page=3'), q('page=3'), LABELS).model.hasMembers).toBe(false);
  });

  it('⭐ the tier-leak field set is EMPTY — the leg on this surface is ARMED BUT VACUOUS', () => {
    // ⛔ This is not a passing check to feel good about. It records, in an executable
    // form, that `member-directory` is currently policed by nothing. Story 11a.3
    // makes it real. Until then a green `member-directory` leg means "renders no
    // classified field" — ⛔ NOT "the directory is being policed".
    const { model } = buildMembersView(accept(''), q(''), LABELS);
    expect(membersSurfaceFieldIds(model)).toEqual([]);
  });

  it('⛔ member_name is NOT among the surface\'s rendered field ids (11a.3 owns the decrypt)', () => {
    expect(Object.values(MEMBERS_FIELD_IDS)).not.toContain('member_name');
    expect(Object.values(MEMBERS_FIELD_IDS).every((id) => id === null)).toBe(true);
  });

  it('NEGATIVE CONTROL — an unclassified key reaching the model THROWS (bidirectional)', () => {
    // The drift guard, planted: 11a.3 (or anyone) adding a member field to the model
    // without classifying it fails here rather than rendering unclassified data.
    const drifted = { ...buildMembersView(accept(''), q(''), LABELS).model, memberName: 'Asha' };
    expect(() => membersSurfaceFieldIds(drifted as never)).toThrow(/no declared matrix field id/);
  });
});

describe('AC10 — pagination controls are REAL LINKS, and honest about what exists', () => {
  it('page 1 offers NO previous link', () => {
    expect(buildMembersView(accept(''), q(''), LABELS).links).toEqual([]);
  });

  it('page 2 offers a previous link back to page 1, preserving lang', () => {
    const view = buildMembersView(accept('page=2&lang=hi'), q('page=2&lang=hi'), LABELS);
    expect(view.hasPrevious).toBe(true);
    expect(view.links).toHaveLength(1);
    expect(view.links[0]).toMatchObject({ rel: 'prev', label: 'Previous page' });
    expect(view.links[0]!.href).toBe('/members?lang=hi');
  });

  it('⛔ NO "next" link ships while the directory is unpublished — it would be an enumeration hint', () => {
    // A next-page affordance on an empty directory tells a prober that more pages are
    // believed to exist. 11a.3 computes this from a real count.
    const view = buildMembersView(accept('page=2'), q('page=2'), LABELS);
    expect(view.links.some((l) => l.rel === 'next')).toBe(false);
  });
});

describe('AC2 — a rejected page request renders a 400-shaped state', () => {
  const rejectionFor = (search: string) => {
    const r = parsePageParams(q(search));
    if (r.ok) throw new Error('fixture expected a rejection');
    return buildMembersRejectionView(LABELS);
  };

  it('⛔ status 400 — NOT a redirect, and NOT a render of a different page', () => {
    expect(rejectionFor('page=all').status).toBe(400);
  });

  it('the member-facing body is i18n copy with the cap interpolated', () => {
    expect(rejectionFor('limit=99999').body).toBe(
      `at most ${PUBLIC_PAGE_SIZE_MAX} entries are shown at a time`,
    );
  });

  it('⛔ the engine\'s developer message never reaches the member-facing view', () => {
    // The parser's `message` names the probe back to the prober ("?page=all asks for
    // an unbounded result set"). That is log copy. The page must not echo it.
    const view = rejectionFor('page=all');
    expect(JSON.stringify(view)).not.toMatch(/FR-91|unbounded result set/);
  });

  it('offers a link back to the directory start', () => {
    expect(rejectionFor('page=-1').linkHref).toBe(MEMBERS_ROUTE);
  });

  it('⭐ the rejected state is REJECTION-INVARIANT — a prober learns nothing about the bound', () => {
    // All four rejection routes must render byte-identically. If they diverged, a
    // scraper could binary-search the page-size cap by diffing responses, which is
    // exactly the information the refusal exists to withhold.
    const views = ['page=all', 'limit=99999', 'page=-1', 'page=1.5'].map(rejectionFor);
    for (const view of views) expect(view).toEqual(views[0]);
  });
});
