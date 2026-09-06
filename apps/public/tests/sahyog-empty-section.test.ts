// ⭐ AN EMPTY STAGE SECTION RENDERS ⛔ NOTHING — `2026-09-04-194` cl.1, Story 11b.12 (AC6).
//
// ── ⭐⭐ THIS CLAUSE WAS **SATISFIED BY CONSTRUCTION**, ⛔ NOT BUILT BY THIS STORY ───────────────
// `sahyog.astro` already guarded BOTH sections with `.length > 0` before 11b.12 existed, so the
// stage rename inherited the behaviour and ⛔ no second guard was added ([[feedback_closure_
// language_precision]] — *"Closed by [edit]"* and *"satisfied by construction"* are ⛔ not the same
// claim, and this one is the latter).
//
// ⚠⛔ BUT *"already true"* IS EXACTLY THE CLASS OF PROPERTY THAT ROTS SILENTLY. Nothing today fails
// if a refactor unwraps either guard: the page would simply render a heading, a caption and an
// empty `<table>` announcing a stage that has no drives — the *"announced omission"* this family of
// surfaces refuses. ⇒ the clause is PINNED here, in the two layers that can actually see it.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildSahyogView, splitSections, type SahyogLabels } from '../src/lib/sahyog-render.js';

const here = dirname(fileURLToPath(import.meta.url));
const ASTRO = join(here, '../src/pages/sahyog.astro');

const labels = {
  pageTitle: 'Sahyog Drive',
  pageIntro: 'intro',
  tableCaptionActive: 'closed caption',
  tableCaptionArchive: 'verified caption',
  sectionActiveTitle: 'Closed drives',
  sectionArchiveTitle: 'Verified drives',
  columnName: 'In memory of',
  columnPool: 'Drive code',
  columnLetter: 'Pool',
  columnOpen: 'Details',
  columnDistrict: 'District',
  columnDate: 'Closed on',
  columnContributions: 'Contributions confirmed',
  columnOutcome: 'Close of cycle',
  districtUnknown: 'Not recorded',
  dateUnknown: 'Not recorded',
  statusActive: 'Closed',
  statusArchive: 'Verified',
  emptyTitle: 'none yet',
  emptyBody: 'none yet body',
  emptyFilteredTitle: 'none match',
  emptyFilteredBody: 'none match body',
  outageTitle: 'outage',
  outageBody: 'outage body',
  pastEndTitle: 'past end',
  pastEndBody: 'past end body',
  rejectedTitle: 'rejected',
  rejectedBody: 'rejected body',
  paginationLabel: 'Pages',
  paginationPrevious: 'Previous',
  paginationNext: 'Next',
  consentNote: 'consent',
  viewDrive: 'View drive',
  driveLinkA11y: (code: string) => `View drive ${code}`,
  contributionsCount: (n: number) => `${n} confirmed`,
  outcomeFullyFunded: 'ok',
  outcomeUnderFunded: 'under',
  outcomePartial: 'partial',
  filterLegend: 'Find a drive',
  filterDistrictLabel: 'District',
  filterClosedFromLabel: 'From',
  filterClosedToLabel: 'To',
  filterPoolCodeLabel: 'Drive code',
  filterSubmit: 'Search',
  filterNoNameSearch: 'no name search',
} as unknown as SahyogLabels;

const row = (status: 'closed' | 'verified') => ({
  deceasedMemberName: 'Rajesh Kumar Sharma',
  poolLetterCode: 'A',
  poolCanonicalIdentifier: 'P-2026-08-001',
  publicToken: 'tok-P-2026-08-001',
  status,
  closedAt: '2026-08-01T00:00:00.000Z',
  district: 'Lucknow',
  confirmedContributionCount: 12,
  fundingOutcome: 'fully_funded' as const,
});

describe('⭐ layer 1 — the PRESENTER hands the page an EMPTY section, ⛔ not a stub row', () => {
  it('a page of only `closed` drives yields an empty `verified` section', () => {
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      new URLSearchParams(),
      labels,
      { items: [row('closed')], page: 1, limit: 25, total: 1 },
    );
    const { active, archive } = splitSections(view);
    expect(archive).toEqual([]);
    expect(active).toHaveLength(1);
  });

  it('a page of only `verified` drives yields an empty `closed` section', () => {
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      new URLSearchParams(),
      labels,
      { items: [row('verified')], page: 1, limit: 25, total: 1 },
    );
    const { active, archive } = splitSections(view);
    expect(active).toEqual([]);
    expect(archive).toHaveLength(1);
  });
});

describe('⭐ layer 2 — the PAGE still refuses to render an empty section at all', () => {
  // ⚠⛔ A SOURCE SCAN, AND ITS LIMITATION IS STATED RATHER THAN GLOSSED: Astro templates are ⛔ not
  // unit-testable in this repo (the house pattern — see `sahyog-invariant.test.ts`). ⇒ this proves
  // the GUARD IS WRITTEN, ⛔ not that the browser rendered nothing. Layer 1 above is what proves
  // the data reaching the guard is genuinely empty; together they are what AC6 asks for.
  const src = readFileSync(ASTRO, 'utf8');

  for (const [stage, guard, heading, caption] of [
    ['closed', 'sections.active.length > 0', 'sectionActiveTitle', 'tableCaptionActive'],
    ['verified', 'sections.archive.length > 0', 'sectionArchiveTitle', 'tableCaptionArchive'],
  ] as const) {
    it(`the ${stage} section's heading, caption and table are ALL inside its \`.length > 0\` guard`, () => {
      expect(src, `the ${stage} section lost its emptiness guard`).toContain(guard);
      // ⭐ The guard must OPEN BEFORE the heading and the caption — a guard that wrapped only the
      // `<tbody>` would still emit a heading and an empty table, which is the defect verbatim.
      const g = src.indexOf(guard);
      const h = src.indexOf(`labels.${heading}`);
      const c = src.indexOf(`labels.${caption}`);
      expect(g).toBeGreaterThan(-1);
      expect(h, `${heading} renders OUTSIDE the guard`).toBeGreaterThan(g);
      expect(c, `${caption} renders OUTSIDE the guard`).toBeGreaterThan(g);
    });
  }

  it('⛔ ⛔ NO SECOND GUARD WAS ADDED — the clause was satisfied by construction', () => {
    // ⭐ `-194` cl.1 is recorded SATISFIED, ⛔ not newly implemented. Two guards for one property is
    // two things to drift, and the second would read as though the first were untrusted.
    expect(src.split('sections.active.length > 0')).toHaveLength(2);
    expect(src.split('sections.archive.length > 0')).toHaveLength(2);
  });
});
