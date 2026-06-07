// Sample Yogdaan Bahi (contribution book) data — 60 rows for P0-5 prototype
// measurement validity. Devanagari names include common conjuncts + ligatures
// to stress-test P1 rendering on substitute devices (Redmi 10 Mali GPU vs
// Snapdragon Adreno baseline per FM-2 disposition).
//
// Hindi-numerals discipline per UX spec line 1127: Yogdaan Bahi rows render
// Gregorian + Latin numerals ONLY (dates, pool codes, amounts). Sahyog
// (beneficiary name) column carries Devanagari per Bihar Hindi context.

export type YogdaanRow = {
  id: string
  date: string  // ISO format, Gregorian
  sahyog: string  // Hindi beneficiary name
  pool: string  // Latin pool/cycle code
  amountInr: number  // raw rupees, formatted at render time
}

// Hindi name pool — mix of common Bihar names + names with challenging
// Devanagari conjuncts/ligatures (कृष्ण क्ष; ज्ञानेश्वर ज्ञ; हृदय हृ; etc.)
const sahyogNames = [
  'रमेश कुमार',
  'सुनीता देवी',
  'अनिल यादव',
  'कमला सिंह',
  'विक्रम चौधरी',
  'रीना शर्मा',
  'शंकर पासवान',
  'दीपिका कुमारी',
  'राम प्रसाद',
  'सीता राम',
  'मनोज महतो',
  'गीता देवी',
  'संजय कुमार',
  'पूजा सिंह',
  'अमित मंडल',
  'रंजना देवी',
  'राकेश राय',
  'सुषमा कुमारी',
  'दीपक भारती',
  'रेखा सिन्हा',
  // Conjunct/ligature stress-test names:
  'अंजली श्रीवास्तव',   // anusvara ं + conjunct श्र
  'कृष्ण मोहन',          // conjunct क्ष
  'विद्यानंद',          // conjunct द्या + nasalization
  'त्रिवेणी प्रसाद',     // conjunct त्रि
  'ज्ञानेश्वर पंडित',   // conjunct ज्ञ — challenging
  'हृदय नारायण',         // conjunct हृ — challenging
  'द्विवेदी प्रसाद',     // conjunct द्वि
  'श्रद्धा सिंह',        // conjunct द्ध
  'दुष्यंत झा',          // conjunct ष्य
  'पुष्पा देवी',         // conjunct ष्प
  'विश्वनाथ पासवान',    // conjunct श्व
  'प्रत्यूष कुमार',      // conjunct त्यू
  'अक्षय भारती',         // conjunct क्ष
  'चन्द्रकांत यादव',     // chandrabindu-style nasalization + conjunct
  'महेन्द्र प्रसाद',     // half-form न + conjunct न्द्र
  // Female teacher names common in Bihar:
  'मंजू कुमारी',
  'सरिता देवी',
  'मीना सिंह',
  'अनिता शर्मा',
  'विद्या कुमारी',
]

const poolCodes = ['C-12', 'C-13', 'C-14', 'C-15', 'C-16']

// Generate 60 rows with deterministic-but-varied data
function generateRows(): YogdaanRow[] {
  const rows: YogdaanRow[] = []
  // Date range: last 60 days from 2026-06-05
  const baseDate = new Date('2026-06-05T00:00:00Z')
  for (let i = 0; i < 60; i++) {
    const date = new Date(baseDate)
    date.setUTCDate(baseDate.getUTCDate() - i)
    const dateStr = date.toISOString().slice(0, 10)  // YYYY-MM-DD

    // Non-null asserted: modulo-indexed access on non-empty arrays — `i %
    // arr.length` always yields a valid index. noUncheckedIndexedAccess
    // surfacing per Story 1.1 AC-3 strict-mode triage.
    const name = sahyogNames[i % sahyogNames.length]!
    const pool = poolCodes[Math.floor(i / 12) % poolCodes.length]!

    // Amounts: realistic Bihar-teacher contribution range
    // (₹100–₹2000), in ₹50 increments
    const amountInr = 100 + ((i * 137) % 39) * 50

    rows.push({
      id: `row-${i.toString().padStart(3, '0')}`,
      date: dateStr,
      sahyog: name,
      pool,
      amountInr,
    })
  }
  return rows
}

export const SAMPLE_YOGDAAN_ROWS: YogdaanRow[] = generateRows()

export const SAMPLE_YOGDAAN_TOTAL_INR: number = SAMPLE_YOGDAAN_ROWS.reduce(
  (sum, row) => sum + row.amountInr,
  0,
)

// Format amount as ₹X,XXX (Latin numerals, Indian grouping — no Hindi numerals
// per UX spec line 1127 Yogdaan Bahi discipline)
export function formatInr(amountInr: number): string {
  return `₹${amountInr.toLocaleString('en-IN')}`
}
