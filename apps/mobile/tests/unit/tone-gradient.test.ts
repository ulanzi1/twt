// The 15-day tone-gradient selector — DB-free unit suite (Story 8.2, Task 7; AC3).
//
// The gradient is a PURE function of the server's days-remaining (via day-of-cycle), so it is
// deterministic and testable without a device (AC3). Boundary behavior IS the contract — tested at the
// story's {0, 10, 11, 13, 14, 15} values + clamp. Runs under the mobile app's node-only vitest config
// (tests/unit/**) — the toneGradient module is pure (no RN/tamagui imports), so it imports cleanly.

import { describe, expect, it } from 'vitest'

import {
  CYCLE_WINDOW_DAYS,
  cycleDayFromDaysRemaining,
  selectToneGradientKey,
  toneKeyForDaysRemaining,
} from '../../components/active-contribution/toneGradient'

describe('selectToneGradientKey — day-of-cycle boundaries (AC3)', () => {
  // Day 0–10 → calm · 11–13 → factual · 14+ → closing (gently urgent). Boundaries at 10|11 and 13|14.
  const cases: Array<[number, ReturnType<typeof selectToneGradientKey>]> = [
    [0, 'calm'],
    [10, 'calm'],
    [11, 'factual'],
    [13, 'factual'],
    [14, 'closing'],
    [15, 'closing'],
  ]
  for (const [cycleDay, expected] of cases) {
    it(`cycleDay ${cycleDay} → ${expected}`, () => {
      expect(selectToneGradientKey(cycleDay)).toBe(expected)
    })
  }

  it('clamps a negative cycle-day to calm', () => {
    expect(selectToneGradientKey(-1)).toBe('calm')
    expect(selectToneGradientKey(-100)).toBe('calm')
  })

  it('a cycle-day beyond the window stays closing (gently urgent, never a crash)', () => {
    expect(selectToneGradientKey(20)).toBe('closing')
  })
})

describe('cycleDayFromDaysRemaining — pure days-remaining → day-of-cycle', () => {
  it('day 0 at the open (15 days remaining), day 15 at the close (0 remaining)', () => {
    expect(cycleDayFromDaysRemaining(15)).toBe(0)
    expect(cycleDayFromDaysRemaining(0)).toBe(15)
    expect(cycleDayFromDaysRemaining(5)).toBe(10)
  })

  it('clamps to [0, window] for stale / over-run days-remaining', () => {
    expect(cycleDayFromDaysRemaining(999)).toBe(0)
    expect(cycleDayFromDaysRemaining(-5)).toBe(CYCLE_WINDOW_DAYS)
  })
})

describe('toneKeyForDaysRemaining — the composition the card uses (UX-correct)', () => {
  it('lots of time remaining → calm; the final day(s) → closing', () => {
    expect(toneKeyForDaysRemaining(15)).toBe('calm') // just opened
    expect(toneKeyForDaysRemaining(5)).toBe('calm') // day 10
    expect(toneKeyForDaysRemaining(4)).toBe('factual') // day 11
    expect(toneKeyForDaysRemaining(2)).toBe('factual') // day 13
    expect(toneKeyForDaysRemaining(1)).toBe('closing') // day 14
    expect(toneKeyForDaysRemaining(0)).toBe('closing') // day 15 (last day)
  })
})
