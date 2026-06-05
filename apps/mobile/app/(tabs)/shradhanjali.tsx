import { ShradhanjaliSahyogVivran } from 'components/shradhanjali/ShradhanjaliSahyogVivran'

// Tab 2 — Shradhanjali Sahyog Vivran (memorial column) per UX spec §8 +
// lines 464-481 + 806 + 1157.
// P0-5 measurement targets: P1 Devanagari rendering (memorial name + parichay
// + kinship + contributor scroll) + P5 list-performance (FlashList over
// 250 contributor entries).
export default function ShradhanjaliTab() {
  return <ShradhanjaliSahyogVivran />
}
