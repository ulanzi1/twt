// The `(sahyog)` route GROUP — ⭐⭐ the member's per-drive DETAIL surface (Story 11b.17, Task 5a).
//
// ⭐⭐ **TASK 5a — THE ROUTE IS NAMED BEFORE IT IS BUILT, AND AC8's TEST DISPOSITION DEPENDS ON IT.**
// The chosen Expo-router path is **`/(sahyog)/[driveToken]`**, reached by `router.push` from story
// **E**'s fourth tab (`(tabs)/sahyog.tsx` → `<MemberDriveList>`'s row). ⚠ There was ⛔ no detail route
// before this story.
//
// ⚠⛔ **WHY A SIBLING GROUP AND ⛔ NOT A NESTED `(tabs)/sahyog/…`.** Nesting would turn the fourth TAB
// into a stack and change E's shipped tab registration — ⭐ this story owns the per-drive view, ⛔ not
// the tab. A sibling group is the house shape for exactly this: `(contribution)` (Story 8.3's
// contributor list, reached from the My Pool card), `(helpdesk)` (10.2, with its own `[ticketId]`),
// `(nominee)`, `(polls)`. ⛔ Do ⛔ not re-home it into the tab group.
//
// ⚠⛔ **AND ⛔ NOT AN OUTBOUND LINK.** `SahyogVivranEntry` opens the drive's **PUBLIC** page in the
// system browser, and that is **Trustee-ratified** (`2026-09-05-200` **cl.4**). ⭐ THIS is the
// member's UNREDACTED view and it is in-app by necessity: it carries Tier-1 banking coordinates and
// must stay behind the root session guard. ⚠ ⇒ after this story a member has **TWO** views of one
// drive; ⭐ that divergence is **EXPECTED AND RECORDED**, ⛔ not a defect to "fix".
//
// A plain Stack, headers hidden, like every sibling member group — the screen renders its own chrome.

import { Stack } from 'expo-router'

export default function SahyogLayout(): React.ReactElement {
  return <Stack screenOptions={{ headerShown: false }} />
}
