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
  // ⛔ no other. ⚠ The `sahyogVivranToken` guard is NOT a second precondition: the field is required
  // by the contract and the API fail-softs the whole card to `{ assigned: false }` when it cannot be
  // read, so this is the type-narrowing that records that ⛔ no address is ever invented here.
  if (!data || !data.assigned) {
    return null
  }

  return (
    <Button
      // ≥56pt — the same touch target the card's contribute CTA uses (UX family 13).
      height={56}
      chromeless
      justify="flex-start"
      // ⛔ `link`, ⛔ not `button`: it leaves the app for the public site, and a screen reader should
      // say so before the member commits to the tap.
      accessibilityRole="link"
      accessibilityLabel={t('sahyog_vivran.entry_a11y', undefined, NS)}
      accessibilityHint={t('sahyog_vivran.entry_hint', undefined, NS)}
      onPress={() => {
        void Linking.openURL(sahyogVivranUrl(data.sahyogVivranToken, locale))
      }}
    >
      {t('sahyog_vivran.entry_cta', undefined, NS)}
    </Button>
  )
}
