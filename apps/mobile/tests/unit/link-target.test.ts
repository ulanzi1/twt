// Story 6.30 AC4 — the login keeps its place (`2026-10-10-312` AL6, corrected by `-315` C3; N5–N8).
// Pure-logic tests of `lib/link-target.ts`, then source-scan pins of its four wiring sites (the mobile
// harness has no screen renderer — `terminated-during-refresh.test.ts` is the precedent).

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { clearLinkTarget, linkTargetFrom, recordLinkTarget, takeLinkTarget } from '../../lib/link-target'

const CODE = 'Ab3dE5gH9kLm'

afterEach(() => clearLinkTarget())

describe('linkTargetFrom — the allowlist (N7)', () => {
  it('an app-link path with a valid single c ⇒ that path + c', () => {
    expect(linkTargetFrom('/peer-request', { c: CODE })).toEqual({ pathname: '/peer-request', params: { c: CODE } })
  })

  it('drops every other parameter', () => {
    expect(linkTargetFrom('/peer-request', { c: CODE, lang: 'hi', next: '/admin', utm: 'x' })).toEqual({
      pathname: '/peer-request',
      params: { c: CODE },
    })
  })

  it.each([
    ['a missing c', '/peer-request', {}],
    ['a malformed c', '/peer-request', { c: 'nope' }],
    ['a repeated c', '/peer-request', { c: [CODE, CODE] }],
    ['a non-allowlisted path', '/claims', { c: CODE }],
    ['a near-miss path (prefix)', '/peer-requests', { c: CODE }],
    ['a nested path', '/peer-request/x', { c: CODE }],
    ['the root', '/', { c: CODE }],
  ])('%s ⇒ no target', (_label, pathname, params) => {
    expect(linkTargetFrom(pathname, params)).toBeNull()
  })
})

describe('record / take / clear', () => {
  it('take returns the recorded target ONCE (consume-once)', () => {
    recordLinkTarget('/peer-request', { c: CODE })
    expect(takeLinkTarget()).toEqual({ pathname: '/peer-request', params: { c: CODE } })
    expect(takeLinkTarget()).toBeNull()
  })

  it('nothing recorded ⇒ take returns null (⇒ /(tabs))', () => {
    expect(takeLinkTarget()).toBeNull()
  })

  it('the latest redirect wins — a non-target redirect clears an earlier target', () => {
    recordLinkTarget('/peer-request', { c: CODE })
    recordLinkTarget('/claims', {})
    expect(takeLinkTarget()).toBeNull()
  })

  it('clear drops a recorded target', () => {
    recordLinkTarget('/peer-request', { c: CODE })
    clearLinkTarget()
    expect(takeLinkTarget()).toBeNull()
  })
})

describe('link-target.ts keeps the target in MEMORY only (Trap 4)', () => {
  const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../lib/link-target.ts'), 'utf8')
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  it('⛔ no MMKV / SecureStore / storage import, ⛔ no logging', () => {
    expect(code).not.toMatch(/mmkv|SecureStore|AsyncStorage|localStorage/i)
    expect(code).not.toMatch(/console\.|logger/)
  })
})

