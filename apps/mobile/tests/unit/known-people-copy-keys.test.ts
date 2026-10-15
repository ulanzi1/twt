// Story 6.36b (AC13) — every `known_people` copy key the screens and the entry component call EXISTS in the catalog and
// resolves through the REAL `t()` in BOTH locales (⛔ a hand-built labels fixture — [[feedback_stub_must_call_not_transcribe]]).
// Keys built at runtime (`refusalCopyKey`, `labelCopyKey`) are checked over their whole ranges.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getCatalog, t } from '@twt/i18n'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))

import { labelCopyKey, refusalCopyKey, successCopyKey } from '../../lib/known-people'

const MOBILE = join(__dirname, '..', '..')
const FILES = [
  'app/(life-events)/known-people.tsx',
  'app/(life-events)/known-people-find.tsx',
  'components/known-people/KnownPeopleRequestEntry.tsx',
]

/** The literal keys passed to `t('…')` in a source file. */
function literalKeys(src: string): string[] {
  return [...src.matchAll(/\bt\(\s*'([a-z_]+(?:\.[a-z_]+)*)'/g)].map((m) => m[1]!)
}

describe('the known_people keys the app uses', () => {
  const en = getCatalog('en', 'known_people')!
  const keys = new Set(FILES.flatMap((f) => literalKeys(readFileSync(join(MOBILE, f), 'utf8'))))

  it('every literal key exists (and the scan finds the screens\' keys — a positive control)', () => {
    expect(keys.size).toBeGreaterThan(25)
    expect(keys).toContain('request.question')
    for (const key of keys) expect(en[key], key).toBeDefined()
    expect(literalKeys("t('no.such_key')")).toEqual(['no.such_key'])
  })

  it('review round 2, P3 — a 404 not_found and a 409 in-progress each have their OWN message (⛔ the generic one)', () => {
    expect(refusalCopyKey('known_people.not_found')).toBe('error.changed')
    expect(refusalCopyKey('known_people.idempotency_in_progress')).toBe('error.in_progress')
    expect(refusalCopyKey('known_people.somethingelse')).toBe('error.generic') // a positive control
  })

  it('every runtime-built key exists and resolves in en AND hi', () => {
    const built = [
      ...['daily_limit', 'monthly_limit', 'busy', 'not_a_member', 'self', 'cannot_ask_now', 'limit_reached', 'request_closed', 'not_available', 'not_found', 'idempotency_in_progress', 'x'].map((c) =>
        refusalCopyKey(`known_people.${c}`),
      ),
      ...(['asked', 'accepted', 'not_accepted', 'unavailable'] as const).map(labelCopyKey),
    ]
    for (const key of built) {
      for (const locale of ['en', 'hi'] as const) expect(t(key, undefined, { locale, namespace: 'known_people' }).length).toBeGreaterThan(0)
    }
    // the spoken confirmations (review 2026-10-15 R5) — each names the person, in both locales
    for (const action of ['accept', 'decline', 'remove', 'withdraw'] as const) {
      for (const locale of ['en', 'hi'] as const) {
        expect(t(successCopyKey(action), { name: 'Asha D.' }, { locale, namespace: 'known_people' }), `${locale}:${action}`).toContain('Asha D.')
      }
    }
  })
})
