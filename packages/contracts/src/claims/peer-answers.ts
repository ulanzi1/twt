// Story 6.27b (PM24; `2026-10-10-310` CF2 — *"whoever approves the claim at a later step … for that claim at that step
// only"*) — the APPROVERS' read of the neighbours' answers:
// `GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/peer-answers`. The SAME section the verifier console shows (6.27a
// PM13) — ONE shape, so the console and the four later-approver hosts can ⛔ never drift.
//   · `peerMesh` ABSENT ⇔ the section is hidden from THIS reader (PM25 (c) — an un-completed ground visit; ⛔ a variant,
//     the 6.27a contract precedent);
//   · `{ status: 'empty' }` ⇔ ⛔ neighbour was chosen; `{ status: 'unavailable' }` ⇔ the section could ⛔ not be read.
// The call-back number follows `-328` read with `-329` (`PeerMeshPingView.callbackMobile` / `callbackBasis`).

import { z } from 'zod';

import { PeerMeshSection } from './verifier-console.js';

export const ClaimPeerAnswersResponse = z.object({ peerMesh: PeerMeshSection.optional() }).strict();
export type ClaimPeerAnswersResponse = z.output<typeof ClaimPeerAnswersResponse>;
