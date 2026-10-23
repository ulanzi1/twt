// @vitest-environment jsdom
// Story 6.35 (AC6, AC8, AC9 — the mobile leg; LS3, LS4 (b), LS5; I1, I2; T4, T8) — `lib/app-language.ts`: the phone store,
// the explicit choice and the reconciliation with the member's server record. In-memory storage and a mocked client are
// INJECTED; every test loads a FRESH module (`vi.resetModules()`), so the module-level process id, choice counter and PUT
// queue start clean — and reloading the module over the SAME storage is a real "app restart" (a new process id).
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { LocaleProvider, useLocale } from '@twt/i18n/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The defaults (`memberAuth`, `mmkvStorage`) are never reached — every call injects — but their modules must load in node.
vi.mock('../../lib/member-api', () => ({
  memberAuth: {
    memberLanguage: () => Promise.reject(new Error('the default client must not be reached')),
    memberLanguageSet: () => Promise.reject(new Error('the default client must not be reached')),
  },
}))
vi.mock('../../lib/mmkv', () => ({ mmkvStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } }))

type Mod = typeof import('../../lib/app-language')
type Lang = 'hi' | 'en'
type Resp = { chosenLocale: Lang | null; pariwarDefaultLocale: Lang }

const LANG = 'app-language.v1'
const PENDING = 'app-language.pending.v1'

async function load(): Promise<Mod> {
  vi.resetModules()
  return import('../../lib/app-language')
}

function memStorage(seed: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(seed))
  return {
    map,
    getItem: vi.fn((k: string) => map.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => {
      map.set(k, v)
    }),
    removeItem: vi.fn((k: string) => {
      map.delete(k)
    }),
  }
}

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const resp = (chosenLocale: Lang | null, pariwarDefaultLocale: Lang = 'hi'): Resp => ({ chosenLocale, pariwarDefaultLocale })

function client() {
  return {
    memberLanguage: vi.fn<() => Promise<Resp>>(),
    memberLanguageSet: vi.fn<(l: Lang) => Promise<Resp>>((l) => Promise.resolve(resp(l))),
  }
}

const pendingOf = (s: ReturnType<typeof memStorage>) => {
  const raw = s.map.get(PENDING)
  return raw === undefined ? null : (JSON.parse(raw) as { locale: Lang; memberId: string | null; processId: string | null })
}

const flushMicrotasks = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  vi.useRealTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('AC6 — the phone remembers (LS3; T4)', () => {
  it('⛔ stored ⇒ null (the provider then starts in Hindi); a stored en ⇒ en; a junk value ⇒ null', async () => {
    const m = await load()
    expect(m.readStoredLanguage(memStorage())).toBeNull()
    expect(m.readStoredLanguage(memStorage({ [LANG]: 'en' }))).toBe('en')
    expect(m.readStoredLanguage(memStorage({ [LANG]: 'fr' }))).toBeNull()
    const throwing = { getItem: () => { throw new Error('boom') }, setItem: () => undefined, removeItem: () => undefined }
    expect(m.readStoredLanguage(throwing)).toBeNull()
  })

  it('the provider mounted with the stored language starts in it (⛔ stored ⇒ Hindi)', async () => {
    const m = await load()
    const Probe = () => createElement('span', { 'data-testid': 'locale' }, useLocale().locale)
    render(createElement(LocaleProvider, { initialLocale: m.readStoredLanguage(memStorage({ [LANG]: 'en' })) ?? undefined }, createElement(Probe)))
    expect(screen.getByTestId('locale').textContent).toBe('en')
    cleanup()
    render(createElement(LocaleProvider, { initialLocale: m.readStoredLanguage(memStorage()) ?? undefined }, createElement(Probe)))
    expect(screen.getByTestId('locale').textContent).toBe('hi')
  })

  it('a choice survives a simulated restart (the same storage, a reloaded module)', async () => {
    const storage = memStorage()
    const first = await load()
    await first.chooseLanguage('en', null, { storage, client: client() })
    const second = await load()
    expect(second.readStoredLanguage(storage)).toBe('en')
  })

  it('the keys are the story\'s (`app-language.v1`, `app-language.pending.v1`)', async () => {
    const m = await load()
    expect(m.APP_LANGUAGE_KEY).toBe(LANG)
    expect(m.APP_LANGUAGE_PENDING_KEY).toBe(PENDING)
  })
})

