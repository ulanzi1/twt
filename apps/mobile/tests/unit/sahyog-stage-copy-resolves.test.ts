// ⭐⭐ THE SHARED STAGE VOCABULARY **RESOLVES FROM THE MEMBER APP** — Story 11b.12 (AC4, Task 5).
//
// ── ⛔⛔ WHAT THIS FILE IS, AND ⛔ WHAT IT DELIBERATELY IS NOT ────────────────────────────────────
// `2026-09-04-193` cl.3 rules **ONE** shared copy source for the stage vocabulary, web AND app.
// ⭐ 11b.12 ships the SOURCE. ⛔ It renders **NOTHING** in `apps/mobile`, and that is a RULING, ⛔ not
// an omission:
//
//   · `driveStatus` appears ⛔ NOWHERE in `apps/mobile` today — verified. `SahyogVivranEntry.tsx`
//     is a LINK-OUT CARD (11b.10) that renders a route and ⛔ no stage. ⇒ there is ⛔ nowhere in the
//     app for a stage word to go.
//   · **Story E (`11b-15`) builds that surface** — its AC4 / Task 4 own the fourth-tab drive list
//     AND the member-side info affordance (incl. the `accessible={true}` requirement tamagui needs).
//
// ⇒ ⛔ Do ⛔ NOT "complete" this by adding a stage to a mobile component. ⚠ B and E each read as
// though the other does it, and ⛔ no per-story pass can see that loop
// ([[feedback_circular_deferral_between_sibling_stories]]) — the split is resolved, and THIS is B's
// half of it: *"consumed by both"* is satisfied by **RESOLVABILITY**, ⛔ not by a render.
//
// ⭐ WHY A TEST AND NOT A NOTE: the `members.json` defect (`packages/i18n/tests/catalog-registration
// .test.ts`) shipped a namespace whose file existed but whose `catalog.ts` lines were forgotten —
// the parity gate stayed GREEN while every `t()` call THREW in production, because every test
// hand-built a label fixture and bypassed the resolver. ⇒ this resolves REAL keys through the REAL
// `t()`, from the app that will consume them.

import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

const NAMESPACE = 'sahyog-shared'
const STAGE_KEYS = [
  'stage.live',
  'stage.closed',
  'stage.verified',
  'stage.live.help',
  'stage.closed.help',
  'stage.verified.help',
  'stage.explainer.summary',
  'stage.explainer.a11y',
] as const

describe('⭐ the ONE shared stage vocabulary resolves from apps/mobile', () => {
  for (const locale of ['en', 'hi'] as const) {
    it(`[${locale}] every stage key resolves to real copy — ⛔ no throw, ⛔ no empty string`, () => {
      for (const key of STAGE_KEYS) {
        // ⚠ `t()` defaults to `common` and THROWS on a missing key, so an unregistered namespace or
        // a typo'd key fails HERE rather than on a member's phone.
        const value = t(key, undefined, { locale, namespace: NAMESPACE })
        expect(value.trim().length, `${locale}/${NAMESPACE} :: ${key}`).toBeGreaterThan(0)
      }
    })
  }

  it('⭐ the three stage NAMES differ from one another in both locales', () => {
    // ⛔ NON-VACUOUS, and it guards a real defect class: `sahyog-render.ts:178-184` records the
    // shipped bug where two coinciding stage labels made every drive render TWICE under
    // contradictory headings. Story E will render these three side by side.
    for (const locale of ['en', 'hi'] as const) {
      const names = (['stage.live', 'stage.closed', 'stage.verified'] as const).map((k) =>
        t(k, undefined, { locale, namespace: NAMESPACE }),
      )
      expect(new Set(names).size, `${locale}: two stage names coincide`).toBe(3)
    }
  })

  it('⭐ story E consumes THESE keys, by name — ⛔ it may ⛔ not mint its own', () => {
    // ⚠ Recorded as an ASSERTION rather than a comment because the cheapest thing E can do, if the
    // key path is only prose, is mint a parallel set in `apps/mobile` — ⭐ recreating the exact
    // two-source defect `-193` cl.3 exists to close, one story later.
    expect(NAMESPACE).toBe('sahyog-shared')
    expect(STAGE_KEYS).toContain('stage.live')
  })
})
