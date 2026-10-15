// Story 6.36a (Task 5; AC4, AC5, AC6) — the workplace picker's and the Workplace screen's PURE logic. Node-only (the
// mobile harness has ⛔ RN renderer for these screens — the logic lives in `lib/workplace.ts` for this reason).
//   · the start date: DD-MM-YYYY (Devanagari digits too), ⛔ future, ⛔ before 1950 (SW6);
//   · *"Continue"* only for a VALID answer (AC5): each of the four answers, a mismatched pick, a phone number typed;
//   · the no-list Pariwar's district box (SW7);
//   · each 422 code → its own words; anything else → the generic retry line;
//   · the history rows (AC3b): a workplace, an *"isn't listed"* answer (pending / suggested / erased), a retirement, a
//     district-only legacy row.

import type { PostingHistoryItemWire, WorkplaceSummaryWire } from '@twt/contracts'
import { WORKPLACE_REFUSAL_CODES } from '@twt/contracts'
import { describe, expect, it } from 'vitest'

import { newIdempotencyKey } from '../../lib/idempotency-key'
import { WIZARD_STEPS } from '../../lib/wizard-steps'
import { newIdempotencyKey as reExported } from '../../lib/peer-request'
import {
  buildDistrictOnlyRequest,
  buildListedRequest,
  EMPTY_ANSWER,
  historyRowView,
  isPlausibleTypedText,
  parseStartDate,
  refusalCopyKey,
  type WorkplaceAnswer,
} from '../../lib/workplace'

const TODAY = '2026-10-14'
const SCHOOL: WorkplaceSummaryWire = {
  workplaceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  kind: 'school',
  name: 'GMS RAMPUR',
  district: 'Patna',
  villageName: 'Rampur',
  clusterName: 'Danapur',
}

const answer = (over: Partial<WorkplaceAnswer>): WorkplaceAnswer => ({ ...EMPTY_ANSWER, district: 'Patna', dateText: '01-06-2019', ...over })

describe('the signup step (AC5)', () => {
  it('sits between kyc and nominees, so "Step N of M" counts it', () => {
    expect([...WIZARD_STEPS]).toEqual(['tc', 'kyc', 'workplace', 'nominees', 'medical', 'payment'])
  })
})

describe('the start date (SW6)', () => {
  it('reads DD-MM-YYYY with ASCII or Devanagari digits; refuses the future, before 1950 and a non-date', () => {
    expect(parseStartDate('01-06-2019', TODAY)).toBe('2019-06-01')
    expect(parseStartDate('०१-०६-२०१९', TODAY)).toBe('2019-06-01')
    expect(parseStartDate('14-10-2026', TODAY)).toBe('2026-10-14')
    expect(parseStartDate('15-10-2026', TODAY)).toBeNull()
    expect(parseStartDate('01-01-1950', TODAY)).toBe('1950-01-01')
    expect(parseStartDate('31-12-1949', TODAY)).toBeNull()
    expect(parseStartDate('31-02-2020', TODAY)).toBeNull()
    expect(parseStartDate('2019-06-01', TODAY)).toBeNull()
  })
})

