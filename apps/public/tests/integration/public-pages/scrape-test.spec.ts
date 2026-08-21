// PII scrape — FR-74 public-shielding live render (D13-1.2 uncompromisable slot).
//
// Story 2.5 activated this architecture-committed integration spec (AC5/AC6a). It
// feeds the PURE Story 1.16b engine (`@twt/contracts`) REAL render HTML, built from
// fixture rows via the apps/public pure render modules — so the spec needs NO live
// Astro server and NO DB.
//
// ⭐ STORY 11a.1 ARMED THE TIER-LEAK LEG HERE. Until now every snapshot carried
// `html` ONLY, and `evaluateSnapshot` runs the tier-leak rules only when `fields`
// is present — so that leg evaluated NOTHING while the suite went green. Combined
// with an empty matrix and a gate whose `loadSnapshots()` was `return []`, the
// green check was certifying an invariant nobody enforced. Every snapshot below
// now carries BOTH `html` and `fields`, and `fields` is DERIVED FROM THE RENDER
// MODEL'S OWN KEYS (ruling D3(a)) — ⛔ never a hand-maintained list restating the
// render, which would drift silently and reproduce the same defect.
//
// ⭐ THIS FILE IS WHERE THE TIER-LEAK LEG LIVES, by ruling D2. The gate script owns
// what committed source can prove (route coverage, indexing reconciliation,
// escalation attestation); the live-render check belongs where real render HTML
// already exists and already runs on every PR via `pnpm turbo run test`.
//
// The naked-PII leg (`detectNakedPii`) was already ACTIVE and is ⛔ NOT touched —
// its negative control works and is left exactly as it was.
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
  getVisibility,
  parsePublicVsPrivateMatrix,
  type PublicVsPrivateMatrix,
  type RenderSnapshot,
} from '@twt/contracts';
import type { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  blogListSurfaceFieldIds,
  blogPostSurfaceFieldIds,
  buildBlogListModel,
  buildBlogPostModel,
} from '../../../src/lib/blog-render.js';
import {
  niyamavaliSurfaceFieldIds,
  renderNiyamavaliClauses,
  renderNiyamavaliHtml,
} from '../../../src/lib/niyamavali-render.js';
import {
  buildMembersView,
  visibleDirectoryColumns,
  type MembersLabels,
} from '../../../src/lib/members-render.js';
import { matrixFieldOutput, visibilityOf } from '../../../src/lib/matrix.server.js';
import {
  deriveFieldIds,
  membersSurfaceFieldIds,
  MEMBER_DIRECTORY_ROW_FIELD_IDS,
} from '../../../src/lib/surface-fields.js';
import {
  buildTcRenderModel,
  renderTcHtml,
  tcSurfaceFieldIds,
  type TcRenderLabels,
} from '../../../src/lib/tc-render.js';

/** Labels are irrelevant to the field-set derivation; only the model's KEYS matter. */
const MEMBERS_TEST_LABELS: MembersLabels = {
  pageTitle: 'Member Directory',
  pageIntro: 'intro',
  tableCaption: 'caption',
  notPublishedTitle: 'not published',
  notPublishedBody: 'being prepared',
  unavailableTitle: 'unavailable',
  unavailableBody: 'temporary',
  pastEndTitle: 'end of directory',
  pastEndBody: 'no more entries',
  paginationLabel: 'pages',
  previousPage: 'previous',
  nextPage: 'next',
  columnName: 'Name',
  columnDistrict: 'District',
  columnStatus: 'Status',
  statusActive: 'Active',
  statusLockIn: 'Waiting period',
  districtUnknown: 'Not recorded',
  invalidTitle: 'invalid',
  invalidBody: 'invalid body',
  invalidLink: 'open',
  backToStart: 'back to start',
};

