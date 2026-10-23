// A member's NOMINEES are never among the five asked about their death — the nominee half of the ONE eligibility predicate
// (Story 6.36d, Task 1; AC2; `2026-10-23-386` ND1–ND4, ND6; `2026-10-23-384` Q1 A). A nominee row has ⛔ member link and its
// mobile is stored RAW (⛔ normalised) and ⛔ hashed (G4, G5), so this module decrypts the deceased's ≤ 2 nominee mobiles AS
// RECORDED BEFORE THE FILING CUT, normalises them, and hashes them into the LOGIN blind-index space; the predicate
// (`peerMeshEligibleMemberSql`) matches those hashes against `member_identities.mobile_blind_index` in SQL.
//
// ⛔ Inside a transaction: the version read runs in the caller's OWN short scope transaction (`inScope`), CLOSED before any KMS
// call (TR3 — the jobs pool is `max: 2`; `mobileBlindIndexMany` must never run inside one). ⛔ Stored, ⛔ logged, ⛔ put in an
// event or job payload — an index, a plaintext or a rank (AC8). A KMS fault or an unreadable envelope THROWS — ⛔ never `[]`
// (ND6: the callers fail CLOSED and alarm).
// ⚠ ND8 — the DATA-MODEL GAP BigDev accepted (G18): a nominee who is a member is found ONLY if the declared number is the number
// they SIGNED UP with; the system records ⛔ member link for a nominee.

import type { Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import { mobileBlindIndexMany } from '../encryption/member-fields.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import type { InScope } from '../member/known-people.js';
import {
  listNomineeDeclarationVersions,
  NOMINEE_RANKS,
  projectedVersionOfRank,
} from '../nominee/declaration-history.js';
import type { MemberNomineeVersionRow } from '../schema/member_nominee_versions.js';
import { resolveCorrectionMobile } from './correction-crypto.js';
import { type PeerMeshFilingCut, getPeerMeshSelectionByClaim, peerMeshFilingCut } from './peer-mesh-read.js';
import { getClaimCase } from './read.js';

/** The batch HMAC's audit purpose (`AUDIT_PURPOSE` form — the 6.36b house constants' shape). */
export const PEER_MESH_NOMINEE_EXCLUSION_AUDIT_PURPOSE = 'peer_mesh_nominee_exclusion';

/**
 * ND1 (b) — the mobile ciphertexts of the declaration AS RECORDED BEFORE THE CUT: keep `recorded_at < cut`, then per rank the
 * version its projection was last written from (`projectedVersionOfRank` — a `vacated` rank ⇒ nobody). PURE. ⛔ A new query.
 */
export function peerMeshNomineeCiphertextsAsOf(
  versions: readonly MemberNomineeVersionRow[],
  cut: Date,
): string[] {
  const before = versions.filter((v) => v.recordedAt.getTime() < cut.getTime());
  const out: string[] = [];
  for (const rank of NOMINEE_RANKS) {
    const ofRank = before.filter((v) => v.rank === rank).sort((a, b) => a.versionNo - b.versionNo);
    const projected = projectedVersionOfRank(ofRank);
    if (projected === null) continue;
    const ct = ofRank.find((v) => v.versionId === projected)?.mobileCiphertext ?? null;
    if (ct !== null) out.push(ct);
  }
  return out;
}

/**
 * ⭐ THE ONE read of the nominee indexes (AC2) — the select job and both send-time children call this and nothing else:
 *   (1) `inScope` → every version of the deceased's declaration (its own short transaction, closed on return);
 *   (2) ND1 (b) — the ciphertexts as recorded before `cut.cut`;
 *   (3) OUTSIDE any transaction: decrypt + `normalizeMobile` each (`resolveCorrectionMobile`, class `member_nominee`, the REAL
 *       Pariwar — a sentinel or invalid number ⇒ `null`, dropped), de-duplicate, and ONE batch HMAC into the login space.
 * ⛔ Version before the cut ⇒ `[]` with ⛔ KMS call; all numbers unusable ⇒ their decrypts run, ⛔ HMAC call, `[]`.
 * @throws on a KMS fault or a malformed envelope (ND6 — the caller alarms and fails closed; ⛔ ever `[]`)
 */
export async function peerMeshNomineeMobileIndexes(input: {
  readonly pariwarId: PariwarId;
  readonly deceasedMemberId: MemberId;
  readonly cut: PeerMeshFilingCut;
  readonly enc: FieldCryptoDeps;
  readonly inScope: InScope;
}): Promise<string[]> {
  const { pariwarId, deceasedMemberId, cut, enc, inScope } = input;
  const versions = await inScope((db) => listNomineeDeclarationVersions(db, pariwarId, deceasedMemberId));
  const ciphertexts = peerMeshNomineeCiphertextsAsOf(versions, cut.cut);
  const canonicals: string[] = [];
  for (const ct of ciphertexts) {
    const e164 = await resolveCorrectionMobile(ct, 'member_nominee', pariwarId, enc);
    if (e164 !== null) canonicals.push(e164);
  }
  const distinct = [...new Set(canonicals)];
  if (distinct.length === 0) return [];
  return mobileBlindIndexMany(distinct, enc, { pariwarId, purpose: PEER_MESH_NOMINEE_EXCLUSION_AUDIT_PURPOSE });
}

/**
 * ND1 (b) / ND4 — the cut the SELECTION was drawn by, for the send-time children (6.27c, 6.31): the selection's persisted
 * `anchor_claim_case_id` (this claim when NULL — a legacy `district_cohort_v1` row) → that claim's `created_at` →
 * `peerMeshFilingCut`. ⇒ ONE nominee set per claim, identical at selection, every send-time re-check and the reminder.
 * @throws when the claim has ⛔ selection or the anchor claim is missing (the child's transient path — ND6)
 */
export async function resolvePeerMeshSelectionFilingCut(
  db: Db,
  pariwarId: PariwarId,
  claimRow: { readonly claimCaseId: ClaimId; readonly createdAt: Date },
): Promise<PeerMeshFilingCut> {
  const selection = await getPeerMeshSelectionByClaim(db, pariwarId, claimRow.claimCaseId);
  if (!selection) throw new Error(`[peer-mesh-nominees] claim ${claimRow.claimCaseId} has no selection`);
  const anchorId = selection.anchorClaimCaseId;
  if (anchorId === null || anchorId === claimRow.claimCaseId) return peerMeshFilingCut(claimRow.createdAt);
  const anchor = await getClaimCase(db, pariwarId, anchorId);
  if (!anchor) throw new Error(`[peer-mesh-nominees] the anchor claim of claim ${claimRow.claimCaseId} is missing`);
  return peerMeshFilingCut(anchor.createdAt);
}
