// The claim CONTACT RECORD — the reads, the CORRECTION CHAIN (W4a) and the APPROVAL CHECK (D14) (Story 6.19a,
// Task 2; the 6.19 shared spec's D5 / D14, committed in `2026-09-28-265`). Transport-free: ⛔ no HTTP, ⛔ no
// audit, ⛔ no decryption — ciphertext AS STORED, and the check reads only presence.
//
// ── The correction chain (W4a) ──────────────────────────────────────────────────────────────────────────────
// Once a claim exists the declaration is LOCKED (`claim/nominee-lock.ts`), so after the contact record is
// written the only way a nominee is re-versioned is a 6.20 correction — the SAME person. ⇒ a row (or a
// claimant link) bound to version V COUNTS FOR any version that corrects V, directly or transitively through
// `corrects_version_id`; when several versions of one chain carry a row, the one NEAREST the effective
// version wins (the effective version's own row first). So a correction + a new determination ⛔ never
// orphans the address or the claimant link, and ⛔ nobody re-types the same person's address.
//
// ── The check (D14) ─────────────────────────────────────────────────────────────────────────────────────────
// Runs AFTER an UNCHANGED `assertClaimApprovable` at P1 / P3 / P4, approve-only (and at 6.19b/6.19c's writers).
// It passes only when: a contact row exists; its agreement consent exists and is ⛔ not revoked; every
// EFFECTIVE nominee's `versionId` has an address row (own or chain-carried — ⛔ never a row COUNT: rows bound
// to projected versions that proved ⛔ not effective stay in the table); and EITHER the claimant's version is
// one of the effective nominees' versions (or in one's chain) OR the claimant block is present AND every
// effective nominee's counted row carries the claimant-to-nominee relationship. The FIRST failing condition,
// in that order, is the reason.
//
// ⛔⛔ IMPORT DISCIPLINE: the three approval writers (verifier-decision / state-trustee-decision / r9-voting
// persist) import THIS module, so it must ⛔ never import any of them — nor the contact WRITER, which imports
// `state-trustee-decision-persist.ts` for its window tuple. A cycle here is the runtime-init trap typecheck
// cannot see ([[project_type_only_import_cycle_trap]]).

