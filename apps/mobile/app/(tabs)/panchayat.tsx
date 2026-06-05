import { PanchayatNoticeboard } from 'components/panchayat/PanchayatNoticeboard'

// Tab 3 — Panchayat Noticeboard per UX spec §8 + lines 483-498 + 807 + 1158.
// P0-5 measurement targets: P1 Devanagari rendering (small/mid-size Devanagari
// across stat line + pinned items + recent closings + footer).
export default function PanchayatTab() {
  return <PanchayatNoticeboard />
}
