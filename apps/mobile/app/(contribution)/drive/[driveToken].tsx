// ⭐⭐ THE MEMBER'S VIEW OF **ONE** DRIVE — Story 11b.17 (Task 5a; AC1). The screen behind
// `/(contribution)/drive/[driveToken]`, reached from story **E**'s fourth tab.
//
// ── ⚠⛔⛔ WHY IT LIVES IN `(contribution)` AND ⛔ NOT IN A NEW `(sahyog)` GROUP ────────────────────
// ⭐⭐ **STORY 11b.10's D4 RULES *"⛔ no new route group"*, AND THAT RULING STILL BINDS.** It is
// author-committed (BigDev, 2026-09-04b) and it is pinned by a **LIVE ASSERTION**:
// `apps/mobile/tests/unit/sahyog-vivran-entry.test.ts` — *"⛔ no `(sahyog)` route group was added to
// the app"*, which `readdirSync`s the route root ⭐ *"the DIRECT reading of that — ⛔ not a proxy for
// it"*.
// ⚠⛔⛔ **THE FIRST BUILD OF THIS STORY ADDED `app/(sahyog)/` AND TURNED THAT TEST RED.** ⭐ Recorded
// rather than quietly renamed ([[feedback_record_unattested_no_backfill]]) — and ⛔⛔ **RENAMING THE
// GROUP WOULD HAVE BEEN THE DISHONEST FIX:** the assertion names `(sahyog)` by string, so
// `(drive-detail)` would have gone GREEN while adding **exactly the new route group D4 forbids**.
// ⇒ ⭐ the rule is MET, ⛔ not evaded: this story adds ⛔ **NO** route group at all.
// ⚠⛔ ⛔ And D4 was ⛔ **not** re-read or reinterpreted to get here ([[feedback_supersede_never_reinterpret]]).
//
// ⭐ **`(contribution)` IS THE RIGHT HOME ON ITS MERITS, ⛔ not merely the available one.** Its sibling
// `contributors.tsx` (Story 8.3) is the same shape — a **read-only member view of a pool**, reached by
// `router.push` from a card affordance — and `note/[id].tsx` already establishes a nested dynamic
// route in this group. ⛔ Nesting under `(tabs)/sahyog/` was rejected: it would turn story **E**'s
// shipped fourth TAB into a stack, and ⭐ this story owns the per-drive VIEW, ⛔ not the tab.
//
// ── ⚠⛔⛔ THE ROUTE PARAMETER IS THE DRIVE'S OPAQUE PUBLIC TOKEN, AND ⛔ NOTHING ELSE ─────────────
// `2026-09-03-184` **(B)**, Trustee-ratified. ⛔⛔ ⛔ Do ⛔ NOT accept, or construct, a `P-YYYY-MM-###`
// canonical identifier here: that counter is **MONOTONIC** per (pariwar, month), so an address built
// from it is **WALKABLE BY COUNTING** — and on THIS surface the walk reaches **FIVE decrypted Tier-1
// fields per account, TWO accounts per drive**. ⭐ The token is **SERVER-RETURNED** and is carried
// verbatim from the list row (`lib/public-site.ts` states the same discipline for `clauseId`).
//
// ⚠ The screen itself is `components/drive-detail/MemberDriveDetail` — ⭐ the route file stays a thin
// param-reader, the `contributors.tsx` / `(helpdesk)/[ticketId].tsx` shape.
// ⚠ `headerShown: false` per screen, ⛔ not on the shared `(contribution)` layout: the screen renders
// its own chrome (including its back control), and changing the group layout would move its siblings.

import { Stack, useLocalSearchParams } from 'expo-router'

import { MemberDriveDetail } from '../../../components/drive-detail/MemberDriveDetail'

export default function MemberDriveDetailScreen(): React.ReactElement {
  // ⚠ Expo Router hands this an `undefined` on the first render of a deep-linked screen — the query
  // hook guards on it rather than firing `/drive-detail/undefined`.
  const { driveToken } = useLocalSearchParams<{ driveToken: string }>()
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MemberDriveDetail driveToken={driveToken} />
    </>
  )
}
