// The mobile pay-screen DISCLOSURE fence — Story 10.16 (Task 4; AC1/AC3/AC6). DB-free, RN-render-free.
//
// ── Why this file exists, and why a view-model test would not do (AC3) ───────────────────────────────
// Story 10.10 shipped moderation prose that reached NOBODY: the presenter attached it to the `headline`
// section and BOTH render layers drop that section (`.filter((s) => s.id !== 'headline')`). "The UI
// tests were green because they asserted the view-model, never the render."
// (`10-10-…md:468-473`.) A green view-model test on `deriveContributionDisclosure` proves exactly
// nothing about whether a suspended member being asked for money ever SEES the disclosure.
//
// `apps/mobile` has no component-mount capability (`vitest.config.ts` is `environment: 'node'` with
// `include: ['tests/unit/**/*.test.ts']` — `.ts` only, so a `.tsx` mount test is not even collected —
// and there is no @testing-library/react-native / react-test-renderer dependency). Six shipped stories
// have reached for a render assertion and used a comment-stripped SOURCE scan; this is the seventh, and
// the direct sibling of `pay-screen-choice-render.test.ts`.
//
// A source scan cannot prove visual placement or runtime reachability, so it scans for the ANATOMY that
// ENCODES those properties rather than for the mere presence of a key:
//   1. the screen sources moderation standing and derives the disclosure;
//   2. the disclosure renders on ≥2 branches — a single placement cannot pass;
//   3. the disclosure JSX precedes <UPIIntentButton> in SOURCE ORDER (AC1's "before they can act");
//   4. the disclosure sits OUTSIDE the `intent.available` sub-branch (the manual/NEFT payer is still
//      being asked for money);
//   5. the validity read does NOT gate the pay CTA (fail-soft);
//   6. the component resolves all three parts through `t(`, with no literal member-facing string.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

// apps/mobile/tests/unit → repo root is four levels up.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

// Extracts every balanced-parenthesis `fnName(...)` call in `src`, including calls nested inside other
// calls' arguments (each nesting level is returned as its own entry). A plain regex can't do this
// correctly across multi-line calls or calls with a nested call of the SAME name in their arguments —
// exactly the shape `t(KEY, { reason: t(vm.reasonLabelKey) }, NS)` has.
const extractBalancedCalls = (src: string, fnName: string): string[] => {
  const calls: string[] = []
  const re = new RegExp(`\\b${fnName}\\(`, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(src)) !== null) {
    let depth = 1
    let i = match.index + match[0].length
    while (depth > 0 && i < src.length) {
      if (src[i] === '(') depth++
      else if (src[i] === ')') depth--
      i++
    }
    calls.push(src.slice(match.index, i))
  }
  return calls
}

const PAY = 'apps/mobile/app/(contribution)/pay.tsx'
const DISCLOSURE = 'apps/mobile/components/active-contribution/SuspensionDisclosure.tsx'
const src = stripComments(read(PAY))
const disclosureSrc = stripComments(read(DISCLOSURE))

describe('pay-screen — the disclosure is wired to the member’s own standing (AC1 / D4)', () => {
  it('reuses the SHIPPED member-validity read (no new endpoint, no new contract field)', () => {
    expect(src).toContain('useMemberValidityQuery')
    // The data already crosses the wire on the member self-read; a new field on the intent/accounts
    // contracts would be the wrong answer (both are .strict() and bundle-fenced).
    expect(src).not.toMatch(/moderationStatus/)
  })

  it('derives the disclosure with the shared pure @twt/ui derivation', () => {
    expect(src).toContain('deriveContributionDisclosure')
    // …and NOT by re-deriving the flag protocol locally at the render layer.
    expect(src).not.toContain('suspended_per_')
  })
})

