// The member claim screen's ANNOUNCEMENTS — Story 6.18, checklist family 13(d). DB-free, RN-render-free.
//
// ⚠⚠ THE GAP THIS CLOSES, in the review's words: *"reachable states are reflected but not announced
// (REAL GAP)"*. Every message below APPEARS in response to something the family does — typing a
// name, blurring an IFSC, pressing Save. Each one replaces or sits beside the control their focus
// is on. ⭐ A `<Text>` that merely renders is SILENT to a screen reader; it has to be inside a live
// region to be spoken.
//
// ⚠⚠ AND A BARE `accessibilityRole="alert"` IS ⛔ NOT ENOUGH, which is the specific defect here.
// On iOS a role alone does ⛔ not reliably announce content that mounts after first paint — the
// pairing with `accessibilityLiveRegion` is what makes it dependable, and `NomineeForm.tsx` in this
// SAME story already pairs them. ⇒ the two files disagreed with each other about the same rule, on
// two screens the same bereaved family walks through minutes apart.
// ⚠ The iOS bare-role behaviour is INFERENCE, recorded as such by the review; the INTERNAL
// INCONSISTENCY between the two files is ⛔ not — it is checkable, and it is what this pins.
//
// `apps/mobile` has no component-mount capability (`vitest.config.ts` is `environment: 'node'` with
// `include: ['tests/unit/**/*.test.ts']`), so this follows the shipped comment-stripped SOURCE-scan
// idiom of its siblings (`pay-screen-vpa-render.test.ts`, `pay-screen-disclosure-render.test.ts`).
// ⚠ A source scan cannot prove a screen reader actually speaks — it proves the ANATOMY that makes
// speaking possible is present on every message, which is the part a future edit can silently drop.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

// apps/mobile/tests/unit → repo root is four levels up.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const REVIEW = 'apps/mobile/app/(claim)/nominee-review.tsx'
const FORM = 'apps/mobile/components/life-events/NomineeForm.tsx'

/** Every `<Text …>` opening tag in the source, as whole strings. */
function textTags(src: string): string[] {
  return src.match(/<Text\b[^>]*>/g) ?? []
}

/**
 * Every complete `<Text …>…</Text>` element, opening tag included.
 *
 * ⚠ WHY WHOLE ELEMENTS AND ⛔ NOT "the nearest `<Text` before the anchor" (which is what this file
 * tried first, and it was wrong): `nominee.bank.vpa_invalid` is used TWICE — once in JSX and once
 * as `setNotice(t('nominee.bank.vpa_invalid'))`, which is inside a plain function with ⛔ no `<Text`
 * before it at all. A nearest-preceding-tag scan reported that as *"not inside a <Text>"* and the
 * test failed for a reason that had ⛔ nothing to do with accessibility.
 */
function textElements(src: string): string[] {
  return src.match(/<Text\b[^>]*>[\s\S]*?<\/Text>/g) ?? []
}

/** The complete `<Text>` elements whose body mentions `anchor`. */
function elementsRendering(src: string, anchor: string): string[] {
  return textElements(src).filter((el) => el.includes(anchor))
}