import { and, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { listNomineeDeclarationVersions } from '../nominee/declaration-history.js';
import {
  type ClaimContactNomineeRow,
  type ClaimContactRow,
  claimContactNominees,
  claimContacts,
} from '../schema/claim_contacts.js';
import { consentRecords } from '../schema/consent_records.js';
import { ClaimContactRequiredError, type ClaimContactRequiredReason } from './errors.js';
import { getEffectiveNomineeDeclaration } from './nominee-effective.js';

/** A claim's contact record AS STORED — the parent (or `null`) and its child rows. */
export interface ClaimContactSnapshot {
  readonly contact: ClaimContactRow | null;
  readonly nominees: readonly ClaimContactNomineeRow[];
}

/** Read a claim's contact record. Tenant-scoped (RLS + the explicit predicate). ⛔ Nothing is decrypted. */
export async function readClaimContact(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimContactSnapshot> {
  const [contact] = await db
    .select()
    .from(claimContacts)
    .where(and(eq(claimContacts.pariwarId, pariwarId), eq(claimContacts.claimCaseId, claimCaseId)))
    .limit(1);
  if (!contact) return { contact: null, nominees: [] };
  const nominees = await db
    .select()
    .from(claimContactNominees)
    .where(and(eq(claimContactNominees.pariwarId, pariwarId), eq(claimContactNominees.contactId, contact.contactId)));
  return { contact, nominees };
}

/** `versionId → corrects_version_id` for every version of the deceased member's declaration. */
export type VersionChainIndex = ReadonlyMap<string, string | null>;

/** Build the chain index from ONE read of the member's versions. */
export async function readVersionChainIndex(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<VersionChainIndex> {
  const rows = await listNomineeDeclarationVersions(db, pariwarId, memberId);
  return new Map(rows.map((r) => [r.versionId as string, (r.correctsVersionId as string | null) ?? null]));
}

/**
 * The correction chain of `versionId`, NEAREST first: `[versionId, the version it corrects, …]` (W4a). Pure.
 * A cycle (impossible by construction — a correction always points at an EARLIER version) is cut, ⛔ never
 * looped on.
 */
export function correctionChainOf(versionId: string, index: VersionChainIndex): string[] {
  const chain: string[] = [];
  let at: string | null = versionId;
  while (at !== null && !chain.includes(at)) {
    chain.push(at);
    at = index.get(at) ?? null;
  }
  return chain;
}

/** The row that COUNTS for `versionId` — its own, else the nearest one up its correction chain (W4a). Pure. */
export function resolveContactRow(
  versionId: string,
  rows: readonly ClaimContactNomineeRow[],
  index: VersionChainIndex,
): { readonly row: ClaimContactNomineeRow; readonly source: 'own' | 'chain' } | null {
  for (const v of correctionChainOf(versionId, index)) {
    const row = rows.find((r) => r.nomineeVersionId === v);
    if (row) return { row, source: v === versionId ? 'own' : 'chain' };
  }
  return null;
}

/** Does a claimant link on `claimantVersionId` count for the effective version `effectiveVersionId` (W4a)? */
export function claimantLinkCountsFor(
  claimantVersionId: string,
  effectiveVersionId: string,
  index: VersionChainIndex,
): boolean {
  return correctionChainOf(effectiveVersionId, index).includes(claimantVersionId);
}

/** The agreement's state, read through `agreement_consent_id` ONLY — ⛔ never by subject (D15, `-261` C3). */
export type ClaimContactAgreementState = 'live' | 'revoked' | 'missing';

export async function readClaimContactAgreementState(
  db: Db,
  pariwarId: PariwarId,
  agreementConsentId: string,
): Promise<ClaimContactAgreementState> {
  const [row] = await db
    .select({ revokedAt: consentRecords.revokedAt, consentType: consentRecords.consentType })
    .from(consentRecords)
    .where(and(eq(consentRecords.pariwarId, pariwarId), eq(consentRecords.consentId, agreementConsentId as never)))
    .limit(1);
  if (!row || row.consentType !== 'claim_contact_agreement') return 'missing';
  return row.revokedAt === null ? 'live' : 'revoked';
}

/**
 * D14, PURE: the first failing condition in the pinned precedence, or `null` when the record is complete for
 * the EFFECTIVE versions. Exported for the unit tests and the admin presence read.
 * ⚠ `effectiveVersionIds === null` means the effective declaration is ⛔ not `effective`: no nominee's address
 * can then be established, so it reports `nominee_address_missing` — ⛔ never a vacuous pass. (At P1/P3/P4 it
 * cannot arise: `assertClaimApprovable` runs first and refuses an undetermined claim.)
 */
export function evaluateClaimContact(input: {
  readonly snapshot: ClaimContactSnapshot;
  readonly agreement: ClaimContactAgreementState;
  readonly effectiveVersionIds: readonly string[] | null;
  readonly index: VersionChainIndex;
}): ClaimContactRequiredReason | null {
  const { contact, nominees } = input.snapshot;
  if (contact === null) return 'no_record';
  if (input.agreement !== 'live') return 'agreement_withdrawn';
  if (input.effectiveVersionIds === null) return 'nominee_address_missing';
  const counted = input.effectiveVersionIds.map((v) => resolveContactRow(v, nominees, input.index));
  if (counted.some((c) => c === null)) return 'nominee_address_missing';
  const claimantVersion = contact.claimantNomineeVersionId as string | null;
  if (claimantVersion !== null) {
    const isANominee = input.effectiveVersionIds.some((v) => claimantLinkCountsFor(claimantVersion, v, input.index));
    return isANominee ? null : 'claimant_details_missing';
  }
  const blockPresent =
    contact.claimantNameCiphertext !== null &&
    contact.claimantMobileCiphertext !== null &&
    contact.claimantAddressCiphertext !== null;
  if (!blockPresent) return 'claimant_details_missing';
  return counted.every((c) => c !== null && c.row.relationship !== null) ? null : 'claimant_details_missing';
}

/**
 * ⭐ D14 — the server boundary of "contact record required". Call it AFTER `assertClaimApprovable`, on APPROVE
 * only, inside the approving transaction (after the claim lock). It reads `getEffectiveNomineeDeclaration`
 * itself — `assertClaimApprovable` returns nothing to its call sites — so it costs one extra query set per
 * approval.
 *
 * @throws ClaimContactRequiredError  the record is incomplete (→ 409 `<route>.claim_contact_required`,
 *                                    `details.reason`). ⛔ NOT a denial — the claim WAITS.
 */
export async function assertClaimContactRecorded(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<void> {
  const snapshot = await readClaimContact(db, pariwarId, claimCaseId);
  if (snapshot.contact === null) throw new ClaimContactRequiredError(claimCaseId, 'no_record');
  const agreement = await readClaimContactAgreementState(db, pariwarId, snapshot.contact.agreementConsentId);
  const effective = await getEffectiveNomineeDeclaration(db, pariwarId, claimCaseId);
  const index = await readVersionChainIndex(db, pariwarId, snapshot.contact.deceasedMemberId);
  const reason = evaluateClaimContact({
    snapshot,
    agreement,
    effectiveVersionIds: effective.status === 'effective' ? effective.entries.map((e) => e.versionId) : null,
    index,
  });
  if (reason !== null) throw new ClaimContactRequiredError(claimCaseId, reason);
}