describe('pay-screen — placement: the member reads it BEFORE they can act (AC1)', () => {
  it('renders the disclosure on ≥2 branches — a single placement cannot pass', () => {
    // The account-choice branch AND the chosen-account branch: both are branches a member can act from.
    const occurrences = src.match(/<SuspensionDisclosure/g) ?? []
    expect(occurrences.length).toBeGreaterThanOrEqual(2)
  })

  it('renders the disclosure BEFORE <UPIIntentButton> in source order', () => {
    // The placement property AC1 requires, expressed as something a scan can actually prove. A
    // disclosure the member reads after paying is not a disclosure.
    const firstDisclosure = src.indexOf('<SuspensionDisclosure')
    const payButton = src.indexOf('<UPIIntentButton')
    expect(firstDisclosure).toBeGreaterThan(-1)
    expect(payButton).toBeGreaterThan(-1)
    expect(firstDisclosure).toBeLessThan(payButton)
  })

  it('places the chosen-account disclosure ABOVE the banking-info panel', () => {
    // Anchored on the panel's RENDER (its "paying to" label), not on `selectedAccount.accountHolderName`
    // — that identifier first appears far earlier, in the decrypt-failure const computation.
    //
    // The `> -1` guard is NOT redundant: `lastIndexOf` returns -1 when the render is absent, and -1 is
    // trivially less than any anchor — so without it this spec passes VACUOUSLY on a deleted render.
    // The revert-sanity probe caught exactly that.
    const lastDisclosure = src.lastIndexOf('<SuspensionDisclosure')
    expect(lastDisclosure).toBeGreaterThan(-1)
    expect(lastDisclosure).toBeLessThan(src.indexOf("'upi_intent.paying_to_label'"))
  })

  it('does NOT render only inside the intent.available branch — the manual/NEFT payer is owed it too', () => {
    // `!intent.available` (the manual-transfer fallback) is reached from the chosen-account branch, so
    // the disclosure must sit ABOVE the intent sub-branching entirely.
    const lastDisclosure = src.lastIndexOf('<SuspensionDisclosure')
    expect(lastDisclosure).toBeGreaterThan(-1)
    expect(lastDisclosure).toBeLessThan(src.indexOf('upi_intent.manual_transfer_hint'))
    expect(lastDisclosure).toBeLessThan(src.indexOf('intentLoading || intent === null'))
  })
})

