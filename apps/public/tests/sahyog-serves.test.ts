// ⛔⛔ THE PAGES STILL **SERVE** AFTER THE STAGE RENAME — Story 11b.12 (AC1).
//
// ── ⚠⛔ THE DEFECT CLASS THIS EXISTS FOR, AND WHY NOTHING ELSE CATCHES IT ────────────────────────
// Both public pages validate the drive status against a **LITERAL SET** at runtime, inside a
// hand-written narrowing over a `Record<string, unknown>` parsed from the API body:
//
//   `sahyog.server.ts`        — `(r['status'] === 'closed' || r['status'] === 'verified')`
//   `sahyog-vivran.server.ts` — `r['driveStatus'] !== 'live' && … !== 'closed' && … !== 'verified'`
//
// ⛔⛔ THE TYPECHECK CANNOT SEE EITHER OF THEM. There is ⛔ no enum type in scope, so a literal that
// can NEVER match compiles perfectly clean. And the failure arm is ⛔ **not** a crash and ⛔ not a
// blank cell — it is the page's **OUTAGE** state. ⇒ if a future rename moves the wire enum and
// misses `sahyog.server.ts`, **every row fails validation and `/sahyog` serves "unavailable" to
// 100% of visitors**, with a green typecheck, a green unit suite AND a green copy suite.
//
// ⭐ SO THIS FILE ASSERTS THE ONE PROPERTY THOSE THREE CANNOT: fed a body carrying **every** member
// of the shipped wire enum, each page returns `ok` and a REAL ROW — ⛔ never `bad_response`.
// ⚠⛔ AND THE ENUM IS **DERIVED FROM THE CONTRACT**, ⛔ never hand-listed here: a hand-listed tuple
// would drift the same way the guard did, and this test would then pass through the very defect it
// exists to catch.

import { PublicSahyogDriveStatus, PublicSahyogVivranStatus } from '@twt/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchSahyogDrive } from '../src/lib/sahyog.server.js';
import { fetchSahyogVivran } from '../src/lib/sahyog-vivran.server.js';

afterEach(() => {
  vi.restoreAllMocks();
});

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const driveRow = (status: string) => ({
  deceasedMemberName: 'Rajesh Kumar Sharma',
  poolLetterCode: 'A',
  poolCanonicalIdentifier: 'P-2026-08-001',
  publicToken: 'tok-P-2026-08-001',
  status,
  // ⚠⛔ SHAPE VARIES BY STATUS — ⛔ not hardcoded (Review finding, 2026-09-08). A real `live` row
  // has `closedAt: null` AND `fundingOutcome: null` (asserted in the domain + API specs); a fixture
  // that hardcodes a closed shape for every status never runs a REAL live row through
  // `isSahyogDriveResponse`, which is exactly the shape Story 11b.14 added to this surface.
  closedAt: status === 'live' ? null : '2026-08-01T00:00:00.000Z',
  district: 'Lucknow',
  confirmedContributionCount: 12,
  // ⭐⭐ STORY 11b.14's REQUIRED FIELDS — ⛔ the fixture must model a REAL API row, or this suite
  // asserts the guard against a body the API could never send. ⚠ These were missing until the
  // 2026-09-07 review widened `isSahyogDriveResponse` to check them; ⭐ the suite FAILED FIRST,
  // exactly as `sahyog.server.ts`'s own comment predicts.
  // ⛔ `driveTargetInr` is deliberately ABSENT, ⛔ never `null` — the 11b.11 shape.
  amountRaisedInr: 1200,
  // ⚠⛔⛔ **STATUS-DEPENDENT — `2026-09-08-207` cl.1** (Review finding, THIRD pass 2026-09-08). The
  // 2026-09-08 hunk taught this fixture to vary `closedAt` and `fundingOutcome` by status under the
  // banner *"the fixture must model a REAL API row"* — and left `confirmedPercentage: 12` hardcoded
  // ONE LINE ABOVE, in the same commit that made a number on a `closed`/`verified` row IMPOSSIBLE.
  // ⇒ ⛔ NOTHING in the repository passed `confirmedPercentage: null` through
  // `isSahyogDriveResponse`, which is the value EVERY archived row now carries. Had the guard been
  // written without its `=== null` arm, `/sahyog` would have served the OUTAGE page to every visitor
  // of every Pariwar holding a closed drive — with a green typecheck and three green suites.
  confirmedPercentage: status === 'live' ? 12 : null,
  nomineeName: 'Sunita Devi Sharma',
  fundingOutcome: status === 'live' ? null : 'fully_funded',
});

