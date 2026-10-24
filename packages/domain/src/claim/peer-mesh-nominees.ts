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
// they SIGNED UP with; the system records ⛔ member link for a nominee. (As built in 6.36d — Story 6.36e, below, narrows it.)
// ⭐ Story 6.36e (`2026-10-24-397` NE7 — NARROWS ND8 in part): a declarer may now MARK a nominee as a member
// (`member_nominee_links`, hung off the version). The SAME `inScope` read also takes the links on the as-of-cut versions, so the
// predicate matches a marked nominee by ACCOUNT as well — DB only, ⛔ KMS for the link half.

import type { Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import { mobileBlindIndexMany } from '../encryption/member-fields.js';
import type { ClaimId, MemberId, NomineeVersionId, PariwarId } from '../ids/index.js';
import type { InScope } from '../member/known-people.js';
import {
  listNomineeDeclarationVersions,
  NOMINEE_RANKS,
  projectedVersionOfRank,
} from '../nominee/declaration-history.js';
import { listNomineeLinksOfVersions, type NomineeLinkOfVersion } from '../nominee/member-links.js';
import type { MemberNomineeVersionRow } from '../schema/member_nominee_versions.js';
import { resolveCorrectionMobile } from './correction-crypto.js';
import { type PeerMeshFilingCut, type PeerMeshNomineeMatch, getPeerMeshSelectionByClaim, peerMeshFilingCut } from './peer-mesh-read.js';
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
  const out: string[] = [];
  for (const projected of projectedVersionsAsOf(versions, cut)) {
    if (projected.mobileCiphertext !== null) out.push(projected.mobileCiphertext);
  }
  return out;
}

/** Per rank, the version projected as of the cut (`recorded_at < cut`, `projectedVersionOfRank`; a `vacated` rank ⇒ none). */
function projectedVersionsAsOf(versions: readonly MemberNomineeVersionRow[], cut: Date): MemberNomineeVersionRow[] {
  const before = versions.filter((v) => v.recordedAt.getTime() < cut.getTime());
  const out: MemberNomineeVersionRow[] = [];
  for (const rank of NOMINEE_RANKS) {
    const ofRank = before.filter((v) => v.rank === rank).sort((a, b) => a.versionNo - b.versionNo);
    const projected = projectedVersionOfRank(ofRank);
    if (projected === null) continue;
    const row = ofRank.find((v) => v.versionId === projected);
    if (row) out.push(row);
  }
  return out;
}

/**
 * ⭐ Story 6.36e NE7 (`-396` Q1 A) — the members the deceased MARKED on the versions projected as of the cut (the SAME walk
 * as {@link peerMeshNomineeCiphertextsAsOf}), whose link had ⛔ ended before the cut (`ended_at IS NULL OR ended_at >= cut`) —
 * WHATEVER they answered (`not_me` included: a "not me", true or false, never puts a possible payee back among the five).
 * ⛔ An `asked_at` test (V15 — a link is written in the same transaction as its version). PURE; de-duplicated.
 */
export function peerMeshNomineeLinkedMembersAsOf(
  versions: readonly MemberNomineeVersionRow[],
  links: readonly NomineeLinkOfVersion[],
  cut: Date,
): MemberId[] {
  const projected = new Set<string>(projectedVersionsAsOf(versions, cut).map((v) => v.versionId));
  const out = new Set<MemberId>();
  for (const l of links) {
    if (!projected.has(l.versionId)) continue;
    if (l.endedAt !== null && l.endedAt.getTime() < cut.getTime()) continue;
    out.add(l.nomineeMemberId);
  }
  return [...out];
}

/**
 * ⭐ THE ONE read of the nominee match (AC2; Story 6.36e AC6) — the select job and both send-time children call this and
 * nothing else:
 *   (1) `inScope` → every version of the deceased's declaration AND every link on them (its own short transaction, closed on
 *       return — ONE extra SELECT by `version_id`, DB only);
 *   (2) ND1 (b) — the ciphertexts as recorded before `cut.cut`; NE7 — the members marked on those versions;
 *   (3) OUTSIDE any transaction: decrypt + `normalizeMobile` each (`resolveCorrectionMobile`, class `member_nominee`, the REAL
 *       Pariwar — a sentinel or invalid number ⇒ `null`, dropped), de-duplicate, and ONE batch HMAC into the login space.
 * ⛔ Version before the cut ⇒ empty lists with ⛔ KMS call; all numbers unusable ⇒ their decrypts run, ⛔ HMAC call, `[]`
 * indexes (the marked members still returned).
 * @throws on a KMS fault or a malformed envelope (ND6 — the caller alarms and fails closed; ⛔ ever empty lists)
 */
export async function peerMeshNomineeMatch(input: {
  readonly pariwarId: PariwarId;
  readonly deceasedMemberId: MemberId;
  readonly cut: PeerMeshFilingCut;
  readonly enc: FieldCryptoDeps;
  readonly inScope: InScope;
}): Promise<PeerMeshNomineeMatch> {
  const { pariwarId, deceasedMemberId, cut, enc, inScope } = input;
  const { versions, links } = await inScope(async (db) => {
    const versions = await listNomineeDeclarationVersions(db, pariwarId, deceasedMemberId);
    const links = await listNomineeLinksOfVersions(db, pariwarId, versions.map((v) => v.versionId as NomineeVersionId));
    return { versions, links };
  });
  const memberIds = peerMeshNomineeLinkedMembersAsOf(versions, links, cut.cut);
  const ciphertexts = peerMeshNomineeCiphertextsAsOf(versions, cut.cut);
  const canonicals: string[] = [];
  for (const ct of ciphertexts) {
    const e164 = await resolveCorrectionMobile(ct, 'member_nominee', pariwarId, enc);
    if (e164 !== null) canonicals.push(e164);
  }
  const distinct = [...new Set(canonicals)];
  if (distinct.length === 0) return { mobileIndexes: [], memberIds };
  const mobileIndexes = await mobileBlindIndexMany(distinct, enc, { pariwarId, purpose: PEER_MESH_NOMINEE_EXCLUSION_AUDIT_PURPOSE });
  return { mobileIndexes, memberIds };
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
