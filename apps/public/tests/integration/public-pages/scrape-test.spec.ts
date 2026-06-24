// PII scrape — FR-74 public-shielding live render (D13-1.2 uncompromisable slot).
//
// Story 2.5 activates this architecture-committed integration spec (AC5/AC6a). It
// feeds the PURE Story 1.16b engine (`@twt/contracts`) the REAL Niyamavali render
// HTML, built from fixture clauses via the apps/public pure render module — so the
// spec needs NO live Astro server and NO DB. The FR-74 matrix is empty at v1
// (`surfaces: []` — Epic 11a populates it), so the tier-leak leg is a no-op for
// `niyamavali`; the naked-PII leg (`detectNakedPii`) is ACTIVE regardless and is the
// asserted gate here. A negative-control case proves the gate has teeth (it catches a
// planted leak), so the green pass is not vacuous.
//
// LOCATION NOTE: the architecture-committed slot is `tests/integration/public-pages/
// scrape-test.spec.ts` (root). It is REALIZED here, inside the `@twt/public` workspace,
// so it resolves the `@twt/*` packages + their transitive deps cleanly AND runs in the
// existing `test` CI job (`pnpm turbo run test`) on every PR — the AC5/AC6a "verified on
// every PR going forward" requirement — with no new CI wiring. (root `tests/integration/
// README.md` points here.)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  detectNakedPii,
  evaluateSnapshot,
  parsePublicVsPrivateMatrix,
  type PublicVsPrivateMatrix,
  type RenderSnapshot,
} from '@twt/contracts';
import type { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { renderNiyamavaliClauses, renderNiyamavaliHtml } from '../../../src/lib/niyamavali-render.js';
import { buildTcRenderModel, renderTcHtml, type TcRenderLabels } from '../../../src/lib/tc-render.js';

const here = dirname(fileURLToPath(import.meta.url));
const matrixPath = join(
  here,
  '../../../../../packages/contracts/public-pages/public-vs-private-matrix.yaml',
);
const matrix: PublicVsPrivateMatrix = parsePublicVsPrivateMatrix(
  readFileSync(matrixPath, 'utf8'),
) ?? { version: 1, surfaces: [] };

/** Minimal clause-version row fixture (the render reads only the display fields). */
function clause(partial: {
  clauseId: string;
  version: number;
  effectiveDate: Date;
  payload: Record<string, unknown>;
}): schema.ClauseVersionRow {
  return {
    clauseVersionId: '00000000-0000-4000-8000-000000000000',
    pariwarId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    benefitMechanism: 'pool',
    predecessorClauseIds: [],
    supersededByVersion: null,
    deprecatedAt: null,
    authoredByActor: null,
    authoredAt: new Date('2025-01-01T00:00:00Z'),
    auditId: null,
    ...partial,
  } as unknown as schema.ClauseVersionRow;
}

// Fixture clauses — structurally real Niyamavali content. Deliberately NO accidental
// 10-digit runs (the phone regex false-positives on those — engine caveat CR-D1-1.16b).
const FIXTURE_CLAUSES = [
  clause({
    clauseId: 'niy.contribution-discipline.r7-a',
    version: 2,
    effectiveDate: new Date('2025-03-01T00:00:00Z'),
    payload: {
      rule_code: 'R7(A)',
      title_en: 'Restoration after contribution lapse',
      title_hi: 'अंशदान चूक के बाद पुनर्स्थापन',
      restoration_window_days: 30,
      provisional: true,
    },
  }),
  clause({
    clauseId: 'niy.ninety-percent-rule.r8',
    version: 1,
    effectiveDate: new Date('2025-01-01T00:00:00Z'),
    payload: { rule_code: 'R8', title_en: 'Ninety-percent contribution rule', threshold_percent: 90 },
  }),
];

describe('PII scrape — Niyamavali public render (FR-74)', () => {
  const html = renderNiyamavaliHtml(renderNiyamavaliClauses(FIXTURE_CLAUSES, { locale: 'hi' }));
  const snapshot: RenderSnapshot = { surfaceId: 'niyamavali', viewerContext: 'public', html };

  it('the rendered public HTML contains no naked PII (active leg, AC6a)', () => {
    expect(detectNakedPii(html)).toEqual([]);
  });

  it('evaluateSnapshot passes: no tier leaks + no naked PII (AC5/AC6a)', () => {
    const verdict = evaluateSnapshot(matrix, snapshot);
    expect(verdict.status).toBe('pass');
    expect(verdict.leaks).toEqual([]);
    expect(verdict.piiMatches).toEqual([]);
  });

  it('renders the English render with no PII either (locale invariance)', () => {
    const enHtml = renderNiyamavaliHtml(renderNiyamavaliClauses(FIXTURE_CLAUSES, { locale: 'en' }));
    expect(detectNakedPii(enHtml)).toEqual([]);
  });

  it('NEGATIVE CONTROL — the gate catches a planted naked phone/email (teeth, not vacuous)', () => {
    const leaky = `<section>${html}<p>संपर्क: 9876543210 · ramesh@example.org</p></section>`;
    const verdict = evaluateSnapshot(matrix, {
      surfaceId: 'niyamavali',
      viewerContext: 'public',
      html: leaky,
    });
    expect(verdict.status).toBe('fail');
    expect(verdict.piiMatches.map((m) => m.type).sort()).toEqual(['email', 'phone']);
  });
});

// ── Story 2.6 — the /terms public surface (same fixture-fed pattern) ──────────
const TC_LABELS: TcRenderLabels = {
  provisionalBanner:
    'This T&C is provisional pending legal counsel review; revisions may follow before final publication',
  effectiveLabel: 'In effect from',
  pinnedLabel: 'Pinned rule versions',
  emptyTitle: 'No Terms & Conditions published yet',
  emptyBody: 'The Terms & Conditions have not been published yet. Please check back soon.',
};

// The never-rendered internal-attribution fields (AC4) — sentinel UUIDs we assert
// NEVER appear in the public HTML.
const TC_REVIEWER_SENTINEL = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TC_AUDIT_SENTINEL = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function tcRow(): schema.TcVersionRow {
  return {
    tcVersionId: '11111111-1111-4111-8111-111111111111',
    pariwarId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    version: 1,
    bodyMarkdown: '# Terms & Conditions\n\nBe excellent to each other.',
    // body_html_rendered: already sanitized at write time (no PII, structurally real).
    bodyHtmlRendered:
      '<h1>Terms &#x26; Conditions</h1><p>Members contribute in accordance with the Niyamavali.</p>',
    effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    effectiveUntil: null,
    legalReviewStatus: 'pending',
    legalReviewerActorId: TC_REVIEWER_SENTINEL,
    authoredByActor: null,
    authoredAt: new Date('2026-01-01T00:00:00Z'),
    auditId: TC_AUDIT_SENTINEL,
  } as unknown as schema.TcVersionRow;
}

describe('PII scrape — T&C public render (/terms, FR-74)', () => {
  const html = renderTcHtml(
    buildTcRenderModel(tcRow(), ['0e1c0001-0000-4000-8000-000000000001'], TC_LABELS),
  );
  const snapshot: RenderSnapshot = { surfaceId: 'terms', viewerContext: 'public', html };

  it('the rendered public HTML contains no naked PII (active leg, AC9)', () => {
    expect(detectNakedPii(html)).toEqual([]);
  });

  it('evaluateSnapshot passes: no tier leaks + no naked PII', () => {
    const verdict = evaluateSnapshot(matrix, snapshot);
    expect(verdict.status).toBe('pass');
    expect(verdict.leaks).toEqual([]);
    expect(verdict.piiMatches).toEqual([]);
  });

  it('NEVER renders legal_reviewer_actor_id / audit_id (AC4 internal attribution)', () => {
    expect(html).not.toContain(TC_REVIEWER_SENTINEL);
    expect(html).not.toContain(TC_AUDIT_SENTINEL);
  });

  it('the empty-state render also leaks nothing', () => {
    const emptyHtml = renderTcHtml(buildTcRenderModel(null, [], TC_LABELS));
    expect(detectNakedPii(emptyHtml)).toEqual([]);
  });
});