describe('nominee-review — every ALERT is paired with a live region (family 13(d))', () => {
  const src = stripComments(read(REVIEW))

  it('⛔ NO `accessibilityRole="alert"` is left bare — the pairing is the whole point', () => {
    const alerts = textTags(src).filter((t) => t.includes('accessibilityRole="alert"'))
    // ⛔ NON-VACUITY: if the screen had no alerts at all, the assertion below would be trivially
    // true and this file would be certifying an empty set.
    expect(alerts.length, 'no alerts found — the scan is looking at the wrong file or shape').
      toBeGreaterThanOrEqual(4)
    const bare = alerts.filter((t) => !t.includes('accessibilityLiveRegion'))
    expect(bare, `these alerts announce nothing on mount:\n${bare.join('\n')}`).toEqual([])
  })

  it('⭐ the three validation messages each carry a live region, with the RIGHT urgency', () => {
    // Named individually, so a future edit that drops ONE is reported by name rather than as a
    // count that quietly still passes.
    //
    // ⚠ EACH ANCHOR NAMES ITS EXPECTED VALUE too (code review 2026-09-22) — this used to check only
    // that `accessibilityLiveRegion` was PRESENT on these three, unlike `saved`/`notice` below,
    // which the file's own next test already checks for the exact `polite`/`assertive` value. A
    // message announced with the WRONG urgency (e.g. an error announced politely, never
    // interrupting) would have passed the presence-only check silently. All three below are
    // validation errors, so all three are `assertive`.
    for (const [anchor, value] of [
      ["t('nominee.bank.holder_english')", 'assertive'], // AC12 — the English-script gate, as the family types
      ["t('nominee.bank.ifsc_error')", 'assertive'], // the IFSC could not be resolved
      ["t('nominee.bank.vpa_invalid')", 'assertive'], // the optional UPI ID is malformed
    ] as const) {
      const rendered = elementsRendering(src, anchor)
      expect(rendered.length, `${anchor} is rendered by no <Text> on this screen`).toBeGreaterThan(0)
      // ⭐ EVERY rendering site, ⛔ not just the first: a key shown in two places must announce in
      // both, and `vpa_invalid` really is shown twice (inline, and via the failure notice).
      for (const el of rendered) {
        const openTag = el.slice(0, el.indexOf('>') + 1)
        expect(openTag, `${anchor} renders without a live region`).toContain('accessibilityLiveRegion')
        expect(openTag, `${anchor} renders with the WRONG live-region urgency`).toContain(
          `accessibilityLiveRegion="${value}"`,
        )
      }
    }
  })

  it('⭐ the SAVE outcome is `polite` and the FAILURE notice is `assertive` — ⛔ not both the same', () => {
    // ⚠ The distinction is the point, ⛔ not decoration. `saved` is good news and must ⛔ not
    // interrupt whatever the family is being read; `notice` means the save did ⛔ NOT happen, and
    // waiting politely to say so is the wrong posture on a screen about a death claim.
    const saved = elementsRendering(src, "t('nominee.bank.saved')")
    expect(saved).toHaveLength(1)
    expect(saved[0]!).toContain('accessibilityLiveRegion="polite"')
    // ⚠ 2026-09-23 (code review): the role is PINNED too — `alert` is the interrupting role the
    // 2026-09-22 patch removed from good news, and reverting it passed every test in this file.
    expect(saved[0]!).toContain('accessibilityRole="text"')
    expect(saved[0]!).not.toContain('accessibilityRole="alert"')

    const notice = elementsRendering(src, '{notice}')
    expect(notice.length, 'the failure notice is missing from the screen').toBe(1)
    expect(notice[0]!).toContain('accessibilityLiveRegion="assertive"')
  })
})

describe('the two Story 6.18 member surfaces agree with each other', () => {
  it('⭐⭐ `NomineeForm` pairs role+live-region too — the file the review cited as the CORRECT one', () => {
    // ⚠ This is the reference the whole finding rests on: the review's argument was ⛔ not "a live
    // region is good practice" but *"the sibling `NomineeForm` in this same story already pairs
    // them"*. If THAT file ever loses the pairing, the inconsistency argument silently inverts and
    // somebody could "fix" the wrong side. So it is pinned here, beside the file it governs.
    const form = stripComments(read(FORM))
    const alerts = textTags(form).filter((t) => t.includes('accessibilityRole="alert"'))
    expect(alerts.length, 'NomineeForm has no alert — the cited precedent is gone').toBeGreaterThan(0)
    for (const tag of alerts) expect(tag).toContain('accessibilityLiveRegion')
  })
})

