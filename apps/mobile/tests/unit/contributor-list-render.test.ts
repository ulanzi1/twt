// The mobile <PoolContributorList> render fence — Story 11b.2b (Task 5; AC1–AC7, AC9, AC10).
// DB-free, RN-render-free.
//
// ⛔ THERE IS NO RN MOUNT HARNESS IN apps/mobile, AND THIS STORY DOES NOT STAND ONE UP. No
// `@testing-library/react-native`, no `react-test-renderer`; all `tests/unit/**` files are source scans
// (the `status-pill-render.test.ts:1-18` precedent, and Story 9.6's Dev Note in terms). Comments are
// STRIPPED before scanning (the 8.11 false-negative fix) so a ban can never be satisfied by prose.
//
// A source scan, but DRIVEN BY THE REAL PRESENTER where a behavioural claim is at stake: the
// exhaustiveness block below calls `deriveContributionRowViewModel` for real, so it fails if the row
// taxonomy grows and this render layer does not keep up.
//
// ⛔⛔ WHAT THIS HARNESS CANNOT PROVE IS RECORDED IN THE STORY AS UN-ATTESTED, NOT ASSERTED HERE:
//   · a real screen-reader announcement (no device, no accessibility tree);
//   · a real `t()` resolution at the mobile call site (no mount).
// Story 11b.2's AC2 owns the ten-key ref-resolution proof against `@twt/i18n` in BOTH locales. ⛔ This
// file writes NO second i18n ref test (D12-refscope(a)); it scans its OWN call sites instead.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { deriveContributionRowViewModel, type ContributionRowInput } from '@twt/ui'
import { describe, expect, it } from 'vitest'

// apps/mobile/tests/unit → repo root is four levels up (unit → tests → mobile → apps → root).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const COMPONENT = 'apps/mobile/components/contributor-list/PoolContributorList.tsx'
const ADAPTER = 'apps/mobile/components/contributor-list/contribution-row-input.ts'
const ROUTE_SITE = 'apps/mobile/app/(contribution)/contributors.tsx'
const CONSOLE_SITE = 'apps/mobile/components/nominee-console/NomineeConsole.tsx'

const component = stripComments(read(COMPONENT))
const adapter = stripComments(read(ADAPTER))

// ─── AC1 + AC9 — the presenter is consumed, the inline label is GONE, the adapter exists ─────────────

describe('AC1 — <PoolContributorList> derives row content from the @twt/ui presenter', () => {
  it('imports deriveContributionRowViewModel from @twt/ui', () => {
    expect(component).toMatch(/import\s*\{[^}]*\bderiveContributionRowViewModel\b[^}]*\}\s*from\s*'@twt\/ui'/)
  })

  it('calls the presenter inside renderItem', () => {
    expect(component).toMatch(/deriveContributionRowViewModel\s*\(/)
  })

  it('DELETES the inline contributorLabel() — it is not left beside the presenter', () => {
    expect(
      /\bcontributorLabel\b/.test(component),
      'contributorLabel() still exists in PoolContributorList.tsx. AC1 deletes it; the display name now ' +
        'comes from the presenter view-model, not from a second local composer.',
    ).toBe(false)
  })

  it('DELETES the local ConfirmedRow type-shadow (D10(a))', () => {
    expect(
      /\bConfirmedRow\b/.test(component),
      'The local `interface ConfirmedRow` is still declared or referenced. D10(a) deletes it: the ' +
        'contract file itself forbids type-shadowing (pool-contributor-list.ts:14).',
    ).toBe(false)
  })

  it('types against @twt/contracts ConfirmedContributorRow, type-only', () => {
    expect(component).toMatch(
      /import\s+type\s*\{[^}]*\bConfirmedContributorRow\b[^}]*\}\s*from\s*'@twt\/contracts'/,
    )
  })
})

