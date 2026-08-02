// resolveVisibleBanners — Story 10.9 (AC5, AC9, Decision 3). Pure, DB-free.
//
// The three properties this file exists to pin:
//   1. TWO INDEPENDENT LANES — a winning popup never suppresses the banner and vice-versa.
//   2. The comparator is TOTAL — severity, then valid_from DESC, then banner_id ASC, each key
//      exercised in isolation so a dropped key flips a test.
//   3. REPLAYABILITY — shuffling the input N times yields an IDENTICAL result (the Story 10.1
//      routing-determinism / Story 4.6 rule-order precedent). This is the revert-sanity teeth: strip
//      the banner_id tiebreak and the shuffle test goes red.

import { describe, expect, it } from 'vitest';

import {
  BANNER_SEVERITY_ORDER,
  type BannerCandidate,
  bannerSeverityRank,
  compareBannerPrecedence,
  resolveVisibleBanners,
} from '../src/banners/precedence.js';
import { BANNER_SEVERITIES, type BannerSeverity } from '../src/banners/enums.js';

const NOW = new Date('2026-08-04T12:00:00.000Z');
const FROM = new Date('2026-08-01T00:00:00.000Z');
const UNTIL = new Date('2026-08-08T00:00:00.000Z');

interface CandidateOverrides {
  id: string;
  severity?: BannerSeverity;
  displayMode?: BannerCandidate['displayMode'];
  validFrom?: Date;
  validUntil?: Date;
  status?: BannerCandidate['status'];
}

function candidate(o: CandidateOverrides): BannerCandidate {
  return {
    bannerId: o.id,
    severity: o.severity ?? 'info',
    displayMode: o.displayMode ?? 'banner',
    validFrom: o.validFrom ?? FROM,
    validUntil: o.validUntil ?? UNTIL,
    status: o.status ?? 'published',
  };
}