describe('"Continue" only for a VALID answer (AC5)', () => {
  it('a listed school / office of the chosen kind', () => {
    expect(buildListedRequest(answer({ kind: 'school', workplace: SCHOOL }), TODAY)).toEqual({
      choice: 'workplace',
      workplaceId: SCHOOL.workplaceId,
      startedOn: '2019-06-01',
    })
    expect(buildListedRequest(answer({ kind: 'office', workplace: SCHOOL }), TODAY)).toBeNull()
    expect(buildListedRequest(answer({ kind: 'school', workplace: null }), TODAY)).toBeNull()
  })

  it('"isn\'t listed": a name (trimmed), an optional place, ⛔ a phone number (ASCII or Devanagari)', () => {
    expect(buildListedRequest(answer({ kind: 'not_listed', typedName: '  Village School ', typedPlace: '' }), TODAY)).toEqual({
      choice: 'not_listed',
      district: 'Patna',
      typedName: 'Village School',
      startedOn: '2019-06-01',
    })
    expect(buildListedRequest(answer({ kind: 'not_listed', typedName: 'School', typedPlace: ' Rampur ' }), TODAY)).toMatchObject({ typedPlace: 'Rampur' })
    expect(buildListedRequest(answer({ kind: 'not_listed', typedName: '   ' }), TODAY)).toBeNull()
    expect(buildListedRequest(answer({ kind: 'not_listed', typedName: 'Call ९८७६५४३२१०' }), TODAY)).toBeNull()
    expect(buildListedRequest(answer({ kind: 'not_listed', typedName: 'School', typedPlace: '9876543' }), TODAY)).toBeNull()
    expect(isPlausibleTypedText('x'.repeat(120))).toBe(true)
    expect(isPlausibleTypedText('x'.repeat(121))).toBe(false)
  })

  it('a phone number split by spaces, hyphens or dots is STILL a phone number; a legit number stays (review 2026-10-15, widened)', () => {
    expect(isPlausibleTypedText('98765 43210')).toBe(false)
    expect(isPlausibleTypedText('98765-43210')).toBe(false)
    expect(isPlausibleTypedText('९८७६५-४३२१०')).toBe(false)
    expect(isPlausibleTypedText('98.76.54.321')).toBe(false)
    expect(isPlausibleTypedText('Ward 987 6543')).toBe(false)
    expect(isPlausibleTypedText('Ward 12, Block 345')).toBe(true)
    expect(isPlausibleTypedText('GMS RAMPUR 2')).toBe(true)
  })

  it('a zero-width or marks-only name is ⛔ visible ⇒ invalid; a Devanagari word holding a ZWNJ is valid, sent UNSTRIPPED', () => {
    expect(isPlausibleTypedText('​')).toBe(false)
    expect(isPlausibleTypedText('​‌')).toBe(false)
    expect(isPlausibleTypedText('‍ ‌')).toBe(false) // format characters around a lone space — the server's rule
    expect(isPlausibleTypedText('́ँ')).toBe(false)
    expect(isPlausibleTypedText('  ‍  ')).toBe(false)
    const withZwnj = 'विद्‌यालय'
    expect(isPlausibleTypedText(withZwnj)).toBe(true)
    expect(buildListedRequest(answer({ kind: 'not_listed', typedName: ` ${withZwnj} ` }), TODAY)).toMatchObject({ typedName: withZwnj })
  })

  it('an invisible FILLER that is ⛔ a format character or a mark (Lo / So) is ⛔ visible either; the residue needs a letter or a digit (review R2-5)', () => {
    expect(isPlausibleTypedText('ㅤ')).toBe(false) // Hangul filler (Lo — `\p{L}` alone would pass it)
    expect(isPlausibleTypedText('ᅟ')).toBe(false) // Hangul choseong filler
    expect(isPlausibleTypedText('ᅠ')).toBe(false) // Hangul jungseong filler
    expect(isPlausibleTypedText('ﾠ')).toBe(false) // halfwidth Hangul filler
    expect(isPlausibleTypedText('⠀')).toBe(false) // braille blank (So)
    expect(isPlausibleTypedText('ㅤ ㅤ')).toBe(false)
    expect(isPlausibleTypedText('- - -')).toBe(false) // punctuation alone — ⛔ a letter or digit
    expect(isPlausibleTypedText('GMS RAMPUR')).toBe(true)
    expect(isPlausibleTypedText('विद्यालय')).toBe(true)
    expect(isPlausibleTypedText('Ward 12')).toBe(true)
  })

  it('"I have retired": the district and the RETIREMENT date', () => {
    expect(buildListedRequest(answer({ kind: 'retired', dateText: '31-03-2024' }), TODAY)).toEqual({
      choice: 'retired',
      district: 'Patna',
      startedOn: '2024-03-31',
    })
  })

  it('⛔ without a district, an answer or a valid date', () => {
    expect(buildListedRequest({ ...answer({ kind: 'retired' }), district: null }, TODAY)).toBeNull()
    expect(buildListedRequest(answer({ kind: null }), TODAY)).toBeNull()
    expect(buildListedRequest(answer({ kind: 'retired', dateText: '' }), TODAY)).toBeNull()
    expect(buildListedRequest(answer({ kind: 'retired', dateText: '01-01-2099' }), TODAY)).toBeNull()
  })

  it('a Pariwar with ⛔ list: the district box (SW7)', () => {
    expect(buildDistrictOnlyRequest('  Any District ', true)).toEqual({ choice: 'district_only', district: 'Any District', isRetirement: true })
    expect(buildDistrictOnlyRequest('   ', false)).toBeNull()
    expect(buildDistrictOnlyRequest('x'.repeat(201), false)).toBeNull()
  })
})

