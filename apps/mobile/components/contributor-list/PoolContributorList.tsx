// <PoolContributorList> — the Live Contributor List view (Story 8.3; the sibling of 8.2's
// <ActiveContributionCard>, extended from the aggregate progress meter to the NAMED confirmed rows).
// The member-facing live-pool view the My Pool card links to (D8 — NOT rendered inside the card). For an
// `active` member assigned to a pool whose cycle alert is `live` it renders the pool identity + the
// virtualized list of RECONCILIATION-CONFIRMED contributors (first-name + last-initial) + an AGGREGATE
// pending strip (count + percentage, NO member identity). For every other case it renders a calm,
// non-alarming placeholder (never an error wall).
//
// ── Confirmed-only, and honestly empty WHEN IT IS EMPTY (AC1/AC4/D1/D2) ─────────────────────────────────
// The confirmed rows source EXCLUSIVELY from `contribution.confirmed` (server-side; the client resolves
// nothing about confirmation status). That producer is LIVE — the Epic 9 matcher has populated it since
// Story 9.4/9.5, so this list is live, not structurally empty (AC10; the contract says the same at
// `pool-contributor-list.ts:7-8`). Never read population from a comment. The empty branch below is the
// honest render of a genuinely empty read AND of a read where no row could be derived — its copy speaks
// about NAMES rather than about whether anyone contributed, so it is truthful for both and asserts an
// empty pool in neither (⛔ the sentence is not quoted here: D7(c) re-worded it once already, and
// 11b.2a's AC8 forbids pinning it). The copy REPORTS STATE, it never attributes responsibility
// ("Nobody has contributed."). Same neutral register for the pending strip.
//
// ⚠ An erased contributor is OMITTED ENTIRELY from `confirmed` — never an anonymized placeholder row
// (11b.2a's D5) — while still counting toward `pending`/`confirmedCount` (D3-aggregate). So `confirmed`
// and the aggregate figures LEGITIMATELY DIVERGE, by design: never assert equality between them.
//
// ── Virtualization (AC3 / UX-DR80 / D7) ─────────────────────────────────────────────────────────────────
// The confirmed rows are virtualized with `@shopify/flash-list` (the ratified P0-5 choice; the same pattern
// as ShradhanjaliSahyogVivran including the `FlashList as any` React-19 + new-arch prop-typing cast). NO
// full-set render into the native view (the architecture-committed property) — the Sahyog contributor scroll
// reaches ~16k, so FlashList is mandatory at that scale even though the confirmed set is small early in a cycle.
//
// ── Numeral discipline (amendment-A2 / D6) + a11y (AC6) ─────────────────────────────────────────────────
// The pending count/percentage are OPERATIONAL figures → LATIN numerals even in Hindi (never toHindiNumeral;
// the microcopy UX-DR73 gate enforces it). Every row is semantically labeled; the pending strip is the
// surface's SINGLE ambient status, announced `accessibilityLiveRegion="polite"` (never assertive).

