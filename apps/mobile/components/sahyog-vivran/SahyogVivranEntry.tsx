// <SahyogVivranEntry> — the `live`-drive INBOUND PATH (Story 11b.10, Task 6; AC4, D4).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐⭐ WHY THIS COMPONENT EXISTS AT ALL
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// `2026-09-03-184` **(A)** (Trustee-ratified) answered YES: a `live` drive SHOULD be publicly
// reachable. **(B)** made its address UNGUESSABLE — which removed the only way anyone HAD of getting
// there (constructing the sequential `P-YYYY-MM-###`). ⇒ landing (B) without a path would have made
// the entire Sahyog Vivran surface reachable by NOBODY and silently inverted (A), while passing
// every gate and looking like a security improvement. THIS is the other half of that one deliverable
// (`-184` cl.4 as widened by `2026-09-04-185` cl.3), and ⛔ the two must not be separated.
//
// ⛔⛔ AND IT IS ⛔ NOT THE SHRADHANJALI TAB, despite that tab's name. `(tabs)/shradhanjali.tsx`
// renders `SAMPLE_CONTRIBUTORS` / `SAMPLE_MEMORIAL` from `./sample-data` and has ZERO API wiring —
// it is a P0-5 measurement prototype (Story 0.14 §4 FM-2). Putting the entry there would have
// silently re-scoped this story into building the memorial surface's data layer. ⭐ D4 ruled Tab 1,
// "My Pool" (`(tabs)/index.tsx`), because it is ALREADY reading the exact pool in question.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// ⭐ THE SHAPE IS ALREADY RULED — ⛔ this is NOT a fresh design question
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Story 8.3's **D8** ruled the affordance shape for exactly this situation: a SIBLING of
// <ActiveContributionCard>, ⛔ NEVER a field inside it (8.2 owns the card body). ⇒ this follows
// `components/contributor-list/ViewContributorsEntry.tsx` deliberately and exactly — `return null`
// to self-suppress, a pressable row, ≥56pt, Hindi-first copy through `t()`.
//
// ⛔⛔ IT SELF-SUPPRESSES IN **LOCK-STEP** WITH THE CARD, and that is load-bearing, not tidiness.
// It gates on the SAME `useActiveContributionQuery` the card gates on (⛔ unlike
// ViewContributorsEntry, which deliberately gates on the contributor-list query because its
// DESTINATION resolves that query — see its own header). Here the destination's address IS a field
// on the card's query, so the card's query is the exact precondition: an entry that outlived the
// card would be a DEAD LINK on the member's home screen.
//
// ⛔ THE TOKEN IS SERVER-RETURNED (`sahyogVivranToken`). ⛔ Nothing here derives an address from
// `poolId` or `poolCanonicalIdentifier` — that would re-create D2's guessability inside the client.
// See `lib/public-site.ts`, which states the same discipline for `clauseId`.
//
// ⚠ AN OUTBOUND `Linking.openURL`, ⛔ not an in-app route (precedent: `(auth)/terminated.tsx:94`).
// Every route outside `(auth)` is behind the root session guard, so an in-app view of PUBLIC trust
// content would put that content back behind a gate. ⛔ And there is no in-app route to add: D4
// ruled ⛔ no new route group, ⛔ no notification, ⛔ no 8th FR-71 category, ⛔ no deep-link resource.

import { useLocale, useT } from '@twt/i18n/react'
import { Linking } from 'react-native'
import { Button } from 'tamagui'

import { useActiveContributionQuery } from '../active-contribution/useActiveContributionQuery'
import { sahyogVivranUrl } from '../../lib/public-site'

const NS = { namespace: 'contribution' } as const