const here = dirname(fileURLToPath(import.meta.url));
const matrixPath = join(
  here,
  '../../../../../packages/contracts/public-pages/public-vs-private-matrix.yaml',
);
// ⛔ NO EMPTY-MATRIX FALLBACK. This read used to be `?? { version: 1, surfaces: [] }`,
// which was harmless while the matrix WAS empty and is a trap now that it is not:
// an unreadable matrix would silently become a matrix with no surfaces, every
// tier-leak check would evaluate nothing, and the suite would go green having
// proven nothing. That is the exact defect Story 11a.1 exists to remove — so a
// missing or empty matrix fails LOUDLY here, as it does in the gate.
function loadMatrix(): PublicVsPrivateMatrix {
  const parsed = parsePublicVsPrivateMatrix(readFileSync(matrixPath, 'utf8'));
  if (parsed === null) {
    throw new Error(
      `public-vs-private-matrix.yaml parsed to the empty-document sentinel. The matrix is ` +
        `POPULATED as of Story 11a.1 — an empty parse means it was emptied or corrupted, and ` +
        `⛔ must never degrade to "no surfaces" (that would make every check below vacuous).`,
    );
  }
  return parsed;
}
const matrix: PublicVsPrivateMatrix = loadMatrix();

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
  const model = renderNiyamavaliClauses(FIXTURE_CLAUSES, { locale: 'hi' });
  const html = renderNiyamavaliHtml(model);
  // ⭐ BOTH legs, not one: `html` feeds naked-PII detection, `fields` feeds the
  // tier-leak rules. Passing `html` alone is what made this snapshot half-inert.
  const snapshot: RenderSnapshot = {
    surfaceId: 'niyamavali',
    viewerContext: 'public',
    html,
    fields: niyamavaliSurfaceFieldIds(model),
  };

  it('the snapshot carries a NON-EMPTY field set (⛔ the leg must not be vacuous)', () => {
    // Guards the regression this story exists to fix: if the derivation ever
    // returned nothing, every tier assertion below would pass by evaluating zero
    // fields, and the suite would stay green having checked nothing.
    expect(snapshot.fields?.length).toBeGreaterThan(0);
  });

  it('every rendered field is DECLARED in the committed matrix (fail-closed)', () => {
    const declared = matrix.surfaces.find((s) => s.id === 'niyamavali')?.fields.map((f) => f.id) ?? [];
    for (const id of snapshot.fields ?? []) expect(declared).toContain(id);
  });

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
  const model = buildTcRenderModel(tcRow(), ['0e1c0001-0000-4000-8000-000000000001'], TC_LABELS);
  const html = renderTcHtml(model);
  const snapshot: RenderSnapshot = {
    surfaceId: 'terms',
    viewerContext: 'public',
    html,
    fields: tcSurfaceFieldIds(model),
  };

  it('the snapshot carries a NON-EMPTY field set (⛔ the leg must not be vacuous)', () => {
    expect(snapshot.fields?.length).toBeGreaterThan(0);
  });

  it('every rendered field is DECLARED in the committed matrix (fail-closed)', () => {
    const declared = matrix.surfaces.find((s) => s.id === 'terms')?.fields.map((f) => f.id) ?? [];
    for (const id of snapshot.fields ?? []) expect(declared).toContain(id);
  });

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

// ── Story 11a.1 — the /blog and /blog/[postId] public surfaces ───────────────
//
// Bringing these under the matrix is what AC3 required a render model FOR: the
// pages used to render inline from a full `select()` row, so there was no model
// to derive a field set from and no way to snapshot them honestly. Now there is.

/** A published, public-audience post carrying sentinel authoring metadata. */
const BLOG_AUTHOR_SENTINEL = '11111111-2222-4333-8444-555555555555';
const BLOG_TONE_HASH_SENTINEL = 'b'.repeat(64);

function blogRow(partial: Record<string, unknown> = {}): schema.NewsPostRow {
  return {
    postId: '0e1c0001-0000-4000-8000-000000000001',
    pariwarId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'Annual general meeting notice',
    // ⚠ No accidental 10-digit runs: the phone regex false-positives on those
    // (engine caveat CR-D1-1.16b), same discipline as the clause fixtures above.
    bodyMarkdown: 'The AGM will be held at the community hall on the first Sunday.',
    titleHi: 'वार्षिक आम बैठक सूचना',
    bodyMarkdownHi: 'एजीएम सामुदायिक हॉल में पहले रविवार को आयोजित की जाएगी।',
    audienceScope: 'public',
    audienceScopeValue: null,
    channels: ['push'],
    scheduledPublishAt: null,
    status: 'published',
    authorActorId: BLOG_AUTHOR_SENTINEL,
    reviewerActorId: '99999999-8888-4777-8666-555555555555',
    toneSignoffContentHash: BLOG_TONE_HASH_SENTINEL,
    toneSignoffReviewedAt: new Date('2026-02-01T00:00:00Z'),
    publishedAt: new Date('2026-02-02T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-02-02T00:00:00Z'),
    ...partial,
  } as unknown as schema.NewsPostRow;
}

