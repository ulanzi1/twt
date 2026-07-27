// The mobile <StatusPill> render fence — Story 9.6 (Task 6; AC1/AC3). DB-free, RN-render-free.
//
// The mobile harness is pure-Vitest (no @testing-library/react-native — RN component MOUNT tests aren't
// set up here; see vitest.config.ts + the helpline-cta-presence.test.ts precedent). So this proves the
// two things a pure test CAN prove about the render component without mounting it:
//
//   1. EXHAUSTIVENESS — the mobile adapter maps EVERY `tone` and EVERY `iconName` the pure @twt/ui
//      presenter can emit for the 5 canonical states. This is the mobile half of the "cannot be silently
//      extended" gate ([[feedback_gate_scope_semantic_coverage]]): the @twt/ui `satisfies` gate proves the
//      SPEC is exhaustive over ContributionStatus; this proves the RENDER's TONE_TOKENS / ICONS maps are
//      exhaustive over what that spec emits — so a 6th state (or a re-toned state) can't silently render
//      with a missing colour or a missing glyph.
//   2. NOT COLOR-ONLY (AC3) — the source renders an icon + a visible label + an ARIA label + role=text,
//      simultaneously, so state is legible without colour.
//
// A source scan (comments stripped, the 8.11 false-negative fix) rather than a mount — but it is driven
// by the REAL presenter output, so it is not a static string match: it fails if the taxonomy grows and
// the mobile maps don't keep up.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ContributionStatus } from '@twt/contracts'
import { deriveStatusPillViewModel } from '@twt/ui'
import { describe, expect, it } from 'vitest'

// apps/mobile/tests/unit → repo root is four levels up (unit → tests → mobile → apps → root).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const COMPONENT = 'apps/mobile/components/status-pill/StatusPill.tsx'

describe('mobile <StatusPill> maps every tone + icon the presenter emits (AC1 exhaustiveness)', () => {
  const src = stripComments(read(COMPONENT))
  const statuses = ContributionStatus.options

  for (const status of statuses) {
    const vm = deriveStatusPillViewModel(status)

    it(`TONE_TOKENS has a '${vm.tone}' entry (state ${status})`, () => {
      // The tone is an unquoted object key in TONE_TOKENS: `pending: {…}`.
      expect(
        new RegExp(`\\b${vm.tone}:\\s*\\{`).test(src),
        `StatusPill.tsx TONE_TOKENS has no '${vm.tone}' entry — state '${status}' would render with no ` +
          `colour. Add the mobile-palette triple.`,
      ).toBe(true)
    })

    it(`ICONS has a '${vm.iconName}' entry (state ${status})`, () => {
      // The icon name is a (possibly-quoted) object key in ICONS: `clock:` or `'check-circle':`.
      expect(
        new RegExp(`['"]?${vm.iconName}['"]?:\\s*[A-Z]`).test(src),
        `StatusPill.tsx ICONS has no '${vm.iconName}' glyph — state '${status}' would render with no ` +
          `icon (breaking the not-color-only a11y guarantee). Add the lucide glyph.`,
      ).toBe(true)
    })
  }
})

describe('mobile <StatusPill> is not color-only (AC3) — icon + label + ARIA + role, together', () => {
  const src = stripComments(read(COMPONENT))

  it('renders the resolved icon glyph', () => {
    expect(src).toMatch(/<Icon\b/)
  })

  it('renders the visible label from the presenter labelKey', () => {
    expect(src).toContain('t(vm.labelKey)')
  })

  it('sets the ARIA label from the presenter a11yLabelKey', () => {
    expect(src).toContain('accessibilityLabel={t(vm.a11yLabelKey)}')
  })

  it('sets accessible + accessibilityRole="text" so the pill is one screen-reader unit', () => {
    expect(src).toContain('accessible')
    expect(src).toContain('accessibilityRole="text"')
  })

  it('the scan actually reached real source', () => {
    expect(read(COMPONENT).length).toBeGreaterThan(0)
  })
})
