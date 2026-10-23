// The app's language on this phone, and its record on the member's account (Story 6.35, Task 4.1; LS3, LS5;
// Decision 2026-10-23-387).
//
// Two MMKV keys, both KEPT on sign-out (a phone setting, like the OS language — `lib/session-context.tsx` leaves them):
//   · `app-language.v1` — the language last CHOSEN or ADOPTED on this phone (`'hi' | 'en'`). Read SYNCHRONOUSLY by the root
//     layout before `LocaleProvider` mounts (its `initialLocale` is read on mount only — T4). Nothing stored ⇒ Hindi.
//   · `app-language.pending.v1` — an explicit change ⛔ yet recorded on the server: `{ locale, memberId, processId }`.
//     `memberId: null` = made on the login screen, before sign-in; it is sent ONLY for a sign-in in the SAME app process
//     (`processId`) — a later process drops it, else a login-screen choice would be recorded for whoever signs in next (I1).
//
// ⭐ I1 — the server value changes ONLY through `memberLanguageSet`, and ONLY for a `pending` record, which ONLY
// `chooseLanguage` writes (after the member picked a language DIFFERENT from the one shown). ⛔ First-launch write,
// ⛔ device-language inference, ⛔ the Pariwar's default adopted as a choice (T8): `syncAppLanguage` never PUTs what it
// merely DISPLAYS, and never DISPLAYS the Pariwar's default (LS4 (b) — a member who never chose stays in Hindi, I2).
//
// Races (LS5): ONE serial PUT queue shared by the screen and the sync (a choice made during a PUT is sent AFTER it); the
// pending record is cleared only if it still names the locale just recorded (compare-and-clear); a choice counter drops
// a GET / PUT result that resolves after the member chose again; a sync drops its result when the session's member
// changed meanwhile. Every call is bounded (`withTimeout`); a network failure is silent (the pending record stays and
// the next start / foreground retries it). ⛔ AsyncStorage, ⛔ `expo-localization`.

import type { MemberLanguageResponse } from '@twt/contracts'

import { memberAuth } from './member-api'
import { mmkvStorage } from './mmkv'
import { CALL_TIMEOUT_MS, withTimeout } from './with-timeout'

export const APP_LANGUAGE_KEY = 'app-language.v1'
export const APP_LANGUAGE_PENDING_KEY = 'app-language.pending.v1'

export type AppLanguage = 'hi' | 'en'

