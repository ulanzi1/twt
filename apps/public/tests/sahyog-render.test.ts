// The `/sahyog` pure render module — DB-free unit tests (Story 11b.1, Task 7).
//
// Everything here is pure: no fs, no db, no env, no clock. What it proves is the display logic the
// page delegates to — the FOUR distinct states, the consent-gated name's rendering rule, the
// field-id derivation in BOTH drift directions, and the prohibitions AC5 states.
//
// ⚠ This file deliberately does NOT assert copy. Copy is asserted THROUGH the real `t()` in
// `sahyog-copy.test.ts`, because a labels fixture is exactly the blind spot that let the 11a.2
// interpolation defect ship green.

import type { PublicSahyogDriveResponse } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildSahyogRejectionView,
  buildSahyogView,
  splitSections,
  visibleSahyogColumns,
  type SahyogLabels,
} from '../src/lib/sahyog-render.js';
import {
  SAHYOG_DRIVE_FIELD_IDS,
  SAHYOG_DRIVE_ROW_FIELD_IDS,
  deriveFieldIds,
  sahyogDriveSurfaceFieldIds,
  type SahyogDriveRenderModel,
} from '../src/lib/surface-fields.js';

const labels: SahyogLabels = {
  pageTitle: 'Sahyog Drive',
  pageIntro: 'Every drive this trust has run.',
  tableCaptionActive: 'Closed drives table',
  tableCaptionArchive: 'Verified drives table',
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
  // ⚠ D3 — the FIELD names are historical; the VALUES are the ruled words (Story 11b.12).
  statusActive: 'Closed',
  statusArchive: 'Verified',
  emptyTitle: 'No drives yet',
  emptyBody: 'When a drive closes it appears here.',
  emptyFilteredTitle: 'No drives match',
  emptyFilteredBody: 'Try a wider range.',
  outageTitle: 'Could not load',
  outageBody: 'A problem on our side.',
  pastEndTitle: 'Nothing on this page',
  pastEndBody: 'You reached the end.',
  rejectedTitle: 'Could not read that request',
  rejectedBody: 'Return to the first page.',
  paginationLabel: 'Pages',
  previousPage: 'Previous',
  nextPage: 'Next',
  outcomeFullyFunded: 'The cycle closed with the support it needed.',
  outcomeUnderFunded: 'The cycle closed. The trust met its commitment.',
  outcomePartial: 'The cycle closed. Reconciliation continues.',
  contributionsCount: (n) => `${String(n)} confirmed`,
  viewDrive: 'View drive',
  driveLinkA11y: (code) => `View the full details of drive ${code}`,
};

type WireRow = PublicSahyogDriveResponse['items'][number];

const row = (over: Partial<WireRow> = {}): WireRow => ({
  deceasedMemberName: 'Rajesh Kumar Sharma',
  poolLetterCode: 'A',
  poolCanonicalIdentifier: 'P-2026-08-001',
  publicToken: 'tok-P-2026-08-001',
  status: 'closed',
  closedAt: '2026-08-01T00:00:00.000Z',
  district: 'Lucknow',
  confirmedContributionCount: 12,
  fundingOutcome: 'fully_funded',
  ...over,
});

const wire = (items: WireRow[], total = items.length): PublicSahyogDriveResponse => ({
  items,
  page: 1,
  limit: 25,
  total,
});

const search = (): URLSearchParams => new URLSearchParams();
const allVisible = (): boolean => true;

