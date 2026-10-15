// Where each member works — the PURE logic behind the workplace picker and the Life Events → Workplace screen (Story 6.36a,
// Task 5; AC4, AC5, AC6; `2026-10-14-330` SW4–SW9). DB-free, React-free: unit-tested in `tests/unit/workplace.test.ts`.
//
// · The SERVER is the authority on every rule (the start date, the typed name, the list). These helpers only decide when
//   *"Continue"* may be pressed (a valid answer — AC5) and how a refusal reads: a 422's `error.code` is one of
//   `WORKPLACE_REFUSAL_CODES`, each with its own words; a 409 *"already in progress"* (the same Idempotency-Key still
//   being served — a retry would only re-send it) has its own line; anything else is the generic retry line.
// · The date is typed `DD-MM-YYYY` (ASCII or Devanagari digits) through the neighbours' parser (`parseDisplayDate`) plus
//   the 1950 floor (SW6).
// ⚠ The app ⛔ cannot import `@twt/domain` (the Metro bundle boundary) — the wire types come from `@twt/contracts`.

import {
  WORKPLACE_REFUSAL_CODES,
  type PostingHistoryItemWire,
  type PostingUpdateRequest,
  type WorkplaceRefusalCode,
  type WorkplaceSummaryWire,
} from '@twt/contracts'

import { asciiDigits, parseDisplayDate, toDisplayDate } from './peer-request'

/** The earliest start date the server accepts (SW6). */
export const START_DATE_FLOOR = '1950-01-01'
/** The typed name / place cap (the server's rule; code points). */
export const TYPED_TEXT_MAX = 120

/** `DD-MM-YYYY` → `YYYY-MM-DD`, or `null` (⛔ a real date, in the future (IST), or before 1950). */
export function parseStartDate(text: string, todayIst: string): string | null {
  const iso = parseDisplayDate(text, todayIst)
  return iso !== null && iso >= START_DATE_FLOOR ? iso : null
}

/**
 * A typed workplace name or place the server will take (the server's rule, mirrored — review 2026-10-15):
 *   · 1–120 code points TRIMMED (what is sent — ⛔ never rewritten);
 *   · VISIBLE — with every format character (`\p{Cf}`: ZWJ, ZWNJ, ZWSP…), every mark (`\p{M}`) and the blank FILLERS
 *     removed, what remains holds at least one LETTER or DIGIT (`\p{L}` / `\p{N}`): a zero-width or marks-only name
 *     renders blank, and so do the fillers that are letters or symbols BY CATEGORY — the Hangul fillers U+115F / U+1160
 *     / U+3164 / U+FFA0 are `Lo` (so `\p{L}` alone would pass them), the braille blank U+2800 is `So` — they survive
 *     `trim()` and show nothing (review 2026-10-15 R2-5); a Devanagari word that CONTAINS a ZWNJ is fine;
 *   · ⛔ a run of seven digits once folded (a phone number — SW9), where a space, hyphen or dot BETWEEN digits is ⛔ a
 *     separator (`98765 43210`, `98765-43210`, `98.76.54.321` are all a phone number).
 * The server folds EVERY script's digits; this folds Devanagari (what a Hindi keyboard types) and ASCII.
 */
export function isPlausibleTypedText(text: string): boolean {
  const trimmed = text.trim()
  const len = [...trimmed].length
  if (len < 1 || len > TYPED_TEXT_MAX) return false
  // ⚠ LOCKSTEP with `packages/domain/src/member/workplace.ts` `INVISIBLE_RE` / `LETTER_OR_DIGIT_RE` — the server's exact
  // lines. The stripped copy is TRIMMED again: format characters around a lone space leave only the space (R2-5).
  // The five fillers as ESCAPES (the server's exact line) — a literal blank in source is one copy-paste from a space.
  const residue = trimmed.replace(/[\p{Cf}\p{M}ᅟᅠㅤﾠ⠀]/gu, '').trim()
  if (residue === '' || !/[\p{L}\p{N}]/u.test(residue)) return false
  // ⛔ A lookbehind (Hermes); the captured digit is put back — the server's exact line.
  return !/[0-9]{7}/.test(asciiDigits(trimmed).replace(/([0-9])[\s.-]+(?=[0-9])/g, '$1'))
}

/** The four answers of the step (SW7). `school` / `office` then pick from the list. */
export type WorkplaceAnswerKind = 'school' | 'office' | 'not_listed' | 'retired'

export interface WorkplaceAnswer {
  readonly district: string | null
  readonly kind: WorkplaceAnswerKind | null
  readonly workplace: WorkplaceSummaryWire | null
  readonly typedName: string
  readonly typedPlace: string
  readonly dateText: string
}

export const EMPTY_ANSWER: WorkplaceAnswer = { district: null, kind: null, workplace: null, typedName: '', typedPlace: '', dateText: '' }

/**
 * The request body for a Pariwar WITH a list, or `null` while the answer is incomplete or ⛔ valid — so *"Continue"* is
 * enabled only by a valid answer (AC5). A picked workplace must be of the chosen kind.
 */
