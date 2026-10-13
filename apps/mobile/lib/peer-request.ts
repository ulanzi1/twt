// The neighbours' answer screens — PURE logic (Story 6.27a PM11, Task 5). Node-testable, so every decision the screen
// makes lives here and the components stay thin (the jsdom render test exercises the screen itself):
//   · which questions of a page are shown (the server's `showIf`, against the member's CURRENT answers);
//   · the words in the app's locale (the server resolved both — a new version needs ⛔ no app release);
//   · the save line's state machine (Saved / Saving / "Not saved — retrying") and which failures retry;
//   · how a load / save error maps to a screen state (⛔ a hard error: a dignified "could not be opened");
//   · the date field (DD-MM-YYYY on screen, YYYY-MM-DD on the wire; ⛔ never in the future).

import type {
  PeerRequestAnswerValue,
  PeerRequestDetailResponse,
  PeerRequestQuestion,
  PeerRequestWords,
} from '@twt/contracts'

export type AnswerMap = ReadonlyMap<string, PeerRequestAnswerValue>

/** The live answers as a map by question key. */
export function answersToMap(answers: PeerRequestDetailResponse['answers']): Map<string, PeerRequestAnswerValue> {
  return new Map(answers.flatMap((a) => 'unavailable' in a.value ? [] : [[a.questionKey, a.value] as const]))
}

/** Is `q` shown, given the answers on screen? (The server re-checks every save.) */
export function isShown(q: PeerRequestQuestion, answers: AnswerMap): boolean {
  if (q.showIf === null) return true
  const parent = answers.get(q.showIf.key)
  if (parent === undefined || !('codes' in parent)) return false
  return parent.codes.some((c) => q.showIf!.anyOf.includes(c))
}

/** The questions of one page that are shown now. */
export function visibleQuestions(questions: readonly PeerRequestQuestion[], answers: AnswerMap): PeerRequestQuestion[] {
  return questions.filter((q) => isShown(q, answers))
}

/** The pages that have at least one question shown now (a page whose questions are all hidden is skipped). */
export function visiblePages(detail: Pick<PeerRequestDetailResponse, 'questionnaire'>, answers: AnswerMap): PeerRequestQuestion[][] {
  return detail.questionnaire.pages.map((p) => visibleQuestions(p.questions, answers)).filter((qs) => qs.length > 0)
}

/**
 * May the member move past this page? Only an unanswered REQUIRED question holds them. ⭐ A saved answer that could ⛔ not
 * be shown (`{ unavailable: true }`) IS answered — pass the map WITH those entries (second-pass review S38: "please answer
 * this first" beside "could not be shown" told the member to answer a question they had answered).
 */
export function canLeavePage(questions: readonly PeerRequestQuestion[], answers: ReadonlyMap<string, unknown>): boolean {
  return questions.every((q) => q.optional || answers.has(q.key))
}

/** The words in the app's locale. */
export function wordsIn(words: PeerRequestWords, locale: string): string {
  return locale === 'en' ? words.en : words.hi
}

/** Toggle one option of a question into a new answer value (single / yes_no replace; multi toggles; exclusive alone). */
export function toggleOption(q: PeerRequestQuestion, current: PeerRequestAnswerValue | undefined, code: string): PeerRequestAnswerValue | null {
  if (q.kind !== 'multi') return { codes: [code] }
  const prev = current !== undefined && 'codes' in current ? current.codes : []
  const option = q.options.find((o) => o.code === code)
  if (option?.exclusive) return prev.includes(code) ? null : { codes: [code] }
  const withoutExclusive = prev.filter((c) => !q.options.find((o) => o.code === c)?.exclusive)
  const next = withoutExclusive.includes(code) ? withoutExclusive.filter((c) => c !== code) : [...withoutExclusive, code]
  return next.length === 0 ? null : { codes: next }
}

// ── the date ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Devanagari digits (U+0966–U+096F, what a Hindi keyboard types) → ASCII (second-pass review S37 — JavaScript's `\d` is
 *  ASCII-only). The screen SHOWS Latin numerals (amendment A2); this only ACCEPTS what was typed. */
export function asciiDigits(input: string): string {
  return input.replace(/[\u0966-\u096F]/g, (d) => String(d.charCodeAt(0) - 0x0966))
}

/** `DD-MM-YYYY` (what the member types — ASCII or Devanagari digits) → `YYYY-MM-DD`, or `null` when it is not a real date /
 *  is in the future / is before 1900. `todayIst` is `YYYY-MM-DD`. */
export function parseDisplayDate(input: string, todayIst: string): string | null {
  const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(asciiDigits(input.trim()))
  if (!m) return null
  const iso = `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
  const ms = Date.parse(`${iso}T00:00:00Z`)
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== iso) return null
  if (iso > todayIst || iso < '1900-01-01') return null
  return iso
}

/** `YYYY-MM-DD` → `DD-MM-YYYY` for the field. */
export function toDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

/** Today in IST as `YYYY-MM-DD` (a fixed +05:30 — India has no DST). */
export function todayInIst(now: Date): string {
  return new Date(now.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10)
}

// ── the save line ──────────────────────────────────────────────────────────────────────────────────────────────────

export type SaveLine = 'idle' | 'saving' | 'saved' | 'retrying' | 'failed'

/** What a failed call means for the screen. `retry` keeps the answer on screen and retries ("Not saved — retrying"). */
export type PeerRequestFailure = 'not_openable' | 'no_longer_open' | 'submitted' | 'invalid' | 'retry'

/** Map a transport failure (`ApiError`-shaped: `status` + `code`, or anything else) to the screen's response. */
export function classifyFailure(err: unknown): PeerRequestFailure {
  const e = err as { status?: number; code?: string } | null
  if (e?.status === 404) return 'not_openable'
  if (e?.status === 409 && e.code === 'peer_request.no_longer_open') return 'no_longer_open'
  if (e?.status === 409 && e.code === 'peer_request.submitted') return 'submitted'
  if (e?.status === 422) return 'invalid'
  // ⭐ Second-pass review S32 — a 403 (e.g. the member was suspended mid-session) ⛔ never retries every 30 s behind a
  // blocked Back: the screen closes like the load path's. (A 401 still retries: the token refresh makes it transient, and
  // a dead session signs the member out, which unmounts the screen.)
  if (e?.status === 403) return 'not_openable'
  // a network failure, a 5xx, a 429, a 401, the stale-read 409, an in-flight idempotency 409 — all retry
  return 'retry'
}

/** The retry delay (ms) for the n-th consecutive failed save — capped exponential backoff, ⛔ never give up silently. */
export function retryDelayMs(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** Math.max(0, attempt - 1))
}

/**
 * A fresh Idempotency-Key per NEW save (a retry of the same save reuses its key). A CSPRNG first (`crypto.randomUUID`,
 * Hermes via expo-crypto's polyfill — the repo's `usePersonalEventAssertion` pattern), then `getRandomValues`;
 * `Math.random` only where neither exists (second-pass review S37).
 */
export function newIdempotencyKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  const bytes = new Uint8Array(16)
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
