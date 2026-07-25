// Nominee Console view-resolver unit tests (Story 9.1, Task 5). Pins the PURE render decisions the
// <NomineeConsole> shell projects — self-suppress, grey-takeover, active — since the mobile app has no
// component-render harness (the pool-onboarding-gate / tone-gradient precedent).

import { describe, expect, it } from 'vitest'

import type { NomineeConsoleResponse } from '@twt/contracts'

import {
  formatLastUpdated,
  isConsoleSuppressed,
  isStaffTakeoverActive,
  resolveNomineeConsoleView,
} from '../../components/nominee-console/console-view'

const VALIDATED = (overrides?: Partial<Extract<NomineeConsoleResponse, { isNominee: true }>>): NomineeConsoleResponse => ({
  isNominee: true,
  pool: { letterCode: 'F', name: null, canonicalIdentifier: 'P-2026-07-001' },
  takeover: { eligible: false, daysSinceEngagement: 2 },
  poolOpenAtIso: '2026-07-01T00:00:00.000Z',
  lastUpdatedIso: '2026-07-03T09:30:00.000Z',
  ...overrides,
})

describe('resolveNomineeConsoleView — self-suppress (AC1)', () => {
  it('suppresses on undefined (first fetch / error)', () => {
    expect(resolveNomineeConsoleView(undefined).kind).toBe('suppressed')
    expect(isConsoleSuppressed(undefined)).toBe(true)
  })

  it('suppresses on { isNominee: false }', () => {
    const data: NomineeConsoleResponse = { isNominee: false }
    expect(resolveNomineeConsoleView(data).kind).toBe('suppressed')
    expect(isConsoleSuppressed(data)).toBe(true)
  })
})

describe('resolveNomineeConsoleView — console view (AC1/AC3)', () => {
  it('renders the console for a validated nominee, staffTakeover=false below threshold', () => {
    const view = resolveNomineeConsoleView(VALIDATED())
    expect(view.kind).toBe('console')
    if (view.kind === 'console') {
      expect(view.staffTakeover).toBe(false)
      expect(view.pool.letterCode).toBe('F')
      expect(view.daysSinceEngagement).toBe(2)
      expect(view.poolOpenAtIso).toBe('2026-07-01T00:00:00.000Z')
    }
    expect(isConsoleSuppressed(VALIDATED())).toBe(false)
  })

  it('flags staffTakeover when the server marks the takeover eligible (grey state)', () => {
    const data = VALIDATED({ takeover: { eligible: true, daysSinceEngagement: 9 } })
    const view = resolveNomineeConsoleView(data)
    expect(view.kind).toBe('console')
    if (view.kind === 'console') expect(view.staffTakeover).toBe(true)
    expect(isStaffTakeoverActive(data)).toBe(true)
  })

  it('does not flag staffTakeover for a suppressed view', () => {
    expect(isStaffTakeoverActive(undefined)).toBe(false)
    expect(isStaffTakeoverActive({ isNominee: false })).toBe(false)
  })

  it('passes the curated pool name through when present', () => {
    const view = resolveNomineeConsoleView(
      VALIDATED({ pool: { letterCode: 'F', name: 'Yudhishthira', canonicalIdentifier: 'P-2026-07-001' } }),
    )
    if (view.kind === 'console') expect(view.pool.name).toBe('Yudhishthira')
  })
})

describe('formatLastUpdated — operational numerals (Latin), never Devanagari', () => {
  it('formats a valid ISO to DD-MM HH:MM fixed to Asia/Kolkata (IST), regardless of runner/device TZ', () => {
    // 2026-07-03T09:30:00.000Z + 5:30 IST offset = 2026-07-03 15:00 IST — deterministic (Review fix: no
    // longer dependent on the runner's local timezone).
    const out = formatLastUpdated('2026-07-03T09:30:00.000Z')
    expect(out).toBe('03-07 15:00')
    expect(out).not.toMatch(/[०-९]/) // no Devanagari digits on an operational figure (UX-DR73)
  })

  it('returns empty string for an unparseable value (the caller omits the line)', () => {
    expect(formatLastUpdated('not-a-date')).toBe('')
  })
})
