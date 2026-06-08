// Sample Panchayat Noticeboard data per UX spec lines 483-498.
// Home screen for non-alert moments rendered as panchayat-bhavan
// noticeboard (NOT a feed). RTPS-portal scheme-list + Jagran front-page
// density reference.
//
// Hindi-numerals discipline per UX spec line 1127:
//   Standalone counts/dates render in Latin EVEN on memorial pages and
//   the Panchayat Noticeboard. The stat-line counts (सदस्य / ज़िले /
//   आहुति पूर्ण) render as Latin numerals.

export type StatLine = {
  totalMembers: number
  districts: number
  closedThisMonth: number
}

export type PinnedItemCategory = 'saffron' | 'green' | 'black'

export type PinnedItem = {
  id: string
  category: PinnedItemCategory
  title: string  // Hindi
  detailHint?: string  // Hindi short detail
}

export type RecentClosing = {
  id: string
  memorialName: string  // Hindi
  district: string  // Hindi
  contributorCount: number  // Latin
}

export type NextMeeting = {
  monthYear: string  // Latin "MMM YYYY"
  date: string  // Latin day-of-month
  venue: string  // Hindi
}

// Top stat line counts — Latin numerals only per UX spec line 1127.
// Realistic v1 baseline: a 50,000-member multi-district Bihar trust.
export const SAMPLE_STATS: StatLine = {
  totalMembers: 51_204,
  districts: 38,
  closedThisMonth: 7,
}

// Pinned section: 2-3 items max per UX spec line 491.
// Each row has small left-stub colored by category type.
//   saffron — niyamavali amendment / governance update
//   green   — cycle / pool / disbursement update
//   black   — bereavement notice
export const SAMPLE_PINNED: PinnedItem[] = [
  {
    id: 'pinned-1',
    category: 'black',
    title: 'श्रद्धांजलि: रामेश्वर प्रसाद सिंह, गोपालगंज',
    detailHint: 'योगदान खुला',
  },
  {
    id: 'pinned-2',
    category: 'saffron',
    title: 'नियमावली संशोधन: धारा १४ — पंचायत निर्णय कोरम',
    detailHint: 'अनुमोदन हेतु',
  },
  {
    id: 'pinned-3',
    category: 'green',
    title: 'चक्र C-16 आरंभ — २८० नए सदस्य जुड़े',
    detailHint: 'विवरण देखें',
  },
]

// हाल की आहुति: last 5 closed pools per UX spec line 493.
// Each row: memorial name + district + contributor count.
// Counts render Latin per discipline.
export const SAMPLE_RECENT_CLOSINGS: RecentClosing[] = [
  { id: 'rc-1', memorialName: 'दीनानाथ झा', district: 'मधुबनी', contributorCount: 1842 },
  { id: 'rc-2', memorialName: 'शिवकुमारी देवी', district: 'सीतामढ़ी', contributorCount: 1607 },
  { id: 'rc-3', memorialName: 'विद्यानंद यादव', district: 'दरभंगा', contributorCount: 2104 },
  { id: 'rc-4', memorialName: 'सुषमा कुमारी', district: 'समस्तीपुर', contributorCount: 1295 },
  { id: 'rc-5', memorialName: 'महेश्वर पासवान', district: 'पूर्णिया', contributorCount: 1731 },
]

// Footer: next monthly Pariwar meeting per UX spec line 495.
export const SAMPLE_NEXT_MEETING: NextMeeting = {
  monthYear: 'Jul 2026',
  date: '15',
  venue: 'पटना — शिक्षा भवन सभागार',
}

// Latin-numeral formatting helper (Indian grouping)
export function formatCount(n: number): string {
  return n.toLocaleString('en-IN')
}
