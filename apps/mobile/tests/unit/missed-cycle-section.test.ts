// The MISSED-CYCLE section's guarantees — Story 10.27 (Task 5; AC2/AC4/AC6; D1/D3/D4).
//
// The mobile harness is pure-Vitest with no RN renderer (the status-pill-render.test.ts /
// self-verify-surface-render.test.ts precedent), so this file works in two registers and is explicit
// about which is which:
//
//   (a) BEHAVIOUR — the two decisions most likely to be got silently wrong are hoisted out of JSX
//       into `missed-cycles.ts` precisely so they can be ASSERTED, not scanned: absent-vs-empty, and
//       which of the two same-named `cycleRef`s reaches the assertion request.
//   (b) SOURCE SCAN — the per-branch render obligation, which cannot be expressed as a pure function.
//       ⚠ This scan deliberately does what the 8.11 helpline fence documented as ITS limitation: it
//       verifies PER-BRANCH coverage, by brace-matching the zero-attested-rows early return and
//       asserting the section renders inside it AND after it. A whole-file `includes()` would pass on
//       a surface that rendered the section only in the populated branch — which is exactly the
//       regression AC4 calls out, and exactly the one that would defeat the story for its primary
//       population (a member who has attested nothing and has a missed cycle).

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { MissedCycleEntry } from '@twt/contracts'
import { describe, expect, it } from 'vitest'

import {
  personalEventRequestForCycle,
  shouldRenderMissedCycles,
} from '../../components/yogdaan-bahi/missed-cycles'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const BAHI = 'apps/mobile/components/yogdaan-bahi/YogdaanBahi.tsx'
const SECTION = 'apps/mobile/components/yogdaan-bahi/MissedCycleSection.tsx'
const ASSERTION = 'apps/mobile/components/member-status/PersonalEventAssertion.tsx'
const HOOK = 'apps/mobile/components/member-status/usePersonalEventAssertion.ts'

const ENTRY: MissedCycleEntry = {
  cycleId: '22222222-2222-2222-2222-222222222222',
  cycleRef: '2026-05',
  poolLetterCode: 'C',
  poolCanonicalIdentifier: 'P-2026-05-001',
}

// ─── (a) BEHAVIOUR ───────────────────────────────────────────────────────────────────────────────

describe('AC4 — the section is ABSENT when there is nothing to show, never EMPTY', () => {
  it('zero entries ⇒ no section (not a "no missed cycles" state, not a "0")', () => {
    expect(shouldRenderMissedCycles([])).toBe(false)
  })

  it('an undefined collection ⇒ no section (an older offline-cached response, or a fail-soft)', () => {
    expect(shouldRenderMissedCycles(undefined)).toBe(false)
  })

  it('≥1 entry ⇒ the section renders', () => {
    expect(shouldRenderMissedCycles([ENTRY])).toBe(true)
    expect(shouldRenderMissedCycles([ENTRY, { ...ENTRY, cycleId: '33333333-3333-3333-3333-333333333333' }])).toBe(true)
  })

  it('⛔ D5 — "no coverage" and "nothing missed" are INDISTINGUISHABLE here, and must stay so', () => {
    // The server returns `[]` for both: a member who has missed nothing, and a Pariwar whose
    // projection has no coverage (where the record supports no statement in either direction). Both
    // must render identically silent — so the predicate takes no second argument and can grow none.
    expect(shouldRenderMissedCycles([])).toBe(shouldRenderMissedCycles(undefined))
    expect(shouldRenderMissedCycles.length).toBe(1)
  })
})

