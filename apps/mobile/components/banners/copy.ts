// Pure banner copy selection — Story 10.9 (Task 7; AC8). No React, no Tamagui, no network.
//
// Split out of `BannerHost.tsx` so it is unit-testable in the mobile harness, which is pure-Vitest
// with no RN component-mount renderer (see apps/mobile/vitest.config.ts + the
// status-pill-render.test.ts precedent). Importing the .tsx would drag Tamagui into a node env.
//
// The banner's OWN copy is AUTHORED bilingual content carried on the row — NOT an i18n catalog key
// (only the dismiss/close chrome is). So language selection happens here rather than in `packages/i18n`.

/** The four authored copy fields, as they arrive on the member DTO. */
export interface BannerCopyFields {
  title: string | null
  body: string | null
  title_hi: string | null
  body_hi: string | null
}

/**
 * HINDI-FIRST selection (AC8). Under the app's default `hi` locale the Hindi variant wins; under
 * `en` the English one does.
 *
 * Either way it FALLS BACK to the other language rather than rendering a blank banner. Publishing
 * requires all four fields (a domain 422 otherwise), so a gap can only mean partial or legacy data —
 * and showing a member the message in the "wrong" language is strictly better than showing them an
 * empty band where a maintenance notice should be. A missing field on BOTH sides yields `''`, which
 * the host renders as nothing at all rather than as an empty element.
 */
/** Treats an empty/whitespace-only string the same as null — the `missingBannerCopyFields` convention. */
function orFallback(primary: string | null, fallback: string | null): string | null {
  return primary && primary.trim() !== '' ? primary : fallback
}

export function selectBannerCopy(
  banner: BannerCopyFields,
  locale: string,
): { title: string; body: string } {
  const hiFirst = locale !== 'en'
  const title = (hiFirst ? orFallback(banner.title_hi, banner.title) : orFallback(banner.title, banner.title_hi)) ?? ''
  const body = (hiFirst ? orFallback(banner.body_hi, banner.body) : orFallback(banner.body, banner.body_hi)) ?? ''
  return { title, body }
}

/**
 * The optimistic-dismissal key. `bannerId:revision`, NOT `bannerId` alone: a COPY REVISION bumps
 * `revision` precisely so the banner re-surfaces for members who dismissed the previous wording
 * (AC3's "unless updated"), and a bare-id key would let a stale local dismissal swallow it.
 */
export function bannerDismissalKey(bannerId: string, revision: number): string {
  return `${bannerId}:${revision}`
}
