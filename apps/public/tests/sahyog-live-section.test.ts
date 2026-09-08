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
  // ⭐ Story 11b.14 (AC7) — the nominee's name, under the ruled label "Nominee Name".
  nomineeName: 'Sunita Devi Sharma',
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
    // ⚠⛔ **STRENGTHENED 2026-09-07 — ⭐ the PRIOR assertion was a SUM:**
    //   > `expect(live.length + active.length + archive.length).toBe(3);`
    // ⛔ A row duplicated into two sections while another vanished still sums to 3 — ⭐ and
    // duplication under contradictory headings is the ⛔ EXACT defect this test claims to pin.
    // ⇒ assert MEMBERSHIP by `publicToken` ([[project_live_db_test_gotchas]]).
    // ⚠ The DISPLAY row carries `poolCanonicalIdentifier`, ⛔ not the wire's `publicToken` (which
    // survives only inside `driveHref`) — ⭐ and the fixture gives the three stages distinct ones.
    expect(live.map((r) => r.poolCanonicalIdentifier)).toEqual(['P-2026-08-004']);
    expect(active.map((r) => r.poolCanonicalIdentifier)).toEqual(['P-2026-08-006']);
    expect(archive.map((r) => r.poolCanonicalIdentifier)).toEqual(['P-2026-08-008']);
    // ⛔ AND ⛔ NO ROW APPEARS TWICE ACROSS THE THREE SECTIONS.
    const all = [...live, ...active, ...archive].map((r) => r.poolCanonicalIdentifier);
    expect(new Set(all).size).toBe(all.length);
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
    // ⚠⛔ **STRENGTHENED 2026-09-07 — ⭐ the PRIOR body asserted the HEADER ALONE:**
    //   > `for (const col of …) expect(col.headerLabel).toBeTruthy();`
    // ⛔ It ⛔ never touched `valueOf`, so it would have passed unchanged if the cells and the
    // headers HAD diverged — ⛔ i.e. it could not fail for the reason its name gives.
    const liveCols = visibleSahyogColumns(labels, () => true, 'live');
    const closedCols = visibleSahyogColumns(labels, () => true, 'closed');
    for (const col of liveCols) {
      expect(col.headerLabel).toBeTruthy();
      // ⭐ THE PAIRING: a header present means an accessor present, on the SAME object.
      expect(typeof col.valueOf).toBe('function');
    }
    // ⭐⭐ AND THE DROP IS PROVEN AGAINST THE OTHER STAGE, ⛔ not asserted in the abstract: the
    // three ids the live filter removes must be absent from BOTH the labels and the accessors.
    const liveIds = liveCols.map((c) => c.fieldId);
    const closedIds = closedCols.map((c) => c.fieldId);
    for (const dropped of ['drive_closed_at', 'close_of_cycle_framing', 'drive_index_line']) {
      expect(closedIds).toContain(dropped);
      expect(liveIds).not.toContain(dropped);
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

// ⭐⭐ THE ZERO-STATE SENTENCE — Trustee-ratified (DR + KB) 2026-09-07, `2026-09-07-206` cl.4.
// ⚠ Before this ruling a drive on its FIRST DAY published *"₹ 0 and counting, by 0 colleagues—and
// still going strong!"* in both languages (Review finding, 2026-09-07).
describe('⭐⭐ `2026-09-07-206` cl.4 — a live drive with ⛔ NO confirmed contribution', () => {
  const zeroRow = (deceasedMemberName: string | null) => ({
    ...row('live', null),
    deceasedMemberName,
    confirmedContributionCount: 0,
    confirmedPercentage: 0,
    amountRaisedInr: 0,
  });

  const lineOf = (deceasedMemberName: string | null) => {
    const view = buildSahyogView({ page: 1, limit: 25 }, new URLSearchParams(), labels, {
      items: [zeroRow(deceasedMemberName)],
      page: 1,
      limit: 25,
      total: 1,
    });
    return splitSections(view).live[0]!.driveParticipationLine;
  };

  it('⭐ takes the ZERO-STATE sentence, ⛔ never the participation line', () => {
    const cell = lineOf('Ram Prakash Verma');
    expect(cell).toBe("Late Ram Prakash Verma's family awaits your support.");
    // ⛔ THE PROPERTY: the zero figures must ⛔ not reach the page under ANY wording.
    expect(cell).not.toMatch(/\bby 0\b/);
    expect(cell).not.toMatch(/and counting/);
  });

  it('⛔⛔ falls to the NO-FAMILY variant where the name may ⛔ not be published — ⭐ this is what stops a 500', () => {
    // ⭐ A STRING, ⛔ never null: unlike `index_line.*`, the zero pair is TOTAL over its inputs.
    expect(lineOf(null)).toBe('Family awaits your support.');
  });

  it('⭐ the moment ONE contribution is confirmed, the participation line returns', () => {
    const view = buildSahyogView({ page: 1, limit: 25 }, new URLSearchParams(), labels, {
      items: [{ ...row('live', null), confirmedContributionCount: 1, amountRaisedInr: 100 }],
      page: 1,
      limit: 25,
      total: 1,
    });
    expect(splitSections(view).live[0]!.driveParticipationLine).toMatch(/and counting/);
  });
});

// ⭐⭐ `2026-09-07-206` cl.1 — THE BAR PRINTS ITS OWN FIGURE.
describe('⭐⭐ `2026-09-07-206` cl.1 — the printed percentage', () => {
  const meterCol = () => {
    const cols = visibleSahyogColumns(labels, () => true, 'live');
    const c = cols.find((x) => x.meter !== undefined);
    if (c?.meter === undefined) throw new Error('the live column set must carry exactly one meter');
    return c.meter;
  };

  it('⭐ renders the figure as TEXT — `82%`', () => {
    expect(meterCol().percentLabelOf({ driveProgressPercentage: 82 } as never)).toBe('82%');
  });

  it('⭐ 0% and 100% are printed, ⛔ not suppressed — both are real states of a live drive', () => {
    expect(meterCol().percentLabelOf({ driveProgressPercentage: 0 } as never)).toBe('0%');
    expect(meterCol().percentLabelOf({ driveProgressPercentage: 100 } as never)).toBe('100%');
  });

  it('⛔ a row with NO bar prints NO figure', () => {
    expect(meterCol().percentLabelOf({ driveProgressPercentage: null } as never)).toBeNull();
  });

  it('⛔⛔ it is governed by its OWN matrix field id — ⭐ `drive_progress_percentage` finally has a consumer', () => {
    expect(meterCol().percentFieldId).toBe('drive_progress_percentage');
    // ⛔ ⛔ AND IT IS ⛔ NOT the sentence's id: riding that verdict is what made the field inert.
    // ⚠ The coupling is ONE-DIRECTIONAL (Review finding, 2026-09-08): its own verdict can suppress
    // the figure, but a suppressed `drive_participation_line` column still takes the bar + figure
    // with it via `visibleSahyogColumns`. Fail-safe, ⛔ not independent both ways.
    const cols = visibleSahyogColumns(labels, () => true, 'live');
    const c = cols.find((x) => x.meter !== undefined);
    expect(meterCol().percentFieldId).not.toBe(c?.fieldId);
  });

  it('⛔⛔ the page ASKS the matrix about it — ⛔ a suppressed verdict must suppress the figure', () => {
    const src = readFileSync(ASTRO, 'utf8');
    // ⭐ THE PROPERTY the review found missing: before cl.1 there was ⛔ ZERO `visibilityOf` call
    // naming this field, so flipping its tier suppressed nothing and the leak gate stayed green.
    expect(src).toMatch(/visibilityOf\(\s*'sahyog-drive',\s*col\.meter\.percentFieldId/);
  });

  it('⛔ printing the figure mints ⛔ NO ARIA — ⭐ `-204` cl.5 is NARROWED, ⛔ not reversed', () => {
    // ⚠ The `aria-hidden` bar and the un-resolved `{confirmed} of {total}` keys are asserted by the
    // suite above; ⛔ this one guards the NEW surface cl.1 adds — that the printed figure is plain
    // text and ⛔ does ⛔ not smuggle back a `progressbar` role or a value the refused label carried.
    const src = readFileSync(ASTRO, 'utf8');
    expect(src).not.toMatch(/role="progressbar"|aria-valuenow|aria-valuemax|aria-valuetext/);
  });

  it('⛔⛔ the fill guard is `typeof === number` — ⭐ an `undefined` fill must NOT paint a full bar', () => {
    const src = readFileSync(ASTRO, 'utf8');
    // ⚠ `!== null` let `undefined` through into `--sahyog-meter-fill:undefined%`, which is invalid
    // at computed-value time ⇒ `width` fell back to `auto` = a FULL bar (Review finding).
    expect(src).toMatch(/typeof col\.meter\.fillOf\(row\) === 'number'/);
  });
});
