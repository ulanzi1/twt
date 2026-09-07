// ⭐⭐ A `live` DRIVE RENDERS IN ITS OWN **LIVE** SECTION, LABELLED WITH STORY B's WORD —
// Story 11b.14 (AC1, Task 2 artefact 5; Trap 6).
//
// ⛔⛔ **THIS IS THE ARTEFACT THAT FAILS SILENTLY.** Widening the listing predicate, the wire enum,
// the state→token map and the `.server.ts` literal guard is enough for a live drive to reach this
// page — and with the partition left two-way, **every live drive renders inside the "Closed drives"
// section, labelled "Closed"**. ⛔ No typecheck sees it; ⛔ no existing test saw it either
// (`sahyog-empty-section.test.ts` asserted the two EXISTING sections only).
//
// ⚠ The partition literal's own comment says it: *"Get it wrong and EVERY drive lands in one
// section."*

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  buildSahyogView,
  splitSections,
  visibleSahyogColumns,
  type SahyogLabels,
} from '../src/lib/sahyog-render.js';

const here = dirname(fileURLToPath(import.meta.url));
const ASTRO = join(here, '../src/pages/sahyog.astro');

const labels = {
  pageTitle: 'Sahyog Drive',
  pageIntro: 'intro',
  tableCaptionLive: 'live caption',
  tableCaptionActive: 'closed caption',
  tableCaptionArchive: 'verified caption',
  sectionLiveTitle: 'Live drives',
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
  participationLine: (amount: number, count: number) => `₹ ${amount} and counting, by ${count} colleagues`,
  driveTargetLine: (target: number) => `Expected: ₹ ${target}`,
  columnOutcome: 'Close of cycle',
  districtUnknown: 'Not recorded',
  dateUnknown: 'Not recorded',
  statusLive: 'Live',
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
  viewDrive: 'View drive',
  driveLinkA11y: (code: string) => `View drive ${code}`,
  contributionsCount: (n: number) => `${n} confirmed`,
  outcomeFullyFunded: 'ok',
  outcomeUnderFunded: 'under',
  outcomePartial: 'partial',
} as unknown as SahyogLabels;

const row = (status: 'live' | 'closed' | 'verified', closedAt: string | null) => ({
  deceasedMemberName: 'Rajesh Kumar Sharma',
  poolLetterCode: 'A',
  poolCanonicalIdentifier: `P-2026-08-00${status.length}`,
  publicToken: `tok-${status}`,
  status,
  closedAt,
  district: 'Lucknow',
  confirmedContributionCount: 12,
  // ⭐ Story 11b.14 (AC2, AC3) — the meter's fill and the ruled money figure.
  confirmedPercentage: 12,
  amountRaisedInr: 1200,
  fundingOutcome: null,
});

describe('⭐ the THREE-WAY partition (Task 2, artefact 5)', () => {
  it('⭐⭐ a `live` drive lands in `sections.live` — ⛔ NOT in the Closed section', () => {
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      new URLSearchParams(),
      labels,
      { items: [row('live', null)], page: 1, limit: 25, total: 1 },
    );
    const { live, active, archive } = splitSections(view);
    expect(live).toHaveLength(1);
    expect(active).toEqual([]);
    expect(archive).toEqual([]);
  });

  it('⭐ a `closed` drive still lands in the Closed section, and `verified` in Verified', () => {
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      new URLSearchParams(),
      labels,
      {
        items: [row('closed', '2026-08-01T00:00:00.000Z'), row('verified', '2026-08-02T00:00:00.000Z')],
        page: 1,
        limit: 25,
        total: 2,
      },
    );
    const { live, active, archive } = splitSections(view);
    expect(live).toEqual([]);
    expect(active).toHaveLength(1);
    expect(archive).toHaveLength(1);
  });

  it('⛔ a row appears in EXACTLY ONE section — ⛔ never twice under contradictory headings', () => {
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      new URLSearchParams(),
      labels,
      {
        items: [
          row('live', null),
          row('closed', '2026-08-01T00:00:00.000Z'),
          row('verified', '2026-08-02T00:00:00.000Z'),
        ],
        page: 1,
        limit: 25,
        total: 3,
      },
    );
    const { live, active, archive } = splitSections(view);
    expect(live.length + active.length + archive.length).toBe(3);
  });
});

describe('⭐ the LABEL ternary (Task 2, artefact 5)', () => {
  it('⭐⭐ a `live` row is labelled with story B’s LIVE word — ⛔ never "Closed"', () => {
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      new URLSearchParams(),
      labels,
      { items: [row('live', null)], page: 1, limit: 25, total: 1 },
    );
    const [only] = splitSections(view).live;
    expect(only?.driveStatus).toBe('Live');
    expect(only?.driveStatus).not.toBe('Closed');
  });

  it('⛔ the other two words are UNCHANGED — ⛔ the widening ADDS an arm, it does ⛔ not re-route', () => {
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      new URLSearchParams(),
      labels,
      {
        items: [row('closed', '2026-08-01T00:00:00.000Z'), row('verified', '2026-08-02T00:00:00.000Z')],
        page: 1,
        limit: 25,
        total: 2,
      },
    );
    const { active, archive } = splitSections(view);
    expect(active[0]?.driveStatus).toBe('Closed');
    expect(archive[0]?.driveStatus).toBe('Verified');
  });
});