export function buildListedRequest(a: WorkplaceAnswer, todayIst: string): PostingUpdateRequest | null {
  if (a.district === null || a.kind === null) return null
  const startedOn = parseStartDate(a.dateText, todayIst)
  if (startedOn === null) return null
  switch (a.kind) {
    case 'school':
    case 'office':
      return a.workplace !== null && a.workplace.kind === a.kind ? { choice: 'workplace', workplaceId: a.workplace.workplaceId, startedOn } : null
    case 'not_listed': {
      if (!isPlausibleTypedText(a.typedName)) return null
      const place = a.typedPlace.trim()
      if (place !== '' && !isPlausibleTypedText(place)) return null
      return { choice: 'not_listed', district: a.district, typedName: a.typedName.trim(), ...(place !== '' ? { typedPlace: place } : {}), startedOn }
    }
    case 'retired':
      return { choice: 'retired', district: a.district, startedOn }
  }
}

/** A Pariwar with ⛔ list yet: today's free-text district box + *"I have retired"* (SW7). */
export function buildDistrictOnlyRequest(district: string, isRetirement: boolean): PostingUpdateRequest | null {
  const d = district.trim()
  if (d === '' || [...d].length > 200) return null
  return { choice: 'district_only', district: d, isRetirement }
}

/** The 409 the route answers while the SAME Idempotency-Key is still being served (`handlers.ts` `updatePosting`). */
const IN_PROGRESS_CODE = 'life_events.idempotency_in_progress'

/** A failed save → the copy key (in the `workplace` namespace) of its words. */
export function refusalCopyKey(err: unknown): string {
  const e = err as { status?: number; code?: string } | null
  if (e?.status === 422 && typeof e.code === 'string' && (WORKPLACE_REFUSAL_CODES as readonly string[]).includes(e.code)) {
    return `refusal.${(e.code as WorkplaceRefusalCode).slice('workplace.'.length)}`
  }
  // A retry re-sends the same key and meets the same 409 — so: wait, then check the history (R2-6). Any OTHER 409 is generic.
  if (e?.status === 409 && e.code === IN_PROGRESS_CODE) return 'refusal.in_progress'
  return 'error_generic'
}

/** One history row, ready to render: a title (a copy key OR the data), a kind / state line, and the date line. */
export interface HistoryRowView {
  /** The workplace's name, or the member's own typed name (⛔ when erased). */
  readonly titleText: string | null
  /** When there is ⛔ titleText: a copy key (`row_retired`, `row_district_only`, `row_not_listed`, `row_typed`). */
  readonly titleKey: string | null
  /**
   * The kind / typed-name line (copy key), if any: `kind_*_short`; `row_not_listed` (*"a Pariwar Admin will look for
   * it"*) ONLY while the request is OPEN (`pending` / `suggested`); the neutral `row_typed` once it is `withdrawn` (a
   * later transfer), `confirmed` or `closed` — nobody is looking any more (review 2026-10-15 R2-1).
   */
  readonly kindKey: string | null
  /** An OPEN request's state line (AC3b), if any. */
  readonly statusKey: string | null
  readonly statusParams: Record<string, string> | undefined
  /** `row_since` (a workplace) / `row_on` (a retirement) with `{ date: DD-MM-YYYY }`, or ⛔. */
  readonly dateKey: 'row_since' | 'row_on' | null
  readonly date: string | null
  readonly district: string
}

export function historyRowView(item: PostingHistoryItemWire): HistoryRowView {
  const date = item.startedOn !== null ? toDisplayDate(item.startedOn) : null
  const base = { district: item.district, date, statusKey: null, statusParams: undefined }
  if (item.isRetirement) {
    return { ...base, titleText: null, titleKey: 'row_retired', kindKey: null, dateKey: date !== null ? 'row_on' : null }
  }
  if (item.workplace !== null) {
    return {
      ...base,
      titleText: item.workplace.name,
      titleKey: null,
      kindKey: item.workplace.kind === 'school' ? 'kind_school_short' : 'kind_office_short',
      dateKey: date !== null ? 'row_since' : null,
    }
  }
  if (item.request !== null) {
    const r = item.request
    const status =
      r.state === 'pending'
        ? { statusKey: 'request_pending', statusParams: undefined }
        : r.state === 'suggested' && r.suggested !== null
          ? { statusKey: 'request_suggested', statusParams: { name: r.suggested.name } }
          : { statusKey: null, statusParams: undefined }
    // The line is chosen by the request's STATE (⛔ by whether the name was erased): *"Not listed yet — a Pariwar Admin
    // will look for it"* only while someone will (R2-1). It is the TITLE when the typed text is erased.
    const line = r.state === 'pending' || r.state === 'suggested' ? 'row_not_listed' : 'row_typed'
    return {
      ...base,
      ...status,
      titleText: r.typedName,
      titleKey: r.typedName === null ? line : null,
      kindKey: r.typedName === null ? null : line,
      dateKey: date !== null ? 'row_since' : null,
    }
  }
  return { ...base, titleText: null, titleKey: 'row_district_only', kindKey: null, dateKey: date !== null ? 'row_since' : null }
}
