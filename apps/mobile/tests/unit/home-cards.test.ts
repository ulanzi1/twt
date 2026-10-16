// Story 6.36c (Task 6.6; AC6; RV7) — which ONE reminder card the home shows, the 30-day dismissals, the answer's
// Idempotency-Key, the invite message, and the new copy keys the pure helpers produce.

import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))
const share = vi.hoisted(() => ({ calls: [] as { message: string }[], fail: false }))
vi.mock('react-native', () => ({
  Share: {
    share: async (c: { message: string }) => {
      share.calls.push(c)
      if (share.fail) throw new Error('dismissed')
      return {}
    },
  },
}))

import type { KnownPeoplePromptsResponse } from '@twt/contracts'

import { clearHomeCardDismissals, dismissCard, homeCardDismissalsKey, isCardDismissed, type SyncStorage } from '../../lib/home-card-dismissals'
import { applicableCards, chooseHomeCard } from '../../lib/home-cards'
import { inviteMessage, shareInvite } from '../../lib/invite-share'
import { answerKeyFor, answerKeySettled, freshAnswerKeyState, historyRowView, refusalCopyKey } from '../../lib/workplace'

const NONE: KnownPeoplePromptsResponse = {
  noWorkplace: false,
  hasWorkplace: false,
  suggestedWorkplace: null,
  transferReview: false,
  replaceNeeded: false,
  canNamePeople: false,
  campaign: null,
}
const SUGGESTION = { requestId: 'r-1', workplaceId: 'w-1', name: 'GMS RAMPUR', district: 'Patna' }
const ALL: KnownPeoplePromptsResponse = {
  noWorkplace: true,
  hasWorkplace: true,
  suggestedWorkplace: SUGGESTION,
  transferReview: true,
  replaceNeeded: true,
  canNamePeople: true,
  campaign: { campaignId: 'c-1' },
}

function memoryStorage(): SyncStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) }
}

describe('the ONE card (RV7)', () => {
  it('each flag alone shows its own card', () => {
    const never = () => false
    expect(chooseHomeCard({ ...NONE, suggestedWorkplace: SUGGESTION }, never)?.kind).toBe('suggestion')
    expect(chooseHomeCard({ ...NONE, noWorkplace: true }, never)?.kind).toBe('add_workplace')
    expect(chooseHomeCard({ ...NONE, replaceNeeded: true }, never)?.kind).toBe('replace')
    expect(chooseHomeCard({ ...NONE, transferReview: true }, never)?.kind).toBe('transfer')
    expect(chooseHomeCard({ ...NONE, campaign: { campaignId: 'c-1' } }, never)?.kind).toBe('campaign')
    expect(chooseHomeCard({ ...NONE, hasWorkplace: true }, never)?.kind).toBe('invite')
    expect(chooseHomeCard(NONE, never)).toBeNull()
    expect(chooseHomeCard(undefined, never)).toBeNull()
  })

  it('the order: suggestion → add → replace → transfer → campaign → invite; each dismissal reveals the next', () => {
    // (a) is ⛔ applicable while a suggestion is open — so with ALL it is ⛔ in the list.
    expect(applicableCards(ALL).map((c) => c.kind)).toEqual(['suggestion', 'replace', 'transfer', 'campaign', 'invite'])
    expect(applicableCards({ ...ALL, suggestedWorkplace: null }).map((c) => c.kind)).toEqual(['add_workplace', 'replace', 'transfer', 'campaign', 'invite'])
    const dismissed = new Set<string>()
    const seen: string[] = []
    for (;;) {
      const c = chooseHomeCard(ALL, (k) => dismissed.has(k))
      if (c === null) break
      seen.push(c.kind)
      dismissed.add(c.key)
    }
    expect(seen).toEqual(['suggestion', 'replace', 'transfer', 'campaign', 'invite'])
  })

  it('⛔ "Add your workplace" while a suggestion is open — EVEN when the suggestion card is dismissed', () => {
    const p = { ...NONE, noWorkplace: true, suggestedWorkplace: SUGGESTION }
    expect(chooseHomeCard(p, (k) => k.startsWith('suggestion:'))).toBeNull()
  })

  it('the keys: a campaign per id; a suggestion per (request, workplace) — a re-suggestion shows again', () => {
    const keyOf = (p: KnownPeoplePromptsResponse) => chooseHomeCard(p, () => false)!.key
    expect(keyOf({ ...NONE, campaign: { campaignId: 'c-1' } })).toBe('campaign:c-1')
    expect(keyOf({ ...NONE, campaign: { campaignId: 'c-2' } })).toBe('campaign:c-2')
    expect(keyOf({ ...NONE, suggestedWorkplace: SUGGESTION })).toBe('suggestion:r-1:w-1')
    const dismissedFirst = (k: string) => k === 'suggestion:r-1:w-1'
    expect(chooseHomeCard({ ...NONE, suggestedWorkplace: { ...SUGGESTION, workplaceId: 'w-2' } }, dismissedFirst)?.key).toBe('suggestion:r-1:w-2')
  })
})