describe('chooseLanguage', () => {
  it('the login screen (memberId null) stores the language and a pending record tagged with THIS process — ⛔ API call', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    await expect(m.chooseLanguage('en', null, { storage, client: c })).resolves.toBe('saved_on_phone')
    expect(storage.map.get(LANG)).toBe('en')
    const p = pendingOf(storage)!
    expect(p.locale).toBe('en')
    expect(p.memberId).toBeNull()
    expect(typeof p.processId).toBe('string')
    expect(p.processId!.length).toBeGreaterThan(0)
    expect(c.memberLanguageSet).not.toHaveBeenCalled()
    expect(c.memberLanguage).not.toHaveBeenCalled()
  })

  it('a signed-in member: ONE PUT; on 2xx the pending record is cleared ⇒ `recorded`', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    await expect(m.chooseLanguage('en', 'm-a', { storage, client: c })).resolves.toBe('recorded')
    expect(c.memberLanguageSet).toHaveBeenCalledTimes(1)
    expect(c.memberLanguageSet).toHaveBeenCalledWith('en')
    expect(pendingOf(storage)).toBeNull()
    expect(storage.map.get(LANG)).toBe('en')
  })

  it('a failed PUT ⇒ `not_recorded`, the pending record and the phone language KEPT; the next sync retries it', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    c.memberLanguageSet.mockRejectedValueOnce(new Error('offline'))
    await expect(m.chooseLanguage('en', 'm-a', { storage, client: c })).resolves.toBe('not_recorded')
    expect(pendingOf(storage)?.locale).toBe('en')
    expect(storage.map.get(LANG)).toBe('en')
    const setLocale = vi.fn()
    await m.syncAppLanguage('m-a', { setLocale, storage, client: c })
    expect(c.memberLanguageSet).toHaveBeenCalledTimes(2)
    expect(pendingOf(storage)).toBeNull()
    expect(c.memberLanguage).not.toHaveBeenCalled()
  })

  it('a hung PUT is bounded (`withTimeout`) ⇒ `not_recorded`, pending kept', async () => {
    vi.useFakeTimers()
    const m = await load()
    const storage = memStorage()
    const c = client()
    c.memberLanguageSet.mockReturnValueOnce(new Promise<Resp>(() => undefined))
    const outcome = m.chooseLanguage('en', 'm-a', { storage, client: c })
    await vi.advanceTimersByTimeAsync(15_000)
    await expect(outcome).resolves.toBe('not_recorded')
    expect(pendingOf(storage)?.locale).toBe('en')
  })
})