const vivranDrive = (driveStatus: string) => ({
  poolLetterCode: 'C',
  poolCanonicalIdentifier: 'P-2026-09-003',
  driveStatus,
  closedAt: driveStatus === 'live' ? null : '2026-09-01T18:45:00.000Z',
  district: 'Lucknow',
  confirmedContributionCount: 137,
  fundingOutcome: driveStatus === 'live' ? null : 'fully_funded',
  appealReversal: null,
  nomineeBankAccounts: [{ accountRank: 1, accountHolderName: 'A Holder' }],
  // ⭐⭐ STORY 11b.3b's TWO DRIVE-LEVEL FIELDS — ⛔ the fixture must model a REAL API row, same
  // discipline as `driveRow` above (Review finding, 2026-09-15: this fixture was never updated for
  // either, which masked `isSahyogVivranResponse` never checking them at all).
  deceasedMemberName: null,
  amountRaisedInr: 13700,
});

// ⭐⭐ STORY 11b.3b's paginated contributor ENVELOPE, alongside `drive` — ⛔ never inside it
// (Review finding, 2026-09-15, same fixture-drift class as `vivranDrive`'s two fields above).
const vivranEnvelope = (driveStatus: string) => ({
  drive: vivranDrive(driveStatus),
  items: [{ name: 'Sunita Devi' }],
  page: 1,
  limit: 50,
  total: 1,
});

