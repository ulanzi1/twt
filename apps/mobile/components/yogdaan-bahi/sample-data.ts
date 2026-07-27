// Yogdaan Bahi — the ₹ formatter + a Devanagari conjunct stress-set TEST FIXTURE.
//
// Story 8.6 PRODUCTIONIZED the passbook: the runtime data source is now the real
// GET /api/v1/member/contribution-history read (see useYogdaanQuery.ts). This module no longer feeds
// the runtime path — it provides (1) `formatInr` (the shared ₹ formatter used by the row + footer) and
// (2) `SAMPLE_YOGDAAN_ROWS`, a Devanagari conjunct/ligature stress-set retained for P1 render validation
// (a test/prototype fixture only), now shaped to the REAL `ContributionHistoryRow` contract so it stays
// type-valid. Hindi-numerals discipline (UX line 1127): operational columns render Gregorian + Latin
// numerals ONLY; the `deceasedFirstName`/`deceasedLastInitial` (family) column carries Devanagari.

import type { ContributionHistoryRow } from '@twt/contracts'

/** The passbook row shape — the real read-model contract (Story 8.6 replaced the prototype's fake type). */
export type YogdaanRow = ContributionHistoryRow

// Hindi name pool — common Bihar names + names with challenging Devanagari conjuncts/ligatures
// (कृष्ण क्ष; ज्ञानेश्वर ज्ञ; हृदय हृ; etc.) to stress-test P1 rendering on substitute devices.
const sahyogNames: ReadonlyArray<readonly [first: string, lastInitial: string]> = [
  ['रमेश', 'कु'],
  ['सुनीता', 'दे'],
  ['अनिल', 'या'],
  ['कमला', 'सिं'],
  ['विक्रम', 'चौ'],
  ['रीना', 'श'],
  ['शंकर', 'पा'],
  ['दीपिका', 'कु'],
  // Conjunct/ligature stress-test names:
  ['कृष्ण', 'मो'], // conjunct क्ष
  ['ज्ञानेश्वर', 'पं'], // conjunct ज्ञ — challenging
  ['हृदय', 'ना'], // conjunct हृ — challenging
  ['श्रद्धा', 'सिं'], // conjunct द्ध
  ['विश्वनाथ', 'पा'], // conjunct श्व
  ['प्रत्यूष', 'कु'], // conjunct त्यू
  ['चन्द्रकांत', 'या'], // half-form न + conjunct न्द्र
  ['महेन्द्र', 'प्र'], // half-form न + conjunct न्द्र
]

const poolLetters = ['A', 'B', 'C', 'D', 'E']
// All FIVE tones (Story 9.6 added `held`) so the dev-time passbook exercises every <StatusPill> state on
// the emulator — the only way to eyeball the polished `held` tone (its live producer is Story 9.8).
const statuses: YogdaanRow['status'][] = ['yellow', 'green', 'red', 'grey', 'held']

// Generate stress-set rows in the REAL contract shape (fixture only — never the runtime path).
function generateRows(): YogdaanRow[] {
  const rows: YogdaanRow[] = []
  const baseDate = new Date('2026-06-05T00:00:00Z')
  for (let i = 0; i < sahyogNames.length; i++) {
    const date = new Date(baseDate)
    date.setUTCDate(baseDate.getUTCDate() - i)
    const [first, lastInitial] = sahyogNames[i]!
    const letter = poolLetters[Math.floor(i / 4) % poolLetters.length]!
    const month = ((i % 6) + 1).toString().padStart(2, '0')
    const amountInr = 100 + ((i * 137) % 39) * 50
    rows.push({
      contributionId: `fixture-${i.toString().padStart(3, '0')}`,
      date: date.toISOString(),
      deceasedFirstName: first,
      deceasedLastInitial: lastInitial,
      poolLetterCode: letter,
      poolName: null,
      poolCanonicalIdentifier: `P-2026-${month}-001`,
      cycleRef: `2026-${month}`,
      amountInr,
      status: statuses[i % statuses.length]!,
      // Story 8.7: a resolvable row is Note-generatable in EVERY status (`noteAvailable` is a
      // resolvability predicate, not a status one), so the fixture matches the runtime shape.
      noteAvailable: true,
    })
  }
  return rows
}

export const SAMPLE_YOGDAAN_ROWS: YogdaanRow[] = generateRows()

export const SAMPLE_YOGDAAN_TOTAL_INR: number = SAMPLE_YOGDAAN_ROWS.reduce(
  (sum, row) => sum + row.amountInr,
  0,
)

// Format amount as ₹X,XXX (Latin numerals, Indian grouping — no Hindi numerals per UX line 1127).
export function formatInr(amountInr: number): string {
  return `₹${amountInr.toLocaleString('en-IN')}`
}