/** A deterministic (seeded) shuffle so a failure is reproducible, not a flake. */
function seededShuffle<T>(input: readonly T[], seed: number): T[] {
  const out = [...input];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

describe('bannerSeverityRank', () => {
  it('ranks critical ≻ warning ≻ info (most severe FIRST = lowest rank)', () => {
    expect(bannerSeverityRank('critical')).toBeLessThan(bannerSeverityRank('warning'));
    expect(bannerSeverityRank('warning')).toBeLessThan(bannerSeverityRank('info'));
  });

  it('covers every severity in the DB enum — no value falls off the order', () => {
    for (const s of BANNER_SEVERITIES) {
      expect(BANNER_SEVERITY_ORDER).toContain(s);
      expect(bannerSeverityRank(s)).toBeLessThan(BANNER_SEVERITY_ORDER.length);
    }
  });

  it('fails SOFT on an out-of-vocabulary severity — ties for last rank rather than throwing', () => {
    // Simulates enum drift: a severity value the wire/DB accepts but this order hasn't been updated
    // for yet. The whole point of the fail-soft design is that a resolver never takes down a member
    // read over it — an unranked severity must lose to every real one, never win or crash.
    const drifted = 'urgent' as unknown as (typeof BANNER_SEVERITIES)[number];
    expect(bannerSeverityRank(drifted)).toBe(BANNER_SEVERITY_ORDER.length);
    expect(bannerSeverityRank(drifted)).toBeGreaterThan(bannerSeverityRank('info'));
  });
});

describe('resolveVisibleBanners — an out-of-vocabulary severity never wins (fail-soft, AC5)', () => {
  it('a drifted-severity candidate loses to every real severity, even `info`', () => {
    const drifted = candidate({
      id: '99999999-0000-0000-0000-000000000001',
      severity: 'urgent' as unknown as BannerSeverity,
    });
    const info = candidate({ id: '11111111-0000-0000-0000-000000000001', severity: 'info' });
    const result = resolveVisibleBanners([drifted, info], NOW);
    expect(result.banner?.bannerId).toBe(info.bannerId);
  });
});

describe('compareBannerPrecedence — each comparator key in isolation', () => {
  it('key 1: severity decides first', () => {
    const critical = candidate({ id: 'zzzzzzzz-0000-0000-0000-000000000001', severity: 'critical' });
    const info = candidate({ id: 'aaaaaaaa-0000-0000-0000-000000000001', severity: 'info' });
    // `critical` wins despite losing BOTH later keys (identical validFrom, larger id).
    expect(compareBannerPrecedence(critical, info)).toBeLessThan(0);
  });

  it('key 2: at equal severity, the MOST RECENTLY activated valid_from wins', () => {
    const older = candidate({
      id: 'aaaaaaaa-0000-0000-0000-000000000001',
      validFrom: new Date('2026-08-01T00:00:00.000Z'),
    });
    const newer = candidate({
      id: 'zzzzzzzz-0000-0000-0000-000000000001',
      validFrom: new Date('2026-08-03T00:00:00.000Z'),
    });
    expect(compareBannerPrecedence(newer, older)).toBeLessThan(0);
  });

  it('key 3: at equal severity AND equal valid_from, the lowest banner_id wins', () => {
    const a = candidate({ id: '11111111-0000-0000-0000-000000000001' });
    const b = candidate({ id: '22222222-0000-0000-0000-000000000001' });
    expect(compareBannerPrecedence(a, b)).toBeLessThan(0);
    expect(compareBannerPrecedence(b, a)).toBeGreaterThan(0);
  });

  it('is a TOTAL order — two distinct rows never compare equal', () => {
    const rows = [
      candidate({ id: '11111111-0000-0000-0000-000000000001' }),
      candidate({ id: '22222222-0000-0000-0000-000000000001' }),
      candidate({ id: '33333333-0000-0000-0000-000000000001', severity: 'critical' }),
    ];
    for (const a of rows) {
      for (const b of rows) {
        if (a.bannerId === b.bannerId) continue;
        expect(compareBannerPrecedence(a, b)).not.toBe(0);
      }
    }
  });
});

describe('resolveVisibleBanners — window + status filtering', () => {
  it('excludes a draft, a retracted row, a not-yet-started row and an expired row', () => {
    const live = candidate({ id: '11111111-0000-0000-0000-000000000001' });
    const result = resolveVisibleBanners(
      [
        live,
        candidate({ id: '22222222-0000-0000-0000-000000000001', status: 'draft', severity: 'critical' }),
        candidate({ id: '33333333-0000-0000-0000-000000000001', status: 'retracted', severity: 'critical' }),
        candidate({
          id: '44444444-0000-0000-0000-000000000001',
          severity: 'critical',
          validFrom: new Date('2026-09-01T00:00:00.000Z'),
          validUntil: new Date('2026-09-08T00:00:00.000Z'),
        }),
        candidate({
          id: '55555555-0000-0000-0000-000000000001',
          severity: 'critical',
          validFrom: new Date('2026-07-01T00:00:00.000Z'),
          validUntil: new Date('2026-07-08T00:00:00.000Z'),
        }),
      ],
      NOW,
    );
    // Every `critical` row above is out of the window or not published — the plain `info` row wins.
    expect(result.banner?.bannerId).toBe(live.bannerId);
  });

  it('returns { banner: null, popup: null } for an empty candidate set', () => {
    expect(resolveVisibleBanners([], NOW)).toEqual({ banner: null, popup: null });
  });
});

describe('resolveVisibleBanners — TWO INDEPENDENT LANES (AC5)', () => {
  it('returns a banner AND a popup simultaneously — neither suppresses the other', () => {
    const strip = candidate({ id: '11111111-0000-0000-0000-000000000001', displayMode: 'banner' });
    const modal = candidate({ id: '22222222-0000-0000-0000-000000000001', displayMode: 'popup' });
    const result = resolveVisibleBanners([strip, modal], NOW);
    expect(result.banner?.bannerId).toBe(strip.bannerId);
    expect(result.popup?.bannerId).toBe(modal.bannerId);
  });

  it('a CRITICAL popup does not suppress a mere INFO banner (the lanes do not compete)', () => {
    const infoStrip = candidate({
      id: '11111111-0000-0000-0000-000000000001',
      displayMode: 'banner',
      severity: 'info',
    });
    const criticalModal = candidate({
      id: '22222222-0000-0000-0000-000000000001',
      displayMode: 'popup',
      severity: 'critical',
    });
    const result = resolveVisibleBanners([infoStrip, criticalModal], NOW);
    expect(result.banner?.bannerId).toBe(infoStrip.bannerId);
    expect(result.popup?.bannerId).toBe(criticalModal.bannerId);
  });

  it('yields at most ONE per lane even with many candidates in each', () => {
    const rows = [
      candidate({ id: '11111111-0000-0000-0000-000000000001', displayMode: 'banner' }),
      candidate({ id: '22222222-0000-0000-0000-000000000001', displayMode: 'banner', severity: 'warning' }),
      candidate({ id: '33333333-0000-0000-0000-000000000001', displayMode: 'popup' }),
      candidate({ id: '44444444-0000-0000-0000-000000000001', displayMode: 'popup', severity: 'critical' }),
    ];
    const result = resolveVisibleBanners(rows, NOW);
    expect(result.banner?.bannerId).toBe('22222222-0000-0000-0000-000000000001');
    expect(result.popup?.bannerId).toBe('44444444-0000-0000-0000-000000000001');
  });

  it('an empty lane resolves to null while the other still wins', () => {
    const onlyPopup = candidate({ id: '11111111-0000-0000-0000-000000000001', displayMode: 'popup' });
    const result = resolveVisibleBanners([onlyPopup], NOW);
    expect(result.banner).toBeNull();
    expect(result.popup?.bannerId).toBe(onlyPopup.bannerId);
  });
});

describe('resolveVisibleBanners — the scenario the adversarial review flagged (review-adversarial.md:238)', () => {
  it('an urgent helpline redirect (critical) beats a scheduled-maintenance notice (info)', () => {
    const maintenance = candidate({
      id: '11111111-0000-0000-0000-000000000001',
      severity: 'info',
      validFrom: new Date('2026-08-03T00:00:00.000Z'), // more recent — loses on severity anyway
    });
    const helpline = candidate({
      id: '99999999-0000-0000-0000-000000000001',
      severity: 'critical',
      validFrom: new Date('2026-08-01T00:00:00.000Z'),
    });
    expect(resolveVisibleBanners([maintenance, helpline], NOW).banner?.bannerId).toBe(helpline.bannerId);
  });
});

describe('resolveVisibleBanners — REPLAYABILITY (the AC5 determinism teeth)', () => {
  // A deliberately tie-heavy set: several rows share severity AND valid_from, so the outcome rests
  // entirely on the banner_id tiebreak. Remove that tiebreak and this suite goes red.
  const tieHeavy: BannerCandidate[] = [
    candidate({ id: '55555555-0000-0000-0000-000000000001', severity: 'warning' }),
    candidate({ id: '22222222-0000-0000-0000-000000000001', severity: 'warning' }),
    candidate({ id: '88888888-0000-0000-0000-000000000001', severity: 'warning' }),
    candidate({ id: '11111111-0000-0000-0000-000000000001', severity: 'warning' }),
    candidate({ id: '77777777-0000-0000-0000-000000000001', severity: 'warning', displayMode: 'popup' }),
    candidate({ id: '33333333-0000-0000-0000-000000000001', severity: 'warning', displayMode: 'popup' }),
    candidate({ id: '99999999-0000-0000-0000-000000000001', severity: 'warning', displayMode: 'popup' }),
  ];

  it('yields an IDENTICAL result across 200 shuffles of the same candidate set', () => {
    const expected = resolveVisibleBanners(tieHeavy, NOW);
    // Pinned explicitly: the lowest id in each lane wins when severity + valid_from tie.
    expect(expected.banner?.bannerId).toBe('11111111-0000-0000-0000-000000000001');
    expect(expected.popup?.bannerId).toBe('33333333-0000-0000-0000-000000000001');

    for (let seed = 1; seed <= 200; seed++) {
      const result = resolveVisibleBanners(seededShuffle(tieHeavy, seed), NOW);
      expect(result.banner?.bannerId).toBe(expected.banner?.bannerId);
      expect(result.popup?.bannerId).toBe(expected.popup?.bannerId);
    }
  });

  it('is insensitive to a CLOCK TIE — two rows activating at the same instant still resolve totally', () => {
    const sameInstant = [
      candidate({ id: 'bbbbbbbb-0000-0000-0000-000000000001', validFrom: FROM }),
      candidate({ id: 'aaaaaaaa-0000-0000-0000-000000000001', validFrom: FROM }),
    ];
    expect(resolveVisibleBanners(sameInstant, NOW).banner?.bannerId).toBe('aaaaaaaa-0000-0000-0000-000000000001');
    expect(resolveVisibleBanners([...sameInstant].reverse(), NOW).banner?.bannerId).toBe(
      'aaaaaaaa-0000-0000-0000-000000000001',
    );
  });

  it('does not mutate its input (a resolver must be safe to call on a shared candidate array)', () => {
    const input = [...tieHeavy];
    const before = input.map((c) => c.bannerId);
    resolveVisibleBanners(input, NOW);
    expect(input.map((c) => c.bannerId)).toEqual(before);
  });
});