describe('the FOUR distinct states — ⛔ they are not interchangeable (Trap 7)', () => {
  it('(1) a REJECTION renders a 400-shaped state, and is REJECTION-INVARIANT', () => {
    const a = buildSahyogRejectionView(labels);
    const b = buildSahyogRejectionView(labels);
    expect(a.status).toBe(400);
    // ⭐ It takes no `rejection` argument on purpose: `?page=all`, `?limit=99999` and `?page=-1`
    // must all produce byte-identical output, so a prober learns NOTHING about which bound it hit.
    expect(a).toEqual(b);
  });

  it('(2) an OUTAGE is `apiUnavailable`, and ⛔ NEVER an empty index', () => {
    const view = buildSahyogView({ page: 1, limit: 25 }, search(), labels, null);
    expect(view.model.apiUnavailable).toBe(true);
    // ⛔ The single most misleading thing this page could say is "no drives" during an outage.
    expect(view.model.hasDrives).toBe(false);
    expect(view.model.pastEnd).toBe(false);
    // ⛔ And an outage must never advertise a next page.
    expect(view.hasNext).toBe(false);
  });

  it('(3) PAST-THE-END is distinct from empty — the index HAS drives, none on THIS page', () => {
    const view = buildSahyogView({ page: 3, limit: 25 }, search(), labels, wire([], 40));
    expect(view.model.pastEnd).toBe(true);
    expect(view.model.apiUnavailable).toBe(false);
  });

  it('(4) GENUINELY EMPTY is not past-the-end — total 0 is honestly "nothing yet"', () => {
    const view = buildSahyogView({ page: 1, limit: 25 }, search(), labels, wire([], 0));
    expect(view.model.pastEnd).toBe(false);
    expect(view.model.hasDrives).toBe(false);
  });

  it('⛔ page 1 is NEVER "past the end", whatever the totals say', () => {
    // "You have reached the end" on page 1 is false under any cause, so the conjunct stays even
    // though this surface's rows-vs-total asymmetry is weaker than /members'.
    const view = buildSahyogView({ page: 1, limit: 25 }, search(), labels, wire([], 40));
    expect(view.model.pastEnd).toBe(false);
  });

  it('a FILTERED empty result is flagged, so "none MATCH" ≠ "none EXIST"', () => {
    const view = buildSahyogView({ page: 1, limit: 25 }, search(), labels, wire([], 0), {
      filtered: true,
    });
    expect(view.model.filtered).toBe(true);
  });
});

describe('⭐ consent decides whether a row is NAMED, ⛔ never whether it EXISTS', () => {
  it('a null name keeps the ROW and every other field intact', () => {
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      search(),
      labels,
      wire([row({ deceasedMemberName: null, district: 'Kanpur' })]),
    );
    expect(view.model.rows).toHaveLength(1);
    expect(view.model.hasDrives).toBe(true);
    expect(view.model.rows[0]?.deceasedMemberName).toBeNull();
    expect(view.model.rows[0]?.district).toBe('Kanpur');
    expect(view.model.rows[0]?.poolCanonicalIdentifier).toBe('P-2026-08-001');
  });

  it('⛔ a null name is NOT replaced by a placeholder, dash or "withheld" marker', () => {
    const cols = visibleSahyogColumns(labels, allVisible);
    const nameCol = cols.find((c) => c.fieldId === 'deceased_member_name');
    const rendered = nameCol?.valueOf({
      deceasedMemberName: null,
      poolLetterCode: 'A',
      poolCanonicalIdentifier: 'P-1',
      driveHref: '/sahyog-vivran/tok-P-1',
      driveLinkA11yLabel: 'View the full details of drive P-1',
      driveStatus: 'Closed',
      driveClosedAt: '01-08-2026',
      district: 'Kanpur',
      confirmedContributionCount: '12 confirmed',
      closeOfCycleFraming: 'ok',
    });
    // ⭐ `null` means "render NOTHING". An omission that announces itself is an ENUMERATION SIGNAL:
    // a scraper diffing renders learns exactly which families declined.
    expect(rendered).toBeNull();
  });

  it('⚠ a missing DISTRICT does get a "not recorded" fallback — the difference is deliberate', () => {
    // A missing district is an incomplete RECORD; a missing name is a family's CHOICE. Announcing
    // a choice is what turns the omission into a signal.
    const cols = visibleSahyogColumns(labels, allVisible);
    const districtCol = cols.find((c) => c.fieldId === 'district');
    expect(
      districtCol?.valueOf({
        deceasedMemberName: 'X',
        poolLetterCode: 'A',
        poolCanonicalIdentifier: 'P-1',
        driveHref: '/sahyog-vivran/tok-P-1',
        driveLinkA11yLabel: 'View the full details of drive P-1',
        driveStatus: 'Closed',
        driveClosedAt: null,
        district: null,
        confirmedContributionCount: '0 confirmed',
        closeOfCycleFraming: 'ok',
      }),
    ).toBe(labels.districtUnknown);
  });

  it('a MIXED page renders both the named and the unnamed row — degrades PER-POOL', () => {
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      search(),
      labels,
      wire([row(), row({ deceasedMemberName: null, poolCanonicalIdentifier: 'P-2026-08-002' })]),
    );
    expect(view.model.rows).toHaveLength(2);
    expect(view.model.rows.map((r) => r.deceasedMemberName)).toEqual([
      'Rajesh Kumar Sharma',
      null,
    ]);
  });

  it('⛔ the name is passed through UNTOUCHED — ⛔ never re-shortened in the render layer', () => {
    // Its FORM was decided server-side by `resolvePublicMemberName`; re-deriving it here would be
    // the second copy of the presentation policy that `-136` cl.2 forbids.
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      search(),
      labels,
      wire([row({ deceasedMemberName: 'Rajesh Kumar Sharma' })]),
    );
    expect(view.model.rows[0]?.deceasedMemberName).toBe('Rajesh Kumar Sharma');
  });
});

