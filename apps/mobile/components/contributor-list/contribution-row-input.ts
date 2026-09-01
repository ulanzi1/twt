// The wire→presenter adapter for the confirmed-contributor row — Story 11b.2b (Task 2; AC9).
//
// Story 11b.2's presenter input is DELIBERATELY not the wire row, and 11b.2 routed this adapter here BY
// NAME: "a render layer must ADAPT: re-nest the row's name fields under `displayName` … and splice
// `pool.letterCode` onto each row. This presenter does not do that and must not … The adapter is 11b.2b's,
// and 11b.2b owes it an AC." That is this module, and it is PURE + RN-free so the pure-Vitest mobile
// harness can reach it (the `panchayat/banner-notice.ts` precedent).
//
// ── IT RE-SHAPES, AND DOES NOTHING ELSE (AC9(4)) ────────────────────────────────────────────────────
// No derivation, no joining, no formatting, no interpretation. In particular it NEVER composes
// `firstName + lastInitial`: the contributor name FORM is UNRULED (Story 11b.2's D9(a) /
// D7-nameform(a), routed to the Trustee Panel), and joining the parts anywhere upstream of the render
// layer would RULE it. The presenter emits the parts; the render layer joins them under the form Story
// 8.3 already ships.
//
// ── `letterCode` IS ONCE PER RESPONSE, NOT PER ROW (AC9(2)) ─────────────────────────────────────────
// The wire shape carries the pool identity ONCE on the response (`pool-contributor-list.ts:73-80,94`)
// and the rows carry only `{ firstName, lastInitial }`. The splice happens here rather than in the
// presenter precisely because reading a RESPONSE shape would take a build dependency on the contract
// from `@twt/ui` — which is the boundary 11b.2 kept clean.
//
// ── ONE KIND, AND NO `rowKey` (AC9(1) + AC9(3)) ─────────────────────────────────────────────────────
// The contributor row has exactly ONE kind, wire to pixel: 11b.2a's D5 removes an erased contributor's
// ROW ENTIRELY (never an anonymized placeholder) and D6(a) dropped the anonymized presenter variant, so
// `{ kind: 'name' }` is the only operand any producer can hand this. And there is NO `rowKey`: D5
// vacated the ruling that would have supplied one, it ships in neither `@twt/ui` interface, and NO value
// may be invented to satisfy a type. The FlashList `keyExtractor` keeps `index` (AC3).
//
// `@twt/contracts` is IMPORTED (type-only), NEVER EDITED (D10(a) / Decision 2026-09-01-171 cl.1). That
// includes `pool-contributor-list.ts:88`'s stale "Epic 9's producer is unbuilt" doc-block — false since
// Story 9.4/9.5, contradicting its own file header at :7-8, a SEPARATE stale-contract issue, and routed
// to Story 11b.3. Do not tidy it while you are in the file, and never re-derive the false premise from it.

import type { ConfirmedContributorRow } from '@twt/contracts'
import type { ContributionRowInput } from '@twt/ui'

/**
 * Re-shape ONE confirmed-contributor wire row into the presenter's per-row input, splicing on the
 * response-level pool letter code.
 *
 * Per-row by shape, deliberately — but ⛔ NOT because the caller windows it. The shipped consumer calls
 * this EAGERLY, once per row, inside a memoized `.map()` computed per data change
 * (`PoolContributorList.tsx`) — ⛔ not once per visible row per scroll frame, which is what this
 * doc-block claimed until the second code review. The per-row SHAPE is what 11b.2's Trap 1 requires
 * (no `deriveContributionListViewModel(rows[])` anywhere), and that holds regardless of how the caller
 * iterates; ⛔ a list-level variant is still forbidden.
 */
export function toContributionRowInput(
  row: ConfirmedContributorRow,
  poolLetterCode: string,
): ContributionRowInput {
  return {
    displayName: {
      kind: 'name',
      firstName: row.firstName,
      lastInitial: row.lastInitial,
    },
    poolLetterCode,
  }
}
