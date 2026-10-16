// Which ONE reminder card the home shows (Story 6.36c, Task 6.2; AC6; RV7) — PURE, unit-tested in
// `tests/unit/home-cards.test.ts`.
//
// The home is already long, so ONE container shows the FIRST card that applies and is ⛔ dismissed, in this order:
//   (c) a suggested workplace → (a) add your workplace → (e) someone can no longer be asked → (d) a new workplace — check
//   the people who know you → (f) the campaign → (b) invite your colleagues.
// ⭐ (a) ⛔ while a suggestion is open — EVEN when (c) is dismissed: the member has a suggestion to answer (on the Workplace
// screen), ⛔ a workplace to add. Every flag comes from the server's prompts read (which gates them — RV1); this only
// orders them and applies the phone's dismissals.

import type { KnownPeoplePromptsResponse } from '@twt/contracts'

export type HomeCardKind = 'suggestion' | 'add_workplace' | 'replace' | 'transfer' | 'campaign' | 'invite'

/**
 * A proper discriminated union keyed on `kind` (fix-review): `applicableCards` only ever builds a `'suggestion'` card
 * FROM a non-null `suggestedWorkplace`, so a consumer switching on `kind` gets it back carrying that suggestion
 * NON-NULLABLE — ⛔ a redundant runtime `!== null` recheck at the call site. Every other kind carries only its
 * dismissal key (what the card is ABOUT — a new campaign or suggestion shows at once).
 */
export type HomeCard =
  | { readonly kind: 'suggestion'; readonly key: string; readonly suggestedWorkplace: NonNullable<KnownPeoplePromptsResponse['suggestedWorkplace']> }
  | { readonly kind: Exclude<HomeCardKind, 'suggestion'>; readonly key: string }

/** Every card the prompts allow, in the display order. */
export function applicableCards(p: KnownPeoplePromptsResponse): HomeCard[] {
  const out: HomeCard[] = []
  if (p.suggestedWorkplace !== null) {
    out.push({
      kind: 'suggestion',
      key: `suggestion:${p.suggestedWorkplace.requestId}:${p.suggestedWorkplace.workplaceId}`,
      suggestedWorkplace: p.suggestedWorkplace,
    })
  }
  if (p.noWorkplace && p.suggestedWorkplace === null) out.push({ kind: 'add_workplace', key: 'add_workplace' })
  if (p.replaceNeeded) out.push({ kind: 'replace', key: 'replace' })
  if (p.transferReview) out.push({ kind: 'transfer', key: 'transfer' })
  if (p.campaign !== null) out.push({ kind: 'campaign', key: `campaign:${p.campaign.campaignId}` })
  if (p.hasWorkplace) out.push({ kind: 'invite', key: 'invite' })
  return out
}

/** The ONE card to show — the first applicable and ⛔ dismissed — or `null`. */
export function chooseHomeCard(p: KnownPeoplePromptsResponse | undefined, isDismissed: (key: string) => boolean): HomeCard | null {
  if (p === undefined) return null
  return applicableCards(p).find((c) => !isDismissed(c.key)) ?? null
}
