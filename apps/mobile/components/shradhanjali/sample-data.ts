// Sample Shradhanjali Sahyog Vivran data per UX spec lines 464-481.
// Memorial subject + 250 contributor entries to exercise FlashList
// virtualization per architecture line 2669 (Shradhanjali contributor
// scroll 200-13,000+ entries is the canonical FlashList case).
//
// Hindi-numerals discipline per UX spec line 1127 amendment A2:
//   - Parichay prose CAN use Hindi numerals ("३४ वर्षों की सेवा")
//   - Standalone counts/dates/amounts render in Latin EVEN on memorial pages
//   - Contributor scroll month-year timestamps: Latin

export type MemorialSubject = {
  name: string  // Hindi serif display name
  birthDate: string  // ISO Gregorian
  deathDate: string  // ISO Gregorian
  village: string  // Hindi
  school: string  // Hindi
  yearsOfService: number  // for parichay
  parichay: string  // 3-sentence Hindi biography (can include Hindi numerals in prose)
  kinship: Array<{ relation: string; names: string }>  // role -> comma-separated names
  bhavpurnaLine: string  // centered italic line
}

export type Contributor = {
  id: string
  name: string  // Hindi
  district: string  // Hindi
  monthYear: string  // Latin "MMM YYYY" — per UX spec line 478 no minute-precision
  memoryLine: string | null  // optional "दो शब्द स्मृति में" line — null if not provided
}

// Sample memorial subject — a fictional Bihar teacher
export const SAMPLE_MEMORIAL: MemorialSubject = {
  name: 'रामेश्वर प्रसाद सिंह',
  birthDate: '1962-08-15',
  deathDate: '2026-04-22',
  village: 'गोपालगंज',
  school: 'राजकीय उच्च विद्यालय, छपरा',
  yearsOfService: 34,
  // Parichay prose — Hindi numerals permitted per UX spec line 1127 amendment A2
  parichay:
    'गोपालगंज ज़िले के निवासी। ३४ वर्षों तक राजकीय उच्च विद्यालय छपरा में हिन्दी और इतिहास के शिक्षक रहे। शिक्षक संघ के सक्रिय सदस्य और गाँव की पंचायत के समिति सदस्य।',
  kinship: [
    { relation: 'पत्नी', names: 'सुनीता देवी' },
    { relation: 'पुत्र', names: 'अमित, राहुल' },
    { relation: 'पुत्री', names: 'पूजा' },
    { relation: 'भाई', names: 'दीनेश प्रसाद' },
  ],
  bhavpurnaLine: 'भावपूर्ण श्रद्धांजलि',
}

// Contributor name pool — 80 unique Hindi names (will cycle for 250 contributors)
const contributorNames = [
  'रमेश कुमार', 'सुनीता देवी', 'अनिल यादव', 'कमला सिंह', 'विक्रम चौधरी',
  'रीना शर्मा', 'शंकर पासवान', 'दीपिका कुमारी', 'राम प्रसाद', 'सीता राम',
  'मनोज महतो', 'गीता देवी', 'संजय कुमार', 'पूजा सिंह', 'अमित मंडल',
  'रंजना देवी', 'राकेश राय', 'सुषमा कुमारी', 'दीपक भारती', 'रेखा सिन्हा',
  'अंजली श्रीवास्तव', 'कृष्ण मोहन', 'विद्यानंद कुमार', 'त्रिवेणी प्रसाद', 'ज्ञानेश्वर पंडित',
  'हृदय नारायण', 'द्विवेदी प्रसाद', 'श्रद्धा सिंह', 'दुष्यंत झा', 'पुष्पा देवी',
  'विश्वनाथ पासवान', 'प्रत्यूष कुमार', 'अक्षय भारती', 'चन्द्रकांत यादव', 'महेन्द्र प्रसाद',
  'मंजू कुमारी', 'सरिता देवी', 'मीना सिंह', 'अनिता शर्मा', 'विद्या कुमारी',
  'रवि शंकर', 'अशोक कुमार', 'सुरेश चौधरी', 'नीतीश राय', 'विजय कुमार',
  'अजय यादव', 'राजेश सिन्हा', 'मुकेश पाण्डेय', 'सुदामा महतो', 'गिरीश पंडित',
  'राधा देवी', 'किरण कुमारी', 'शोभा सिन्हा', 'निर्मला देवी', 'विमला कुमारी',
  'मीरा शर्मा', 'सरला देवी', 'उषा सिंह', 'मधु यादव', 'प्रेम लता',
  'हरि शंकर', 'भोला नाथ', 'शिव कुमार', 'गणेश राय', 'भगवान दास',
  'जयराम कुमार', 'धर्मेन्द्र महतो', 'सत्येन्द्र यादव', 'योगेन्द्र सिंह', 'सुधीर पासवान',
  'श्यामलाल भारती', 'देवनाथ झा', 'चिरंजीवी प्रसाद', 'लक्ष्मण कुमार', 'भीमसेन यादव',
  'भारती देवी', 'प्रभावती कुमारी', 'कौशल्या सिंह', 'जयश्री शर्मा', 'मंजू देवी',
]