describe('a refused save', () => {
  it('each 422 code reads its own words; anything else is the generic retry line', () => {
    expect(WORKPLACE_REFUSAL_CODES.map((code) => refusalCopyKey({ status: 422, code }))).toEqual([
      'refusal.not_found',
      'refusal.district_not_found',
      'refusal.start_date_invalid',
      'refusal.typed_name_invalid',
      'refusal.choice_unavailable',
    ])
    expect(refusalCopyKey({ status: 422, code: 'request.something_else' })).toBe('error_generic')
    expect(refusalCopyKey({ status: 400, code: 'workplace.not_found' })).toBe('error_generic')
    expect(refusalCopyKey(new Error('network'))).toBe('error_generic')
  })

  it('a 409 "already in progress" (the same key still being served) reads its own line; any other 409 is generic (review R2-6)', () => {
    expect(refusalCopyKey({ status: 409, code: 'life_events.idempotency_in_progress' })).toBe('refusal.in_progress')
    expect(refusalCopyKey({ status: 409, code: 'life_events.idempotency_mismatch' })).toBe('error_generic')
    expect(refusalCopyKey({ status: 409 })).toBe('error_generic')
    expect(refusalCopyKey({ status: 422, code: 'life_events.idempotency_in_progress' })).toBe('error_generic')
  })

  it('the Idempotency-Key helper is SHARED (moved, re-exported for the neighbours\' screens)', () => {
    expect(reExported).toBe(newIdempotencyKey)
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey())
  })
})

describe('the history rows (AC3b)', () => {
  const base: PostingHistoryItemWire = {
    postingId: '9b2e7c1a-1111-4111-8111-111111111111',
    recordedAt: '2026-01-01T00:00:00.000000Z',
    district: 'Patna',
    startedOn: '2019-06-01',
    isRetirement: false,
    workplace: null,
    request: null,
  }

  it('a workplace: its name, its kind, the district, "Since"', () => {
    expect(historyRowView({ ...base, workplace: { workplaceId: SCHOOL.workplaceId, kind: 'office', name: 'DEO OFFICE' } })).toMatchObject({
      titleText: 'DEO OFFICE',
      kindKey: 'kind_office_short',
      district: 'Patna',
      dateKey: 'row_since',
      date: '01-06-2019',
      statusKey: null,
    })
  })

  it('"isn\'t listed": the typed name + "Not listed yet"; an OPEN request shows its state; an erased name falls back', () => {
    const req = { requestId: SCHOOL.workplaceId, typedName: 'Village School', typedPlace: null, suggested: null }
    expect(historyRowView({ ...base, request: { ...req, state: 'pending' } })).toMatchObject({
      titleText: 'Village School',
      kindKey: 'row_not_listed',
      statusKey: 'request_pending',
    })
    expect(
      historyRowView({ ...base, request: { ...req, state: 'suggested', suggested: { workplaceId: SCHOOL.workplaceId, name: 'GMS RAMPUR', district: 'Patna' } } }),
    ).toMatchObject({ statusKey: 'request_suggested', statusParams: { name: 'GMS RAMPUR' } })
    expect(historyRowView({ ...base, request: { ...req, typedName: null, state: 'pending' } })).toMatchObject({ titleText: null, titleKey: 'row_not_listed', kindKey: null })
  })

  it('"Not listed yet — a Pariwar Admin will look for it" ONLY while the request is OPEN; withdrawn / confirmed / closed read the neutral line (review R2-1)', () => {
    const req = { requestId: SCHOOL.workplaceId, typedName: 'Village School', typedPlace: null, suggested: null }
    expect(historyRowView({ ...base, request: { ...req, state: 'pending' } }).kindKey).toBe('row_not_listed')
    expect(
      historyRowView({ ...base, request: { ...req, state: 'suggested', suggested: { workplaceId: SCHOOL.workplaceId, name: 'GMS RAMPUR', district: 'Patna' } } }).kindKey,
    ).toBe('row_not_listed')
    // After a transfer the writer sets the request `withdrawn`: the typed name stays the title, ⛔ a status line, ⛔ anyone looking.
    expect(historyRowView({ ...base, request: { ...req, state: 'withdrawn' } })).toMatchObject({ titleText: 'Village School', kindKey: 'row_typed', statusKey: null })
    expect(historyRowView({ ...base, request: { ...req, state: 'confirmed' } })).toMatchObject({ kindKey: 'row_typed', statusKey: null })
    // Erased AND closed: the neutral line is the TITLE.
    expect(historyRowView({ ...base, request: { ...req, typedName: null, state: 'closed' } })).toMatchObject({ titleText: null, titleKey: 'row_typed', kindKey: null, statusKey: null })
  })

  it('a retirement: "Retired", "On <date>"; a legacy district-only row: "District recorded", ⛔ date', () => {
    expect(historyRowView({ ...base, isRetirement: true, startedOn: '2024-03-31' })).toMatchObject({ titleKey: 'row_retired', dateKey: 'row_on', date: '31-03-2024' })
    expect(historyRowView({ ...base, startedOn: null })).toMatchObject({ titleKey: 'row_district_only', dateKey: null, date: null })
  })
})
