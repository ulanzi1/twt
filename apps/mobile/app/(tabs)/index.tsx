import { YogdaanBahi } from 'components/yogdaan-bahi/YogdaanBahi'

// Tab 1 — Yogdaan Bahi pattern per UX spec §8 + lines 805 + 1156.
// P0-5 measurement targets: P1 Devanagari rendering (sahyog column) +
// P5 list-performance baseline (60 rows; FlashList threshold established
// by larger Shradhanjali contributor scroll Day 4+).
export default function YogdaanTab() {
  return <YogdaanBahi />
}
