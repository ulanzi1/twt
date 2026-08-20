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
import { buildMembersView, type MembersLabels } from '../../../src/lib/members-render.js';
import { membersSurfaceFieldIds } from '../../../src/lib/surface-fields.js';
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
  notPublishedTitle: 'not published',
  notPublishedBody: 'being prepared',
  paginationLabel: 'pages',
  previousPage: 'previous',
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

// ── Story 11a.2 — the /members surface, and ⛔ WHAT ITS GREEN CHECK DOES NOT MEAN ──
//
// ⭐⛔ READ THIS BEFORE READING THE ASSERTIONS. The `member-directory` tier-leak leg
// is ARMED BUT EMPTY. The page renders the shell, the FR-91 pagination controls and a
// not-yet-published empty state; it reads NO member data and ⛔ does not render
// `member_name` (the Tier-1 decrypt is Story 11a.3's, behind 11a.3's anti-enumeration
// safeguards). So the derived field set is `[]` and `evaluateSnapshot` evaluates
// nothing on this surface.
//
// ⛔ A green result below therefore means "this surface renders no classified field".
// It does ⛔ NOT mean the flagship Member Directory is being policed. Story 11a.1
// existed to remove exactly this class of vacuous-green defect, so re-introducing it
// silently HERE would be worse than the original — hence these tests ASSERT the
// vacuity rather than letting it hide behind a pass.
describe('PII scrape — Member Directory shell (/members, Story 11a.2)', () => {
  const model = buildMembersView(
    { page: 1, limit: 25 },
    new URLSearchParams(''),
    MEMBERS_TEST_LABELS,
  ).model;
  const snapshot: RenderSnapshot = {
    surfaceId: 'member-directory',
    viewerContext: 'public',
    fields: membersSurfaceFieldIds(model),
  };

  it('⭐ the snapshot field set is EMPTY — the leg is ARMED BUT VACUOUS until 11a.3', () => {
    // ⛔ The inverse of every other surface's "carries a NON-EMPTY field set" test,
    // and deliberately so: this records the vacuity in an executable form instead of
    // leaving it to be inferred from a pass.
    expect(snapshot.fields).toEqual([]);
  });

  it('evaluateSnapshot passes — and the pass proves only that nothing classified renders', () => {
    const verdict = evaluateSnapshot(matrix, snapshot);
    expect(verdict.status).toBe('pass');
    expect(verdict.leaks).toEqual([]);
  });

  it('⛔ the render model carries NO member data to leak in the first place', () => {
    // Asserted on the MODEL because that is what the page can reach. There is no
    // roster read on this surface at all — not a narrowed one, none.
    expect(Object.keys(model).sort()).toEqual(['hasMembers', 'limit', 'page']);
    expect(model.hasMembers).toBe(false);
  });

  it('⛔ member_name is NOT rendered here, though the matrix DECLARES it visible at public', () => {
    // Both halves matter. The matrix declares `member_name` public (the ruled Tier-1
    // exception), so a reader could reasonably assume this page shows it. It does not:
    // declaring a field visible is not the same as rendering it, and 11a.3 owns the
    // decrypt together with the safeguards that make it safe.
    expect(getVisibility(matrix, 'member-directory', 'member_name', 'public').visible).toBe(true);
    expect(snapshot.fields).not.toContain('member_name');
  });

  it('NEGATIVE CONTROL — the leg WOULD fire here: an unclassified field on this surface fails', () => {
    // ⭐ The control that stops the vacuity above from being mistaken for a broken leg.
    // The leg is wired correctly and armed; it simply has nothing to evaluate yet.
    // Planted against the REAL committed matrix, independently of every other control.
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
});