/** The storage seam (MMKV in the app; an in-memory map in tests) — the `known-people-saved-names.ts` shape. */
export interface SyncStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** The two member calls this module makes (the app's `memberAuth` by default). */
export interface AppLanguageClient {
  memberLanguage(): Promise<MemberLanguageResponse>
  memberLanguageSet(locale: AppLanguage): Promise<MemberLanguageResponse>
}

interface Pending {
  readonly locale: AppLanguage
  readonly memberId: string | null
  readonly processId: string | null
}

/** This JS process's boot id — minted once, at module load. A `memberId: null` pending from another process is dropped. */
const PROCESS_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** Bumped by every `chooseLanguage` — a GET / PUT result that resolves after it moved is dropped. */
let choiceCounter = 0

const isLanguage = (v: unknown): v is AppLanguage => v === 'hi' || v === 'en'

/** The language stored on this phone, or `null` (⇒ the provider's Hindi default). Never throws. */
export function readStoredLanguage(storage: SyncStorage = mmkvStorage): AppLanguage | null {
  try {
    const raw = storage.getItem(APP_LANGUAGE_KEY)
    return isLanguage(raw) ? raw : null
  } catch {
    return null
  }
}

function storeLanguage(storage: SyncStorage, locale: AppLanguage): void {
  try {
    storage.setItem(APP_LANGUAGE_KEY, locale)
  } catch {
    // ⛔ a storage failure never breaks the switch — the screen already shows the language
  }
}

function readPending(storage: SyncStorage): Pending | null {
  try {
    const raw = storage.getItem(APP_LANGUAGE_PENDING_KEY)
    if (raw === null) return null
    const p = JSON.parse(raw) as Partial<Pending>
    if (!isLanguage(p.locale)) return null
    const memberId = typeof p.memberId === 'string' ? p.memberId : null
    const processId = typeof p.processId === 'string' ? p.processId : null
    return { locale: p.locale, memberId, processId }
  } catch {
    return null
  }
}

const samePending = (a: Pending | null, b: Pending): boolean =>
  a !== null && a.locale === b.locale && a.memberId === b.memberId && a.processId === b.processId

/** Remove the pending record only if it is still `expected` (a newer choice written meanwhile is kept). */
function clearPendingIf(storage: SyncStorage, expected: Pending): void {
  try {
    if (samePending(readPending(storage), expected)) storage.removeItem(APP_LANGUAGE_PENDING_KEY)
  } catch {
    // best-effort
  }
}

/** May `pending` be recorded for `memberId`? Its own member, or a login-screen choice made in THIS process. */
function sendableFor(pending: Pending, memberId: string): boolean {
  if (pending.memberId !== null) return pending.memberId === memberId
  return pending.processId === PROCESS_ID
}

type FlushResult =
  | { readonly kind: 'nothing' }
  | { readonly kind: 'failed' }
  /** `current` — ⛔ choice was made since this PUT began, so its response may be adopted. */
  | { readonly kind: 'recorded'; readonly response: MemberLanguageResponse; readonly current: boolean }

/** The ONE serial PUT queue (LS5 (ii)): while it runs, a second caller joins it; it sends every pending choice in turn. */
let flushing: Promise<FlushResult> | null = null

function flush(memberId: string, client: AppLanguageClient, storage: SyncStorage): Promise<FlushResult> {
  if (flushing !== null) return flushing
  const run = (async (): Promise<FlushResult> => {
    // Yield first, so `flushing` is assigned before the loop can finish (and clear it) synchronously.
    await Promise.resolve()
    try {
      let last: FlushResult = { kind: 'nothing' }
      for (;;) {
        const pending = readPending(storage)
        if (pending === null) return last
        if (!sendableFor(pending, memberId)) {
          clearPendingIf(storage, pending)
          return last
        }
        const counterAtStart = choiceCounter
        let response: MemberLanguageResponse
        try {
          response = await withTimeout(client.memberLanguageSet(pending.locale), CALL_TIMEOUT_MS)
        } catch {
          return { kind: 'failed' }
        }
        clearPendingIf(storage, pending)
        last = { kind: 'recorded', response, current: choiceCounter === counterAtStart }
        // A choice made during the PUT is still pending ⇒ the loop sends it next (serial, ⛔ deduped).
      }
    } finally {
      flushing = null
    }
  })()
  flushing = run
  return run
}

export type ChooseOutcome = 'saved_on_phone' | 'recorded' | 'not_recorded'

/**
 * The member EXPLICITLY picked `locale` — a language DIFFERENT from the one shown (the caller's check; I1). Stores it on
 * the phone and as `pending`; with a member (`memberId` non-null) records it on the server through the serial queue.
 * `memberId: null` (the login screen) calls ⛔ API. The caller has already shown the language (`setLocale`).
 */
export function chooseLanguage(
  locale: AppLanguage,
  memberId: string | null,
  opts: { client?: AppLanguageClient; storage?: SyncStorage } = {},
): Promise<ChooseOutcome> {
  const storage = opts.storage ?? mmkvStorage
  choiceCounter += 1
  storeLanguage(storage, locale)
  try {
    storage.setItem(APP_LANGUAGE_PENDING_KEY, JSON.stringify({ locale, memberId, processId: PROCESS_ID } satisfies Pending))
  } catch {
    // ⛔ a storage failure never breaks the switch
  }
  if (memberId === null) return Promise.resolve('saved_on_phone')
  return flush(memberId, opts.client ?? memberAuth, storage).then((r) =>
    r.kind === 'failed' ? 'not_recorded' : 'recorded',
  )
}

/**
 * Reconcile the phone with the server for the signed-in member (sign-in, start with a stored session, return to the
 * foreground — `lib/session-context.tsx`). (1) A pending choice this member may record ⇒ PUT it (the serial queue);
 * a pending choice of ANOTHER member, or a login-screen choice from an EARLIER process ⇒ dropped, ⛔ PUT. (2) Else GET
 * and DISPLAY `chosenLocale ?? the phone's language ?? 'hi'` — a server choice is also stored on the phone; the Pariwar's
 * default is ⛔ displayed (LS4 (b)) and nothing displayed is ⛔ PUT (T8). Never throws; a failure changes nothing.
 */
export async function syncAppLanguage(
  memberId: string,
  opts: {
    setLocale: (locale: AppLanguage) => void
    client?: AppLanguageClient
    storage?: SyncStorage
    /** The session's member NOW — a result for a member who is no longer signed in is dropped (an account switch). */
    currentMemberId?: () => string | null | undefined
  },
): Promise<void> {
  const client = opts.client ?? memberAuth
  const storage = opts.storage ?? mmkvStorage
  const stillCurrent = (): boolean => (opts.currentMemberId ? opts.currentMemberId() === memberId : true)
  try {
    const pending = readPending(storage)
    if (pending !== null && sendableFor(pending, memberId)) {
      const r = await flush(memberId, client, storage)
      if (r.kind === 'recorded' && r.current && stillCurrent() && isLanguage(r.response.chosenLocale)) {
        storeLanguage(storage, r.response.chosenLocale)
        opts.setLocale(r.response.chosenLocale)
      }
      return
    }
    if (pending !== null) clearPendingIf(storage, pending)

    const counterAtStart = choiceCounter
    const res = await withTimeout(client.memberLanguage(), CALL_TIMEOUT_MS)
    if (choiceCounter !== counterAtStart || !stillCurrent() || readPending(storage) !== null) return
    if (isLanguage(res.chosenLocale)) {
      storeLanguage(storage, res.chosenLocale)
      opts.setLocale(res.chosenLocale)
      return
    }
    // ⛔ server choice: the phone's own language, else Hindi — ⛔ `res.pariwarDefaultLocale` (LS4 (b)), ⛔ stored, ⛔ PUT.
    opts.setLocale(readStoredLanguage(storage) ?? 'hi')
  } catch {
    // Silent (LS5): the screen language stays; a pending choice stays for the next start / foreground.
  }
}