describe('⛔ the target is quarantined — no comparison figure reaches the copy path (AC4)', () => {
  it('maps each opaque outcome token to its own framing string', () => {
    for (const [outcome, expected] of [
      ['fully_funded', labels.outcomeFullyFunded],
      ['under_funded', labels.outcomeUnderFunded],
      ['partial', labels.outcomePartial],
    ] as const) {
      const view = buildSahyogView(
        { page: 1, limit: 25 },
        search(),
        labels,
        wire([row({ fundingOutcome: outcome })]),
      );
      expect(view.model.rows[0]?.closeOfCycleFraming).toBe(expected);
    }
  });

  it('⛔ NO key on a rendered row could carry a target, percentage or shortfall', () => {
    const view = buildSahyogView({ page: 1, limit: 25 }, search(), labels, wire([row()]));
    const forbidden = /target|expected|shortfall|percent|ratio|remaining|deficit|goal|amount|total/i;
    expect(Object.keys(view.model.rows[0] ?? {}).filter((k) => forbidden.test(k))).toEqual([]);
  });
});

describe('⛔ the sort order is NOT a ranking, and there is no sort affordance (AC5)', () => {
  it('⛔ NO column exposes a sort handle or comparator', () => {
    // ⚠⭐ AMENDED AT STORY 11b.10, ⛔ NOT WEAKENED. This used to assert an EXACT key set of
    // `['fieldId','headerLabel','valueOf']`, which read as "no sort affordance" but actually said
    // "no NEW key of any kind" — and 11b.10 legitimately adds `hrefOf`/`a11yOf` (the ruled inbound
    // path, `2026-09-03-184` (A)). ⇒ the assertion is split into the two claims it was conflating,
    // so BOTH stay sharp instead of one being relaxed to let the other through.
    const cols = visibleSahyogColumns(labels, allVisible);
    const ALLOWED = ['a11yOf', 'fieldId', 'headerLabel', 'hrefOf', 'valueOf'];
    // ⭐ THE PROHIBITION MOST LIKELY TO BE BREACHED BY ACCIDENT: "sort by contributions" reads like
    // a harmless table affordance rather than the leaderboard it builds.
    const SORTISH = /sort|order|rank|comparator|compare|direction|asc|desc/i;
    for (const col of cols) {
      const keys = Object.keys(col);
      expect(keys.filter((k) => SORTISH.test(k))).toEqual([]);
      // ⛔ And nothing UNKNOWN either: a key nobody listed is a key nobody reasoned about.
      expect(keys.filter((k) => !ALLOWED.includes(k))).toEqual([]);
    }
  });

  it('⭐ EXACTLY ONE column is a link — ⛔ no second onward affordance (11b.10, control 5)', () => {
    // ⛔ This route's control 5 is *"the absence of any DETAIL or EXPORT affordance"* beyond the one
    // ruled inbound path. A second `hrefOf` would be a second onward affordance arriving quietly.
    const cols = visibleSahyogColumns(labels, allVisible);
    const linked = cols.filter((c) => c.hrefOf !== undefined);
    expect(linked.map((c) => c.fieldId)).toEqual(['drive_href']);
    // ⛔ A link with no accessible name is a bare "click here" (family 13).
    expect(linked[0]?.a11yOf).toBeTypeOf('function');
  });

  it('⭐ the drive link is built from the TOKEN — ⛔ never from `P-YYYY-MM-###` (11b.10 AC1/D2)', () => {
    // ⛔⛔ THE DEFECT THIS CATCHES: reconstructing an address from the canonical identifier would
    // re-create exactly the guessability the token was minted to remove — and it would still LOOK
    // like a working link, so nothing else would fail.
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      search(),
      labels,
      wire([row({ poolCanonicalIdentifier: 'P-2026-08-777', publicToken: 'OPAQUE-TOKEN-XYZ' })]),
    );
    const first = view.model.rows[0];
    expect(first?.driveHref).toBe('/sahyog-vivran/OPAQUE-TOKEN-XYZ');
    expect(first?.driveHref).not.toContain('P-2026-08-777');
  });

  it('⭐ the link carries ONLY `lang` forward — ⛔ never the index filters', () => {
    // ⛔ Dragging `district`/`from`/`to`/`poolCode` onto a single-drive URL would put a FILTER SHAPE
    // on a route whose API query schema is EMPTY and `.strict()` — an onward collection affordance
    // on the one surface that must not appear to have one.
    const withFilters = new URLSearchParams('lang=hi&district=Lucknow&page=3&poolCode=P-1');
    const view = buildSahyogView({ page: 1, limit: 25 }, withFilters, labels, wire([row()]));
    expect(view.model.rows[0]?.driveHref).toBe('/sahyog-vivran/tok-P-2026-08-001?lang=hi');
  });

  it('⭐ the link’s accessible name identifies WHICH drive — ⛔ never a bare "click here"', () => {
    // ⛔ And it is built from the DRIVE CODE, ⛔ never the deceased member's name: that name is
    // Tier-1, consent-gated and `null` for any unconsented family — the accessible name would then
    // VANISH on exactly the rows that still need one.
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      search(),
      labels,
      wire([row({ deceasedMemberName: null, poolCanonicalIdentifier: 'P-2026-08-042' })]),
    );
    const label = view.model.rows[0]?.driveLinkA11yLabel ?? '';
    expect(label).toContain('P-2026-08-042');
    expect(label).not.toMatch(/click here/i);
    expect(label.length).toBeGreaterThan(0);
  });

  it('⛔ the render module does NOT reorder rows — the wire order is preserved verbatim', () => {
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      search(),
      labels,
      wire([
        row({ poolCanonicalIdentifier: 'P-1', confirmedContributionCount: 1 }),
        row({ poolCanonicalIdentifier: 'P-2', confirmedContributionCount: 99 }),
        row({ poolCanonicalIdentifier: 'P-3', confirmedContributionCount: 50 }),
      ]),
    );
    // ⛔ If anything here sorted by contribution count, P-2 would lead. The domain's deterministic
    // close-instant ordering is what makes "page N is the same page N" true, and re-sorting in the
    // render layer would break BOTH that and the AC5 prohibition at once.
    expect(view.model.rows.map((r) => r.poolCanonicalIdentifier)).toEqual(['P-1', 'P-2', 'P-3']);
  });
});

