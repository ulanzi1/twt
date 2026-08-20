// The `/members` render module — Story 11a.3 (Task 7; AC3, AC4, AC5, AC10).
//
// ⭐ THE MOST IMPORTANT ASSERTION IN THIS FILE CHANGED DIRECTION AT THIS STORY.
// At 11a.2 it was NEGATIVE — "the field set is EMPTY" — recording, executably, that the
// `member-directory` tier-leak leg was policed by nothing. ⚠ That assertion is REPLACED here,
// ⛔ never deleted: the replacement asserts the EXACT expected set, so a silently dropped field
// fails just as loudly as a silently added one.
import { describe, expect, it } from 'vitest';

import {
  buildMembersRejectionView,
  buildMembersView,
  MEMBERS_ROUTE,
  type MembersLabels,
} from '../src/lib/members-render.js';
import {
  PUBLIC_PAGE_HORIZON,
  PUBLIC_PAGE_SIZE_MAX,
  parsePageParams,
} from '../src/lib/pagination.js';
import {
  MEMBERS_FIELD_IDS,
  MEMBER_DIRECTORY_ROW_FIELD_IDS,
  membersSurfaceFieldIds,
} from '../src/lib/surface-fields.js';

const LABELS: MembersLabels = {
  pageTitle: 'Member Directory',
  pageIntro: 'The member directory for this family.',
  notPublishedTitle: 'not published yet',
  notPublishedBody: 'being prepared',
  unavailableTitle: 'temporarily unavailable',
  unavailableBody: 'a problem on our side',
  paginationLabel: 'Directory pages',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  columnName: 'Name',
  columnDistrict: 'District',
  columnStatus: 'Status',
  statusActive: 'Active',
  statusLockIn: 'Waiting period',
  districtUnknown: 'Not recorded',
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

const dir = (
  items: Array<{ name: string; district: string | null; status: 'active' | 'lock-in' }>,
  total = items.length,
  page = 1,
  limit = 25,
) => ({ items, page, limit, total });

const ROWS = [
  { name: 'Rajesh Kumar Sharma', district: 'Lucknow', status: 'active' as const },
  { name: 'Sunita Devi', district: null, status: 'lock-in' as const },
];

describe('AC4 — ⭐ the tier-leak field set is NON-EMPTY: the leg on this surface is OPERATIVE', () => {
  it('⭐ REPLACES the 11a.2 "field set IS empty" assertion with the EXACT expected set', () => {
    // ⛔ This is the assertion the whole story turns on. At 11a.2 this read `toEqual([])` and
    // recorded that the flagship public surface was policed by nothing. Asserting the EXACT set
    // (not merely "non-empty") means a silently DROPPED field fails here too.
    const { model } = buildMembersView(accept(''), q(''), LABELS, dir(ROWS));
    expect(membersSurfaceFieldIds(model)).toEqual(['district', 'member_name', 'member_status']);
  });

  it('⭐ the field set does NOT depend on a page having rows — an empty page still declares them', () => {
    // ⛔ Otherwise the leg would go vacuous again on exactly the pages where nobody would notice.
    const { model } = buildMembersView(accept(''), q(''), LABELS, dir([], 0));
    expect(membersSurfaceFieldIds(model)).toEqual(['district', 'member_name', 'member_status']);
    // …and on an OUTAGE page too.
    const outage = buildMembersView(accept(''), q(''), LABELS, null);
    expect(membersSurfaceFieldIds(outage.model)).toEqual([
      'district',
      'member_name',
      'member_status',
    ]);
  });

  it('member_name IS now a rendered field id — the Tier-1 decrypt landed at this story', () => {
    expect(Object.values(MEMBER_DIRECTORY_ROW_FIELD_IDS)).toContain('member_name');
    // ⛔ The shell keys remain unclassified — they are not member attributes.
    expect(Object.values(MEMBERS_FIELD_IDS).every((id) => id === null)).toBe(true);
  });

  it('NEGATIVE CONTROL — an unclassified key reaching the MODEL throws', () => {
    const drifted = {
      ...buildMembersView(accept(''), q(''), LABELS, dir(ROWS)).model,
      registrationDate: '2026-01-01',
    };
    expect(() => membersSurfaceFieldIds(drifted as never)).toThrow(/no declared matrix field id/);
  });

  it('NEGATIVE CONTROL — a STALE mapping entry throws the OTHER way', () => {
    // ⛔ An INDEPENDENT control from the one above: this is the drift direction where the
    // classification outlives the render. One fixture tripping both would hide which fired.
    const { model } = buildMembersView(accept(''), q(''), LABELS, dir(ROWS));
    const withoutRows: Record<string, unknown> = { ...model };
    delete withoutRows['rows'];
    expect(() => membersSurfaceFieldIds(withoutRows as never)).toThrow(
      /mapping declares key\(s\) the render model does not have/,
    );
  });
});

describe('AC3/AC5 — rows carry display values only, resolved upstream', () => {
  it('maps the wire row onto the display shape, localising ONLY the status label', () => {
    const { model } = buildMembersView(accept(''), q(''), LABELS, dir(ROWS));
    expect(model.rows).toEqual([
      { memberName: 'Rajesh Kumar Sharma', district: 'Lucknow', memberStatus: 'Active' },
      { memberName: 'Sunita Devi', district: null, memberStatus: 'Waiting period' },
    ]);
  });

  it('⛔ the name passes through UNTOUCHED — the presentation policy is applied server-side', () => {
    // ⛔ A second copy of `splitFirstNameLastInitial` here would be the second identity system
    // `-136` cl.2 forbids. The shielded form arrives already shielded.
    const { model } = buildMembersView(
      accept(''),
      q(''),
      LABELS,
      dir([{ name: 'Rajesh S.', district: 'Lucknow', status: 'active' }]),
    );
    expect(model.rows[0]?.memberName).toBe('Rajesh S.');
  });
});

describe('⛔ an OUTAGE is not an empty directory', () => {
  it('a null directory sets apiUnavailable and leaves hasMembers false', () => {
    const { model } = buildMembersView(accept(''), q(''), LABELS, null);
    expect(model.apiUnavailable).toBe(true);
    expect(model.hasMembers).toBe(false);
    expect(model.rows).toEqual([]);
  });

  it('a genuinely EMPTY roster is NOT an outage — the two states are distinguishable', () => {
    const { model } = buildMembersView(accept(''), q(''), LABELS, dir([], 0));
    expect(model.apiUnavailable).toBe(false);
    expect(model.hasMembers).toBe(false);
  });

  it('⛔ an outage offers NO next link — it knows nothing about how many pages exist', () => {
    const view = buildMembersView(accept('page=2'), q('page=2'), LABELS, null);
    expect(view.hasNext).toBe(false);
    expect(view.links.some((l) => l.rel === 'next')).toBe(false);
  });
});

describe('AC10 — pagination controls are REAL LINKS, and HONEST about what exists', () => {
  it('page 1 of a single-page directory offers neither link', () => {
    expect(buildMembersView(accept(''), q(''), LABELS, dir(ROWS, 2)).links).toEqual([]);
  });

  it('page 2 offers a previous link back to page 1, preserving lang', () => {
    const view = buildMembersView(accept('page=2&lang=hi'), q('page=2&lang=hi'), LABELS, dir(ROWS, 30));
    expect(view.hasPrevious).toBe(true);
    expect(view.links.find((l) => l.rel === 'prev')?.href).toBe('/members?lang=hi');
  });

  it('⭐ the NEXT link is derived from the REAL total — ⛔ never from "this page came back full"', () => {
    // A directory holding EXACTLY one page's worth must not advertise a page 2. Inferring "next"
    // from `rows.length === limit` is both a lie and an enumeration invitation.
    const exactlyOnePage = buildMembersView(
      { page: 1, limit: 2 },
      q(''),
      LABELS,
      dir(ROWS, 2, 1, 2),
    );
    expect(exactlyOnePage.hasNext).toBe(false);

    const moreToCome = buildMembersView({ page: 1, limit: 2 }, q(''), LABELS, dir(ROWS, 5, 1, 2));
    expect(moreToCome.hasNext).toBe(true);
    expect(moreToCome.links.find((l) => l.rel === 'next')?.href).toBe('/members?page=2');
  });

  it('the LAST page offers a previous link but no next', () => {
    const view = buildMembersView({ page: 3, limit: 2 }, q('page=3'), LABELS, dir(ROWS, 5, 3, 2));
    expect(view.hasPrevious).toBe(true);
    expect(view.hasNext).toBe(false);
  });
});

describe('AC2/AC6.2 — a rejected page request renders a 400-shaped state', () => {
  const rejectionFor = (search: string) => {
    const r = parsePageParams(q(search));
    if (r.ok) throw new Error('fixture expected a rejection');
    return buildMembersRejectionView(LABELS);
  };

  it('⛔ status 400 — NOT a redirect, and NOT a render of a different page', () => {
    expect(rejectionFor('page=all').status).toBe(400);
  });

  it('⭐ the NEW deep-pagination horizon rejects an over-horizon page', () => {
    const over = parsePageParams(q(`page=${PUBLIC_PAGE_HORIZON + 1}`));
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.reason).toBe('page_above_horizon');
    // …and the horizon itself is still served, so the bound rejects only what it should.
    expect(parsePageParams(q(`page=${PUBLIC_PAGE_HORIZON}`)).ok).toBe(true);
  });

  it('⭐ the horizon ALSO closes the offset-precision gap — no page can leave safe-integer range', () => {
    const huge = parsePageParams(q('page=999999999999'));
    expect(huge.ok).toBe(false);
    // (page-1)*limit at the horizon and the cap is nowhere near MAX_SAFE_INTEGER.
    expect((PUBLIC_PAGE_HORIZON - 1) * PUBLIC_PAGE_SIZE_MAX).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });

  it('the member-facing body is i18n copy with the cap interpolated', () => {
    expect(rejectionFor('limit=99999').body).toBe(
      `at most ${PUBLIC_PAGE_SIZE_MAX} entries are shown at a time`,
    );
  });

  it("⛔ the engine's developer message never reaches the member-facing view", () => {
    const view = rejectionFor('page=all');
    expect(JSON.stringify(view)).not.toMatch(/FR-91|unbounded result set|horizon/i);
  });

  it('offers a link back to the directory start', () => {
    expect(rejectionFor('page=-1').linkHref).toBe(MEMBERS_ROUTE);
  });

  it('⭐ the rejected state is REJECTION-INVARIANT — including the NEW horizon reason', () => {
    // ⛔ All rejection routes must render byte-identically. A new decidable reason must NOT leak
    // into the DOM: if it did, a prober could binary-search the page horizon by diffing responses,
    // which is exactly the information the refusal exists to withhold.
    const views = [
      'page=all',
      'limit=99999',
      'page=-1',
      'page=1.5',
      `page=${PUBLIC_PAGE_HORIZON + 1}`,
    ].map(rejectionFor);
    for (const view of views) expect(view).toEqual(views[0]);
  });
});