describe('⭐ the LIVE section carries its OWN emptiness guard — ⛔ exactly one, like its siblings', () => {
  // ⚠ AC1's clarification: the 2026-09-04 *"⛔ do ⛔ not add another guard"* means ONE guard PER
  // SECTION, ⛔ never two guards on one section. ⛔ It does ⛔ NOT forbid the Live section's own.
  const src = readFileSync(ASTRO, 'utf8');

  it('the live section’s heading, caption and table are ALL inside its `.length > 0` guard', () => {
    const guard = 'sections.live.length > 0';
    expect(src, 'the live section has no emptiness guard').toContain(guard);
    const g = src.indexOf(guard);
    const h = src.indexOf('labels.sectionLiveTitle');
    const c = src.indexOf('labels.tableCaptionLive');
    expect(h, 'sectionLiveTitle renders OUTSIDE the guard').toBeGreaterThan(g);
    expect(c, 'tableCaptionLive renders OUTSIDE the guard').toBeGreaterThan(g);
  });

  it('⛔ exactly ONE guard for the live section — ⛔ two would be two things to drift', () => {
    expect(src.split('sections.live.length > 0')).toHaveLength(2);
  });
});

describe('⭐ Trap 4 — the LIVE table drops the two columns that have no meaning yet', () => {
  const ids = (stage: 'live' | 'closed' | 'verified') =>
    visibleSahyogColumns(labels, () => true, stage).map((c) => c.fieldId);

  it('⛔⛔ ⛔ NO "Closed on" column on a Live row — ⭐ the shipped "Not recorded" fallback would OTHERWISE announce the omission down the whole section', () => {
    // ⚠ `driveClosedAt` is `null` for EVERY live row by construction, and `visibleSahyogColumns`
    // already does `?? labels.dateUnknown` ⇒ leaving the column in renders "Not recorded" /
    // "दर्ज नहीं" in every cell under a labelled header — the announced-omission shape AC5 forbids.
    expect(ids('live')).not.toContain('drive_closed_at');
    expect(ids('closed')).toContain('drive_closed_at');
    expect(ids('verified')).toContain('drive_closed_at');
  });

  it('⛔ ⛔ NO close-of-cycle sentence over a drive that has ⛔ not closed', () => {
    expect(ids('live')).not.toContain('close_of_cycle_framing');
    expect(ids('closed')).toContain('close_of_cycle_framing');
  });

  it('⭐⭐ and the CONVERSE — the METER is LIVE-ONLY', () => {
    // ⭐ `-189` cl.2(b) rules a bar for a drive that is COLLECTING. A bar on a closed drive would
    // compare against a cycle that has already ended, and the ruled sentence's *"…and counting"*
    // would be false in terms.
    expect(ids('live')).toContain('drive_participation_line');
    expect(ids('closed')).not.toContain('drive_participation_line');
    expect(ids('verified')).not.toContain('drive_participation_line');
  });

  it('⛔ the header and the cells are dropped TOGETHER — ⛔ never a blank column under a label', () => {
    // ⭐ The same discipline `visibleSahyogColumns` applies to a matrix suppression: one column
    // object carries BOTH the `<th>` label and the `<td>` accessor, so they cannot diverge.
    for (const col of visibleSahyogColumns(labels, () => true, 'live')) {
      expect(col.headerLabel).toBeTruthy();
    }
  });
});

describe('⭐⭐ the BAR is `aria-hidden`, and that is a RULING', () => {
  const src = readFileSync(ASTRO, 'utf8');

  it('⛔ the meter carries `aria-hidden` — the ruled sentence beneath it carries the meaning', () => {
    // ⭐⭐ `D6` removed the shipped *"{confirmed} of {total} contributions confirmed"* label because
    // it NAMES ITS DENOMINATOR; `active_contribution.progress_a11y` carries the identical shape and
    // would name that denominator to assistive tech. ⇒ ⛔ neither key is rendered here, the bar is
    // decorative to a screen reader, and ⛔ no new a11y string is minted that names a hidden figure.
    const meter = src.indexOf('class="sahyog__meter"');
    expect(meter).toBeGreaterThan(-1);
    expect(src.slice(meter, meter + 300)).toContain('aria-hidden="true"');
  });

  it('⛔ ⛔ NEITHER `{confirmed} of {total}` key is RESOLVED on this surface', () => {
    // ⚠ It scans for a RESOLUTION (a quoted key passed to `t()` / `ts()`), ⛔ not for the mere
    // string — the page's own doc-comment NAMES `active_contribution.progress_a11y` in explaining
    // why it is not rendered, and a substring check would fail on the explanation itself.
    expect(src).not.toMatch(/t\w*\(\s*['"`]active_contribution\.progress/);
  });

  it('⭐ the motion is CSS-only, fills ONCE, and honours `prefers-reduced-motion`', () => {
    // ⭐ RULED (A), BigDev: the bar grows from nothing on load, then HOLDS STILL. ⛔ No ripple and
    // ⛔ no repeating shine — `/sahyog` is edge-cached at `s-maxage=300`, so continuous motion would
    // assert money is arriving while a visitor watches, which this page ⛔ cannot honour.
    expect(src).toContain('@keyframes sahyog-meter-grow');
    // ⛔ `animation-fill-mode: both` is load-bearing — without it the bar snaps back to 0% when the
    // animation ends, which is the exact opposite of "holds still".
    expect(src).toMatch(/animation:\s*sahyog-meter-grow[^;]*both/);
    expect(src).not.toMatch(/animation-iteration-count:\s*infinite/);
    expect(src).toContain('@media (prefers-reduced-motion: reduce)');
    // ⛔ ⛔ NO JS: a static, server-rendered page carries no script for this.
    expect(src).not.toMatch(/requestAnimationFrame|new Animation\(|\.animate\(/);
  });
});