describe('pay-screen — fail-soft: the disclosure read never gates payment (AC1 / Task 3)', () => {
  it('does not early-return on the validity query’s loading state', () => {
    // The pay flow's own guards are the accounts read (`!accounts && !accountsLoadFailed`) and the
    // intent read. The validity query must add NO new blocking branch — a member whose validity read is
    // slow or down is never stopped from paying.
    expect(src).not.toMatch(/if\s*\(\s*validityLoading\s*\)/)
    expect(src).not.toMatch(/if\s*\(\s*validityError\s*\)\s*\{?\s*return\b/)
    expect(src).not.toMatch(/isLoading\s*\}\s*=\s*useMemberValidityQuery/)
  })

  it('renders nothing rather than a half-disclosure when the read has not resolved', () => {
    expect(src).toMatch(/disclosure\s*\?\s*<SuspensionDisclosure/)
    expect(src).toMatch(/validity\s*\?\s*deriveContributionDisclosure\(/)
  })
})

describe('SuspensionDisclosure — says all three things, through i18n (AC1 / AC4)', () => {
  it('resolves what-it-does, what-it-does-not-buy and the restoration package from the view-model', () => {
    expect(disclosureSrc).toContain('vm.whatItDoesKey')
    expect(disclosureSrc).toContain('vm.whatItDoesNotBuyKey')
    expect(disclosureSrc).toContain('vm.restorationPackage')
  })

  it('routes every part through t(', () => {
    expect(disclosureSrc).toMatch(/t\(vm\.whatItDoesKey/)
    expect(disclosureSrc).toMatch(/t\(vm\.whatItDoesNotBuyKey/)
    // Story 10.25 folded the two non-`ok` arms into one <Paragraph> whose KEY is selected by a
    // ternary, so the unavailable key is no longer the direct argument of a `t(` call.
    expect(disclosureSrc).toContain('RESTORATION_PACKAGE_UNAVAILABLE_KEY')
    expect(disclosureSrc).toContain('RESTORATION_PACKAGE_NO_CONSECUTIVE_REQUIREMENT_KEY')
  })

  it('resolves the contribution namespace on every t( call — a dropped NS resolves the wrong catalog or throws', () => {
    // Every `t(...)` call in this component must pass `NS` (`{ namespace: 'contribution' }`) as its
    // trailing argument, with ONE deliberate exception: the reason-label lookup `t(vm.reasonLabelKey)`
    // resolves from the default `common` catalog (the shipped D5 precedent — `moderationReasonLabelKey`
    // labels live there, not in `contribution`). A regex that only checks the key stops short of this:
    // it would still pass if a future edit dropped the NS argument, silently resolving against the wrong
    // namespace (or throwing, per the documented "10.10 trap").
    const REASON_LABEL_LOOKUP = 't(vm.reasonLabelKey)'
    const calls = extractBalancedCalls(disclosureSrc, 't').filter((c) => c !== REASON_LABEL_LOOKUP)
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call).toMatch(/,\s*NS\s*,?\s*\)\s*$/)
    }
  })

  it('renders BOTH degraded arms with a route to the helpline, and keeps them distinct (AC4; 10.25 D4)', () => {
    // Story 10.25 made a THIRD arm reachable. Both non-`ok` arms end at the helpline, because both
    // leave the member with a question a person can answer — but they must not collapse into one
    // sentence: "we cannot yet tell you" (facts un-derivable) and "your package is not counted in
    // contributions" (R7(D)/(E)/(F) prescribe lock-in months instead) are DIFFERENT claims, and
    // telling a member the system is broken when it is simply measuring something else is the
    // "honest sentinel quietly becomes a lie" failure in a new costume.
    expect(disclosureSrc).toContain("'no_consecutive_requirement'")
    expect(disclosureSrc).toContain('CallHelplineCTA')
    expect(disclosureSrc).toContain('RESTORATION_PACKAGE_UNAVAILABLE_KEY')
    expect(disclosureSrc).toContain('RESTORATION_PACKAGE_NO_CONSECUTIVE_REQUIREMENT_KEY')
    // Never a fabricated zero.
    expect(disclosureSrc).not.toMatch(/remaining:\s*0\b/)
  })

  it('renders the `ok` arm correctly — LIVE since Story 10.25, and still a zero-change activation (AC4)', () => {
    // 10.16 declared this arm and 10.24 left it unreachable; Story 10.25's producer lit it with no
    // change to the (a)/(b) copy keys and no change to `pay.tsx`, which is what the shape was for.
    const okBranch = disclosureSrc.slice(disclosureSrc.indexOf("restoration.status === 'ok'"))
    expect(okBranch).toMatch(/t\(\s*RESTORATION_PACKAGE_REMAINING_KEY/)
    // Both counts are interpolated as STRINGS (Latin operational numerals, amendment-A2) — not raw
    // numbers, which `t()`'s param typing rejects, and not a fabricated fallback.
    expect(okBranch).toMatch(/remaining:\s*String\(restoration\.remaining\)/)
    expect(okBranch).toMatch(/required:\s*String\(restoration\.required\)/)
    // Rendered in the tabular numeral face, matching the sibling counts on this screen.
    expect(okBranch.slice(0, okBranch.indexOf('RESTORATION_PACKAGE_REMAINING_KEY'))).toContain('$tabular')
  })

  it('never suppresses (a) and (b) whatever the count arm — they are outside that branch', () => {
    const packageBranch = disclosureSrc.indexOf("restoration.status === 'ok'")
    expect(packageBranch).toBeGreaterThan(-1)
    expect(disclosureSrc.indexOf('vm.whatItDoesKey')).toBeLessThan(packageBranch)
    expect(disclosureSrc.indexOf('vm.whatItDoesNotBuyKey')).toBeLessThan(packageBranch)
  })

  it('attributes cause ONLY through the trustee-recorded reason label (AC5)', () => {
    expect(disclosureSrc).toContain('vm.reasonLabelKey')
    expect(disclosureSrc).toMatch(/reason:\s*t\(vm\.reasonLabelKey\)/)
  })

  it('carries NO literal member-facing string (the i18n fence the sibling scans apply)', () => {
    // No Devanagari anywhere, and no bare English sentence in a JSX text position.
    expect(disclosureSrc).not.toMatch(/[ऀ-ॿ]/)
    expect(disclosureSrc).not.toMatch(/>\s*[A-Z][a-z]+ [a-z]+ [a-z]+/)
    // The narrow three-word-cadence check above only catches a capitalized word followed by exactly two
    // lowercase words — a literal starting lowercase, using punctuation, or of any other length sails
    // through it. Every JSX text child in this component must be a `{...}` expression (i.e. `t(...)`),
    // never bare text — assert that directly: no `>` is immediately followed by a run of Latin letters
    // that isn't itself the start of a `{` expression or another tag/closing brace.
    expect(disclosureSrc).not.toMatch(/>\s*[A-Za-z][A-Za-z0-9 ,.'-]*[A-Za-z][^{}<]*</)
  })
})

describe('SuspensionDisclosure — accessibility + tone (AC5 / AC6)', () => {
  it('is announced, with an explicit role', () => {
    expect(disclosureSrc).toMatch(/accessibilityRole="summary"/)
    expect(disclosureSrc).toMatch(/accessibilityLiveRegion="polite"/)
    expect(disclosureSrc).toMatch(/accessibilityLabel=\{t\(vm\.a11yLabelKey/)
  })

  it('collapses the subtree into ONE accessible element — `accessible` is what makes `accessibilityLabel` actually suppress the inner nodes', () => {
    // Without `accessible`, a screen reader can still discover and read each inner <Text>/<Paragraph>
    // separately, on top of the summary label — double-announcing the same content. The prop must sit on
    // the SAME <YStack> that carries `accessibilityLabel`, not merely appear somewhere in the file.
    const yStackOpenTag = disclosureSrc.slice(
      disclosureSrc.indexOf('<YStack'),
      disclosureSrc.indexOf('>', disclosureSrc.indexOf('accessibilityLabel={t(vm.a11yLabelKey')) + 1,
    )
    expect(yStackOpenTag).toMatch(/\baccessible\b(?!\s*=\s*\{?\s*false)/)
  })

  it('is NOT colour-only — the meaning is in the words, not a red border', () => {
    // The alert/red treatment on this screen means "something is wrong with your payment". A
    // disclosure is not an error, and AC5 forbids framing the member's standing as a moral failing.
    expect(disclosureSrc).not.toContain('$red10')
    expect(disclosureSrc).not.toContain('$red11')
    expect(disclosureSrc).not.toMatch(/accessibilityRole="alert"/)
  })

  it('renders any count with the tabular (Latin operational numeral) face — amendment-A2', () => {
    expect(disclosureSrc).toContain('$tabular')
  })
})

describe('the story’s scope boundary holds (AC3)', () => {
  it('does not touch the member-status panel’s headline logic', () => {
    // AC3 pins `deriveHeadlineState` byte-unchanged and AC1 says the disclosure is not a status-panel
    // concern. The pay screen must not reach for the panel's presenter.
    expect(src).not.toContain('buildMemberStatusViewModel')
    expect(src).not.toContain('deriveHeadlineState')
    expect(disclosureSrc).not.toContain('buildMemberStatusViewModel')
  })
})