describe('⛔⛔ /sahyog SERVES ROWS for every ruled wire token — ⛔ never its OUTAGE arm', () => {
  // ⛔ NON-VACUOUS: the enum must actually have members, or the loop below asserts nothing.
  it('the derived enum is non-empty and is the CONTRACT’s, ⛔ not a local copy', () => {
    expect(PublicSahyogDriveStatus.options.length).toBeGreaterThan(0);
  });

  for (const status of PublicSahyogDriveStatus.options) {
    it(`\`${status}\` passes the runtime literal-set guard and yields a real row`, async () => {
      vi.stubGlobal('fetch', async () =>
        json({ items: [driveRow(status)], page: 1, limit: 25, total: 1 }),
      );
      const res = await fetchSahyogDrive({ page: 1, limit: 25, forwardedFor: null });
      // ⛔ `bad_response` here IS the outage page. The message names the cause, because the
      // symptom (an "unavailable" index) looks nothing like the cause (a stale string literal).
      expect(
        res.ok,
        `\`${status}\` is in PublicSahyogDriveStatus but sahyog.server.ts's literal-set guard ` +
          `REJECTED it ⇒ /sahyog would serve its OUTAGE page to every visitor. The guard and the ` +
          `enum have drifted — fix the literal set, ⛔ do not widen this test.`,
      ).toBe(true);
      if (res.ok) {
        expect(res.data.items).toHaveLength(1);
        expect(res.data.items[0]?.status).toBe(status);
      }
    });
  }

  it('⛔ still REJECTS a retired token — the guard is ⛔ not merely permissive', async () => {
    // ⭐ Without this the test above would pass against a guard that accepted anything at all.
    vi.stubGlobal('fetch', async () =>
      json({ items: [driveRow('active')], page: 1, limit: 25, total: 1 }),
    );
    expect((await fetchSahyogDrive({ page: 1, limit: 25, forwardedFor: null })).ok).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────────────────────────────
  // ⭐⭐ `2026-09-08-207` cl.1 — THE STAGE⇄NULLABILITY PAIRING, BOTH DIRECTIONS.
  // ⚠⛔ Added in the THIRD review pass (2026-09-08): the cl.1 patch landed with ⛔ NO test anywhere
  // in the repository passing `confirmedPercentage: null` through this guard, on a ruling whose
  // failure arm is `/sahyog` serving its OUTAGE page to 100% of visitors.
  // ────────────────────────────────────────────────────────────────────────────────────────────
  it('⭐ an ARCHIVED row carrying `confirmedPercentage: null` SERVES — ⛔ never the outage arm', async () => {
    for (const status of ['closed', 'verified']) {
      vi.stubGlobal('fetch', async () =>
        json({ items: [driveRow(status)], page: 1, limit: 25, total: 1 }),
      );
      const res = await fetchSahyogDrive({ page: 1, limit: 25, forwardedFor: null });
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.items[0]?.confirmedPercentage).toBeNull();
    }
  });

  it('⛔⛔ a `live` row with a NULL percentage is REJECTED — the ruling is CONDITIONAL', async () => {
    // ⚠⛔ cl.1 reads *"`null` UNLESS the drive is `live`"*. A guard implementing only the
    // unconditional half accepted a live row with `null`, and that row is ⛔ not an outage — it is
    // worse: the bar and the printed figure vanish while the लक्ष्य `<p>`, an independently-gated
    // SIBLING in the same `<td>`, survives ⇒ *"Expected: ₹ 8 lakh"* with ⛔ no bar beside it, the
    // bare-target framing `2026-09-04-189` cl.2(c) resolved POOL-REALITY #2 by making INVISIBLE.
    vi.stubGlobal('fetch', async () =>
      json({
        items: [{ ...driveRow('live'), confirmedPercentage: null }],
        page: 1,
        limit: 25,
        total: 1,
      }),
    );
    expect((await fetchSahyogDrive({ page: 1, limit: 25, forwardedFor: null })).ok).toBe(false);
  });

  it('⭐⭐ an ARCHIVED row carrying a NUMBER is TOLERATED — ⛔ THE DEPLOY ESCAPE CLAUSE', async () => {
    // ⛔⛔ **THIS TEST WAS INVERTED ON 2026-09-08 (FOURTH review pass), AND THE INVERSION IS THE
    // POINT.** ⭐ It previously asserted REJECTION, and that assertion was the disproof of the
    // deploy-order record written in the same commit.
    // ⚠ A **pre-cl.1 `apps/api`** emits `confirmedPercentage` UNCONDITIONALLY
    // (`64510a7b:packages/domain/src/pool/public-read.ts:1041`) ⇒ a strict `=== null` here sent a
    // newer `apps/public` running against an older API to the OUTAGE page for **100% of visitors**
    // of every Pariwar holding a closed drive — ⛔ on a body that renders perfectly, because
    // `toDisplayRow` already blanks the figure off-Live.
    // ⭐ BigDev's ruling turns on exactly this: *"…unless the public consumer handles BOTH shapes."*
    // ⇒ tolerance here is what keeps that escape TRUE, and it is also `-207` cl.1's own letter —
    // *"the validator **accepts the `null`**"*, ⛔ never *"rejects the number"*.
    // ⛔ DO ⛔ NOT "tighten" this back to a rejection.
    for (const status of ['closed', 'verified']) {
      vi.stubGlobal('fetch', async () =>
        json({
          items: [{ ...driveRow(status), confirmedPercentage: 82 }],
          page: 1,
          limit: 25,
          total: 1,
        }),
      );
      const res = await fetchSahyogDrive({ page: 1, limit: 25, forwardedFor: null });
      expect(res.ok).toBe(true);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────────────────────
  // ⭐⭐ THE NUMERIC BOUNDS.
  // ⚠⛔ **HEADER CORRECTED 2026-09-08 (FOURTH pass) — the prior text overstated its own coverage 4×.**
  // It read *"⛔ every one of these previously PASSED the guard and then THREW inside
  // `buildSahyogView`"*. ⭐ Checked against the pre-image: the non-integers, the out-of-range
  // percentages, the zero target and the whitespace district were **ALL already rejected** by guards
  // predating the third pass (`driveTargetInr: 0` by the pre-existing `> 0`, ⛔ not by any new bound).
  // ⇒ ⭐ this table is a REGRESSION FENCE over the whole numeric surface, ⛔ not a list of newly
  // closed holes; the genuinely new arms are the two upper bounds and the count ceiling, and those
  // are pinned by the DISCRIMINATING cases below rather than here.
  // ────────────────────────────────────────────────────────────────────────────────────────────
  it.each([
    ['a non-integer count', { confirmedContributionCount: 12.5 }],
    ['a non-integer amount', { amountRaisedInr: 1200.5 }],
    ['an amount past the formatter’s safe-integer bound', { amountRaisedInr: 1e15 }],
    ['a negative percentage', { status: 'live', confirmedPercentage: -5 }],
    ['a percentage over 100', { status: 'live', confirmedPercentage: 101 }],
    ['a zero target', { driveTargetInr: 0 }],
    ['a target past the formatter’s safe-integer bound', { driveTargetInr: 1e15 }],
    ['a whitespace-only district', { district: '   ' }],
    // ⭐⭐ THE DISCRIMINATING VALUES — ⛔ these are the ones that pin the bounds' VALUE, ⛔ not merely
    // their existence. `1e15` above is rejected by the OLD `1e15` bound too; `1e14` is ⛔ NOT.
    ['an amount at 1e14 — ⭐ the value the OLD `1e15` bound ACCEPTED', { amountRaisedInr: 1e14 }],
    ['a target at 1e14 — ⭐ same discriminator, target side', { driveTargetInr: 1e14 }],
    // ⭐ The count ceiling: `1e21` passed `Number.isInteger` and rendered `"1e,+21"` through
    // `formatCount` — ⛔ garbage in ratified copy, ⛔ never a throw.
    ['a count past the render ceiling', { confirmedContributionCount: 1e21 }],
  ])('⛔ %s falls to the OUTAGE arm', async (_label, patch) => {
    vi.stubGlobal('fetch', async () =>
      json({ items: [{ ...driveRow('live'), ...patch }], page: 1, limit: 25, total: 1 }),
    );
    expect((await fetchSahyogDrive({ page: 1, limit: 25, forwardedFor: null })).ok).toBe(false);
  });
});

describe('⛔⛔ the drive page SERVES for every ruled wire token — ⛔ never its OUTAGE arm', () => {
  it('the derived enum is non-empty and is the CONTRACT’s, ⛔ not a local copy', () => {
    expect(PublicSahyogVivranStatus.options.length).toBeGreaterThan(0);
  });

  for (const driveStatus of PublicSahyogVivranStatus.options) {
    it(`\`${driveStatus}\` passes the runtime literal-set guard and yields a real drive`, async () => {
      vi.stubGlobal('fetch', async () => json(vivranEnvelope(driveStatus)));
      const res = await fetchSahyogVivran({ driveToken: 'P-2026-09-003', forwardedFor: null });
      expect(
        res.ok,
        `\`${driveStatus}\` is in PublicSahyogVivranStatus but sahyog-vivran.server.ts's ` +
          `literal-set guard REJECTED it ⇒ the drive page would serve its OUTAGE state. Fix the ` +
          `literal set, ⛔ do not widen this test.`,
      ).toBe(true);
      if (res.ok) expect(res.data.drive.driveStatus).toBe(driveStatus);
    });
  }

  it('⛔ still REJECTS a retired token — the guard is ⛔ not merely permissive', async () => {
    vi.stubGlobal('fetch', async () => json({ drive: vivranDrive('collecting') }));
    expect((await fetchSahyogVivran({ driveToken: 'P-1', forwardedFor: null })).ok).toBe(false);
  });
});