const districts = [
  'पटना', 'गया', 'मुजफ्फरपुर', 'दरभंगा', 'भागलपुर',
  'पूर्णिया', 'सहरसा', 'मधुबनी', 'सीतामढ़ी', 'समस्तीपुर',
  'वैशाली', 'सारण', 'सिवान', 'गोपालगंज', 'पश्चिम चम्पारण',
  'पूर्व चम्पारण', 'मधेपुरा', 'कटिहार', 'अररिया', 'किशनगंज',
  'बेगूसराय', 'खगड़िया', 'मुंगेर', 'जमुई', 'बांका',
  'नालंदा', 'जहानाबाद', 'अरवल', 'नवादा', 'औरंगाबाद',
  'रोहतास', 'कैमूर', 'भोजपुर', 'बक्सर', 'शेखपुरा',
  'लखीसराय', 'सुपौल', 'शिवहर',
]

// Sample memory lines (Hindi) — single-line "दो शब्द स्मृति में" entries
const memoryLines = [
  'प्रेरणा के स्तंभ',
  'गाँव के गौरव',
  'शिक्षक तो ऐसे ही होने चाहिए',
  'हिन्दी के असली सेवक',
  'पाठ नहीं, संस्कार दिए',
  'पीढ़ियों तक रहेंगे याद',
  'कक्षा के बाहर भी शिक्षक',
  'अमिट छाप',
  'सच्चे गुरु',
  'एक युग का अंत',
  'भुलाए नहीं भूलेंगे',
  'कलम ही नहीं, कर्म भी सिखाया',
  'श्रद्धा सहित',
  'विनम्र श्रद्धांजलि',
  'पुण्य आत्मा को शांति',
]

// Generate 250 contributors with month-year timestamps spanning May 2026
function generateContributors(): Contributor[] {
  const contributors: Contributor[] = []
  // Month-year format: Latin per UX spec line 478 + line 1127 amendment A2
  const monthYears = ['Apr 2026', 'May 2026', 'Jun 2026']
  for (let i = 0; i < 250; i++) {
    // Non-null asserted: modulo-indexed access on non-empty arrays — `i %
    // arr.length` always yields a valid index. noUncheckedIndexedAccess
    // surfacing per Story 1.1 AC-3 strict-mode triage.
    const name = contributorNames[i % contributorNames.length]!
    const district = districts[i % districts.length]!
    const monthYear = monthYears[Math.floor(i / 85) % monthYears.length]!
    // About 1 in 3 contributors leave a memory line
    const memoryLine = i % 3 === 0 ? memoryLines[i % memoryLines.length]! : null
    contributors.push({
      id: `contrib-${i.toString().padStart(3, '0')}`,
      name,
      district,
      monthYear,
      memoryLine,
    })
  }
  return contributors
}

export const SAMPLE_CONTRIBUTORS: Contributor[] = generateContributors()

// Latin numeral formatting helpers per UX spec line 1127 (Latin on memorial
// pages for standalone counts/dates/amounts)
export function formatBirthDeath(birth: string, death: string): string {
  const formatDate = (iso: string): string => {
    // Non-null asserted: ISO date strings always split on '-' with at least
    // one segment. noUncheckedIndexedAccess surfacing per Story 1.1 AC-3.
    const [year] = iso.split('-') as [string, ...string[]]
    return year  // year-only display per memorial discipline
  }
  return `${formatDate(birth)} – ${formatDate(death)}`
}