describe('AC8 — syncAppLanguage (LS4 (b), LS5)', () => {
  it('a pending choice of THIS member ⇒ ONE PUT, cleared, adopted (setLocale + stored); ⛔ GET', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    c.memberLanguageSet.mockRejectedValueOnce(new Error('offline'))
    await m.chooseLanguage('en', 'm-a', { storage, client: c }) // leaves a pending record
    c.memberLanguageSet.mockClear()
    const setLocale = vi.fn()
    await m.syncAppLanguage('m-a', { setLocale, storage, client: c })
    expect(c.memberLanguageSet).toHaveBeenCalledTimes(1)
    expect(c.memberLanguageSet).toHaveBeenCalledWith('en')
    expect(pendingOf(storage)).toBeNull()
    expect(setLocale).toHaveBeenCalledWith('en')
    expect(storage.map.get(LANG)).toBe('en')
    expect(c.memberLanguage).not.toHaveBeenCalled()
  })

  it('a login-screen choice (memberId null) made in THIS process ⇒ ONE PUT at sign-in, then cleared', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    await m.chooseLanguage('en', null, { storage, client: c })
    expect(c.memberLanguageSet).not.toHaveBeenCalled()
    await m.syncAppLanguage('m-a', { setLocale: vi.fn(), storage, client: c })
    expect(c.memberLanguageSet).toHaveBeenCalledTimes(1)
    expect(c.memberLanguageSet).toHaveBeenCalledWith('en')
    expect(pendingOf(storage)).toBeNull()
  })

  it('⭐ I1 — a login-screen choice from an EARLIER app process ⇒ dropped, ⛔ PUT; the language it set stays on the phone', async () => {
    const storage = memStorage()
    const earlier = await load()
    await earlier.chooseLanguage('en', null, { storage, client: client() })
    const later = await load() // a restart: a new process id
    const c = client()
    c.memberLanguage.mockResolvedValue(resp(null))
    const setLocale = vi.fn()
    await later.syncAppLanguage('m-a', { setLocale, storage, client: c })
    expect(c.memberLanguageSet).not.toHaveBeenCalled()
    expect(pendingOf(storage)).toBeNull()
    expect(c.memberLanguage).toHaveBeenCalledTimes(1)
    expect(setLocale).toHaveBeenCalledWith('en') // the phone's language (`app-language.v1`), ⛔ recorded
    expect(storage.map.get(LANG)).toBe('en')
  })

  it('a null pending with ⛔ processId (a malformed / legacy record) is dropped as if from an earlier process', async () => {
    const m = await load()
    const storage = memStorage({ [PENDING]: JSON.stringify({ locale: 'en', memberId: null }) })
    const c = client()
    c.memberLanguage.mockResolvedValue(resp(null))
    await m.syncAppLanguage('m-a', { setLocale: vi.fn(), storage, client: c })
    expect(c.memberLanguageSet).not.toHaveBeenCalled()
    expect(pendingOf(storage)).toBeNull()
  })

  it('a pending choice of ANOTHER member (a shared phone) ⇒ dropped, ⛔ PUT; then the GET decides', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    c.memberLanguageSet.mockRejectedValueOnce(new Error('offline'))
    await m.chooseLanguage('en', 'm-a', { storage, client: c })
    c.memberLanguageSet.mockClear()
    c.memberLanguage.mockResolvedValue(resp('hi'))
    const setLocale = vi.fn()
    await m.syncAppLanguage('m-b', { setLocale, storage, client: c })
    expect(c.memberLanguageSet).not.toHaveBeenCalled()
    expect(pendingOf(storage)).toBeNull()
    expect(setLocale).toHaveBeenCalledWith('hi')
  })

  it('⛔ pending + server `en` ⇒ setLocale(en) + stored, ⛔ PUT', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    c.memberLanguage.mockResolvedValue(resp('en'))
    const setLocale = vi.fn()
    await m.syncAppLanguage('m-a', { setLocale, storage, client: c })
    expect(setLocale).toHaveBeenCalledWith('en')
    expect(storage.map.get(LANG)).toBe('en')
    expect(c.memberLanguageSet).not.toHaveBeenCalled()
  })

  it('⭐ I2 / LS4 (b) — ⛔ pending + server null + ⛔ phone choice + pariwarDefaultLocale `en` ⇒ STAYS Hindi, stores nothing, ⛔ PUT', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    c.memberLanguage.mockResolvedValue(resp(null, 'en'))
    const setLocale = vi.fn()
    await m.syncAppLanguage('m-a', { setLocale, storage, client: c })
    expect(setLocale).not.toHaveBeenCalledWith('en')
    for (const call of setLocale.mock.calls) expect(call[0]).toBe('hi')
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(c.memberLanguageSet).not.toHaveBeenCalled()
  })

  it('⭐ T8 — ⛔ pending + server null + phone `en` ⇒ stays `en`, stores nothing, ⛔ PUT (what is merely displayed is never recorded)', async () => {
    const m = await load()
    const storage = memStorage({ [LANG]: 'en' })
    const c = client()
    c.memberLanguage.mockResolvedValue(resp(null, 'hi'))
    const setLocale = vi.fn()
    await m.syncAppLanguage('m-a', { setLocale, storage, client: c })
    expect(setLocale).toHaveBeenCalledWith('en')
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(c.memberLanguageSet).not.toHaveBeenCalled()
  })

  it('server `hi` + phone `en` ⇒ setLocale(hi) + stored (the server choice wins on this phone)', async () => {
    const m = await load()
    const storage = memStorage({ [LANG]: 'en' })
    const c = client()
    c.memberLanguage.mockResolvedValue(resp('hi'))
    const setLocale = vi.fn()
    await m.syncAppLanguage('m-a', { setLocale, storage, client: c })
    expect(setLocale).toHaveBeenCalledWith('hi')
    expect(storage.map.get(LANG)).toBe('hi')
    expect(c.memberLanguageSet).not.toHaveBeenCalled()
  })

  it('GET fails ⇒ ⛔ change, ⛔ throw; a hung GET is bounded and changes nothing', async () => {
    const m = await load()
    const storage = memStorage({ [LANG]: 'en' })
    const c = client()
    c.memberLanguage.mockRejectedValue(new Error('offline'))
    const setLocale = vi.fn()
    await expect(m.syncAppLanguage('m-a', { setLocale, storage, client: c })).resolves.toBeUndefined()
    expect(setLocale).not.toHaveBeenCalled()
    expect(storage.setItem).not.toHaveBeenCalled()

    vi.useFakeTimers()
    c.memberLanguage.mockReturnValue(new Promise<Resp>(() => undefined))
    const sync = m.syncAppLanguage('m-a', { setLocale, storage, client: c })
    await vi.advanceTimersByTimeAsync(15_000)
    await expect(sync).resolves.toBeUndefined()
    expect(setLocale).not.toHaveBeenCalled()
  })

  it('⭐ race (i) — the member switches while a GET is pending ⇒ the GET\'s later result is DROPPED; the chosen language stays', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    const get = deferred<Resp>()
    c.memberLanguage.mockReturnValue(get.promise)
    const setLocale = vi.fn()
    const sync = m.syncAppLanguage('m-a', { setLocale, storage, client: c })
    await flushMicrotasks()
    await m.chooseLanguage('en', 'm-a', { storage, client: c }) // the screen: shown + recorded
    get.resolve(resp('hi'))
    await sync
    expect(setLocale).not.toHaveBeenCalled()
    expect(storage.map.get(LANG)).toBe('en')
  })

  it('⭐ race (i) — a GET for member A resolving after the session changed to B ⇒ dropped', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    const get = deferred<Resp>()
    c.memberLanguage.mockReturnValue(get.promise)
    let current: string | null = 'm-a'
    const setLocale = vi.fn()
    const sync = m.syncAppLanguage('m-a', { setLocale, storage, client: c, currentMemberId: () => current })
    await flushMicrotasks()
    current = 'm-b'
    get.resolve(resp('en'))
    await sync
    expect(setLocale).not.toHaveBeenCalled()
    expect(storage.map.get(LANG)).toBeUndefined()
  })

  it('⭐ race (ii) — a sync while the screen\'s PUT is in flight ⇒ still ONE PUT (single-flight)', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    const put = deferred<Resp>()
    c.memberLanguageSet.mockReturnValueOnce(put.promise)
    const screenChoice = m.chooseLanguage('en', 'm-a', { storage, client: c })
    await flushMicrotasks()
    expect(c.memberLanguageSet).toHaveBeenCalledTimes(1)
    const setLocale = vi.fn()
    const sync = m.syncAppLanguage('m-a', { setLocale, storage, client: c })
    await flushMicrotasks()
    put.resolve(resp('en'))
    await expect(screenChoice).resolves.toBe('recorded')
    await sync
    expect(c.memberLanguageSet).toHaveBeenCalledTimes(1)
    expect(c.memberLanguage).not.toHaveBeenCalled()
    expect(pendingOf(storage)).toBeNull()
  })

  it('⭐ serial + compare-and-clear — en then hi during the first PUT ⇒ two PUTs in that order, pending cleared after the second, the screen stays hi', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    const firstPut = deferred<Resp>()
    c.memberLanguageSet.mockReturnValueOnce(firstPut.promise)
    const shown: Lang[] = []
    const setLocale = vi.fn((l: Lang) => shown.push(l))
    const en = m.chooseLanguage('en', 'm-a', { storage, client: c })
    await flushMicrotasks()
    const sync = m.syncAppLanguage('m-a', { setLocale, storage, client: c }) // a foreground sync joins the queue
    const hi = m.chooseLanguage('hi', 'm-a', { storage, client: c }) // mid-PUT
    await flushMicrotasks()
    expect(pendingOf(storage)?.locale).toBe('hi')
    firstPut.resolve(resp('en'))
    await flushMicrotasks()
    // en's 2xx did NOT clear hi's pending record (compare-and-clear)…
    await Promise.all([en, hi, sync])
    expect(c.memberLanguageSet.mock.calls.map((a) => a[0])).toEqual(['en', 'hi'])
    expect(pendingOf(storage)).toBeNull()
    expect(storage.map.get(LANG)).toBe('hi')
    // …and ⛔ adopted en: the screen never flips back to English.
    expect(shown).not.toContain('en')
  })

  it('race (i) on the PUT — a choice made during the sync\'s PUT (and ⛔ sent by it) ⇒ that PUT\'s response is ⛔ adopted', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    c.memberLanguageSet.mockRejectedValueOnce(new Error('offline'))
    await m.chooseLanguage('en', 'm-a', { storage, client: c }) // a pending en for m-a
    const put = deferred<Resp>()
    c.memberLanguageSet.mockReturnValueOnce(put.promise)
    const setLocale = vi.fn()
    const sync = m.syncAppLanguage('m-a', { setLocale, storage, client: c })
    await flushMicrotasks()
    // A newer choice the queue will ⛔ send for m-a (another member's, on an account switch) moves the counter.
    void m.chooseLanguage('hi', 'm-b', { storage, client: c })
    put.resolve(resp('en'))
    await sync
    expect(setLocale).not.toHaveBeenCalled()
    expect(storage.map.get(LANG)).toBe('hi')
  })

  it('compare-and-clear — en\'s 2xx arriving while hi is pending leaves hi pending (when hi\'s PUT then fails)', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    const firstPut = deferred<Resp>()
    c.memberLanguageSet.mockReturnValueOnce(firstPut.promise).mockRejectedValueOnce(new Error('offline'))
    const en = m.chooseLanguage('en', 'm-a', { storage, client: c })
    await flushMicrotasks()
    const hi = m.chooseLanguage('hi', 'm-a', { storage, client: c })
    firstPut.resolve(resp('en'))
    await expect(hi).resolves.toBe('not_recorded')
    await en
    expect(pendingOf(storage)?.locale).toBe('hi')
  })
})

describe('AC9 — ⛔ never on first launch (I1)', () => {
  it('a fresh install (empty storage) signs in and syncs with server null ⇒ ZERO PUT calls and ⛔ `app-language.v1` written', async () => {
    const m = await load()
    const storage = memStorage()
    const c = client()
    c.memberLanguage.mockResolvedValue(resp(null, 'hi'))
    const setLocale = vi.fn()
    await m.syncAppLanguage('m-a', { setLocale, storage, client: c })
    await m.syncAppLanguage('m-a', { setLocale, storage, client: c }) // a foreground resync too
    expect(c.memberLanguageSet).toHaveBeenCalledTimes(0)
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(storage.map.has(LANG)).toBe(false)
    expect(storage.map.has(PENDING)).toBe(false)
  })
})