describe('pagination + section split', () => {
  it('the NEXT link comes from the real total, ⛔ never from "this page came back full"', () => {
    const full = Array.from({ length: 25 }, (_, i) =>
      row({ poolCanonicalIdentifier: `P-${String(i)}` }),
    );
    // Exactly `limit` rows and total === limit ⇒ there is NO next page. Inferring one from a full
    // page would advertise an empty page 2: a lie AND an enumeration invitation.
    const exact = buildSahyogView({ page: 1, limit: 25 }, search(), labels, wire(full, 25));
    expect(exact.hasNext).toBe(false);
    const more = buildSahyogView({ page: 1, limit: 25 }, search(), labels, wire(full, 26));
    expect(more.hasNext).toBe(true);
  });

  it('⛔ never advertises a next page the parser would REFUSE (the horizon clamp)', () => {
    // Without the clamp a large index renders rel="next" → ?page=201 on page 200, and clicking it
    // hits the 400 state. A page must never advertise a link it knows will be refused.
    const view = buildSahyogView({ page: 200, limit: 25 }, search(), labels, wire([row()], 100_000));
    expect(view.hasNext).toBe(false);
  });

  // ⭐⭐ THE SECTION PARTITION, WITH **BOTH** RULED TOKENS PRESENT (Story 11b.12, AC1).
  // ⚠⛔ THIS IS WHAT PINS `sahyog-render.ts:338`, and it is ⛔ NOT a label test. The partition
  // branches on the WIRE TOKEN (`item.status === 'verified'`), ⛔ not on the `:296` label ternary
  // — a dev who renames only the ternary meets `:338` as a bare type error and may invert or widen
  // it. ⭐ Feeding BOTH tokens and asserting the two section lengths is the only shape that catches
  // that; the file's own `:178-184` records what breaking it did in production.
  it('splits ONE bounded page on the WIRE TOKEN — `closed` and `verified` land in different sections', () => {
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      search(),
      labels,
      wire([row({ status: 'closed' }), row({ status: 'verified' }), row({ status: 'closed' })]),
    );
    const { active, archive } = splitSections(view);
    expect(active).toHaveLength(2);
    expect(archive).toHaveLength(1);
    // ⛔ EXHAUSTIVE AND DISJOINT: every row lands in exactly one section — ⛔ none twice, ⛔ none lost.
    expect(active.length + archive.length).toBe(view.model.rows.length);
  });

  // ⭐⛔ THE PARTITION SURVIVES A LOCALE WHOSE TWO STATUS LABELS COINCIDE (Review finding,
  // 2026-08-27).
  //
  // `splitSections` used to recover the Active/Archive split by string-comparing each row's
  // LOCALISED `driveStatus` against `labels.statusActive` / `labels.statusArchive` — destroying
  // the wire discriminant and reconstructing it from copy. ⛔ If a translator (or a copy edit)
  // ever made the two labels identical, BOTH filters matched EVERY row and every drive rendered
  // TWICE, under two headings making contradictory claims about whether the family had been paid.
  // ⚠ No existing test could catch it: the fixture above uses two DISTINCT labels, and the copy
  // test never compares the two keys to each other.
  it('⛔ does NOT partition on display strings — identical status labels still split correctly', () => {
    const collidingLabels: SahyogLabels = {
      ...labels,
      statusActive: 'अभियान',
      statusArchive: 'अभियान', // ⚠ the SAME string — the exact translator slip
    };
    const view = buildSahyogView(
      { page: 1, limit: 25 },
      search(),
      collidingLabels,
      wire([row({ status: 'closed' }), row({ status: 'verified' }), row({ status: 'closed' })]),
    );
    const { active, archive } = splitSections(view);
    expect(active).toHaveLength(2);
    expect(archive).toHaveLength(1);
    // ⛔ And no row is rendered twice: the two sections partition the page, they do not overlap.
    expect(active.length + archive.length).toBe(view.model.rows.length);
  });
});

