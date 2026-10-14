// Where each member works — the PURE logic behind the workplace picker and the Life Events → Workplace screen (Story 6.36a,
// Task 5; AC4, AC5, AC6; `2026-10-14-330` SW4–SW9). DB-free, React-free: unit-tested in `tests/unit/workplace.test.ts`.
//
// · The SERVER is the authority on every rule (the start date, the typed name, the list). These helpers only decide when
//   *"Continue"* may be pressed (a valid answer — AC5) and how a refusal reads: a 422's `error.code` is one of
//   `WORKPLACE_REFUSAL_CODES`, each with its own words; anything else is the generic retry line.
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
 * A typed workplace name or place the server will take: 1–120 characters trimmed and ⛔ a run of seven digits (a phone
 * number — SW9). The server folds EVERY script's digits; this folds Devanagari (what a Hindi keyboard types) and ASCII.
 */
export function isPlausibleTypedText(text: string): boolean {
  const trimmed = text.trim()
  const len = [...trimmed].length
  return len >= 1 && len <= TYPED_TEXT_MAX && !/[0-9]{7}/.test(asciiDigits(trimmed))
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

/** A failed save → the copy key (in the `workplace` namespace) of its words. */
export function refusalCopyKey(err: unknown): string {
  const e = err as { status?: number; code?: string } | null
  if (e?.status === 422 && typeof e.code === 'string' && (WORKPLACE_REFUSAL_CODES as readonly string[]).includes(e.code)) {
    return `refusal.${(e.code as WorkplaceRefusalCode).slice('workplace.'.length)}`
  }
  return 'error_generic'
}

/** One history row, ready to render: a title (a copy key OR the data), a kind / state line, and the date line. */
export interface HistoryRowView {
  /** The workplace's name, or the member's own typed name (⛔ when erased). */
  readonly titleText: string | null
  /** When there is ⛔ titleText: a copy key (`row_retired`, `row_district_only`, `row_not_listed`). */
  readonly titleKey: string | null
  /** The kind / not-listed line (copy key), if any. */
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
    return {
      ...base,
      ...status,
      titleText: r.typedName,
      titleKey: r.typedName === null ? 'row_not_listed' : null,
      kindKey: r.typedName === null ? null : 'row_not_listed',
      dateKey: date !== null ? 'row_since' : null,
    }
  }
  return { ...base, titleText: null, titleKey: 'row_district_only', kindKey: null, dateKey: date !== null ? 'row_since' : null }
}
