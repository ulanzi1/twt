// Story 6.30 AC4 — the login keeps its place (`2026-10-10-312` AL6, corrected by `-315` C3; N5–N8).
// Pure-logic tests of `lib/link-target.ts`, then source-scan pins of its four wiring sites (the mobile
// harness has no screen renderer — `terminated-during-refresh.test.ts` is the precedent).

import { readdirSync, readFileSync } from 'node:fs'
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

/**
 * `indexOf` that FAILS the test on a miss. A bare `indexOf` returns `-1` on a miss, which satisfies `toBeLessThan`,
 * and `slice(0, -1)` keeps nearly the whole text for `toContain` — so a reformatted file could pass every pin below
 * vacuously (code review 2026-10-10).
 */
const at = (haystack: string, needle: string): number => {
  const index = haystack.indexOf(needle)
  expect(index, `expected to find ${JSON.stringify(needle)}`).toBeGreaterThan(-1)
  return index
}

/** Every `.ts` / `.tsx` file under `dirs`, repo-relative. */
const sourceFiles = (dirs: readonly string[]): string[] =>
  dirs.flatMap((dir) =>
    readdirSync(path.join(repoRoot, dir), { recursive: true, encoding: 'utf8' })
      .filter((entry) => /\.tsx?$/.test(entry))
      .map((entry) => path.posix.join(dir, entry.split(path.sep).join('/'))),
  )

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
    const branch = OTP.slice(at(OTP, "res.sessionType === 'full_session'"), at(OTP, "res.sessionType === 'signup_continuation'"))
    const take = at(branch, 'takeLinkTarget()')
    const signIn = at(branch, 'await signIn(res)')
    expect(signIn).toBeGreaterThan(take)
    expect(branch).toContain('router.replace({ pathname: target.pathname, params: { c: target.params.c } })')
    expect(branch).toContain("router.replace('/(tabs)')")
  })

  it('no other app file consumes the holder — the whole of app/, components/ and lib/ (code review 2026-10-11)', () => {
    const consumers = sourceFiles(['apps/mobile/app', 'apps/mobile/components', 'apps/mobile/lib'])
      .filter((rel) => rel !== 'apps/mobile/lib/link-target.ts')
      .filter((rel) => read(rel).includes('takeLinkTarget('))
    expect(consumers).toEqual(['apps/mobile/app/(auth)/otp.tsx'])
  })

  it('a signIn that throws puts the target back (⛔ consumed by a login that stored no session)', () => {
    const branch = OTP.slice(at(OTP, "res.sessionType === 'full_session'"), at(OTP, "res.sessionType === 'signup_continuation'"))
    const signIn = at(branch, 'await signIn(res)')
    const restore = at(branch, 'if (target) recordLinkTarget(target.pathname, target.params)')
    expect(restore).toBeGreaterThan(signIn)
    expect(at(branch, 'throw signInErr')).toBeGreaterThan(restore)
  })

  it("the guard's post-login /(tabs) branch is skipped on (auth)/otp — otp.tsx's own replace must land last", () => {
    expect(ROOT_LAYOUT).toContain("const onOtpScreen = inAuthGroup && (segments as readonly string[])[1] === 'otp'")
    const branch = ROOT_LAYOUT.slice(at(ROOT_LAYOUT, '} else if (session && inAuthGroup && !onOtpScreen) {'))
    expect(branch.slice(0, at(branch, '\n    }\n'))).toContain("router.replace('/(tabs)')")
    expect(ROOT_LAYOUT.match(/router\.replace\('\/\(tabs\)'\)/g)).toHaveLength(1)
  })
})

describe('(iii) the clears', () => {
  it('the signup branch clears BEFORE signIn(full)', () => {
    const branch = OTP.slice(at(OTP, "res.sessionType === 'signup_continuation'"))
    const clear = at(branch, 'clearLinkTarget()')
    const signIn = at(branch, 'await signIn(full)')
    expect(signIn).toBeGreaterThan(clear)
  })

  it("otp.tsx's terminated branch clears before routing to the termination surface", () => {
    const branch = OTP.slice(at(OTP, "e.code === 'auth.member_terminated'"))
    const clear = at(branch, 'clearLinkTarget()')
    const route = at(branch, "pathname: '/(auth)/terminated'")
    expect(route).toBeGreaterThan(clear)
  })

  it('signOut() and the refresh termination handler clear', () => {
    const signOut = SESSION_CONTEXT.slice(at(SESSION_CONTEXT, 'async function signOut()'))
    expect(signOut.slice(0, at(signOut, '\n  }\n'))).toContain('clearLinkTarget()')
    const handler = SESSION_CONTEXT.slice(at(SESSION_CONTEXT, 'setTerminatedDuringRefreshHandler((notice) => {'))
    expect(handler.slice(0, at(handler, '})'))).toContain('clearLinkTarget()')
  })
})

describe('(iv) every refused refresh resets the in-app session (N5)', () => {
  it('session.ts calls the dead-refresh handler for EVERY 4xx, AFTER the termination callback', () => {
    const fourxx = SESSION.slice(at(SESSION, 'res.status >= 400 && res.status < 500'))
    const termination = at(fourxx, "code === 'auth.member_terminated' && onTerminatedDuringRefresh")
    const deadRefresh = at(fourxx, 'onRefreshRejected?.()')
    expect(deadRefresh).toBeGreaterThan(termination)
    // Outside the termination `if` — so it runs for every 4xx, not only a termination: the `if`'s closing brace
    // (`})` of the callback's argument, then the brace of the `if` on its own line) comes BEFORE the call.
    const terminationIf = fourxx.slice(termination)
    const endOfIf = terminationIf.search(/\}\)\n\s*\}\n/)
    expect(endOfIf).toBeGreaterThan(-1)
    expect(endOfIf).toBeLessThan(at(terminationIf, 'onRefreshRejected?.()'))
    // And the clear's rejection cannot skip either handler (code review 2026-10-10): both sit in a `finally`.
    expect(at(fourxx, 'await clearSession()')).toBeGreaterThan(at(fourxx, 'try {'))
    expect(at(fourxx, '} finally {')).toBeLessThan(termination)
  })

  it('session-context registers setSession(null) for it and unregisters on cleanup', () => {
    expect(SESSION_CONTEXT).toMatch(/setRefreshRejectedHandler\(\(\) => \{\s*clearPeerRequestsCache\(queryClient\)\s*setSession\(null\)/)
    expect(SESSION_CONTEXT).toContain('setRefreshRejectedHandler(null)')
  })
})
