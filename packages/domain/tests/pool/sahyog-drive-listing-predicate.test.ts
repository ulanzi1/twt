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
    expect(driveConfirmedPercentage(2, 3)).toBe(67);
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
    expect(Math.round((amount / (target as number)) * 100)).toBe(
      driveConfirmedPercentage(confirmed, assigned),
    );
  });
});
