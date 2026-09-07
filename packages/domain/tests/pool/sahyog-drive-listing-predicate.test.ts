// ⭐ THE PUBLIC INDEX'S LISTING PREDICATE ADMITS `live` — Story 11b.14 (AC1, Task 2; Trap 6).
//
// ⭐⭐ THIS FILE EXISTS BECAUSE THE WIDENING IS **FIVE ARTEFACTS**, ⛔ NOT ONE, AND ⛔ TWO OF THEM
// FAIL SILENTLY. Three of the five live in this package and are pinned here; the other two —
// `apps/public/src/lib/sahyog.server.ts`'s hand-typed literal-set guard and
// `sahyog-render.ts`'s partition — are pinned in `apps/public/tests/`, because a green typecheck
// says nothing about either.
//
// ⚠⛔ THE RULING. `2026-09-04-189` cl.2 — *"(Q2) — **YES: A COLLECTING DRIVE IS LISTED**"* — and
// **FR-76**, a standing requirement since the PRD (*"Active page near-real-time during live
// alert"*) that was cited in ⛔ ZERO implementation records until `2026-09-04-187` found it.
// ⛔ Recorded at `2026-09-07-204`. ⛔ `spawned` remains a PURE DENY.

import { describe, expect, it } from 'vitest';

import {
  SAHYOG_DRIVE_STATUSES,
  SAHYOG_DRIVE_VISIBLE_POOL_STATES,
  driveConfirmedPercentage,
  publicStatusForPoolState,
  resolveDriveTargetForPublic,
} from '../../src/pool/public-read.js';
import { POOL_LIFECYCLE_STATES } from '../../src/pool/state.js';

describe('the index listing predicate (AC1, `-189` cl.2)', () => {
  it('⭐⭐ ADMITS `live` — the drive that is still collecting is LISTED', () => {
    expect([...SAHYOG_DRIVE_VISIBLE_POOL_STATES]).toContain('live');
  });

  it('⭐ keeps `closed` and `settled` — ⛔ the widening ADDS, it does ⛔ not replace', () => {
    expect([...SAHYOG_DRIVE_VISIBLE_POOL_STATES]).toContain('closed');
    expect([...SAHYOG_DRIVE_VISIBLE_POOL_STATES]).toContain('settled');
    expect(SAHYOG_DRIVE_VISIBLE_POOL_STATES).toHaveLength(3);
  });

  it('⛔⛔ `spawned` REMAINS EXCLUDED — a pool that never opened is ⛔ not a drive', () => {
    // ⚠ AC6: ⛔ no `spawned`. It is a PURE DENY on this surface and on the wire below.
    expect([...SAHYOG_DRIVE_VISIBLE_POOL_STATES]).not.toContain('spawned');
  });

  it('names only REAL lifecycle states — ⛔ a typo here would silently list nothing', () => {
    for (const s of SAHYOG_DRIVE_VISIBLE_POOL_STATES) {
      expect(POOL_LIFECYCLE_STATES).toContain(s);
    }
  });
});