describe('PII scrape — News/Blog list render (/blog, FR-74)', () => {
  const model = buildBlogListModel([blogRow()]);
  const snapshot: RenderSnapshot = {
    surfaceId: 'blog',
    viewerContext: 'public',
    fields: blogListSurfaceFieldIds(model),
  };

  it('the snapshot carries a NON-EMPTY field set', () => {
    expect(snapshot.fields?.length).toBeGreaterThan(0);
  });

  it('evaluateSnapshot passes: every rendered card field is declared and public', () => {
    const verdict = evaluateSnapshot(matrix, snapshot);
    expect(verdict.status).toBe('pass');
    expect(verdict.leaks).toEqual([]);
  });

  it('⛔ the model carries NO authoring metadata to leak in the first place (AC3)', () => {
    // The narrowed read means these are not merely unrendered — they are not
    // fetched. Asserted on the MODEL because that is what the page can reach.
    const serialized = JSON.stringify(model);
    expect(serialized).not.toContain(BLOG_AUTHOR_SENTINEL);
    expect(serialized).not.toContain(BLOG_TONE_HASH_SENTINEL);
  });
});

describe('PII scrape — News/Blog detail render (/blog/[postId], FR-74)', () => {
  const model = buildBlogPostModel(blogRow());
  const snapshot: RenderSnapshot = {
    surfaceId: 'blog-post',
    viewerContext: 'public',
    fields: blogPostSurfaceFieldIds(model),
  };

  it('the snapshot carries a NON-EMPTY field set', () => {
    expect(snapshot.fields?.length).toBeGreaterThan(0);
  });

  it('evaluateSnapshot passes: every rendered article field is declared and public', () => {
    const verdict = evaluateSnapshot(matrix, snapshot);
    expect(verdict.status).toBe('pass');
    expect(verdict.leaks).toEqual([]);
  });

  it('the rendered body copy contains no naked PII', () => {
    expect(detectNakedPii(`${model.title} ${model.bodyMarkdown} ${model.bodyMarkdownHi ?? ''}`)).toEqual([]);
  });
});

// ── AC10 REVERT-SANITY: the render-time detection routes, independently planted ──
//
// ⭐ Each control plants ITS OWN violation. Not one fixture tripping several checks:
// a shared fixture lets one route quietly stop firing while its neighbours keep the
// suite green — which is the shape of the defect this story fixes. The house
// doctrine is explicit that a gate which cannot be made to fail has no teeth.
//
// The source-provable routes (undeclared route, orphaned surface, indexing conflict,
// escalation count mismatch, unattested escalation) are controlled in
// `packages/contracts/tests/public-pages-gate.test.ts`; the parse-time routes
// (Tier-1 public without an exception, a second exception, malformed ledger,
// non-escalating entry) in `public-pages-matrix-schema.test.ts`. Together with the
// two below, every detection route in this story carries a planted control.
describe('AC10 revert-sanity — the tier-leak leg has TEETH', () => {
  it('NEGATIVE CONTROL — an UNDECLARED field id in a real snapshot fails as `unclassified`', () => {
    // Planted against the REAL committed matrix — no fixture matrix, no override.
    // This is the exact scenario D3(a) exists to catch: a field reaches the render
    // model, therefore the snapshot, and nobody classified it.
    const model = buildTcRenderModel(tcRow(), [], TC_LABELS);
    const verdict = evaluateSnapshot(matrix, {
      surfaceId: 'terms',
      viewerContext: 'public',
      fields: [...tcSurfaceFieldIds(model), 'tc_legal_reviewer_actor_id'],
    });
    expect(verdict.status).toBe('fail');
    expect(verdict.leaks).toHaveLength(1);
    expect(verdict.leaks[0]!.tier).toBe('unclassified');
    expect(verdict.leaks[0]!.field).toBe('tc_legal_reviewer_actor_id');
    expect(verdict.leaks[0]!.message).toMatch(/terms/);
  });

  it('NEGATIVE CONTROL — a field classified ABOVE the viewer ceiling fails, naming surface + field', () => {
    // Independently planted: this one reclassifies a REAL declared field to
    // `operator_restricted` in a copy of the committed matrix, then feeds the real
    // render's field set. It proves the TIER rule fires (not just the fail-closed
    // undeclared rule) using the actual field ids the page renders.
    const planted: PublicVsPrivateMatrix = {
      ...matrix,
      surfaces: matrix.surfaces.map((s) =>
        s.id !== 'terms'
          ? s
          : { ...s, fields: s.fields.map((f) => (f.id === 'tc_version' ? { ...f, tier: 'operator_restricted' as const } : f)) },
      ),
    };
    const model = buildTcRenderModel(tcRow(), [], TC_LABELS);
    const verdict = evaluateSnapshot(planted, {
      surfaceId: 'terms',
      viewerContext: 'public',
      fields: tcSurfaceFieldIds(model),
    });
    expect(verdict.status).toBe('fail');
    expect(verdict.leaks).toHaveLength(1);
    expect(verdict.leaks[0]!.tier).toBe('operator_restricted');
    expect(verdict.leaks[0]!.field).toBe('tc_version');
    expect(verdict.leaks[0]!.message).toMatch(/surface "terms" field "tc_version"/);
  });

  it('NEGATIVE CONTROL — a snapshot for a surface the matrix does not declare fails entirely', () => {
    // The Epic 11b guarantee in miniature: an 11b surface rendering before it is
    // declared does not pass quietly — every field it renders is unclassified.
    const verdict = evaluateSnapshot(matrix, {
      surfaceId: 'sahyog-vivran',
      viewerContext: 'public',
      fields: ['contributor_name', 'amount'],
    });
    expect(verdict.status).toBe('fail');
    expect(verdict.leaks).toHaveLength(2);
    expect(verdict.leaks.every((l) => l.tier === 'unclassified')).toBe(true);
  });
});

