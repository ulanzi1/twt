// ⭐⭐ THE MEMBER'S VIEW OF **ONE** DRIVE — Story 11b.17 (Task 5a; AC1). The screen behind
// `/(sahyog)/[driveToken]`, reached from story **E**'s fourth tab.
//
// ⚠⛔⛔ **THE ROUTE PARAMETER IS THE DRIVE'S OPAQUE PUBLIC TOKEN, AND ⛔ NOTHING ELSE**
// (`2026-09-03-184` **(B)**, Trustee-ratified). ⛔⛔ ⛔ Do ⛔ NOT accept, or construct, a
// `P-YYYY-MM-###` canonical identifier here: that counter is MONOTONIC per (pariwar, month), so an
// address built from it is **WALKABLE BY COUNTING** — and on THIS surface the walk reaches FIVE
// decrypted Tier-1 fields per account, TWO accounts per drive. ⭐ The token is **server-returned** and
// is carried verbatim from the list row (`lib/public-site.ts` states the same discipline).
//
// ⚠ The screen itself is `components/drive-detail/MemberDriveDetail` — ⭐ the route file stays a thin
// param-reader, the `(helpdesk)/[ticketId]` / `(tabs)/sahyog.tsx` shape.

import { useLocalSearchParams } from 'expo-router'

import { MemberDriveDetail } from '../../components/drive-detail/MemberDriveDetail'

export default function MemberDriveDetailScreen(): React.ReactElement {
  // ⚠ Expo Router hands this an `undefined` on the first render of a deep-linked screen — the query
  // hook guards on it rather than firing `/drive-detail/undefined`.
  const { driveToken } = useLocalSearchParams<{ driveToken: string }>()
  return <MemberDriveDetail driveToken={driveToken} />
}
