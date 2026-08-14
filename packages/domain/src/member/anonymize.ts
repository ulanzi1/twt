// Member RTBF field-level anonymization core — Story 3.12 (Task 1; AC1, AC2, AC4).
//
// The PURE mutation core behind the DPDPA Right-To-Be-Forgotten soft-delete (FR-96). It is the
// INVERSE of `data-export/assemble.ts` (Story 3.11): assemble READS + DECRYPTS every member-PII
// column; this OVERWRITES every one of those same columns with a fixed anonymized sentinel (or NULLs
// the nullable ones). Same table set, same field-class encryption contexts — kept deliberately in the
// SAME shape so no PII surface is missed (assemble is the authoritative checklist).
//
// ── Soft-delete, NOT row-delete (architecture §2.12) ───────────────────────────────────────────────
// The member row is RETAINED (the caller projects `withdrawn → anonymized`); the event stream is
// RETAINED (the caller APPENDS `member.rtbf_anonymized`, never mutates); contribution / payment /
// consent history is RETAINED. Only PII *fields* are overwritten/nulled here. This is what keeps
// Epic 7 pool-engine audit-reproducibility intact through an RTBF.
//
// ── CRITICAL GUARDRAIL — RETAIN `member_identities.mobile_blind_index` (AC4) ────────────────────────
// The 12-month rejoin lock (Story 3.10 AC3) keys on `mobile_blind_index` (a one-way deterministic
// HMAC, NOT a displayable value — `resolveMembersByMobile` WHERE mi.mobile_blind_index = $1). Clearing
// it would silently break the rejoin lock. So we overwrite ONLY the displayable `mobile_ciphertext`
// and LEAVE `mobile_blind_index` (+ the `member_withdrawals` rejoin columns) untouched.
//
// ── Domain-layer crypto (same shape as assemble.ts) ────────────────────────────────────────────────
// Unlike every other domain WRITE accessor (which takes pre-serialized ciphertext strings), this must
// encrypt one sentinel under FIVE distinct field-class contexts across many tables — passing 5+
// pre-encrypted values in would be unwieldy. So it takes `enc: { kms, kekRef }` and encrypts the
// sentinel INTERNALLY, exactly as assemble.ts calls `decryptTier1` internally. The `FIELD_CLASS_*`
// constants + `MEMBER_IDENTITY_NAMESPACE` are declared module-locally (domain cannot import
// apps/api/src/context.ts — the package boundary), duplicated BY VALUE from assemble.ts / context.ts.
//
// Every write runs under the caller's RLS scope-tx (tenant-isolated). Naming: DB snake_case, TS
// camelCase. NO HTTP / audit / event emission here — the route orchestrates (mirrors assemble.ts).

import { eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import { encryptTier1, serializeEnvelope } from '../encryption/envelope.js';
import type { KmsKeyRef, KmsProvider } from '../encryption/kms-provider.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { dataExports } from '../schema/data_exports.js';
import { memberAddresses } from '../schema/member_addresses.js';
import { memberIdentities } from '../schema/member_identities.js';
import { memberKycProfiles } from '../schema/member_kyc_profiles.js';
import { memberMedicalDisclosures } from '../schema/member_medical_disclosures.js';
import { memberModerationActions } from '../schema/member_moderation_actions.js';
import { memberModerationGrounds } from '../schema/member_moderation_grounds.js';
import { memberNominees } from '../schema/member_nominees.js';
import { memberWithdrawals } from '../schema/member_withdrawals.js';

/** The KMS material the sentinel-encrypt uses. The caller (the RTBF handler) threads its `{ kms, kekRef }`
 *  here — the SAME `ExportEncryption` shape assemble.ts uses for the inverse decrypt. */
export interface AnonymizeEncryption {
  readonly kms: KmsProvider;
  readonly kekRef: KmsKeyRef;
}

export interface AnonymizeMemberParams {
  readonly memberId: MemberId;
  readonly pariwarId: PariwarId;
}

/**
 * The fixed non-PII marker every NOT-NULL Tier-1 PII column is overwritten with. A stable, bounded
 * sentinel — never member data, so it is safe past the PII-scrape CI gate. Nullable columns are set to
 * NULL instead (there is no round-trip requirement once the member is anonymized).
 */
export const ANONYMIZED_SENTINEL = '[anonymized]';

// Field-class literals — mirror the `piiColumn(1, '<class>')` annotations on the source schemas (same
// package) + the parallel constants in assemble.ts / apps/api context.ts. Kept module-local so this
// module has NO cross-app dependency.
const FIELD_CLASS_KYC = 'member_kyc';
const FIELD_CLASS_NOMINEE = 'member_nominee';
const FIELD_CLASS_MEDICAL = 'member_medical';
const FIELD_CLASS_ADDRESS = 'member_address';
const FIELD_CLASS_MOBILE = 'member_mobile';
// Story 10.10 — mirrors `piiColumn(1, 'member_moderation')` on member_moderation_actions.
const FIELD_CLASS_MODERATION = 'member_moderation';

// The member mobile Tier-1 envelope keys on this fixed sentinel namespace (login runs pre-scope — see
// apps/api context.ts MEMBER_IDENTITY_NAMESPACE + assemble.ts), NOT the member's real pariwarId.
// Duplicated here by value because domain cannot import apps/api.
const MEMBER_IDENTITY_NAMESPACE = '00000000-0000-0000-0000-000000000001';

/**
 * Encrypt the anonymized sentinel under one field-class context → a serialized `enc:v1:…` envelope.
 * A FRESH DEK/IV per call (encryptTier1 is non-deterministic), so each sentinel ciphertext differs at
 * rest even for the same plaintext — the exact inverse of assemble.ts's `decryptField`.
 */
async function encSentinel(
  pariwarId: string,
  fieldClass: string,
  enc: AnonymizeEncryption,
): Promise<string> {
  const ct = await encryptTier1(
    Buffer.from(ANONYMIZED_SENTINEL, 'utf-8'),
    { pariwarId, fieldClass },
    enc.kms,
    enc.kekRef,
  );
  return serializeEnvelope(ct);
}

/**
 * Field-level anonymize EVERY member-PII column for a `withdrawn` member (RTBF soft-delete). Overwrites
 * each NOT-NULL Tier-1 ciphertext with the anonymized sentinel and NULLs each nullable PII column,
 * across `member_identities` / `member_kyc_profiles` / `member_addresses` / `member_nominees` /
 * `member_medical_disclosures` / `member_withdrawals` / `member_moderation_actions`. RETAINS
 * `mobile_blind_index` (AC4 rejoin key),
 * the `member_withdrawals` rejoin columns + `reason_code` (non-PII), and every non-PII / history row
 * (`member_postings.district`, `member_attribution`, payments, consents, events).
 *
 * Runs under the caller's RLS scope-tx (tenant-isolated). Does NOT touch `members.state` or the event
 * stream — the caller projects `member.rtbf_anonymized` (`withdrawn → anonymized`) in the SAME tx.
 */
export async function anonymizeMember(
  client: Db,
  enc: AnonymizeEncryption,
  params: AnonymizeMemberParams,
): Promise<void> {
  const { memberId, pariwarId } = params;

  // ── member_identities ── overwrite the displayable mobile; RETAIN mobile_blind_index (AC4). ────────
  await client
    .update(memberIdentities)
    .set({ mobileCiphertext: await encSentinel(MEMBER_IDENTITY_NAMESPACE, FIELD_CLASS_MOBILE, enc) })
    .where(eq(memberIdentities.memberId, memberId));

  // ── member_kyc_profiles ── name/dob → sentinel (NOT NULL); photo/aadhaar_masked_id → NULL. ─────────
  await client
    .update(memberKycProfiles)
    .set({
      nameCiphertext: await encSentinel(pariwarId, FIELD_CLASS_KYC, enc),
      dobCiphertext: await encSentinel(pariwarId, FIELD_CLASS_KYC, enc),
      photoCiphertext: null,
      aadhaarMaskedId: null,
    })
    .where(eq(memberKycProfiles.memberId, memberId));

  // ── member_addresses ── ALL history rows: address_line → sentinel (NOT NULL). ──────────────────────
  await client
    .update(memberAddresses)
    .set({ addressLineCiphertext: await encSentinel(pariwarId, FIELD_CLASS_ADDRESS, enc) })
    .where(eq(memberAddresses.memberId, memberId));

  // ── member_nominees ── ALL rows: name/mobile → sentinel (NOT NULL); address → NULL. ────────────────
  await client
    .update(memberNominees)
    .set({
      nameCiphertext: await encSentinel(pariwarId, FIELD_CLASS_NOMINEE, enc),
      mobileCiphertext: await encSentinel(pariwarId, FIELD_CLASS_NOMINEE, enc),
      addressCiphertext: null,
    })
    .where(eq(memberNominees.memberId, memberId));

  // ── member_medical_disclosures ── ALL rows: conditions → sentinel (NOT NULL); context → NULL. ──────
  await client
    .update(memberMedicalDisclosures)
    .set({
      disclosedConditionsCiphertext: await encSentinel(pariwarId, FIELD_CLASS_MEDICAL, enc),
      additionalContextCiphertext: null,
    })
    .where(eq(memberMedicalDisclosures.memberId, memberId));

  // ── member_withdrawals ── free-text reason → NULL; reason_code + rejoin columns RETAINED (AC4). ────
  await client
    .update(memberWithdrawals)
    .set({ reasonTextCiphertext: null })
    .where(eq(memberWithdrawals.memberId, memberId));

  // ── member_moderation_actions (Story 10.10, review follow-up) ────────────────────────────────────
  // The moderation RATIONALE is admin-authored free text NAMING WHAT THE MEMBER ALLEGEDLY DID — the
  // most sensitive free text on the member's record, and Tier-1 by declaration
  // (`piiColumn(1, 'member_moderation')`). It shipped absent from this set, so it survived RTBF
  // outright: an RTBF is a SOFT delete (the `members` row is retained), so the table's
  // `ON DELETE cascade` FK never fires and nothing else could remove it.
  //
  // The SENTINEL, not NULL: the column is NOT NULL and the append-only posture forbids deleting the
  // row. Governance history — that an action was taken, on what ground, by whom, when — is retained
  // deliberately: FR-6's rejoin lock and the audit trail both depend on the row existing, and
  // `action` / `reason_code` are bounded non-PII vocabulary. Only the free text goes.
  //
  // ⚠ This UPDATE is why migration 0092 exists. `0091` granted `twt_app` SELECT + INSERT only, so
  // before it this scrub could not have been written at all — the column was structurally
  // un-erasable, which is a stronger failure than merely being forgotten.
  // ── ⭐ Story 10.20 — EVERY new Tier-1 column, BY NAME (AC11) ─────────────────────────────────────
  // Premise #4, and the reason this block exists at all: a Postgres COLUMN-LEVEL `GRANT UPDATE` does
  // NOT extend to columns added later. `0092` granted UPDATE on ONE named column, so every Tier-1
  // column migration 0099 adds started life structurally UN-ERASABLE — the identical defect 0092's
  // own header describes, reintroduced. 0099 grants each of them by name, and this scrub is the
  // other half of that pair. ⛔ Shipping one without the other is silent: the scrub compiles, runs,
  // and raises a permission error only against a real database.
  //
  // ⚠ The RENAME needed no re-grant (privileges follow the attribute), which is why
  // `decisionNoteCiphertext` above works unchanged. The NEW columns are the opposite case.
  //
  // ⛔ `evidence_refs` is deliberately NOT scrubbed, and a reviewer will ask why. They are BOUNDED
  // REFERENCES to records that live elsewhere — a complaint number, a ticket id — not prose about
  // the member, and that is true STRUCTURALLY rather than by convention: three CHECK constraints
  // make a sentence unrepresentable in the column (`evidence-refs.ts`). If that shape enforcement is
  // ever weakened, this exemption must be revisited in the SAME change.
  // ⛔ `r7a_restorations_used_snapshot` and `dwell_policy_version` are likewise not scrubbed: a
  // bounded integer and a clause-version id are non-PII, and both are governance facts the record
  // depends on to stay readable.
  const moderationSentinel = await encSentinel(pariwarId, FIELD_CLASS_MODERATION, enc);
  await client
    .update(memberModerationActions)
    .set({
      decisionNoteCiphertext: moderationSentinel,
      // ⚠ CASE-guarded, NOT unconditional, on these two: `escalation_iff_terminate` requires BOTH
      // columns NULL on any non-`terminate` row. A flat sentinel write here satisfies `terminate`
      // rows but violates the CHECK (23514) the instant a member's history includes a suspend or
      // restore row, aborting the whole scrub. The CASE still reaches every row in this ONE
      // statement (no read-first, no missed row) — it just keeps each row's action-gated NULL-ness
      // instead of collapsing it.
      escalationInadequacyCiphertext: sql`CASE WHEN ${memberModerationActions.action} = 'terminate' THEN ${moderationSentinel} ELSE NULL END`,
      escalationProportionalityCiphertext: sql`CASE WHEN ${memberModerationActions.action} = 'terminate' THEN ${moderationSentinel} ELSE NULL END`,
      // No CHECK ties this one to `action`, so an unconditional sentinel is safe here.
      immediateTerminationReasonCiphertext: moderationSentinel,
    })
    .where(eq(memberModerationActions.memberId, memberId));

  // The grounds table's optional Tier-1 note (Story 10.20, WS-E).
  // ⭐ THIS ONE-LINER IS WHY `member_id` IS DENORMALIZED ONTO THAT TABLE. Every scrub in this file
  // is `.where(eq(<table>.memberId, memberId))` — an erasure request carries a member id and
  // nothing else. Reachable only through `moderation_action_id`, this would have needed a correlated
  // subquery inside an UPDATE or a two-step read-then-write, in the one code path where a miss
  // leaves PII behind an erasure request. ⛔ A scrub here that reaches through the action id is the
  // signal that the column was dropped from the migration.
  // ⚠ NULL, not the sentinel: unlike the action's Decision Note this column is NULLABLE (a ground
  // need not carry a note), so there is no NOT NULL constraint forcing a placeholder — and writing a
  // sentinel where the honest answer is "there was never a note" would fabricate a record.
  await client
    .update(memberModerationGrounds)
    .set({ noteCiphertext: null })
    .where(eq(memberModerationGrounds.memberId, memberId));

  // ── data_exports (Story 10.21, AC11) — the member's assembled DOSSIER ──────────────────────────────
  //
  // ⛔ THE DOCUMENTED RTBF MECHANISM FOR THIS TABLE HAS NEVER FIRED. `migrations/0033_data-exports.sql`
  // and `schema/data_exports.ts` both state that RTBF removal happens via `ON DELETE CASCADE` on the
  // member FK. Story 3.12 shipped RTBF as a **SOFT delete** — this very file performs ZERO `delete()`
  // calls and the `members` row is retained — so the cascade never fires and the stated protection has
  // been inert since 3.11 landed. 3.11 was written against an assumption 3.12 then contradicted, and
  // nothing detected it because no story until 10.21 built an export for a member it also erases.
  // Both stale comments are corrected in place; this block is the real mechanism.
  //
  // ⚠ WHAT WAS ACTUALLY PROTECTING THE ARTIFACT WAS A TTL, NOT AN ERASURE. `DATA_EXPORT_VACUUM` zeroes
  // `artifact_ciphertext` only for `consumed`/`expired` rows, hourly, against a 24h window — so a
  // `ready`, unconsumed export survived an erasure for up to ~25 hours, in full and decryptable.
  // ⛔ A TTL is not an erasure. This runs in the SAME transaction as the scrub above.
  //
  // `artifact_ciphertext` is `piiColumn(1, 'data_export')` — the member's WHOLE assembled dossier as a
  // single Tier-1 envelope ciphertext. It is NULLed, not sentinel-ed: unlike the NOT NULL columns above
  // it is nullable, and the vacuum already NULLs it, so this matches the shipped posture.
  //
  // ⛔ THE METADATA ROW IS RETAINED, never deleted — the same posture as the vacuum ("drop the PII
  // payload, keep the metadata row for audit"). The erasure stays a soft delete.
  await client
    .update(dataExports)
    .set({ artifactCiphertext: null })
    .where(eq(dataExports.memberId, memberId));

  // ⭐ THE `pending` FLIP IS THE LOAD-BEARING HALF, AND IT IS NOT HYGIENE — IT IS THE GUARD.
  // A `pending` row holds no ciphertext yet, so "zero the ciphertext" reads as a no-op on it. But the
  // `DATA_EXPORT_BUILD` worker writes `status: 'ready'` AND the freshly-assembled ciphertext under
  // `WHERE status = 'pending'`. Flipping `pending` → `expired` is what stops an in-flight build from
  // RESURRECTING the dossier after this erasure commits. ⛔ Do not "optimise" this away as redundant
  // with the zeroing above; they defend different moments.
  //
  // ⛔ `consumed` IS DELIBERATELY EXCLUDED FROM THE STATUS FLIP — Escalation 9, RAISED AND UNANSWERED
  // (Decision `2026-08-14-106`). Overwriting a `consumed` row's status destroys the record that the
  // member ACTUALLY DOWNLOADED their export — a completed statutory-access fulfilment, and a fact the
  // retention clause above promises to keep. The ZEROING applies to `consumed` (uncontroversial; the
  // vacuum already does exactly that) and is handled by the unconditional update above; only the STATUS
  // change is contested. ⛔ Do NOT add 'consumed' to this list without a ratified decision id — that is
  // a retention question owed to the Trustee Panel, not a coding preference. Story 10.21 AC11 owns it.
  await client
    .update(dataExports)
    .set({ status: 'expired' })
    .where(
      sql`${dataExports.memberId} = ${memberId} AND ${inArray(dataExports.status, ['pending', 'ready'])}`,
    );
}