// ── Story 11a.2 (AC8) — CR-D0-1.16b is DISCHARGED, and the discharge has teeth ──
//
// The deferred finding: a `RenderSnapshot` carrying `html` but no `fields` at
// `authenticated_member` / `operator_restricted` runs NEITHER leg — the tier-leak
// rules need a field set, and `detectNakedPii` is public-only by spec — and the
// verdict was a bare `pass`, indistinguishable from a snapshot that was actually
// checked. Its recorded trigger is THIS story.
//
// ⛔ A warning nobody reads is not a discharge. These assertions are what make the
// closure real: break the engine's warning and this block goes red.
describe('AC8 — CR-D0-1.16b: a non-public snapshot with html and no fields WARNS', () => {
  const HTML = '<article><p>Member-only content.</p></article>';

  it('authenticated_member + html + no fields → status pass, but CARRYING a warning', () => {
    const verdict = evaluateSnapshot(matrix, {
      surfaceId: 'terms',
      viewerContext: 'authenticated_member',
      html: HTML,
    });
    // Still `pass` — the behaviour is spec-correct (AC-2 limits PII detection to
    // public renders) and failing would break callers doing nothing wrong. What was
    // missing is that the verdict said nothing about having checked nothing.
    expect(verdict.status).toBe('pass');
    expect(verdict.warnings).toHaveLength(1);
    expect(verdict.warnings[0]).toMatch(/UNVERIFIED SNAPSHOT/);
    expect(verdict.warnings[0]).toMatch(/NEITHER leg ran/);
  });

  it('operator_restricted + html + no fields → the same warning (both non-public tiers)', () => {
    const verdict = evaluateSnapshot(matrix, {
      surfaceId: 'terms',
      viewerContext: 'operator_restricted',
      html: HTML,
    });
    expect(verdict.warnings.some((w) => w.startsWith('UNVERIFIED SNAPSHOT'))).toBe(true);
  });

  it('⛔ a PUBLIC snapshot with html and no fields does NOT warn — the PII leg really ran', () => {
    // The boundary of the discharge: on `public`, `detectNakedPii` DID execute, so
    // the verdict is a checked pass and a warning would be noise that trains readers
    // to ignore the channel.
    const verdict = evaluateSnapshot(matrix, {
      surfaceId: 'terms',
      viewerContext: 'public',
      html: HTML,
    });
    expect(verdict.status).toBe('pass');
    expect(verdict.warnings).toEqual([]);
  });

  it('⛔ a non-public snapshot that DOES carry fields does not warn — the leak leg ran', () => {
    const model = buildTcRenderModel(tcRow(), [], TC_LABELS);
    const verdict = evaluateSnapshot(matrix, {
      surfaceId: 'terms',
      viewerContext: 'authenticated_member',
      html: HTML,
      fields: tcSurfaceFieldIds(model),
    });
    expect(verdict.warnings.some((w) => w.startsWith('UNVERIFIED SNAPSHOT'))).toBe(false);
  });

  it('⛔ a snapshot with NEITHER html nor fields stays `no-op`, unwarned', () => {
    // no-op is honest on its own terms — it says outright that there was no render.
    const verdict = evaluateSnapshot(matrix, {
      surfaceId: 'terms',
      viewerContext: 'authenticated_member',
    });
    expect(verdict.status).toBe('no-op');
    expect(verdict.warnings).toEqual([]);
  });
});