describe('⛔ AC6/D4 — the assertion request receives the UUID, never the display string', () => {
  it('maps entry.cycleId (the UUID) onto the request’s UUID-typed cycleRef', () => {
    const req = personalEventRequestForCycle(ENTRY, 'bereavement')
    expect(req.cycleRef).toBe(ENTRY.cycleId)
  })

  it('never sends the entry’s own display cycleRef (a freeze month) as provenance', () => {
    const req = personalEventRequestForCycle(ENTRY, 'illness')
    expect(req.cycleRef).not.toBe(ENTRY.cycleRef)
    expect(req.cycleRef).not.toBe('2026-05')
    expect(req.cycleRef).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it('carries NO free text and NO member id (ratified §3.1 / D3) — kind + provenance, nothing else', () => {
    const req = personalEventRequestForCycle(ENTRY, 'other')
    expect(Object.keys(req).sort()).toEqual(['cycleRef', 'kind'])
  })
})

// ─── (b) SOURCE SCAN — the per-branch render obligation ──────────────────────────────────────────

/** Slice `src` from `startIdx` through the brace that closes the block opening at/after it. */
function blockFrom(src: string, startIdx: number): string {
  const open = src.indexOf('{', startIdx)
  if (open === -1) throw new Error('no block opens after the given index')
  let depth = 0
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1
    else if (src[i] === '}') {
      depth -= 1
      if (depth === 0) return src.slice(open, i + 1)
    }
  }
  throw new Error('unbalanced braces — the brace matcher needs fixing, not the assertion')
}

describe('⛔ AC4 — <MissedCycleSection> renders in BOTH branches of the passbook', () => {
  const src = stripComments(read(BAHI))
  const guardIdx = src.indexOf('if (rows.length === 0)')

  it('the zero-attested-rows early return still exists (the scan is anchored to real source)', () => {
    // If this fails the branch was restructured; re-anchor the scan rather than deleting it — the
    // Fabric empty→populated crash is why the branch split exists at all.
    expect(guardIdx, `${BAHI} no longer contains the zero-attested-rows guard`).toBeGreaterThan(-1)
  })

  it('THE EMPTY-PASSBOOK branch renders it (a member with nothing attested but a missed cycle)', () => {
    const emptyBranch = blockFrom(src, guardIdx)
    expect(
      emptyBranch.includes('<MissedCycleSection'),
      `${BAHI}: the zero-attested-rows branch does not render <MissedCycleSection>. A member who ` +
        `has attested NOTHING but has a missed cycle is this story's primary population — they ` +
        `would see nothing at all.`,
    ).toBe(true)
  })

  it('THE POPULATED-LIST branch renders it too', () => {
    const emptyBranch = blockFrom(src, guardIdx)
    const afterBranch = src.slice(guardIdx + emptyBranch.length)
    expect(
      afterBranch.includes('<MissedCycleSection'),
      `${BAHI}: the populated-list branch does not render <MissedCycleSection>.`,
    ).toBe(true)
  })

  it('is rendered OUTSIDE the FlatList — never an item, header or footer (the Fabric hazard)', () => {
    // The section sits between the list's closing `/>` and the sticky footer, i.e. in the stable
    // region — not passed as ListHeaderComponent/ListFooterComponent/renderItem.
    expect(src).not.toMatch(/List(Header|Footer)Component=\{[^}]*MissedCycleSection/)
    expect(src).not.toMatch(/renderItem[^\n]*MissedCycleSection/)
  })
})

describe('AC2/AC6 — the section’s anatomy', () => {
  const src = stripComments(read(SECTION))

  it('returns null on an empty collection — the ABSENT decision routes through the pure predicate', () => {
    expect(src).toContain('shouldRenderMissedCycles')
    expect(src).toMatch(/if\s*\(!shouldRenderMissedCycles\([^)]*\)\)\s*return null/)
  })

  it('⛔ AC2 — it does NOT reuse the five attested tones (no <StatusPill>, no `grey`)', () => {
    // `grey` means "on record, cycle closed with no verdict" and applies to a cycle the member DID
    // attest. A missed cycle has no attestation, so it has no tone.
    expect(src).not.toContain('<StatusPill')
    expect(src).not.toContain("'grey'")
    expect(src).toContain('missed_cycle.state_label')
  })

  it('⛔ D1 — it names NO cause and NO deceased family (both are forbidden, for different reasons)', () => {
    // The causes are structurally unrecorded and out-of-band is fenced against ever being recorded;
    // and naming a bereaved family beside "no matched contribution recorded" pairs a person with an
    // absence. Neither may reappear "helpfully".
    for (const forbidden of ['deceasedFirstName', 'deceasedLastInitial', 'reasonCode', 'cause']) {
      expect(src, `the section must not reference ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('⛔ AC6 — it CONSUMES the shipped 10.26 assertion flow rather than authoring a second one', () => {
    expect(src).toContain("from '../member-status/PersonalEventAssertion'")
    expect(src).toContain('<PersonalEventAssertion')
    // Per-ROW instantiation carrying that row's cycle UUID — not a navigation to the membership
    // screen's instance, which has no cycle context.
    expect(src).toMatch(/cycleId=\{entry\.cycleId\}/)
    expect(src).not.toMatch(/cycleId=\{entry\.cycleRef\}/)
  })

  it('holds NO literal member-facing copy — every visible string is an i18n key in `contribution`', () => {
    expect(src).toContain("namespace: 'contribution'")
    for (const call of src.matchAll(/t\(\s*'([^']+)'/g)) {
      expect(call[1], 'every resolved key belongs to this story’s stem').toMatch(/^missed_cycle\./)
    }
  })
})

describe('AC6 — the assertion flow accepts a cycle without changing its contract', () => {
  const assertion = stripComments(read(ASSERTION))
  const hook = stripComments(read(HOOK))

  it('the component takes an optional cycleId and threads it as the request’s cycleRef', () => {
    expect(assertion).toMatch(/cycleId\?:\s*string\s*\|\s*undefined/)
    expect(assertion).toMatch(/cycleRef:\s*cycleId/)
  })

  it('an absent cycle omits the field entirely (the .strict() + .optional() shape)', () => {
    expect(assertion).toMatch(/cycleId === undefined \? \{ kind \}/)
    expect(hook).toMatch(/input\.cycleRef === undefined/)
  })

  it('the hook’s mutation input WIDENED to carry the optional cycle UUID', () => {
    expect(hook).toMatch(/mutationFn:\s*\(input:\s*\{\s*kind:\s*PersonalEventKind;\s*cycleRef\?:/)
  })

  it('⛔ the personal_event keys resolve against the `contribution` namespace, not the `common` default', () => {
    // `t`'s default namespace is `common`; these keys live in `contribution.json`, and the resolver
    // is loud-by-default — so an un-namespaced call THROWS at render. Story 10.26 shipped it that
    // way; Story 10.27 mounts this component on the passbook, where the throw would take the whole
    // surface down. Guarded so it cannot silently regress.
    expect(assertion).toContain("namespace: 'contribution'")
    expect(
      assertion.match(/t\('personal_event\.[A-Za-z0-9_.]+'\)/g),
      'every personal_event key must pass the contribution namespace explicitly',
    ).toBeNull()
  })
})
