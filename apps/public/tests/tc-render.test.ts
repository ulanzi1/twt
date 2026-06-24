// Unit tests for the pure T&C render module — Story 2.6 (Task 8; AC4, AC5).
//
// Banner-selection (AC5) + the empty-state model (AC4) + renderTcHtml composition.
// The `.astro` page has no co-located test (Astro carve-out), so this is the
// load-bearing coverage of the display logic.

import type { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { buildTcRenderModel, renderTcHtml, type TcRenderLabels } from '../src/lib/tc-render.js';

type TcVersionRow = schema.TcVersionRow;

const LABELS: TcRenderLabels = {
  provisionalBanner: 'PROVISIONAL — pending legal review',
  effectiveLabel: 'In effect from',
  pinnedLabel: 'Pinned rule versions',
  emptyTitle: 'No Terms published yet',
  emptyBody: 'Please check back soon.',
};

const REVIEWER_SENTINEL = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const AUDIT_SENTINEL = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function row(status: TcVersionRow['legalReviewStatus']): TcVersionRow {
  return {
    tcVersionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as TcVersionRow['tcVersionId'],
    pariwarId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' as TcVersionRow['pariwarId'],
    version: 2,
    bodyMarkdown: '# Terms',
    bodyHtmlRendered: '<h1>Terms</h1><p>Be excellent.</p>',
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveUntil: null,
    legalReviewStatus: status,
    legalReviewerActorId: REVIEWER_SENTINEL,
    authoredByActor: null,
    authoredAt: new Date('2026-01-01T00:00:00.000Z'),
    auditId: AUDIT_SENTINEL,
  };
}

describe('buildTcRenderModel — banner selection (AC5)', () => {
  it.each([
    ['pending', true],
    ['under-review', true],
    ['reviewed-with-changes-required', false],
    ['approved', false],
    ['superseded', false],
  ] as const)('status %s → showProvisionalBanner=%s', (status, expected) => {
    const model = buildTcRenderModel(row(status), ['c1'], LABELS);
    expect(model.showProvisionalBanner).toBe(expected);
    expect(model.hasContent).toBe(true);
    expect(model.version).toBe(2);
    expect(model.pinnedClauseIds).toEqual(['c1']);
  });

  it('null row → empty-state model (AC4)', () => {
    const model = buildTcRenderModel(null, [], LABELS);
    expect(model.hasContent).toBe(false);
    expect(model.showProvisionalBanner).toBe(false);
    expect(model.html).toBe('');
    expect(model.version).toBeNull();
  });
});

describe('renderTcHtml — composition', () => {
  it('renders the provisional banner for a pending version + the raw body HTML', () => {
    const html = renderTcHtml(buildTcRenderModel(row('pending'), ['cv1', 'cv2'], LABELS));
    expect(html).toContain(LABELS.provisionalBanner);
    expect(html).toContain('<h1>Terms</h1>'); // body_html_rendered emitted RAW
    // pinned COUNT rendered (not the raw clause_version_id UUIDs — PII-scanner safe).
    expect(html).toContain(LABELS.pinnedLabel);
    expect(html).not.toContain('cv1');
    expect(html).toMatch(/<dt>Pinned rule versions<\/dt><dd>2<\/dd>/);
  });

  it('omits the banner for an approved version', () => {
    const html = renderTcHtml(buildTcRenderModel(row('approved'), [], LABELS));
    expect(html).not.toContain(LABELS.provisionalBanner);
    expect(html).toContain('<h1>Terms</h1>');
  });

  it('NEVER renders legal_reviewer_actor_id / audit_id / authored_by_actor (AC4)', () => {
    const html = renderTcHtml(buildTcRenderModel(row('pending'), ['c1'], LABELS));
    expect(html).not.toContain(REVIEWER_SENTINEL);
    expect(html).not.toContain(AUDIT_SENTINEL);
  });

  it('renders a dignified empty state when there is no content', () => {
    const html = renderTcHtml(buildTcRenderModel(null, [], LABELS));
    expect(html).toContain(LABELS.emptyTitle);
    expect(html).toContain(LABELS.emptyBody);
    expect(html).not.toContain(LABELS.provisionalBanner);
  });
});