describe('AC1 / Trap 1 — the presenter throw is GUARDED, per row, so one bad row cannot red-box the list', () => {
  it('wraps the derive call in try/catch inside renderItem', () => {
    // The Story 9.12 shape: `let vm: T; try { vm = derive…(…) } catch { return null }`.
    const guarded = /try\s*\{[\s\S]*?deriveContributionRowViewModel\s*\([\s\S]*?\}\s*catch\s*(\([^)]*\))?\s*\{[\s\S]*?return\s+null/
    expect(
      guarded.test(component),
      'deriveContributionRowViewModel is not wrapped in a try/catch that returns null. The presenter ' +
        'THROWS by ruling (11b.2 D8(a)) and this consumer is a FlashList renderItem — an unguarded throw ' +
        'red-boxes the WHOLE list on every scroll frame (Trap 1).',
    ).toBe(true)
  })

  it('does NOT branch on an anonymized kind (11b.2a D5 + D6(a) — no such row is ever emitted)', () => {
    expect(/anonymized/i.test(component)).toBe(false)
  })

  it('does NOT resolve member.anonymousMember (its subject cannot exist)', () => {
    expect(/anonymousMember/.test(component)).toBe(false)
  })

  it('writes NO render arm for the unknown kind — the try/catch IS its handling (D8(a))', () => {
    expect(/['"]unknown['"]/.test(component)).toBe(false)
  })
})

describe('AC9 — the wire→presenter adapter (routed here BY NAME by Story 11b.2)', () => {
  it('exists as its own module and is imported by the component', () => {
    expect(component).toMatch(/from\s*'\.\/contribution-row-input'/)
  })

  it('takes the contract row type-only from @twt/contracts (D10(a))', () => {
    expect(adapter).toMatch(
      /import\s+type\s*\{[^}]*\bConfirmedContributorRow\b[^}]*\}\s*from\s*'@twt\/contracts'/,
    )
  })

  it('returns the presenter input type, imported type-only from @twt/ui', () => {
    expect(adapter).toMatch(/import\s+type\s*\{[^}]*\bContributionRowInput\b[^}]*\}\s*from\s*'@twt\/ui'/)
  })

  it('re-nests the flat name fields under displayName as the ONE input kind', () => {
    expect(adapter).toMatch(/kind:\s*'name'/)
    expect(adapter).toMatch(/firstName/)
    expect(adapter).toMatch(/lastInitial/)
  })

  it('splices the RESPONSE-level pool letter code onto each row', () => {
    expect(adapter).toMatch(/poolLetterCode/)
  })

  it('supplies NO rowKey — D5 vacated it and no value may be invented to satisfy a type', () => {
    expect(
      /\browKey\b/.test(adapter) || /\browKey\b/.test(component),
      'rowKey appears in the render layer. 11b.2a D5 vacated it, it ships in neither @twt/ui interface, ' +
        'and AC9(3) forbids inventing a value for it.',
    ).toBe(false)
  })

  it('JOINS NOTHING — the name FORM is unruled (11b.2 D9(a)); the adapter re-shapes only', () => {
    expect(
      /firstName\s*\}?\s*[+`]|\$\{[^}]*firstName[^}]*\}\s/.test(adapter),
      'The adapter composes firstName and lastInitial. It must re-shape only — joining the parts would ' +
        'RULE the name form, the exact question D7-nameform(a) routes to the Trustee Panel.',
    ).toBe(false)
  })
})

// ─── AC6 — exhaustiveness over what the REAL presenter can emit, plus anti-widening ──────────────────

describe('AC6 — every displayName kind the presenter can take is rendered or PROVABLY guarded', () => {
  const input = (displayName: ContributionRowInput['displayName']): ContributionRowInput => ({
    displayName,
    poolLetterCode: 'F',
  })

  it("kind 'name' is the ONE renderable kind, and it yields nameParts", () => {
    const vm = deriveContributionRowViewModel(
      input({ kind: 'name', firstName: 'Reena', lastInitial: 'S' }),
    )
    expect(vm.displayName.kind).toBe('nameParts')
    // The render layer reads exactly these two fields off the view-model and joins them itself.
    expect(vm.displayName.firstName).toBe('Reena')
    expect(vm.displayName.lastInitial).toBe('S')
  })

  it("kind 'unknown' THROWS — and the component's try/catch is what handles it", () => {
    expect(() => deriveContributionRowViewModel(input({ kind: 'unknown' }))).toThrow()
  })

  it('ANTI-WIDENING — a THIRD kind throws too, so it cannot silently render blank', () => {
    const forged = { kind: 'anonymized', firstName: 'x', lastInitial: 'y' } as unknown as
      ContributionRowInput['displayName']
    expect(
      () => deriveContributionRowViewModel(input(forged)),
      'A third display-name kind did not throw. Adding one is a RULING (11b.2a D5/D6(a) left exactly one ' +
        'renderable kind); this render layer must not be widened silently.',
    ).toThrow()
  })

  it('the component reads the nameParts arm off the view-model, not the wire row', () => {
    expect(component).toMatch(/\bfirstName\b/)
    expect(component).toMatch(/\blastInitial\b/)
    // The join reads the VIEW-MODEL, so `item.firstName` may only survive in the keyExtractor (AC3).
    const itemReads = component.match(/\bitem\.(firstName|lastInitial)\b/g) ?? []
    expect(
      itemReads.length <= 2,
      'The component still composes the display name from the WIRE row (item.firstName / ' +
        'item.lastInitial) outside the keyExtractor. AC1 routes row content through the presenter.',
    ).toBe(true)
  })
})

// ─── AC5 — the five named behaviour-preservation assertions + AC3 ────────────────────────────────────

describe('AC5 — behaviour is preserved, stated as five named properties', () => {
  it('(1) FlashList remains the list renderer', () => {
    expect(component).toMatch(/FlashList/)
    expect(component).toMatch(/@shopify\/flash-list/)
  })

  it('(2) the four states each still render their own distinct branch', () => {
    expect(component, 'loading branch').toMatch(/if\s*\(\s*isLoading\s*\)/)
    expect(component, 'absence branch').toMatch(/if\s*\(\s*!data\s*\|\|\s*!data\.assigned\s*\)/)
    expect(component, 'empty branch').toMatch(/confirmedRows\.length\s*===\s*0/)
    expect(component, 'list branch').toMatch(/data=\{confirmedRows\}/)
  })

  it('(3) String(...) keeps the pending count + percentage LATIN in both locales', () => {
    expect(component).toMatch(/String\(data\.pending\.count\)/)
    expect(component).toMatch(/String\(data\.pending\.percentage\)/)
    expect(/toHindiNumeral/.test(component)).toBe(false)
  })

  it('(4) the pending strip stays accessibilityLiveRegion="polite", never assertive', () => {
    expect(component).toMatch(/accessibilityLiveRegion="polite"/)
    expect(/assertive/.test(component)).toBe(false)
  })

  it('(5) empty / loading / absence render OUTSIDE the list (Trap 2 — Fabric empty→populated)', () => {
    expect(
      /ListEmptyComponent/.test(component),
      'A ListEmptyComponent was introduced. New-Arch FlashList red-boxes when a list crosses ' +
        'empty→populated IN PLACE, and the 60s poll makes that a routine transition, not an edge case.',
    ).toBe(false)
  })
})

describe('AC3 — the keyExtractor KEEPS index; the 8.3 deferral stays open', () => {
  it('is byte-unchanged: `${item.firstName}-${item.lastInitial}-${index}`', () => {
    expect(component).toContain('`${item.firstName}-${item.lastInitial}-${index}`')
  })
})

// ─── AC4 — the anti-chrome fence (11b.2 D2(a) rejected the bridge BY NAME) ───────────────────────────

describe('AC4 — NO token bridge and NO confirmed chrome (D2(a))', () => {
  const touched = [component, adapter]

  it('(a) imports no @twt/tokens anywhere in the touched files', () => {
    for (const src of touched) expect(/@twt\/tokens/.test(src)).toBe(false)
  })

  it('(b) introduces no status / tone / colour-role element on the contributor row', () => {
    for (const src of touched) {
      expect(/StatusPill/.test(src), 'a StatusPill reached the contributor row').toBe(false)
      expect(/\w+_TOKENS\b/.test(src), 'a tone/colour token MAP was introduced').toBe(false)
      expect(/['"]green['"]/.test(src), "a 'green' literal reached the row").toBe(false)
      expect(/\btone\s*[:=]/.test(src), 'a tone field was introduced').toBe(false)
      expect(/\bstatus\s*[:=]/.test(src), 'a status field was introduced').toBe(false)
    }
  })

  it('(c) creates no local palette bridge module in the contributor-list directory', () => {
    let present = true
    try {
      read('apps/mobile/components/contributor-list/tokens.ts')
    } catch {
      present = false
    }
    expect(present, 'A contributor-list/tokens.ts palette bridge was created. D2(a) rejected exactly ' + 'this construction by name.').toBe(false)
  })
})

// ─── AC1 + AC2 — the no-death-term regression fence, over BOTH render sites ──────────────────────────

describe('AC1/AC2 — no death-derived term reaches ANY contributor render path', () => {
  // ⭐ Site (2) is a staff-takeover-session-as-deceased surface: the session context IS the deceased
  // member, so a dev "fixing" the list there is one conjunct away from deleting dead contributors from
  // it. A contribution made while alive stays in the record with its name on it (11b.2 D9(a) /
  // 2026-08-24-159 cl.11) — "the right conjunct in the wrong read".
  const sites: ReadonlyArray<readonly [string, string]> = [
    ['the component', COMPONENT],
    ['render site 1 — the 8.3 route', ROUTE_SITE],
    ['render site 2 — the Nominee Console', CONSOLE_SITE],
  ]
  const BANNED = /\bdeceased\b|account[-_]?frozen|accountFrozen|members\.state/i

  for (const [label, rel] of sites) {
    it(`${label} (${rel}) carries no death-derived conjunct`, () => {
      expect(
        BANNED.test(stripComments(read(rel))),
        `A death-derived term reached ${rel}. No such term may filter, mask, anonymize or reorder a ` +
          'contributor row — C-5 inverts here (AC1).',
      ).toBe(false)
    })
  }
})

describe('AC2 — both render sites still mount the ONE list component', () => {
  it('render site 1 — the 8.3 contributors route', () => {
    const src = stripComments(read(ROUTE_SITE))
    expect(src).toMatch(/import\s*\{\s*PoolContributorList\s*\}/)
    expect(src).toMatch(/<PoolContributorList\s*\/>/)
  })

  it('render site 2 — the Nominee Console (composed, never re-implemented)', () => {
    const src = stripComments(read(CONSOLE_SITE))
    expect(src).toMatch(/import\s*\{\s*PoolContributorList\s*\}/)
    expect(src).toMatch(/<PoolContributorList\s*\/>/)
  })
})

// ─── AC6 — the i18n obligation: THIS story's OWN call sites ──────────────────────────────────────────

describe('AC6 — every t() call site passes an EXPLICIT namespace (t() defaults to common and THROWS)', () => {
  /** Every `t(` call in `src`, returned as its full balanced-paren argument text. */
  const tCalls = (src: string): string[] => {
    const out: string[] = []
    const opener = /(?<![\w.$])t\(/g
    let m: RegExpExecArray | null
    while ((m = opener.exec(src)) !== null) {
      let depth = 1
      let i = m.index + m[0].length
      for (; i < src.length && depth > 0; i += 1) {
        if (src[i] === '(') depth += 1
        else if (src[i] === ')') depth -= 1
      }
      out.push(src.slice(m.index, i))
    }
    return out
  }

  it('no bare t(key) call survives in the component', () => {
    // Every call must carry the namespace as its THIRD argument: t(key, params, { namespace }) — the
    // shared `NS` const, an inline literal, or the presenter ref's own namespace.
    const calls = tCalls(component)
    expect(calls.length, 'no t() calls found — the scan would be vacuous').toBeGreaterThan(0)
    for (const call of calls) {
      expect(
        /\bNS\s*,?\s*\)|namespace:/.test(call),
        `Bare t() call without an explicit namespace: ${call}. t() defaults to 'common' and THROWS on ` +
          'a miss (resolver.ts:55, :63-64).',
      ).toBe(true)
    }
  })

  it('the row a11y label resolves the PRESENTER REF — key and namespace both, never guessed', () => {
    // The two-step consumption `view-model.ts:57-64` prescribes: join the parts, then
    // t(rowA11y.ref.key, { name }, { namespace: rowA11y.ref.namespace }).
    expect(component).toMatch(/t\(\s*\n?\s*vm\.rowA11y\.ref\.key\s*,/)
    expect(component).toMatch(/namespace:\s*vm\.rowA11y\.ref\.namespace/)
  })

  it('and that ref IS contributor_list.row_a11y in the contribution namespace (presenter-driven)', () => {
    const vm = deriveContributionRowViewModel({
      displayName: { kind: 'name', firstName: 'Reena', lastInitial: 'S' },
      poolLetterCode: 'F',
    })
    expect(vm.rowA11y.ref.key).toBe('contributor_list.row_a11y')
    expect(vm.rowA11y.ref.namespace).toBe('contribution')
  })

  it('row_a11y is called WITH a {name} param', () => {
    expect(
      /\{\s*name:\s*label\s*\}/.test(component),
      "row_a11y is '{name}, confirmed contributor' — a single-brace token. Calling it without a `name` " +
        'param throws at the interpolation step (resolver.ts:33-42), which is how the 11a.2 defect shipped.',
    ).toBe(true)
  })

  it('does NOT byte-assert the empty-state copy — only that the key is resolved (11b.2a AC8 / D7(c))', () => {
    // D7(c) RE-WORDED `contributor_list.empty` in both locales, and 11b.2a's AC8 forbids pinning the
    // sentence: a byte-equality test on copy turns every future tone review into a test edit. So the
    // SENTENCE is read from the locale at runtime and never appears in this file — and this assertion
    // fails if a later pass pastes it in. What is asserted is that the KEY is resolved.
    const empty = (rel: string): string =>
      (JSON.parse(read(rel)) as Record<string, string>)['contributor_list.empty']
    const self = read('apps/mobile/tests/unit/contributor-list-render.test.ts')
    for (const locale of ['en', 'hi']) {
      const sentence = empty(`packages/i18n/locales/${locale}/contribution.json`)
      expect(sentence.length, `contributor_list.empty is missing from ${locale}`).toBeGreaterThan(0)
      expect(
        self.includes(sentence),
        `This test file byte-pins the ${locale} empty-state sentence. Assert the key and the branch, ` +
          'never the words (11b.2a AC8 / D7(c)).',
      ).toBe(false)
    }
    expect(component).toMatch(/t\(\s*'contributor_list\.empty'/)
  })
})

// ─── AC7 — family-13 semantic accessibility, on the reachable set ONLY ───────────────────────────────

describe('AC7 — family 13 (a): EVERY element carrying accessibilityLabel is explicitly accessible', () => {
  // A label on an element that is not an accessibility element is NEVER announced — and check (a) has
  // failed silently in this codebase before, so this is asserted over every subject, not just the row.
  // `accessible` is matched as a BARE PROP, so `accessibilityRole` / `accessibilityLabel` cannot satisfy it.
  const elements = component
    .split(/</)
    .filter((chunk) => /accessibilityLabel=/.test(chunk))

  it('has subjects — the scan is not vacuous', () => {
    expect(elements.length).toBeGreaterThanOrEqual(2)
  })

  for (const [i, chunk] of elements.entries()) {
    const tag = chunk.slice(0, chunk.search(/\s/)) || `element ${i}`
    it(`<${tag}> declares itself an accessibility element`, () => {
      expect(
        /(^|\s)accessible(\s*=\s*\{true\})?\s*$/m.test(chunk),
        `<${tag}> carries accessibilityLabel with no explicit \`accessible\`. Its label may never be ` +
          'announced (family 13 check (a)).',
      ).toBe(true)
    })
  }
})

