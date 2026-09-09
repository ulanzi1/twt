// Pure formatting helpers for `<MemberDriveList>` — Story 11b.15, AC3's floor.
//
// [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09), SECOND pass:
// extracted out of `MemberDriveList.tsx` into a PLAIN `.ts` file (no `react`/`react-native`/`tamagui`
// imports) precisely so a test can `import` and CALL these functions directly. `MemberDriveList.tsx`
// pulls in `@shopify/flash-list`/`tamagui`/`@twt/i18n/react`, which this repo's pure-Vitest harness
// (no `@testing-library/react-native`) cannot load — confirmed by trying (`SyntaxError: Unexpected
// token 'typeof'`, from a transitive React Native dependency's Flow syntax). Every OTHER assertion in
// `tests/unit/drive-list-render.test.ts` works around that by scanning the `.tsx` source as TEXT; that
// technique can prove a function is REFERENCED but never that it computes the right ANSWER. Moving the
// two functions with real, checkable output here removes the need for that tradeoff on this file.

/**
 * ⭐ Format a drive's close/settle instant the same way the public index does — IST, `DD-MM-YYYY`, in
 * `apps/public/src/lib/sahyog-render.ts`'s `formatClosedAt`/`IST_OFFSET_MS`. ⚠ DUPLICATED rather than
 * relocated into `@twt/i18n`: unlike the two Sahyog money forms this story already moved there, this
 * is a plain mechanical date format with no Trustee ruling behind it, so a second small copy is not
 * the fork a second copy of a RULED number form would be, and it leaves the public surface untouched
 * (AC8).
 *
 * ⛔ Returns `null` for an unparseable `iso` — matching the public formatter's guard exactly.
 * `entry.closedAt` is validated `Iso8601Datetime` (`z.string().datetime({ offset: true })`) at the
 * wire boundary and is always a real `Date#toISOString()` output server-side, so this is defense in
 * depth rather than a reachable path today — kept anyway, matching the function it copies.
 */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

export function formatClosedAtIst(iso: string): string | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const ist = new Date(d.getTime() + IST_OFFSET_MS)
  const yyyy = String(ist.getUTCFullYear()).padStart(4, '0')
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(ist.getUTCDate()).padStart(2, '0')
  return `${dd}-${mm}-${yyyy}`
}

/**
 * ⭐ Map the close-of-cycle funding-outcome enum onto its i18n key, EXHAUSTIVELY. Mirrors
 * `apps/public/src/lib/sahyog-render.ts`'s `framingFor` exactly: an explicit switch with a `never`
 * exhaustiveness guard, so a widened `MemberDriveFundingOutcome` enum fails at BUILD time here rather
 * than resolving to an unmapped `outcome.*` key at runtime — `t()` THROWS on a miss, which would
 * crash the WHOLE row's render, not just this one field.
 */
export function outcomeFramingKey(outcome: 'fully_funded' | 'partial' | 'under_funded'): string {
  switch (outcome) {
    case 'fully_funded':
      return 'outcome.fully_funded'
    case 'partial':
      return 'outcome.partial'
    case 'under_funded':
      return 'outcome.under_funded'
    default: {
      const _never: never = outcome
      throw new Error(`[MemberDriveList] unhandled funding outcome: ${String(_never)}`)
    }
  }
}