describe('the public vocabulary and the state→token map (Trap 6, artefacts 2 and 3)', () => {
  it('⭐ the public wire carries THREE words — Live · Closed · Verified', () => {
    expect([...SAHYOG_DRIVE_STATUSES]).toEqual(['live', 'closed', 'verified']);
  });

  it('⛔⛔ the map is TOTAL over the visible set — ⛔ every listed state has a public word', () => {
    // ⭐ THIS IS THE COMPILE GATE STATED AS A RUNTIME PROPERTY. `PUBLIC_STATUS_BY_POOL_STATE` is a
    // `Record<SahyogDriveVisiblePoolState, SahyogDriveStatus>`, so widening the predicate without
    // minting a public word fails the TYPECHECK. ⚠ The typecheck cannot be asserted from a test,
    // so the same property is pinned here through the exported accessor.
    for (const s of SAHYOG_DRIVE_VISIBLE_POOL_STATES) {
      expect(SAHYOG_DRIVE_STATUSES).toContain(publicStatusForPoolState(s));
    }
  });

  it('⭐ `live` maps to `live`, and `settled` STILL maps to `verified`', () => {
    // ⚠ The map is now part-identity in TWO places. ⛔ That does ⛔ not make it deletable: `spawned`
    // is an internal state with ⛔ no public token at all, and the map is what proves it.
    expect(publicStatusForPoolState('live')).toBe('live');
    expect(publicStatusForPoolState('closed')).toBe('closed');
    expect(publicStatusForPoolState('settled')).toBe('verified');
  });

  it('⛔⛔ leaks ⛔ NO un-ruled internal lifecycle word — an ALLOW-list, ⛔ never a deny-list', () => {
    // ⭐ `2026-08-21-144` cl.8's property is *"no UN-RULED internal vocabulary crosses"*, ⛔ not
    // *"these particular strings never appear"*. `live` and `closed` are ruled public words
    // (`-190` cl.5 / `-191` cl.3 / `-193` cl.1) and deliberately sit on both sides.
    const ruled = new Set<string>(SAHYOG_DRIVE_STATUSES);
    for (const s of POOL_LIFECYCLE_STATES) {
      if ((SAHYOG_DRIVE_VISIBLE_POOL_STATES as readonly string[]).includes(s)) continue;
      expect(ruled.has(s)).toBe(false);
    }
  });
});

describe('the meter — a PURE function of the row (AC2, Task 3)', () => {
  // ⭐ The query itself is exercised by the live-DB spec; what is pinned here is the ARITHMETIC,
  // which is where the ruling actually lives.
  it('⭐⭐ the fill is `confirmedCount ÷ assignedCount`, as a whole percent', () => {
    expect(driveConfirmedPercentage(0, 100)).toBe(0);
    expect(driveConfirmedPercentage(50, 100)).toBe(50);
    expect(driveConfirmedPercentage(1, 3)).toBe(33);
    // ⚠⛔ **REVERSED BY THE NEVER-OVERSTATE FIX, 2026-09-07 — ⭐ the PRIOR text, kept:**
    //   > `expect(driveConfirmedPercentage(2, 3)).toBe(67);`
    // ⭐ 66.67% now TRUNCATES to 66. ⛔ The old value was `Math.round`, which also reached **100**
    // from 99.5% ⇒ a visually COMPLETE bar on a drive still collecting. ⛔ The bar must ⛔ never
    // overstate — the same posture `formatCurrencyShort` is ruled to take for the money figure,
    // and ⛔ the two may ⛔ not disagree on one row.
    expect(driveConfirmedPercentage(2, 3)).toBe(66);
  });

  it('⛔ a ZERO-ASSIGNEE pool is 0%, ⛔ never a divide-by-zero and ⛔ never an error', () => {
    expect(driveConfirmedPercentage(0, 0)).toBe(0);
  });

  it('⭐ it CLAMPS at 100 — ⛔ over-confirmation is an ordinary state here, ⛔ not a throw', () => {
    // ⚠ ⛔ This is ⛔ NOT the member card's `confirmedCount > rosterSize` THROW: that guards an
    // IMPOSSIBLE state on a roster the card owns. Here the two counts come from different queries
    // over the same frozen assignment set, and the public surface must ⛔ never 500 on a race.
    expect(driveConfirmedPercentage(150, 100)).toBe(100);
  });
});