export function SahyogVivranEntry() {
  const t = useT()
  // ⚠ `useLocale()` — the house hook (`LockInClockWidget`, `(auth)/terminated.tsx`). ⛔ NOT a value
  // derived from `useT()`: `useT()` returns a FRESH CLOSURE on every render, so depending on `t`
  // for anything but calling it defeats memoization ([[project_uset_fresh_closure_memo_trap]]).
  const { locale } = useLocale()
  const { data } = useActiveContributionQuery()

  // ⛔ LOCK-STEP WITH THE CARD: the same `{ assigned }` discriminated union the card reads. The card
  // renders only for an `active` member assigned to a pool whose cycle alert is `live` — precisely
  // the `live` drive AC4 owes a path to — and this entry appears under exactly that condition and
  // ⛔ no other.
  //
  // ⚠ THE `sahyogVivranToken` CHECK — added by code review. A LIVE server response always carries it
  // (the contract requires it and `member-pool` fail-softs the whole card to `{ assigned: false }`
  // when the token read returns null), so on the happy path this is pure type-narrowing that records
  // ⛔ no address is ever invented here. ⛔ BUT `useActiveContributionQuery` is PERSISTED TO MMKV and
  // rehydrated verbatim with ⛔ no `buster` on `persistOptions` (`components/Provider.tsx`): after an
  // app upgrade a pre-11b.10 `{ assigned: true }` card comes back with ⛔ no `sahyogVivranToken` key
  // and ⛔ no Zod re-parse. Without this guard the entry would render and open
  // `…/sahyog-vivran/undefined` until the refetch lands — never, on an offline cold start. ⇒ an
  // entry that outlives a usable token is the same dead link as one that outlives the card.
  if (!data || !data.assigned || !data.sahyogVivranToken) {
    return null
  }

  return (
    <Button
      // ≥56pt — the same touch target the card's contribute CTA uses (UX family 13).
      height={56}
      chromeless
      justify="flex-start"
      // ⭐⭐ EXPLICIT `accessible` — ⛔ WITHOUT THIS THE THREE PROPS BELOW ARE ⛔ NEVER ANNOUNCED
      // (family 13 check (a); review 2026-09-04). Tamagui's `Button` is `styled(View, …)`
      // (`@tamagui/button` `Button.native.js`), and `@tamagui/web`'s `createComponent.native.js`
      // sets `accessible` ⛔ NOWHERE — so this is a plain RN `View`, and an RN `View` is ⛔ not an
      // accessibility element unless it says so. The inner `Text` would be focused instead and the
      // role, label and hint would ⛔ all be dropped on the floor.
      // ⚠⛔ ⛔ DO ⛔ NOT ASSUME `Pressable` SEMANTICS HERE. The repo's worked example states the
      // mechanism in terms: *"RN sets `accessible={true}` on `Pressable` by DEFAULT, and that is the
      // ONLY reason …"* (`components/panchayat/PinnedItem.tsx:42`, grouping at `:107`). A tamagui
      // `Button` is ⛔ not a `Pressable`, so ⛔ nothing supplies it for us.
      accessible={true}
      // ⛔ `link`, ⛔ not `button`: it leaves the app for the public site, and a screen reader should
      // say so before the member commits to the tap.
      accessibilityRole="link"
      accessibilityLabel={t('sahyog_vivran.entry_a11y', undefined, NS)}
      accessibilityHint={t('sahyog_vivran.entry_hint', undefined, NS)}
      onPress={() => {
        // ⚠ `Linking.openURL` REJECTS when no handler can open the URL (⛔ it does not resolve
        // false), so a bare `void` leaves an unhandled rejection on a member's home screen.
        // ⭐ The house shape is `LockInClockWidget.tsx`'s: await inside try/catch and fail QUIETLY —
        // there is nothing useful to say to the member, and ⛔ never a red box on Tab 1.
        // ⛔ Do ⛔ not copy `(auth)/terminated.tsx:94`, which is the weaker of the two precedents.
        void (async () => {
          try {
            await Linking.openURL(sahyogVivranUrl(data.sahyogVivranToken, locale))
          } catch {
            // Intentionally silent — see above.
          }
        })()
      }}
    >
      {t('sahyog_vivran.entry_cta', undefined, NS)}
    </Button>
  )
}