describe('⭐ the tier-leak field-id derivation is OPERATIVE, and drifts fail in BOTH directions', () => {
  const model: SahyogDriveRenderModel = {
    hasDrives: true,
    page: 1,
    limit: 25,
    apiUnavailable: false,
    pastEnd: false,
    filtered: false,
    rows: [],
  };

  it('returns a NON-EMPTY, sorted, deduplicated set — ⛔ not armed-but-empty', () => {
    expect(sahyogDriveSurfaceFieldIds(model)).toEqual([
      'close_of_cycle_framing',
      'confirmed_contribution_count',
      'deceased_member_name',
      'district',
      'drive_closed_at',
      // ⭐ Story 11b.10 — the per-row inbound link. `pii_tier: 3` (an ADDRESS, ⛔ not a person), so
      // it adds ⛔ no Tier-1 field and needs ⛔ no allowlist entry.
      'drive_href',
      'drive_status',
      'pool_canonical_identifier',
      'pool_letter_code',
    ]);
  });

  it('⭐ declares `deceased_member_name` even on a page where EVERY name is withheld', () => {
    // ⛔ Deriving row ids from `rows[0]` would make the classified field set depend on whether the
    // first family happened to consent — so a page of entirely unconsented drives would silently
    // declare a SMALLER set and the leak leg would go partly vacuous exactly where nobody looks.
    const noRows = sahyogDriveSurfaceFieldIds({ ...model, rows: [], hasDrives: false });
    expect(noRows).toContain('deceased_member_name');
  });

  it('THROWS on a model key with no mapping — a field was rendered and never classified', () => {
    expect(() =>
      deriveFieldIds({ ...model, sneakyNewField: 'x' }, SAHYOG_DRIVE_FIELD_IDS),
    ).toThrow(/no declared matrix field id/);
  });

  it('THROWS on a mapping entry with no model key — the classification went stale', () => {
    expect(() =>
      deriveFieldIds(model, { ...SAHYOG_DRIVE_FIELD_IDS, removedField: 'removed_field' }),
    ).toThrow(/does not have/);
  });

  it('every ROW field id is snake_case and mapped BY HAND — ⛔ never mechanically converted', () => {
    for (const id of Object.values(SAHYOG_DRIVE_ROW_FIELD_IDS)) {
      if (id === null) continue;
      expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});

describe('column visibility — the `<th>`/`<td>` pair is suppressed TOGETHER', () => {
  it('drops a column entirely when the matrix says it is not visible', () => {
    const cols = visibleSahyogColumns(labels, (fieldId) => fieldId !== 'deceased_member_name');
    expect(cols.map((c) => c.fieldId)).not.toContain('deceased_member_name');
    // ⭐ The header goes WITH the cell. An unconditional pair emits an empty <td> under a labelled
    // header — the omission announcing itself through the table even though <MatrixField> stayed
    // silent. That is the 11a.3 finding, inherited rather than rediscovered.
    expect(cols.every((c) => c.headerLabel !== labels.columnName)).toBe(true);
  });

  it('every declared column id is one the matrix derivation also declares', () => {
    const declared = new Set(sahyogDriveSurfaceFieldIds({
      hasDrives: true, page: 1, limit: 25, apiUnavailable: false, pastEnd: false,
      filtered: false, rows: [],
    }));
    for (const col of visibleSahyogColumns(labels, allVisible)) {
      expect(declared.has(col.fieldId)).toBe(true);
    }
  });
});