describe('लक्ष्य — the DERIVED total, gated (AC2, `D4`, `D7`)', () => {
  it('⭐⭐ it is `assignedCount × fixedAmount` — ⛔ never a figure anyone typed', () => {
    expect(resolveDriveTargetForPublic(6485, 300, { revealToPublic: true })).toBe(1_945_500);
  });

  it('⛔⛔ DEFAULT OFF ⇒ ⛔ NOTHING — the ruled launch posture (`-190` cl.7(b))', () => {
    expect(resolveDriveTargetForPublic(6485, 300, { revealToPublic: false })).toBeNull();
  });

  it('⛔ a ZERO-ASSIGNEE pool yields ⛔ NOTHING even when REVEALED — ⭐ silence, ⛔ never `₹0`', () => {
    // ⭐ The same posture the read path already applies to `fundingOutcome`: no expectation was ever
    // set, so the surface SAYS NOTHING rather than saying something false.
    expect(resolveDriveTargetForPublic(0, 300, { revealToPublic: true })).toBeNull();
  });

  it('⭐⭐ THE IDENTITY — the bar and लक्ष्य ⛔ CANNOT disagree, at any value', () => {
    // `amount / लक्ष्य = (confirmed × fA) / (assigned × fA) = confirmed / assigned` = the bar.
    // ⚠ `D7` is DISSOLVED BY IDENTITY, ⛔ not ruled away. ⛔ Do ⛔ not add a reconciling guard.
    const assigned = 6485;
    const confirmed = 2518;
    const fixedAmount = 300;
    const target = resolveDriveTargetForPublic(assigned, fixedAmount, { revealToPublic: true });
    const amount = confirmed * fixedAmount;
    expect(target).not.toBeNull();
    // ⚠ **AMENDED 2026-09-07 — ⭐ the PRIOR line used `Math.round`:**
    //   > `expect(Math.round((amount / (target as number)) * 100)).toBe(`
    // ⛔ That is ⛔ not a change to the IDENTITY, which holds at every value and is what this test
    // exists to pin. ⭐ It is that the test's own arithmetic must use the **same truncation as the
    // function it checks** — with the two modes mixed, the test compared `round(38.8)` against
    // `floor(38.8)` and failed on a property that was never in doubt.
    expect(Math.floor((amount / (target as number)) * 100)).toBe(
      driveConfirmedPercentage(confirmed, assigned),
    );
  });
});

// ⭐⭐ TWO REVIEW FIXES ON THE SAME TWO FUNCTIONS — 2026-09-07.
describe('⭐⭐ the bar must ⛔ NEVER overstate, and लक्ष्य must ⛔ never be a zero', () => {
  it('⛔⛔ 199 of 200 is 99%, ⛔ NOT 100 — ⭐ `Math.round` painted a COMPLETE bar on a collecting drive', () => {
    expect(driveConfirmedPercentage(199, 200)).toBe(99);
    // ⭐ AND THE WHOLE ROUNDING BAND, ⛔ not one sample: everything from 99.5% up had reached 100.
    expect(driveConfirmedPercentage(999, 1000)).toBe(99);
    expect(driveConfirmedPercentage(1999, 2000)).toBe(99);
  });

  it('⭐⭐ 100 means COMPLETE and ⛔ nothing else — ⭐ reachable only when every assignment is confirmed', () => {
    expect(driveConfirmedPercentage(200, 200)).toBe(100);
    // ⚠ The clamp still covers the two-subquery race; ⛔ it is ⛔ not what produces 100 on a full drive.
    expect(driveConfirmedPercentage(201, 200)).toBe(100);
  });

  it('⛔ a NON-POSITIVE `fixed_amount` yields SILENCE — ⛔ never `0`, which fails `z.positive()` and 500s the route', () => {
    const revealed = { revealToPublic: true } as const;
    // ⚠ `pools.fixed_amount` carries ⛔ no positivity CHECK (migration 0115), so `0` is reachable.
    expect(resolveDriveTargetForPublic(3, 0, revealed)).toBeNull();
    expect(resolveDriveTargetForPublic(3, -1, revealed)).toBeNull();
    // ⭐ AND THE ORDINARY PATH IS UNTOUCHED.
    expect(resolveDriveTargetForPublic(3, 100, revealed)).toBe(300);
  });
});
