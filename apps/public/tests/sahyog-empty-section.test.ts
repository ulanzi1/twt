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
  // ⭐ Story 11b.14 (AC2, AC3) — the LIVE meter cell's header and its two ruled lines.
  columnProgress: 'Progress',
  // ⭐ Story 11b.14 (AC7) — the RULED label. ⛔ *"Account holder"* may ⛔ NOT be used.
  columnNominee: 'Nominee Name',
  columnSummary: 'About this drive',
  indexLine: (tk: { nomineeName: string | null; familyName: string | null; districtName: string | null }) =>
    tk.nomineeName === null && tk.familyName === null ? null : `line for ${tk.nomineeName ?? tk.familyName}`,
  participationLine: (amount: number, count: number) => `₹ ${amount} and counting, by ${count} colleagues`,
  // ⭐ Story 11b.14 (`2026-09-07-206` cl.4) — the ZERO-STATE pair. ⚠ The `null` arm is the one that
  // stops an unconsented drive 500ing the page, so the fixture models BOTH.
  zeroLine: (familyName: string | null) =>
    familyName === null ? 'Family awaits your support.' : `Late ${familyName}'s family awaits your support.`,
  driveTargetLine: (target: number) => `Expected: ₹ ${target}`,
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

const row = (status: 'live' | 'closed' | 'verified') => ({
  deceasedMemberName: 'Rajesh Kumar Sharma',
  // ⭐ Story 11b.14 (AC7) — the nominee's name, under the ruled label "Nominee Name".
  nomineeName: 'Sunita Devi Sharma',
  poolLetterCode: 'A',
  poolCanonicalIdentifier: 'P-2026-08-001',
  publicToken: 'tok-P-2026-08-001',
  status,
  closedAt: '2026-08-01T00:00:00.000Z',
  district: 'Lucknow',
  confirmedContributionCount: 12,
  // ⭐ Story 11b.14 (AC2, AC3) — the meter's fill and the ruled money figure.
  // ⚠⛔⛔ **STATUS-DERIVED — `2026-09-08-207` cl.1** (Review finding, FOURTH pass 2026-09-08). A
  // hardcoded number here models a wire shape the API can ⛔ no longer emit: the figure is a
  // LIVE-ROW datum and is `null` on every `closed` / `verified` row. ⭐ An explicit override still
  // wins, so a test that wants a specific fill just passes one.
  confirmedPercentage: status === 'live' ? 12 : null,
  amountRaisedInr: 1200,
  fundingOutcome: 'fully_funded' as const,
});

describe('⭐ layer 1 — the PRESENTER hands the page an EMPTY section, ⛔ not a stub row', () => {
  it('⭐ a page of only `live` drives yields EMPTY closed AND verified sections', () => {
    // ⭐ Story 11b.14 (AC1) — the third section's half of the same property. ⚠ Without it the
    // suppression leg would be asserted for two of three sections and go partly vacuous on the
    // exact section this story added.
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      new URLSearchParams(),
      labels,
      { items: [row('live')], page: 1, limit: 25, total: 1 },
    );
    const { live, active, archive } = splitSections(view);
    expect(live).toHaveLength(1);
    expect(active).toEqual([]);
    expect(archive).toEqual([]);
  });

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
    // ⭐ Story 11b.14 (AC1) — the THIRD section. ⚠⛔ AC1's clarification of the 2026-09-04 guard
    // clause: *"⛔ do ⛔ not add another guard"* means **ONE guard PER SECTION**, ⛔ never two on one
    // — it does ⛔ NOT forbid the Live section's own, which AC1 REQUIRES.
    ['live', 'sections.live.length > 0', 'sectionLiveTitle', 'tableCaptionLive'],
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

  it('⛔ ⛔ NO SECOND GUARD ON ANY SECTION — one each, and ⛔ exactly one', () => {
    // ⭐ `-194` cl.1 is recorded SATISFIED, ⛔ not newly implemented. Two guards for one property is
    // two things to drift, and the second would read as though the first were untrusted.
    // ⚠ Story 11b.14 extends the property to the LIVE section — ⛔ it does ⛔ not relax it.
    expect(src.split('sections.live.length > 0')).toHaveLength(2);
    expect(src.split('sections.active.length > 0')).toHaveLength(2);
    expect(src.split('sections.archive.length > 0')).toHaveLength(2);
  });
});