import { useLocale, useT } from '@twt/i18n/react'
import { FlashList } from '@shopify/flash-list'
import { deriveContributionRowViewModel } from '@twt/ui'
import type { ContributionRowViewModel } from '@twt/ui'
import type { ConfirmedContributorRow } from '@twt/contracts'
import { useCallback, useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { Paragraph, Text, View, YStack } from 'tamagui'

import { toContributionRowInput } from './contribution-row-input'
import { usePoolContributorsQuery } from './usePoolContributorsQuery'

/** The contribution i18n namespace (shared with 8.2's card copy). */
const NS = { namespace: 'contribution' } as const

// `__DEV__` is an RN/Metro global. ⛔⛔ `declare const` is TYPE-LEVEL ONLY and emits NOTHING, so a BARE
// `if (__DEV__)` compiles to a bare identifier read — which is a **ReferenceError**, ⛔ not `undefined`,
// anywhere Metro has not injected the global (node/Vitest, SSR, react-native-web, Storybook).
// ⚠⚠ THE `typeof` GUARD IS LOAD-BEARING, ⛔ NOT STYLE: the only consumer below sits INSIDE A CATCH
// BLOCK, so a throw there ESCAPES the per-row guard entirely, escapes the memo, and red-boxes the whole
// surface — reintroducing the exact Trap-1 failure the guard exists to prevent, ON the recovery path.
// Caught at the third code review; the `lib/loop-timing-store.ts:29` precedent is this `typeof` form,
// and the second review cited that precedent while ⛔ not following it.
declare const __DEV__: boolean | undefined
const isDevBuild = (): boolean => typeof __DEV__ !== 'undefined' && __DEV__ === true

/** Stable empty-row identity. A fresh `[]` literal would be a new reference on every render and would
 *  invalidate the memo below in the not-yet-assigned case, which is the case that renders most often. */
const NO_ROWS: ConfirmedContributorRow[] = []

// The row type is the CONTRACT's, imported type-only above — there is deliberately no local mirror of it
// here (D10(a) / Decision 2026-09-01-171 cl.1). `pool-contributor-list.ts:14` declares the discipline in
// terms ("NO type-shadowing"), and the shadow this file used to carry was not even a duplicate: the SDK
// already returns `ConfirmedContributorRow[]`, so it only re-annotated what TypeScript infers. A local
// mirror does not fail typecheck when the contract widens, which is exactly the Story 11b.1 defect class.
//
// ⚠ Its removal is why `renderItem`/`keyExtractor` parameters change SPELLING and lose a `readonly`
// modifier (`z.output` is not readonly). Both are type-level only — AC5's preservation is BEHAVIOURAL,
// not textual — and re-declaring a local type to "restore" `readonly` would reinstate the shadow.

export function PoolContributorList() {
  const t = useT()
  const { locale } = useLocale()
  const { data, isLoading } = usePoolContributorsQuery()

  // ⛔⛔ THE DERIVATION HOOKS RUN UNCONDITIONALLY, ABOVE THE EARLY RETURNS. That placement is what makes
  // memoizing legal at all (rules of hooks), and the memo is load-bearing rather than polish: `useT()`
  // returns a FRESH closure on every render (`packages/i18n/src/react.ts:56-58`), so before this the
  // whole list re-derived on EVERY render, and FlashList's `ViewHolder` memo comparator — which includes
  // `prevProps.renderItem === nextProps.renderItem` — re-rendered every visible cell along with it,
  // defeating cell memoization wholesale. Same class as the `PanchayatNoticeboard.tsx:98` note.
  const assigned = data && data.assigned ? data : null
  const confirmedRows = assigned ? assigned.confirmed : NO_ROWS
  const poolLetterCode = assigned ? assigned.pool.letterCode : ''

  // ── THE PER-ROW GUARD, AND WHAT IT ACTUALLY COVERS ──────────────────────────────────────────────────
  // It degrades ONE row rather than letting a throw hide every good row behind one bad one (Trap 1 /
  // 11b.2's D8(a); the Story 9.12 `<ActiveContributionCard>` shape at `:123-138`).
  // ⚠⚠ ITS REAL COVERAGE IS NARROWER THAN THIS COMMENT ONCE CLAIMED, and the claim is CORRECTED here
  // rather than the guard widened (second code review, decision 1 → (b)):
  //   · the presenter's throw arm is UNREACHABLE from this call site — the adapter hardcodes
  //     `kind:'name'` (`contribution-row-input.ts:50`) and the wire row is `.strict()` with
  //     `firstName: z.string().min(1)`, so `deriveContributionRowViewModel` cannot throw here today;
  //   · a SYSTEMIC namespace miss does ⛔ NOT reach the `!hasRenderableRow` fallback below.
  //     `rowA11y.ref.namespace` is `'contribution'` (`i18n-keys.ts:38`) — the SAME namespace as `NS` —
  //     so `t('contributor_list.title', …)` in the header throws FIRST and the whole surface goes to
  //     expo-router's `ErrorBoundary` (`app/_layout.tsx:33`). ⭐ That boundary IS the surface-level
  //     answer, by ruling; this guard is ⛔ not it and must ⛔ not be described as it.
  //   ⇒ the guard's ONE live trigger is a `contributor_list.row_a11y`-KEY-only miss: it degrades the
  //     affected rows, and if it hits every row the list falls to the empty-state branch.
  const renderableRows = useMemo(
    () =>
      confirmedRows.map((item): { label: string; ariaLabel: string } | null => {
        try {
          const vm: ContributionRowViewModel = deriveContributionRowViewModel(
            toContributionRowInput(item, poolLetterCode),
          )
          // The JOIN lives here, in the render layer, and nowhere upstream: the presenter emits name
          // PARTS and never composes them, because the contributor name FORM is UNRULED (D9(a) /
          // D7-nameform(a), routed to the Trustee Panel). This is the form Story 8.3 already ships.
          const label = vm.displayName.lastInitial
            ? `${vm.displayName.firstName} ${vm.displayName.lastInitial}`
            : vm.displayName.firstName
          // The KEY AND ITS NAMESPACE BOTH COME FROM THE PRESENTER'S REF, never guessed here — `t()`
          // defaults to `common` and THROWS on a miss, and the namespace is the THIRD argument (passing
          // it second lands it in the params slot and throws on every call). The `{name}` param is the
          // render layer's, deliberately: the presenter does not fill it.
          const ariaLabel = t(vm.rowA11y.ref.key, { name: label }, { namespace: vm.rowA11y.ref.namespace })
          return { label, ariaLabel }
        } catch (error) {
          // ⚠ NOT SILENT — and that is the point. The file header records that `confirmed` and the
          // aggregate figures LEGITIMATELY diverge (an erased contributor is omitted, 11b.2a's D5), so
          // WITHOUT a signal here a RENDER FAILURE is indistinguishable from a LAWFUL ERASURE and
          // nothing is left to tell them apart (second code review, patch 11). Dev-only, and ⛔ NO
          // member data in the message: the row's name parts are exactly what must never reach a log
          // ([["anonymous" diagnostic log convention]] — the signal is the ACTION, never the subject).
          // ⚠ The message states ⛔ NO member data — the row's name parts are exactly what must never
          // reach a log. `error.message` is safe to include: every resolver throw carries the param
          // NAME, key, namespace and locale, ⛔ never a param VALUE (`resolver.ts:39,59,64`, verified).
          if (isDevBuild()) {
            console.warn(
              '[PoolContributorList] a confirmed row failed to derive and was dropped from the list. ' +
                '⚠ NOTHING on this surface accounts for it: the row is CONFIRMED, so the pending strip ' +
                'does not count it, and this component renders no confirmed total. Cause: ' +
                (error instanceof Error ? error.message : String(error)),
            )
          }
          return null
        }
      }),
    // ⚠⛔ `t` is DELIBERATELY NOT a dependency. `useT()` returns a FRESH closure on every render
    // (`packages/i18n/src/react.ts:56-58`), so listing it would defeat this memo entirely — the exact
    // "silently defeated memo" class recorded at `PanchayatNoticeboard.tsx:98`. `t` is PURE given the
    // locale (it reads the module catalog), so `locale` is the real input and `locale` is what is listed.
    [confirmedRows, poolLetterCode, locale],
  )
  const hasRenderableRow = useMemo(() => renderableRows.some((row) => row !== null), [renderableRows])

  // `useCallback` is load-bearing, not polish: FlashList's `ViewHolder` memo comparator includes
  // `prevProps.renderItem === nextProps.renderItem`, so a fresh closure here re-renders EVERY visible
  // cell on every parent render.
  const renderItem = useCallback(
    ({ index }: { index: number }) => {
      const renderable = renderableRows[index]
      if (!renderable) return null

      return (
        <View
          px="$5"
          py="$3"
          borderBottomWidth={StyleSheet.hairlineWidth}
          borderBottomColor="$borderColor"
          bg="$background"
          accessible
          accessibilityRole="text"
          accessibilityLabel={renderable.ariaLabel}
        >
          <Text fontFamily="$body" fontSize="$4" color="$color">
            {renderable.label}
          </Text>
        </View>
      )
    },
    [renderableRows],
  )

  // Loading is distinct from true absence (Review fix) — showing the "no live pool" copy while the first
  // fetch is still in flight would assert a false claim (this screen is only reached once the member is
  // already known to be assigned). A neutral loading placeholder, never the absence copy, during the fetch.
  if (isLoading) {
    return (
      <YStack flex={1} bg="$background" px="$5" py="$6" gap="$2" accessibilityRole="summary">
        <Text fontFamily="$body" fontSize="$4" color="$colorPress" accessibilityRole="text">
          {t('loading', undefined, { namespace: 'common' })}
        </Text>
      </YStack>
    )
  }

  // Self-suppress / fail-soft (AC1) — a calm placeholder for true absence or error. Never an error wall.
  if (!data || !data.assigned) {
    return (
      <YStack flex={1} bg="$background" px="$5" py="$6" gap="$2" accessibilityRole="summary">
        <Text fontFamily="$body" fontSize="$4" color="$colorPress" accessibilityRole="text">
          {t('contributor_list.no_pool', undefined, NS)}
        </Text>
      </YStack>
    )
  }

  const poolTitle = data.pool.name ?? `Pool ${data.pool.letterCode}`
  // Operational figures — Latin numerals even in Hindi (amendment-A2 / D6). `String(...)` keeps them Latin.
  const pendingCount = String(data.pending.count)
  const pendingPercentage = String(data.pending.percentage)

  return (
    <YStack flex={1} bg="$background" accessibilityRole="summary">
      {/* Passbook register header — hairline rule below, no fintech chrome. */}
      <YStack px="$5" pt="$5" pb="$3" gap="$1" borderBottomWidth={1} borderColor="$borderColor">
        <Text fontFamily="$body" fontSize="$2" color="$colorPress" accessibilityRole="text">
          {t('contributor_list.title', undefined, NS)}
        </Text>
        <Text fontFamily="$body" fontSize="$7" color="$color" accessibilityRole="header">
          {poolTitle}
        </Text>
        <Text fontFamily="$body" fontSize="$3" color="$colorPress" accessibilityRole="text">
          {t('contributor_list.confirmed_header', undefined, NS)}
        </Text>
      </YStack>

      {/* Confirmed rows — virtualized (AC3). The empty branch renders a calm, state-reporting placeholder
          (NOT an error; a low/empty list is not a failure — the 8.2 "low meter is not danger"). It is a
          SIBLING of the list, never a ListEmptyComponent: New-Arch FlashList red-boxes crossing
          empty→populated IN PLACE, and the 60s poll makes that transition routine (Trap 2).
          ⚠ TWO states share this branch, and the copy is truthful for BOTH: a genuinely empty read, and
          a non-empty read where NO row could be derived (the SIXTH reachable state, added by the first
          code review and enumerated in AC7's family-13(d) list only at the second). The copy reports
          "no contributor NAMES to show" — a statement about names, not about whether anyone contributed
          — so it never asserts an empty pool. ⛔ Do not "simplify" the first disjunct away: it is
          redundant (an empty array has no renderable row) and KEPT deliberately, because the two
          conditions are different facts and the branch reads as the union it is. */}
      {confirmedRows.length === 0 || !hasRenderableRow ? (
        // Family-13 check (a), made EXPLICIT — ⚠ CAUGHT AT THE COMBINED REVIEW (2026-09-01). This
        // branch carried `accessibilityRole="text"` on a container that was ⛔ NOT an accessibility
        // element, and the inner `<Text>` carried ⛔ no role either — so the role was INERT and this
        // was the ONLY one of the five state branches shaped that way (loading `:186-187` and absence
        // `:197-198` both put the role on the inner `<Text>`; the row `:168` and the pending strip
        // `:287` both declare `accessible`). ⛔⛔ The irony is the point: this same diff ADDED
        // `accessible` to the pending strip citing "relying on that default is exactly how check (a)
        // has failed silently in this codebase before" — and did not apply that reasoning one branch
        // up. ⭐ `accessible` groups the child text and announces it under the declared role (the
        // `panchayat/PinnedItem.tsx` explicit-grouping precedent the checklist points at).
        <YStack px="$5" py="$6" accessible accessibilityRole="text">
          <Text fontFamily="$body" fontSize="$4" color="$colorPress">
            {t('contributor_list.empty', undefined, NS)}
          </Text>
        </YStack>
      ) : (
        <View flex={1}>
          {(() => {
            // FlashList v2 prop-typing wrinkle under React 19 + new arch — cast as any (the ratified
            // ShradhanjaliSahyogVivran pattern). Runtime behavior unchanged.
            // ⚠ THE CAST HAS A COST, PAID ONCE ALREADY: it suppresses unknown-prop errors, which is how
            // an `estimatedItemSize` prop survived here after v2 REMOVED it (verified absent from
            // `FlashListProps.d.ts` in `@shopify/flash-list@2.0.2`) — inert, forwarded as an unknown
            // prop, with a dead constant behind it. Removed at the second code review; ⛔ do not
            // reintroduce a sizing prop without checking it exists in the installed major.
            // ⚠ `data` is the UNFILTERED wire array, deliberately: `renderItem` maps index→derived row,
            // so a failed row renders `null` and FlashList v2 SELF-MEASURES it to zero height (it does
            // ⛔ not leave a reserved-height hole). It is still counted by `keyExtractor` and by
            // `data.length` — a dropped row is invisible to the READER, ⛔ not to the list.
            const FlashListAny = FlashList as any
            return (
              <FlashListAny
                data={confirmedRows}
                renderItem={renderItem}
                // UNCHANGED BY RULING (AC3). The 8.3 code-review deferral on `index` STAYS OPEN: its
                // recorded blocker — the PII-shielded shape carries no stable per-member identifier —
                // is still true, because D5 vacated the `rowKey` that would have supplied one. Its
                // re-trigger is the Epic 11b PUBLIC render (Story 11b.3), not this member surface.
                keyExtractor={(item: ConfirmedContributorRow, index: number) =>
                  `${item.firstName}-${item.lastInitial}-${index}`
                }
              />
            )
          })()}
        </View>
      )}

      {/* Pending strip — AGGREGATE count + percentage ONLY (D3), NO per-member identity. The surface's
          single ambient status, announced polite (never assertive). Neutral/aggregate — no shame framing. */}
      <YStack px="$5" py="$4" borderTopWidth={1} borderColor="$borderColor">
        <Paragraph
          fontFamily="$body"
          fontSize="$3"
          color="$colorPress"
          // Family-13 check (a), made EXPLICIT rather than inherited (Story 11b.2b, AC7). RN treats a
          // `Text` as an accessibility element by default, so this strip's label was announced — but
          // relying on that default is exactly how check (a) has failed silently in this codebase
          // before (the 11a.6 `<PinnedItem>` note: dropping the `Pressable` dropped the mechanism that
          // was carrying the guarantee). The label is load-bearing here — it is the ONLY place the
          // aggregate is stated as a sentence — so the element declares itself.
          accessible
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          accessibilityLabel={t(
            'contributor_list.pending_strip_a11y',
            { count: pendingCount, percentage: pendingPercentage },
            NS,
          )}
        >
          {t('contributor_list.pending_strip', { count: pendingCount, percentage: pendingPercentage }, NS)}
        </Paragraph>
      </YStack>
    </YStack>
  )
}
