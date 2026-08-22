// The Panchayat Noticeboard's mobile-palette bridge — Story 11a.5 (Task 3; AC3 / Decision
// 2026-08-22-152 D6(a)).
//
// ⭐ THE ONLY PLACE a noticeboard notice CATEGORY (or its hairline rule) becomes a colour. FM-14 #2 —
// colours come from a token authority, never a magic literal. The `StatusPill` `TONE_TOKENS` /
// `BannerHost` `SEVERITY_TOKENS` precedent, and the shape D6(a) ruled: ONE named semantic→Tamagui-scale
// map, `as const satisfies Record<NoticeCategory, …>`, so the mapping is EXHAUSTIVE BY TYPE and a new
// category cannot compile without a colour.
//
// ── Why not `@twt/tokens` directly (D6(b), refused) ─────────────────────────────────────────────────
// `apps/mobile` does not depend on `@twt/tokens`, and `tamagui.config.ts` overrides FONTS ONLY — so
// `stamp-mudra` and `rule-hairline` do not exist in the mobile theme. Importing the hex would bypass the
// Tamagui theme entirely, and those colours would stop responding to theme switching while every
// neighbouring colour still did.
//
// ── Why not bridge `@twt/tokens` into `tamagui.config.ts` (D6(c)) ───────────────────────────────────
// ⚠ That is the architecturally RIGHT answer and the only one that makes `stamp-mudra` a real mobile
// token. It was declined ON BLAST RADIUS, not on merit — it re-themes EVERY mobile surface from inside a
// story scoped to one tab — and is ROUTED in `deferred-work.md` with an explicit re-trigger: the next
// story that needs a `@twt/tokens` colour role on RN. At that point this map, `TONE_TOKENS` and
// `SEVERITY_TOKENS` become the migration list, not obstacles.
//
// ⚠ Accepted cost, stated so it is not rediscovered as a surprise: the mobile palette is ALIGNED TO
// rather than DERIVED FROM `@twt/tokens` — an honest, already-accepted variance (`StatusPill.tsx:43-44`
// states it in terms), not a new one. Each entry below names the role it aligns to.

import type { NoticeCategory } from '@twt/ui'
import type { ColorTokens } from 'tamagui'

/**
 * Category → the 4pt left-stub colour (`ux-design-specification.md:1817`). The vocabulary is §1819's,
 * ruled canonical by D2(a); ⛔ `saffron` is gone, and ⚠ `black` means SCHEDULED MEETING here, not
 * bereavement (§491's meaning, superseded).
 *
 * ⛔ The stub is DECORATIVE (§1820): the category is also conveyed in the screen-reader label, so the
 * treatment is never colour-only.
 */
export const CATEGORY_TOKENS = {
  // close-of-cycle celebration — aligned to `@twt/tokens` `stamp-mudra` (#a23b2e, the warm-red ceremonial
  // seal accent): the noticeboard's one celebratory mark, and the same family the Pariwar seal carries.
  terracotta: { stub: '$red9' },
  // milestone — aligned to `status-confirmed` (#0f5132, the confirmed/green family).
  green: { stub: '$green9' },
  // scheduled meeting — aligned to `ink-primary` (#1a1a1a): the plain near-black of a ruled notice.
  black: { stub: '$gray12' },
  // generic — aligned to `status-grey-takeover` (#6b6b6b): a quiet mid-neutral, deliberately DISTINCT
  // from `black` so "a meeting is scheduled" and "here is a notice" do not read as the same mark.
  ink: { stub: '$gray9' },
} as const satisfies Record<NoticeCategory, { stub: ColorTokens | string }>

/**
 * The section-separating rule. Aligned to `@twt/tokens` `rule-hairline` (#d8d4c8) — ⚠ a WARM LIGHT rule,
 * which is why the prototype's `bg="#000000"` was wrong on two counts (a magic literal, and the wrong
 * colour). `$borderColor` is the theme-aware Tamagui equivalent and is already what every other hairline
 * on this surface uses.
 */
export const RULE_HAIRLINE_TOKEN = '$borderColor'

/**
 * The `accessibilityHint` KEY per category (the `noticeboard` namespace).
 *
 * ⚠ THIS MAP IS THE CORRECTION D2(a) FORCES, not a re-keying. The prototype mapped `black` → "memorial"
 * and `saffron` → "governance", which were §491's meanings. Under §1819 `black` is a SCHEDULED MEETING
 * and `saffron` does not exist — so carrying the old hint across would have told a screen-reader user
 * "memorial" about a meeting notice.
 */
export const CATEGORY_HINT_KEYS = {
  terracotta: 'open_detail_terracotta',
  green: 'open_detail_green',
  black: 'open_detail_black',
  ink: 'open_detail_ink',
} as const satisfies Record<NoticeCategory, string>