// ── Story 11a.3 — the /members surface, and ⭐ WHAT ITS GREEN CHECK NOW ACTUALLY MEANS ──
//
// ⭐⛔ READ THIS BEFORE READING THE ASSERTIONS. The `member-directory` tier-leak leg is now
// **OPERATIVE**. ⚠ This SUPERSEDES the 11a.2 block that stood here and asserted the field set was
// EMPTY — that assertion was TRUE THEN and is ⛔ FALSE NOW. It is REPLACED, ⛔ not deleted, and the
// replacement asserts the EXACT expected set so a silently dropped field fails as loudly as a
// silently added one.
//
// ⭐ A green result below now means the flagship public surface IS being policed: `member_name`,
// `district` and `member_status` are evaluated against the committed matrix on every run, and the
// planted controls at the bottom prove a leak FAILS a run that previously passed. That is the
// discharge of `2026-08-19-136` cl.4 — the launch-blocking clause this whole epic was written
// around (Decision `2026-08-20-143`).
describe('PII scrape — Member Directory (/members, Story 11a.3)', () => {
  const model = buildMembersView(
    { page: 1, limit: 25 },
    new URLSearchParams(''),
    MEMBERS_TEST_LABELS,
    {
      items: [
        { name: 'Rajesh Kumar Sharma', district: 'Lucknow', status: 'active' },
        { name: 'Sunita Devi', district: null, status: 'waiting-period' },
      ],
      page: 1,
      limit: 25,
      total: 2,
    },
  ).model;
  /**
   * ⭐ THE RENDERED HTML, BUILT THROUGH THE PRODUCTION PATH — ⛔ not hand-written, and ⛔ not a
   * concatenation of the fields this test already knows about.
   *
   * ⚠ WHY THIS EXISTS: the `member-directory` snapshot used to carry `fields` but ⛔ NO `html`,
   * while every other surface in this file passes both and the file's own header asserts *"Every
   * snapshot below now carries BOTH `html` and `fields`"*. ⇒ on the ONE public surface that prints
   * member PII, the FR-93 naked-PII leg evaluated NOTHING, and a committed record claimed coverage
   * the flagship surface did not have.
   *
   * ⭐ It walks `visibleDirectoryColumns` + `matrixFieldOutput` — the SAME two functions
   * `members.astro` uses — so a fourth rendered value appears here automatically. A hand-maintained
   * string restating the render is what the header forbids, and it is exactly what a
   * newly-rendered field would silently escape.
   */
  const columns = visibleDirectoryColumns(
    MEMBERS_TEST_LABELS,
    (fieldId) => visibilityOf('member-directory', fieldId, 'public').visible,
  );
  const DIRECTORY_HTML = [
    '<table>',
    `<thead><tr>${columns.map((c) => `<th scope="col">${c.headerLabel}</th>`).join('')}</tr></thead>`,
    '<tbody>',
    ...model.rows.map(
      (row) =>
        `<tr>${columns
          .map((c) => {
            const { output } = matrixFieldOutput('member-directory', c.fieldId, 'public', c.valueOf(row));
            // ⛔ `null` ⇒ NOTHING — no cell, no placeholder. Mirrors the page exactly.
            return output === null ? '' : `<td><span data-field="${c.fieldId}">${output}</span></td>`;
          })
          .join('')}</tr>`,
    ),
    '</tbody></table>',
  ].join('');

  const snapshot: RenderSnapshot = {
    surfaceId: 'member-directory',
    viewerContext: 'public',
    html: DIRECTORY_HTML,
    fields: membersSurfaceFieldIds(model),
  };

  it('⭐ the snapshot field set is NON-EMPTY, and is EXACTLY the three classified fields', () => {
    // ⛔ THE ASSERTION THAT REPLACES 11a.2's `toEqual([])`. Asserting the exact set — rather than
    // merely "length > 0" — is what makes a DROPPED field fail here too.
    expect(snapshot.fields).toEqual(['district', 'member_name', 'member_status']);
  });

  it('evaluateSnapshot passes — and the pass now proves the directory IS policed', () => {
    const verdict = evaluateSnapshot(matrix, snapshot);
    expect(verdict.status).toBe('pass');
    expect(verdict.leaks).toEqual([]);
  });

  it('⭐ member_name IS rendered here, and the matrix declares it visible at public', () => {
    // ⚠ At 11a.2 this test asserted the OPPOSITE half: declared-but-not-rendered. Both halves
    // still matter — declaring a field visible is not the same as rendering it — but this story is
    // where the two finally agree, under the ruled Tier-1 public exception.
    expect(getVisibility(matrix, 'member-directory', 'member_name', 'public').visible).toBe(true);
    expect(snapshot.fields).toContain('member_name');
  });

  it('⛔ the render model carries NO field beyond the classified three', () => {
    expect(Object.keys(model).sort()).toEqual([
      'apiUnavailable',
      'hasMembers',
      'limit',
      'page',
      'pastEnd',
      'rows',
    ]);
    expect(Object.keys(model.rows[0] ?? {}).sort()).toEqual([
      'district',
      'memberName',
      'memberStatus',
    ]);
  });

  it('⛔ the rendered HTML leaks no naked PII — and the leg actually RUNS on this surface', () => {
    // ⚠ This used to scan a hand-built `${memberName} ${district} ${memberStatus}` string, which
    // the file's own header forbids ("⛔ never a hand-maintained list restating the render, which
    // would drift silently"). It now scans the SAME html the snapshot carries.
    expect(detectNakedPii(DIRECTORY_HTML)).toEqual([]);
    // ⛔ And the snapshot must genuinely carry it — a missing `html` makes the FR-93 leg evaluate
    // nothing while every assertion here still passes.
    expect(snapshot.html).toBeDefined();
    expect(snapshot.html).toContain('Rajesh Kumar Sharma');
  });

  it('⭐ NEGATIVE CONTROL — the FR-93 leg on THIS surface catches naked PII when it is there', () => {
    // ⛔ Without this, `detectNakedPii(DIRECTORY_HTML) === []` proves only that the scan ran over
    // something; it does not prove the scan can FAIL. Plant a mobile number in the same shape the
    // render would produce and require it to be caught.
    const leaky = DIRECTORY_HTML.replace(
      '</tbody>',
      '<tr><td><span data-field="member_mobile">9876543210</span></td></tr></tbody>',
    );
    expect(detectNakedPii(leaky).length).toBeGreaterThan(0);
  });

  // ── AC10 — INDEPENDENTLY PLANTED CONTROLS. ⛔ One fixture must never trip several checks. ──

  it('CONTROL 1 — an UNDECLARED field at public FAILS (and names the field)', () => {
    const verdict = evaluateSnapshot(matrix, {
      surfaceId: 'member-directory',
      viewerContext: 'public',
      fields: [...snapshot.fields!, 'member_mobile'],
    });
    expect(verdict.status).toBe('fail');
    expect(verdict.leaks).toHaveLength(1);
    expect(verdict.leaks[0]!.tier).toBe('unclassified');
    expect(verdict.leaks[0]!.field).toBe('member_mobile');
  });

  it('CONTROL 2 — ⭐ the leak fails a run that PREVIOUSLY PASSED, on the REAL field set', () => {
    // ⭐ THIS is the discharge proof AC4 asks for, and it is deliberately distinct from CONTROL 1:
    // "the set is non-empty" is not the proof — the proof is that the SAME snapshot passes, and
    // then fails once a leak is planted into it. At 11a.2 this test could not have existed at all,
    // because the set was empty and `evaluateSnapshot` evaluated nothing.
    //
    // ⚠ `member_full_name_authenticated_only` is a FABRICATED id, not a real `authenticated_member`
    // field drawn from this surface's matrix rows — deliberately, not an oversight (code-review
    // finding, 2026-08-21): `member-directory` declares NO `authenticated_member`-tier field at
    // all, because that viewer has NO VIEWER to render it to on this surface (Trap 1 — members are
    // token-bearer, there is no `apps/member-web/`). So this control and CONTROL 1 both exercise
    // the SAME half of AC4's "or" (undeclared-field rejection); the tier-ceiling half is proven
    // separately below, at CONTROL 4, using a REAL field and a REAL (simulated) tier.
    const clean = evaluateSnapshot(matrix, snapshot);
    expect(clean.status).toBe('pass');

    const leaked = evaluateSnapshot(matrix, {
      ...snapshot,
      fields: [...snapshot.fields!, 'member_full_name_authenticated_only'],
    });
    expect(leaked.status).toBe('fail');
    expect(leaked.leaks.map((l) => l.field)).toContain('member_full_name_authenticated_only');
  });

  it('CONTROL 3 — a DROPPED field is caught by the REAL derivation, not by arithmetic', () => {
    // ⛔ An INDEPENDENT control: a leg that only detects ADDITIONS would silently accept a field
    // being removed from the render while the matrix still claims it is shown.
    //
    // ⚠ WHAT THIS REPLACES. The previous body was:
    //     const dropped = snapshot.fields!.filter((f) => f !== 'member_status');
    //     expect(dropped).not.toEqual(snapshot.fields);
    //     expect(dropped).toHaveLength(2);
    // — which called ⛔ NO production symbol. It built a 2-element array from a 3-element one and
    // asserted it had 2 elements. Delete `MEMBER_DIRECTORY_ROW_FIELD_IDS`, delete `<MatrixField>`,
    // delete `member_status` from the render entirely, and it still passed. ⭐ It was presented as
    // AC10's control for a silently-dropped field and it caught nothing.
    //
    // ⭐ The real mechanism is `deriveFieldIds`, which throws in BOTH directions. A row shape that
    // has LOST a key while the mapping still declares it is a STALE MAPPING — plant that and
    // require the throw.
    const rowWithDroppedField = { memberName: 'Rajesh Kumar Sharma', district: 'Lucknow' };
    expect(() =>
      deriveFieldIds(rowWithDroppedField, MEMBER_DIRECTORY_ROW_FIELD_IDS),
    ).toThrow(/member_status|memberStatus/);

    // ⭐ And the positive half, so the control cannot pass by throwing on everything.
    expect(() =>
      deriveFieldIds(
        { memberName: 'Rajesh Kumar Sharma', district: 'Lucknow', memberStatus: 'Active' },
        MEMBER_DIRECTORY_ROW_FIELD_IDS,
      ),
    ).not.toThrow();
  });

  it('CONTROL 4 — ⭐ a REAL authenticated_member-tier field at public FAILS (AC4\'s OTHER half)', () => {
    // ⛔ Neither CONTROL 1 nor CONTROL 2 above exercises the TIER-CEILING rejection path
    // (`above_viewer_ceiling` in `getVisibility`) — both plant an id the matrix has never heard of
    // for this surface, which is the UNDECLARED path (`undeclared_field`). AC4 asks for "a tier OR
    // undeclared field" to fail; this control is the tier half, done honestly: `member-directory`
    // has no field CURRENTLY at `authenticated_member`, so this simulates the one that WAS — before
    // Decision `2026-08-19-136` escalated `member_name` from `authenticated_member` to `public`
    // (see the matrix's own `escalations` entry). If that escalation had never been ruled, would
    // this leg have caught `member_name` leaking? This proves yes, using the real field id and the
    // real matrix machinery, not a fabricated one.
    const preEscalationMatrix: PublicVsPrivateMatrix = structuredClone(matrix);
    const surface = preEscalationMatrix.surfaces.find((s) => s.id === 'member-directory');
    const nameField = surface?.fields.find((f) => f.id === 'member_name');
    if (nameField === undefined) throw new Error('fixture assumption broke: member_name row moved');
    nameField.tier = 'authenticated_member';

    const verdict = evaluateSnapshot(preEscalationMatrix, snapshot);
    expect(verdict.status).toBe('fail');
    const leak = verdict.leaks.find((l) => l.field === 'member_name');
    expect(leak?.tier).toBe('authenticated_member');
  });
});