describe('nominee-review — the `saved` hold (code review 2026-09-23)', () => {
  const src = stripComments(read(REVIEW))

  it('⭐ `saved` is announced on iOS too — `accessibilityLiveRegion` is Android-only', () => {
    expect(src).toContain("AccessibilityInfo.announceForAccessibility(t('nominee.bank.saved'))")
  })

  it('⛔ the announcement delay is NOT a re-submit window — `saved` blocks Save and every field', () => {
    // A second tap during the delay fired a second bank write and a second navigation.
    expect(src).toMatch(/const canSubmit =[\s\S]*?submit !== 'saved'/)
    expect(src).toMatch(/const busy = [^\n]*submit === 'saved'/)
    expect(src).toMatch(/if \(submit === 'saving' \|\| submit === 'saved'\) return/)
  })

  it('⛔ the delayed navigation does NOT fire once the screen has unmounted', () => {
    const tail = src.slice(src.indexOf('SAVED_ANNOUNCEMENT_DELAY_MS))'))
    expect(tail.indexOf('if (!mountedRef.current) return'), 'no unmount guard after the delay').toBeGreaterThan(-1)
    expect(tail.indexOf('if (!mountedRef.current) return')).toBeLessThan(
      tail.indexOf("router.push('/(claim)/acknowledgement')"),
    )
  })
})

describe('nominee-review — code review 2026-09-23b', () => {
  const src = stripComments(read(REVIEW))

  it('⛔ a member who may NOT edit cannot submit, and every field is locked — ⛔ not just a banner', () => {
    // The ticked 2026-09-20 bullet prescribed "suppress the in-app edit"; only the copy landed.
    expect(src).toMatch(/const canSubmit =[\s\S]*?memberEditable\s*\n/)
    expect(src).toMatch(/const locked = busy \|\| !memberEditable/)
    // ⭐ NON-VACUITY + completeness: the fields exist, and ⛔ none still gates on `busy` alone.
    expect((src.match(/disabled=\{locked\}/g) ?? []).length).toBeGreaterThanOrEqual(5)
    expect(src).not.toContain('disabled={busy}')
  })

  it('⛔ a failed status read is NOT swallowed — the family is told, in an announced alert', () => {
    const catchBody = src.slice(src.indexOf('.nomineeBankStatus(claimCaseId)'))
    expect(catchBody.slice(0, catchBody.indexOf('}, [claimCaseId])'))).toContain('setStatusUnavailable(true)')
    const rendered = elementsRendering(src, "t('nominee.bank.status_unavailable')")
    expect(rendered).toHaveLength(1)
    expect(rendered[0]!).toContain('accessibilityRole="alert"')
    expect(rendered[0]!).toContain('accessibilityLiveRegion="assertive"')
  })

  it('⭐ `saved` is cleared when the screen regains focus — going BACK never finds a locked form', () => {
    expect(src).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{\s*setSubmit\(\(prev\) => \(prev === 'saved' \? 'idle' : prev\)\)/)
  })

  it('⛔ the imperative announcement is iOS-only — TalkBack already speaks the live region', () => {
    expect(src).toContain(
      "if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(t('nominee.bank.saved'))",
    )
  })
})

describe('nominee-review — code review 2026-09-23c', () => {
  const src = stripComments(read(REVIEW))

  it('⭐ the status is RE-READ on every focus, and a later success CLEARS the "unavailable" notice', () => {
    expect(src).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{[\s\S]*?return readStatus\(\)/)
    const body = src.slice(src.indexOf('const readStatus'), src.indexOf('}, [claimCaseId])'))
    expect(body).toContain('setStatusUnavailable(false)')
    expect(body).toContain('setStatusUnavailable(true)')
    // ⛔ …and ⛔ no mount-only copy of the read survives beside it.
    expect(src.match(/\.nomineeBankStatus\(claimCaseId\)/g) ?? []).toHaveLength(1)
  })

  it('⭐ a LOCKED form says why — announced politely — and ⛔ never "saving below will replace…"', () => {
    const locked = elementsRendering(src, "t('nominee.bank.locked')")
    expect(locked).toHaveLength(1)
    expect(locked[0]!).toContain('accessibilityLiveRegion="polite"')
    expect(src).toMatch(/\{!memberEditable && !correctionNeeded \? \(\s*<Text[^>]*>\s*\{t\('nominee\.bank\.locked'\)\}/)
    expect(src).toMatch(/existingBankNames\.length > 0 && memberEditable \?/)
  })
})
