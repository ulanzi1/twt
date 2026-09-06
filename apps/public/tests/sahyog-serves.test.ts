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
  closedAt: '2026-08-01T00:00:00.000Z',
  district: 'Lucknow',
  confirmedContributionCount: 12,
  fundingOutcome: 'fully_funded',
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
});

describe('⛔⛔ the drive page SERVES for every ruled wire token — ⛔ never its OUTAGE arm', () => {
  it('the derived enum is non-empty and is the CONTRACT’s, ⛔ not a local copy', () => {
    expect(PublicSahyogVivranStatus.options.length).toBeGreaterThan(0);
  });

  for (const driveStatus of PublicSahyogVivranStatus.options) {
    it(`\`${driveStatus}\` passes the runtime literal-set guard and yields a real drive`, async () => {
      vi.stubGlobal('fetch', async () => json({ drive: vivranDrive(driveStatus) }));
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
