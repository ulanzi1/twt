// Story 6.27c (Task 5.2; AC6) — the `/peer-request?c=<code>` slot wired to the by-link resolver. DB-free and RN-render-free:
//   1. the PURE decision (`peerRequestSlotView`): ⛔ anything before the session; an open questionnaire wins; ⛔ code ⇒ the list;
//      pending ⇒ loading; `{ pingId }` ⇒ that questionnaire; a 404 OR a failed call ⇒ the not-openable state (⛔ a hard error);
//   2. source scans: ONE call, gated on the session AND a code, ⛔ a retry, ⛔ a refetch; in memory only (`gcTime: 0`); the code
//      ⛔ logged; the eslint-disable gone; the not-openable state is 6.27a's (`not_openable`, with the helpline CTA); Back from the
//      link's request dismisses the code; the login-return keeps `c` (6.30 AL6) and the shell hands it to the slot.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { peerRequestByLinkKey, PEER_REQUEST_CACHE_OPTIONS } from '../../components/peer-request/peer-request-cache'
import { peerRequestSlotView } from '../../lib/peer-request'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel: string): string => readFileSync(path.join(root, rel), 'utf8')
const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const P = '11111111-1111-4111-8111-111111111111'
const PING = '22222222-2222-4222-8222-222222222222'
const CODE = 'Ab3dE5gH9kLm'
const pending = { status: 'pending' as const, pingId: null }

describe('peerRequestSlotView — the slot\'s ONE decision (AC6)', () => {
  it('⛔ anything before the session has loaded — even with a code', () => {
    expect(peerRequestSlotView({ pariwarId: undefined, openPingId: null, code: CODE, byLink: pending })).toEqual({ kind: 'loading' })
    expect(peerRequestSlotView({ pariwarId: undefined, openPingId: PING, code: null, byLink: pending })).toEqual({ kind: 'loading' })
  })
  it('⛔ code (missing / malformed / dismissed) ⇒ the list (6.27a\'s behaviour)', () => {
    expect(peerRequestSlotView({ pariwarId: P, openPingId: null, code: null, byLink: pending })).toEqual({ kind: 'list' })
  })
  it('a code: pending ⇒ loading; `{ pingId }` ⇒ that questionnaire', () => {
    expect(peerRequestSlotView({ pariwarId: P, openPingId: null, code: CODE, byLink: pending })).toEqual({ kind: 'loading' })
    expect(peerRequestSlotView({ pariwarId: P, openPingId: null, code: CODE, byLink: { status: 'success', pingId: PING } })).toEqual({
      kind: 'questionnaire',
      pingId: PING,
    })
  })
  it('a 404 OR a failed call ⇒ the dignified not-openable state (⛔ a hard error)', () => {
    expect(peerRequestSlotView({ pariwarId: P, openPingId: null, code: CODE, byLink: { status: 'error', pingId: null } })).toEqual({ kind: 'not_openable' })
  })
  it('a questionnaire opened from the list wins over the link', () => {
    expect(peerRequestSlotView({ pariwarId: P, openPingId: PING, code: CODE, byLink: { status: 'error', pingId: null } })).toEqual({
      kind: 'questionnaire',
      pingId: PING,
    })
  })
})

describe('the wiring (source scans)', () => {
  const slot = strip(read('components/peer-request/PeerRequestSlot.tsx'))
  const queries = strip(read('components/peer-request/usePeerRequestQueries.ts'))
  const hook = queries.slice(queries.indexOf('export function usePeerRequestByLinkQuery'), queries.indexOf('export function useSavePeerAnswer'))

  it('the slot makes ONE by-link call through the hook, with the session\'s pariwarId and the (un-dismissed) code', () => {
    expect(slot).toContain('const linkCode = linkDismissed ? null : code')
    expect(slot).toContain('usePeerRequestByLinkQuery(pariwarId, linkCode)')
    expect(slot.match(/usePeerRequestByLinkQuery\(/g)).toHaveLength(1)
    // the 6.27a placeholder is gone — `code` is used
    expect(read('components/peer-request/PeerRequestSlot.tsx')).not.toContain('eslint-disable')
    expect(slot).not.toMatch(/_props/)
  })

  it('the hook: gated on the session AND a code; ⛔ a retry; ⛔ a refetch (staleTime Infinity); in memory only', () => {
    expect(hook).toContain("enabled: typeof pariwarId === 'string' && typeof memberId === 'string' && session?.pariwarId === pariwarId && code !== null")
    expect(hook).toContain('retry: false')
    expect(hook).toContain('staleTime: Infinity')
    expect(hook).toContain('...PEER_REQUEST_CACHE_OPTIONS')
    expect(hook).toContain('peerRequestApi.byLink(pariwarId as string, code as string)')
    expect(PEER_REQUEST_CACHE_OPTIONS.gcTime).toBe(0) // ⛔ dehydrated to disk
    expect(peerRequestByLinkKey(P, 'm', CODE)[0]).toBe('peer-requests') // ⭐ cleared with every other peer entry on sign-out
  })

  it('⛔ the code in a log — the slot, the hook, the shell', () => {
    for (const s of [slot, hook, strip(read('app/(peer-request)/peer-request.tsx'))]) expect(s).not.toMatch(/console\.|logger\.|log\(/)
  })

  it('a failed link is 6.27a\'s not-openable state (`not_openable`, its helpline CTA); Back from the link\'s request dismisses the code', () => {
    expect(slot).toContain('<PeerRequestNotOpenable messageKey="peer_request.not_openable" />')
    expect(read('components/peer-request/PeerRequestNotOpenable.tsx')).toContain('<CallHelplineCTA />')
    expect(slot).toMatch(/const back = \(\): void => \{\s*setOpenPingId\(null\)\s*setLinkDismissed\(true\)/)
    expect(slot).toContain('onBack={back}')
    // empty / loading / error render OUTSIDE any list ([[project_fabric_flatlist_empty_populated_crash]])
    expect(slot).not.toMatch(/FlatList/)
  })

  it('⭐ AL6 — logged out → login → back keeps `c`, and the shell hands the parsed code to the slot', () => {
    const shell = strip(read('app/(peer-request)/peer-request.tsx'))
    expect(shell).toContain('const code = parseAppLinkCode(useLocalSearchParams())')
    expect(shell).toContain('<PeerRequestSlot code={code} />')
    const otp = strip(read('app/(auth)/otp.tsx'))
    expect(otp).toContain('const target = takeLinkTarget()')
    expect(otp).toContain('router.replace({ pathname: target.pathname, params: { c: target.params.c } })')
  })
})