// ── Source-scan pins ──────────────────────────────────────────────────────────────────────────────────
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string =>
  readFileSync(path.join(repoRoot, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')

const ROOT_LAYOUT = read('apps/mobile/app/_layout.tsx')
const OTP = read('apps/mobile/app/(auth)/otp.tsx')
const SESSION = read('apps/mobile/lib/session.ts')
const SESSION_CONTEXT = read('apps/mobile/lib/session-context.tsx')

describe('(i) the guard records via usePathname + useGlobalSearchParams', () => {
  it('reads the pathname and the GLOBAL search params', () => {
    expect(ROOT_LAYOUT).toContain('usePathname()')
    expect(ROOT_LAYOUT).toContain('useGlobalSearchParams()')
  })

  it('records the target immediately before the login redirect, after the termination check', () => {
    const terminationCheck = ROOT_LAYOUT.indexOf('terminationNotice) {')
    const record = ROOT_LAYOUT.indexOf('recordLinkTarget(pathname, searchParams)')
    const loginBounce = ROOT_LAYOUT.indexOf("router.replace('/(auth)/login')")
    expect(terminationCheck).toBeGreaterThan(-1)
    expect(record).toBeGreaterThan(terminationCheck)
    expect(loginBounce).toBeGreaterThan(record)
    expect(ROOT_LAYOUT.slice(record, loginBounce)).not.toContain('router.replace')
  })
})

describe('(ii) otp.tsx is the ONE consumer, and takes BEFORE signIn', () => {
  it('only otp.tsx calls takeLinkTarget (the guard never reads the holder)', () => {
    expect(ROOT_LAYOUT).not.toContain('takeLinkTarget')
    expect(OTP.match(/takeLinkTarget\(\)/g)).toHaveLength(1)
  })

  it("the full-session branch takes the target BEFORE `await signIn(res)` and replaces to it, else /(tabs)", () => {
    const branch = OTP.slice(OTP.indexOf("res.sessionType === 'full_session'"), OTP.indexOf("res.sessionType === 'signup_continuation'"))
    const take = branch.indexOf('takeLinkTarget()')
    const signIn = branch.indexOf('await signIn(res)')
    expect(take).toBeGreaterThan(-1)
    expect(signIn).toBeGreaterThan(take)
    expect(branch).toContain('router.replace({ pathname: target.pathname, params: { c: target.params.c } })')
    expect(branch).toContain("router.replace('/(tabs)')")
  })

  it('no other app file consumes the holder', () => {
    for (const rel of ['apps/mobile/lib/session.ts', 'apps/mobile/lib/session-context.tsx']) {
      expect(read(rel)).not.toContain('takeLinkTarget')
    }
  })
})

describe('(iii) the clears', () => {
  it('the signup branch clears BEFORE signIn(full)', () => {
    const branch = OTP.slice(OTP.indexOf("res.sessionType === 'signup_continuation'"))
    const clear = branch.indexOf('clearLinkTarget()')
    const signIn = branch.indexOf('await signIn(full)')
    expect(clear).toBeGreaterThan(-1)
    expect(signIn).toBeGreaterThan(clear)
  })

  it("otp.tsx's terminated branch clears before routing to the termination surface", () => {
    const branch = OTP.slice(OTP.indexOf("e.code === 'auth.member_terminated'"))
    const clear = branch.indexOf('clearLinkTarget()')
    const route = branch.indexOf("pathname: '/(auth)/terminated'")
    expect(clear).toBeGreaterThan(-1)
    expect(route).toBeGreaterThan(clear)
  })

  it('signOut() and the refresh termination handler clear', () => {
    const signOut = SESSION_CONTEXT.slice(SESSION_CONTEXT.indexOf('async function signOut()'))
    expect(signOut.slice(0, signOut.indexOf('\n  }\n'))).toContain('clearLinkTarget()')
    const handler = SESSION_CONTEXT.slice(SESSION_CONTEXT.indexOf('setTerminatedDuringRefreshHandler((notice) => {'))
    expect(handler.slice(0, handler.indexOf('})'))).toContain('clearLinkTarget()')
  })
})

describe('(iv) every refused refresh resets the in-app session (N5)', () => {
  it('session.ts calls the dead-refresh handler for EVERY 4xx, AFTER the termination callback', () => {
    const fourxx = SESSION.slice(SESSION.indexOf('res.status >= 400 && res.status < 500'))
    const termination = fourxx.indexOf("code === 'auth.member_terminated' && onTerminatedDuringRefresh")
    const deadRefresh = fourxx.indexOf('onRefreshRejected?.()')
    expect(termination).toBeGreaterThan(-1)
    expect(deadRefresh).toBeGreaterThan(termination)
    // Outside the termination `if` — so it runs for every 4xx, not only a termination.
    const terminationIf = fourxx.slice(termination)
    expect(terminationIf.indexOf('})\n      }')).toBeLessThan(terminationIf.indexOf('onRefreshRejected?.()'))
  })

  it('session-context registers setSession(null) for it and unregisters on cleanup', () => {
    expect(SESSION_CONTEXT).toContain('setRefreshRejectedHandler(() => setSession(null))')
    expect(SESSION_CONTEXT).toContain('setRefreshRejectedHandler(null)')
  })
})
