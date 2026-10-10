// The `/peer-request` route shell (Story 6.30, `2026-10-10-312` AL16, corrected by `-315` C8).
//
// The screen an app link `https://<domain>/peer-request?c=<code>` opens (Story 6.27's text to the five
// neighbours). ⭐ 6.30 OWNS this file and keeps it THIN: it parses `c` (through `parseAppLinkCode` — a
// missing, malformed or repeated `c` is `null`) and renders the CONSUMER SLOT. The split, stated once:
//   • 6.30 — this shell, the parse, and the login that returns here (`lib/link-target.ts`, AL6);
//   • 6.27a — FILLS the slot: the list, the questionnaire, the not-openable copy, and ⛔ no API call
//     before the session has loaded (it may replace or remove `PeerRequestSlot`);
//   • 6.27c — wires the parsed `c` to the by-link resolver; its 404 reuses 6.27a's not-openable state.
// ⛔ Never a second route file for this path, and ⛔ never a `(peer-request)/[x].tsx` — a route group is
// ⛔ not a URL segment, so that would be a THIRD root-level catch-all (the route-map test refuses it).
// 6.27a's questionnaire pages are in-screen state or real NESTED segments under `/peer-request/…`.
// ⛔ Never log the code (6.27 PM21 (e)).

import { parseAppLinkCode } from '@twt/contracts'
import { useLocalSearchParams } from 'expo-router'

import { PeerRequestSlot } from '../../components/peer-request/PeerRequestSlot'

export default function PeerRequestScreen(): React.ReactElement {
  const code = parseAppLinkCode(useLocalSearchParams())
  return <PeerRequestSlot code={code} />
}