describe('the dismissals (30 days, on this phone, namespaced per account)', () => {
  it('hidden for 30 days, then shown again; a corrupt store reads as nothing dismissed; clear forgets all; another account reads nothing', () => {
    const s = memoryStorage()
    const t0 = new Date('2026-10-16T00:00:00.000Z')
    dismissCard('invite', 'm1', t0, s)
    expect(isCardDismissed('invite', 'm1', new Date(t0.getTime() + 29 * 86_400_000), s)).toBe(true)
    expect(isCardDismissed('invite', 'm1', new Date(t0.getTime() + 30 * 86_400_000), s)).toBe(false)
    expect(isCardDismissed('replace', 'm1', t0, s)).toBe(false)
    // A different account's own key is untouched — ⛔ sees `m1`'s dismissal (fix-review — the namespaced key).
    expect(isCardDismissed('invite', 'm2', t0, s)).toBe(false)
    // An expired entry is dropped on the next write.
    dismissCard('replace', 'm1', new Date(t0.getTime() + 31 * 86_400_000), s)
    expect(Object.keys(JSON.parse(s.map.get(homeCardDismissalsKey('m1'))!) as object)).toEqual(['replace'])
    s.map.set(homeCardDismissalsKey('m1'), '{not json')
    expect(isCardDismissed('replace', 'm1', t0, s)).toBe(false)
    dismissCard('invite', 'm1', t0, s)
    clearHomeCardDismissals('m1', s)
    expect(s.map.has(homeCardDismissalsKey('m1'))).toBe(false)
  })

  it('`undefined` (no known account) is a no-op — ⛔ throw, ⛔ clear anything', () => {
    const s = memoryStorage()
    dismissCard('invite', 'm1', new Date('2026-10-16T00:00:00.000Z'), s)
    clearHomeCardDismissals(undefined, s)
    expect(s.map.has(homeCardDismissalsKey('m1'))).toBe(true)
  })
})

describe('the answer’s Idempotency-Key (Task 6.5b)', () => {
  it('the first press takes the key minted when SHOWN; a retry of the same press reuses it; the other answer, or a press after a 200, mints anew', () => {
    let n = 0
    const mint = () => `k${(n += 1)}`
    let s = freshAnswerKeyState(mint) // k1 — minted when shown
    let r = answerKeyFor(s, 'yes', mint)
    expect(r.key).toBe('k1')
    s = answerKeySettled(r.state, false)
    r = answerKeyFor(s, 'yes', mint) // a retry of the failed press
    expect(r.key).toBe('k1')
    s = answerKeySettled(r.state, false)
    r = answerKeyFor(s, 'no', mint) // the OTHER answer
    expect(r.key).toBe('k2')
    s = answerKeySettled(r.state, true)
    r = answerKeyFor(s, 'no', mint) // a new press after a 200
    expect(r.key).toBe('k3')
    // A new suggestion is a new question (a remount): a fresh key.
    expect(answerKeyFor(freshAnswerKeyState(mint), 'no', mint).key).toBe('k4')
  })
})

describe('the invite (RV5)', () => {
  it('the member’s own message, the Trust’s name from config (or the no-name line); ONE share per call; a closed sheet is ⛔ an error', async () => {
    const t = (key: string, p?: Record<string, string | number>) => (p ? `${key}:${String(p['trust_name'])}` : key)
    expect(inviteMessage(t, 'The Trust')).toBe('invite.message:The Trust')
    expect(inviteMessage(t, null)).toBe('invite.message_no_name')
    await shareInvite(t, null)
    share.fail = true
    await expect(shareInvite(t, 'X')).resolves.toBeUndefined()
    expect(share.calls).toEqual([{ message: 'invite.message_no_name' }, { message: 'invite.message:X' }])
  })
})

describe('the answer’s refusals and the closed request row (AC4)', () => {
  it('each answer code reads its own words; the posting route’s codes are unchanged', () => {
    expect(refusalCopyKey({ status: 404, code: 'workplace.request_not_found' })).toBe('refusal.request_not_found')
    expect(refusalCopyKey({ status: 409, code: 'workplace.request_closed' })).toBe('refusal.request_closed')
    expect(refusalCopyKey({ status: 409, code: 'workplace.suggestion_stale' })).toBe('refusal.suggestion_stale')
    expect(refusalCopyKey({ status: 422, code: 'workplace.start_date_invalid' })).toBe('refusal.start_date_invalid')
    expect(refusalCopyKey({ status: 409, code: 'workplace.something' })).toBe('error_generic')
  })

  it('a CLOSED request asks the member to choose again — with their typed name, or without it once erased', () => {
    const base = { postingId: 'p', recordedAt: '2026-01-01T00:00:00.000000Z', district: 'Patna', startedOn: '2020-01-01', isRetirement: false, workplace: null }
    const req = { requestId: 'r', state: 'closed' as const, typedName: 'Rampur School', typedPlace: null, suggested: null }
    expect(historyRowView({ ...base, request: req })).toMatchObject({ statusKey: 'request_closed', statusParams: { name: 'Rampur School' } })
    expect(historyRowView({ ...base, request: { ...req, typedName: null } })).toMatchObject({ statusKey: 'request_closed_no_name' })
  })
})