describe('AC7 — family 13 (d): every state ratified REACHABLE is ANNOUNCED, not merely styled', () => {
  // ⭐ THE REACHABLE SET IS FIVE: loading · absence · empty · a name row · the pending strip.
  // ⛔ THE ANONYMIZED ROW IS NOT ONE OF THEM — 11b.2a's D5 makes it unreachable BY CONSTRUCTION, and an
  // a11y assertion over an unreachable state is exactly the vacuous green family 13 exists to catch.
  const announced: ReadonlyArray<readonly [string, RegExp]> = [
    ['loading', /t\('loading'/],
    ['absence', /t\('contributor_list\.no_pool'/],
    ['empty', /t\('contributor_list\.empty'/],
    ['a name row', /t\(\s*\n?\s*vm\.rowA11y\.ref\.key/],
    ['the pending strip', /t\(\s*\n?\s*'contributor_list\.pending_strip_a11y'/],
  ]

  for (const [state, pattern] of announced) {
    it(`${state} resolves announced copy`, () => {
      expect(pattern.test(component), `${state} renders no announced text`).toBe(true)
    })
  }

  it('every state branch carries an accessibilityRole', () => {
    const roles = component.match(/accessibilityRole="/g) ?? []
    expect(roles.length).toBeGreaterThanOrEqual(5)
  })
})

describe('AC7 — family 13 (b) and (c) are NOT-APPLICABLE on this surface, and that is asserted', () => {
  // ⛔ Recorded as not-applicable, NEVER as passing: the surface has no measurable-value role and no
  // interactive role, so the two checks have no subject here ([[feedback_gate_scope_semantic_coverage]]).
  it('(b) N/A — no progressbar/slider role exists, so none can lack accessibilityValue', () => {
    expect(/accessibilityRole="(progressbar|slider)"/.test(component)).toBe(false)
  })

  it('(c) N/A — no button/link role exists, so none can announce over an empty handler', () => {
    expect(/accessibilityRole="(button|link)"/.test(component)).toBe(false)
  })
})

// ─── AC10 — the in-diff stale comments are corrected (THIS FILE ONLY) ────────────────────────────────

describe('AC10 — the stale "producer is unbuilt" claims are corrected in this story diff', () => {
  // Scanned on the RAW source: these are comments, and stripping them would make the test vacuous.
  const raw = read(COMPONENT)

  it('no longer claims Epic 9\'s confirmed producer is unbuilt', () => {
    expect(
      /producer is unbuilt|producer is not built/i.test(raw),
      'PoolContributorList.tsx still says Epic 9\'s producer is unbuilt. It has been LIVE since Story ' +
        '9.4/9.5 — never read population from a comment.',
    ).toBe(false)
  })

  it('no longer asserts "0 confirmed today"', () => {
    expect(/0 confirmed today/i.test(raw)).toBe(false)
  })

  it('does not import from packages/contracts source or edit the contract (out of diff)', () => {
    // D10(a) is an `import type` FROM contracts; packages/contracts/ never enters this story's diff.
    expect(/packages\/contracts/.test(component)).toBe(false)
  })
})
