// The member-facing pool NAME FORM on the two mobile consumers — Story 8.16 (Task 3, Task 5; AC2, AC2b,
// AC3, AC5).
//
// The two surfaces here are consumers ① (the My Pool card) and ② (the Yogdaan Bahi row). Both used to
// JOIN the deceased family's name from a first-name/last-initial pair, which made each of them a place
// where the member-facing name FORM was decided. `2026-09-02-181` moved that decision into the shared
// resolver, under the Pariwar's stored mode — so what has to hold on this side is a NEGATIVE: neither
// component re-joins, re-forms, or reaches for a form decider of its own.
//
// The mobile harness is pure-Vitest with no RN renderer (the `status-pill-render` / `missed-cycle-section`
// precedent), so this is a SOURCE SCAN, and it is honest about what that can and cannot prove: it proves
// the form decision is not present in these files, which is exactly the AC2b fence ("no consumer grows
// its own name resolution"). It does not prove pixels.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const CARD = 'apps/mobile/components/active-contribution/ActiveContributionCard.tsx'
const ROW = 'apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx'
const SAMPLE = 'apps/mobile/components/yogdaan-bahi/sample-data.ts'

const CONSUMERS: ReadonlyArray<readonly [string, string]> = [
  ['the My Pool card (consumer ①)', CARD],
  ['the Yogdaan Bahi row (consumer ②)', ROW],
]

// ⭐ Story 11b.21 (Trap 8) — the contributor list renders a MEMBER-FACING name too (a contributor's, mode-
// resolved on the server since `#decision-2026-09-19-224` D3), and until now this file gave it ⛔ NO
// coverage, so "it still passes" proved nothing for it. It joins the AC2b fences below — the client must
// grow ⛔ no name resolution of its own. ⚠ It is ⛔ not in `CONSUMERS`: AC3's `deceasedDisplayName` field
// belongs to the pool-identity surfaces, ⛔ not to a contributor row.
const CONTRIBUTOR_LIST = 'apps/mobile/components/contributor-list/PoolContributorList.tsx'
const FENCED: ReadonlyArray<readonly [string, string]> = [
  ...CONSUMERS,
  ['the contributor list (Story 11b.21)', CONTRIBUTOR_LIST],
]

describe('AC3 — both mobile consumers read the ONE resolved field', () => {
  it('the scan is not vacuous: both files are read and non-trivial', () => {
    for (const [label, rel] of CONSUMERS) {
      expect(read(rel).length, `${label} must be readable`).toBeGreaterThan(500)
    }
  })

  it.each(CONSUMERS)('%s renders `deceasedDisplayName`', (_label, rel) => {
    expect(stripComments(read(rel))).toContain('deceasedDisplayName')
  })

  it.each(CONSUMERS)('%s no longer references the shed PARTS', (_label, rel) => {
    const src = stripComments(read(rel))
    expect(src).not.toContain('deceasedFirstName')
    expect(src).not.toContain('deceasedLastInitial')
  })
})

describe('AC2b — the client does NOT grow a second name resolution', () => {
  it.each(FENCED)('%s binds no form decider and no shielding helper', (_label, rel) => {
    const src = stripComments(read(rel))
    for (const forbidden of [
      'splitFirstNameLastInitial',
      'resolvePublicMemberName',
      'resolveMemberFacingDeceasedName',
      'resolvePoolIdentity',
      // The MODE itself must not reach the client either. Handing it down would let a surface re-join
      // parts under it — a second resolution site wearing the right mode, which is worse than an
      // obviously-wrong one because it would agree with the server most of the time.
      'public_name_presentation_mode',
      'presentationMode',
      'shielded_name',
      'full_name',
    ]) {
      expect(src, `${rel} must not bind ${forbidden}`).not.toContain(forbidden)
    }
  })

  it.each(FENCED)('%s performs no JOIN of its own on the family name', (_label, rel) => {
    // The specific shape that was there before, and the specific shape a well-meaning edit would put
    // back: a ternary over an empty last-initial, or a template literal splicing two name fields.
    const src = stripComments(read(rel))
    expect(src).not.toMatch(/\$\{[^}]*[Ff]irstName[^}]*\}\s*\$\{/)
    expect(src).not.toMatch(/lastInitial\s*\?/)
  })
})

describe('AC5 — the RN a11y element boundary holds on both components', () => {
  // ⚠⛔ THE FAILURE MODE THIS EXISTS FOR, and it is silent: a tamagui `<Button>` is `styled(View, …)`
  // and supplies `accessible` NOWHERE. An RN `View` is not an accessibility element without
  // `accessible={true}`, so the inner `<Text>` takes focus and the carefully-written
  // `accessibilityLabel` is never announced. The label reads correctly in the source and does not
  // reach the screen reader — which is why an eyeball review passes and this assertion does not.
  it.each(CONSUMERS)('%s: every <Button> carrying a label is also an a11y ELEMENT', (_label, rel) => {
    const src = read(rel)
    const buttons = src.split(/<Button\b/).slice(1)
    expect(buttons.length, `${rel} should contain at least one <Button>`).toBeGreaterThan(0)
    for (const [i, tail] of buttons.entries()) {
      const props = tail.slice(0, tail.indexOf('>'))
      if (!props.includes('accessibilityLabel')) continue
      expect(
        props.includes('accessible={true}') || /\baccessible\b(?!\w)/.test(props),
        `${rel} <Button> #${i + 1} carries an accessibilityLabel but is not an accessibility element`,
      ).toBe(true)
    }
  })

  it('the Yogdaan row announces the family name inside its ONE row-level a11y unit', () => {
    // The row is one screen-reader unit (date + family + pool + amount + status-by-NAME), so the
    // family string this story changed must reach `yogdaan.row_a11y` — not just the visible column.
    const src = stripComments(read(ROW))
    expect(src).toContain('yogdaan.row_a11y')
    expect(src).toMatch(/family,/)
  })

  it('the card passes the family into BOTH the parichay line and the tone a11y copy', () => {
    const src = stripComments(read(CARD))
    expect(src).toContain('active_contribution.family_parichay')
    expect(src).toMatch(/toneParams\s*=\s*\{[^}]*family/)
    expect(src).toContain('_a11y')
  })
})

describe('the layout stress fixture tracks the shipped shape', () => {
  it('the Yogdaan sample data emits `deceasedDisplayName`, not the shed pair', () => {
    // A fixture on the old shape is how a stress set silently stops exercising the real column.
    const src = stripComments(read(SAMPLE))
    expect(src).toContain('deceasedDisplayName')
    expect(src).not.toContain('deceasedFirstName')
  })
})
