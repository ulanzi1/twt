// anonymizeMember unit tests — Story 3.12 (Task 6; AC1/AC4). DB-FREE.
//
// The reducer transitions (`withdrawn → anonymized`, identity no-ops from `anonymized` + non-withdrawn
// states) are ALREADY covered in state.test.ts:83-93 + withdrawal.test.ts:76-79 — NOT duplicated here.
// These tests exercise the `anonymizeMember` WRITE core itself: a mocked Drizzle `client` captures every
// `.update(table).set(obj)` call, and a REAL fake-KMS round-trip proves each NOT-NULL column got the
// anonymized sentinel while each nullable column got NULL. The load-bearing AC4 guard is asserted at the
// unit level: `mobile_blind_index` is NEVER written (only `mobile_ciphertext` is).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { Db } from '../../src/db.js';
import { createFakeKmsProvider } from '../../src/encryption/index.js';
import { decryptTier1, parseEnvelope } from '../../src/encryption/envelope.js';
import type { KmsKeyRef, KmsProvider } from '../../src/encryption/kms-provider.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../src/member/anonymize.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../src/ids/index.js';
import {
  dataExportDeliveryGrants,
  memberAuthOtps,
  dataExports,
  memberAddresses,
  memberDataRightsCorrections,
  memberIdentities,
  memberKycProfiles,
  memberMedicalDisclosures,
  memberModerationActions,
  memberModerationGrounds,
  memberNominees,
  memberWithdrawals,
} from '../../src/schema/index.js';

// The fixed namespace the member mobile Tier-1 envelope keys on (login runs pre-scope). Duplicated by
// value from anonymize.ts / apps/api context.ts — see anonymize.ts header.
const MEMBER_IDENTITY_NAMESPACE = '00000000-0000-0000-0000-000000000001';

function fakeKms(): { kms: KmsProvider; kekRef: KmsKeyRef } {
  const kms = createFakeKmsProvider({
    kekBytes: new Uint8Array(32).fill(7),
    hmacKeyBytes: new Uint8Array(32).fill(9),
  });
  return { kms, kekRef: { resourceName: 'fake:rtbf-unit-test-kek' } };
}

interface Captured {
  table: unknown;
  set: Record<string, unknown>;
}

/** A mock Drizzle client that records every `update(table).set(obj).where(cond)` chain (DB-free). */
function mockClient(captured: Captured[]): Db {
  return {
    update(table: unknown) {
      return {
        set(obj: Record<string, unknown>) {
          captured.push({ table, set: obj });
          return { where: () => Promise.resolve() };
        },
      };
    },
  } as unknown as Db;
}

describe('anonymizeMember — field-level PII overwrite (DB-free)', () => {
  const { kms, kekRef } = fakeKms();

  /** Decrypt a captured sentinel envelope with its field-class context → plaintext. */
  async function dec(serialized: unknown, pariwarId: string, fieldClass: string): Promise<string> {
    const ct = parseEnvelope(serialized as string);
    const bytes = await decryptTier1(ct, { pariwarId, fieldClass }, kms, kekRef);
    return Buffer.from(bytes).toString('utf-8');
  }

  async function run(): Promise<{ captured: Captured[]; pariwar: string }> {
    const captured: Captured[] = [];
    const memberId = toMemberId(randomUUID());
    const pariwar = randomUUID();
    await anonymizeMember(mockClient(captured), { kms, kekRef }, {
      memberId,
      pariwarId: toPariwarId(pariwar),
    });
    return { captured, pariwar };
  }

  function setFor(captured: Captured[], table: unknown): Record<string, unknown> {
    const found = captured.find((c) => c.table === table);
    if (!found) throw new Error('no update captured for table');
    return found.set;
  }

  it('updates exactly the eleven member-PII tables (twelve statements), once each except data_exports', async () => {
    // Seven since Story 10.10's review pass added `member_moderation_actions`; EIGHT since Story
    // 10.20 added `member_moderation_grounds`. This count is the completeness check for the RTBF
    // surface — a new Tier-1 column landing in a table absent from this list is exactly how the
    // moderation rationale came to survive an erasure request in the first place.
    //
    // ⚠ REWRITTEN by Story 10.21 (AC11): NINE tables, TEN statements. `data_exports` joined the surface
    // — its `artifact_ciphertext` is `piiColumn(1, 'data_export')`, i.e. the member's WHOLE assembled
    // dossier as one Tier-1 envelope — and it takes TWO statements, deliberately:
    //   1. an unconditional NULL of `artifact_ciphertext` on every row of the member; and
    //   2. a status flip to `expired` restricted to `pending`/`ready` rows ONLY.
    // ⛔ The two are NOT collapsible. (2) is scoped and (1) is not, because the `consumed` STATUS is
    // deliberately left untouched by RULING (`2026-08-14-109` cl.6) while its ciphertext is still zeroed. And the
    // `pending` flip is the load-bearing guard that stops an in-flight DATA_EXPORT_BUILD resurrecting
    // the dossier after the erasure commits.
    // ⛔ This assertion was NOT named as collateral by the story spec; it was found by running the
    // suite. It is REWRITTEN to the new truth, never weakened — the count is the completeness check.
    //
    // ⭐ MOVED UPWARD AGAIN by the Story 10.21 ROUND-2 REVIEW: TWELVE tables, FOURTEEN statements.
    // The two added statements are the REVOCATION half — `data_export_delivery_grants` is updated a
    // SECOND time (status `pending` → `expired`) and `member_auth_otps` is burned on the delivery pool.
    // ⛔ Scrubbing the attestation is not revoking the grant: without these, an erasure left a live
    // grant and a live OTP in the member's hands, safe only by the INCIDENTAL 404 that `redeemDelivery`
    // returns on a null artifact.
    // ⚠ Story 10.21 AC-R1/AC-R2 had already moved it to ELEVEN tables / TWELVE statements:
    // `data_export_delivery_grants` (the staff ATTESTATION) and `member_data_rights_corrections` (the
    // member's requested change + the staff action taken) both carry Tier-1 columns, so both MUST be
    // scrubbed. ⚠ This assertion is the mechanism that forced them in: adding the columns without the
    // scrub failed HERE, which is precisely what it exists to do. ⛔ Whoever adds the next Tier-1
    // column raises this number in the same commit — a Tier-1 column outside `anonymizeMember` is how
    // the 10.10 moderation rationale survived an erasure request.
    const { captured } = await run();
    expect(captured).toHaveLength(14);
    const tables = captured.map((c) => c.table);
    for (const t of [
      memberIdentities,
      memberKycProfiles,
      memberAddresses,
      memberNominees,
      memberMedicalDisclosures,
      memberWithdrawals,
      memberModerationActions,
      memberModerationGrounds,
      dataExports,
      dataExportDeliveryGrants,
      memberDataRightsCorrections,
      memberAuthOtps,
    ]) {
      expect(tables).toContain(t);
    }
    // Exactly one statement per table, EXCEPT the two that take a documented second:
    //   · `data_exports`     — zero the artifact, then flip `pending` → `expired` (the build guard);
    //   · `…delivery_grants` — scrub the attestation, then revoke the live grant.
    expect(tables.filter((t) => t === dataExports)).toHaveLength(2);
    expect(tables.filter((t) => t === dataExportDeliveryGrants)).toHaveLength(2);
    expect(new Set(tables).size).toBe(12);
  });

  it('⭐ Story 10.21 (AC-R1/AC-R2): the staff attestation and the correction record are SCRUBBED but RETAINED', async () => {
    // ⚠ SENTINEL, not NULL, and the distinction is deliberate. That a staff actor obtained the export,
    // and that a correction was requested and handled, are AUDIT FACTS the Trust keeps — it is the
    // CONTENT that the erasure removes, not the record of the act. Same posture as the moderation
    // tables. ⛔ A NULL here would erase the fact along with the content.
    const { captured, pariwar } = await run();

    const grants = setFor(captured, dataExportDeliveryGrants);
    expect(grants, 'the staff attestation must be scrubbed').toHaveProperty('attestationCiphertext');

    const corrections = setFor(captured, memberDataRightsCorrections);
    for (const col of ['requestedChangeCiphertext', 'actionTakenCiphertext']) {
      expect(corrections, `${col} must be scrubbed`).toHaveProperty(col);
      expect(await dec(corrections[col], pariwar, 'data_rights_correction')).toBe(ANONYMIZED_SENTINEL);
    }
  });

  it('⭐ Story 10.21 (AC11): the dossier ciphertext is NULLed and `consumed` KEEPS its status', async () => {
    // ⛔ This test must be able to FAIL. It asserts the two data_exports statements by shape, rather
    // than iterating anonymizeMember's own coverage set — that shape is structurally blind to a table
    // outside the set, which is precisely how this gap survived from 3.11 until 10.21.
    const { captured } = await run();
    const exportStatements = captured.filter((c) => c.table === dataExports);
    expect(exportStatements).toHaveLength(2);

    // (1) the unconditional zeroing — NULL, not a sentinel (the column is nullable and the vacuum
    // already NULLs it, so this matches the shipped posture).
    const zeroing = exportStatements.find((c) => 'artifactCiphertext' in c.set);
    expect(zeroing, 'artifact_ciphertext must be zeroed').toBeDefined();
    expect(zeroing!.set.artifactCiphertext).toBeNull();

    // (2) the status flip — and it must NOT be an unconditional 'expired' on every row.
    const flip = exportStatements.find((c) => 'status' in c.set);
    expect(flip, 'pending/ready must flip to expired').toBeDefined();
    expect(flip!.set.status).toBe('expired');
    // ⛔ The two statements are distinct: the zeroing must not also carry the status.
    expect(zeroing).not.toBe(flip);
    expect('status' in zeroing!.set).toBe(false);
  });

  it('⭐ Story 10.20: EVERY new Tier-1 moderation column is scrubbed, BY NAME', async () => {
    // ⛔ A test that asserts "the rationale is scrubbed" and stops is what let migration 0092's gap
    // ship the first time. Premise #4: a Postgres COLUMN-LEVEL grant does not extend to columns
    // added later, so each of these was structurally UN-ERASABLE until 0099 granted it by name —
    // and the failure is silent, surfacing only against a real database.
    const { captured, pariwar } = await run();
    const set = setFor(captured, memberModerationActions);
    for (const col of ['decisionNoteCiphertext', 'immediateTerminationReasonCiphertext']) {
      expect(set, `${col} must be scrubbed`).toHaveProperty(col);
      expect(await dec(set[col], pariwar, 'member_moderation')).toBe(ANONYMIZED_SENTINEL);
    }

    // ⛔ CASE-guarded, NOT a flat overwrite (post-review fix): a flat sentinel here would violate
    // `escalation_iff_terminate` on any non-`terminate` row in the member's history. The captured
    // value is a raw drizzle SQL fragment, not a plain string — assert its shape instead of
    // decrypting it directly: the sentinel is embedded as a param, the CASE keys on the `action`
    // column, and the guard text names `terminate` and falls through to `NULL`.
    for (const col of ['escalationInadequacyCiphertext', 'escalationProportionalityCiphertext']) {
      expect(set, `${col} must be scrubbed`).toHaveProperty(col);
      const fragment = set[col] as { queryChunks: unknown[] };
      expect(
        Array.isArray(fragment?.queryChunks),
        `${col} must be a CASE-guarded SQL fragment, not a flat sentinel`,
      ).toBe(true);
      const embeddedSentinel = fragment.queryChunks.find((c): c is string => typeof c === 'string');
      expect(embeddedSentinel, `${col} must embed the sentinel ciphertext`).toBeDefined();
      expect(await dec(embeddedSentinel, pariwar, 'member_moderation')).toBe(ANONYMIZED_SENTINEL);
      const referencesActionColumn = fragment.queryChunks.some(
        (c) => !!c && typeof c === 'object' && (c as { name?: string }).name === 'action',
      );
      expect(referencesActionColumn, `${col}'s CASE must key on the action column`).toBe(true);
      const guardText = fragment.queryChunks
        .filter((c): c is { value: string[] } => !!c && typeof c === 'object' && 'value' in c)
        .flatMap((c) => c.value)
        .join('');
      expect(guardText).toContain('terminate');
      expect(guardText).toContain('ELSE NULL');
    }

    // ⛔ The NON-PII columns are deliberately NOT scrubbed: a bounded integer and a clause-version
    // id are governance facts the record depends on to stay readable, and `evidence_refs` are
    // bounded REFERENCES rather than prose — a property three CHECK constraints CREATE.
    for (const col of [
      'r7aRestorationsUsedSnapshot',
      'dwellPolicyVersion',
      'evidenceRefs',
      'action',
      'reasonCode',
      'rejoinPermittedAt',
    ]) {
      expect(set, `${col} must be RETAINED`).not.toHaveProperty(col);
    }
  });

  it('⭐ Story 10.20: the grounds note is scrubbed via the table\'s OWN member_id', async () => {
    // This one-liner is why `member_id` is denormalized onto `member_moderation_grounds`. Every
    // scrub in `anonymize.ts` keys on `<table>.memberId` — an erasure request carries a member id
    // and nothing else. ⛔ A scrub reaching through `moderation_action_id` is the signal that the
    // column was dropped from the migration.
    const { captured } = await run();
    const set = setFor(captured, memberModerationGrounds);
    // NULL, not the sentinel: the column is NULLABLE (a ground need not carry a note), so writing a
    // sentinel where the honest answer is "there was never a note" would fabricate a record.
    expect(set).toHaveProperty('noteCiphertext', null);
    // ⛔ The governance facts stay: code, is_primary, added_at and the evidence references.
    for (const col of ['code', 'isPrimary', 'addedAt', 'evidenceRefs']) {
      expect(set, `${col} must be RETAINED`).not.toHaveProperty(col);
    }
  });

  it('member_moderation_actions: the admin-authored rationale → sentinel, decision fields untouched', async () => {
    // The rationale is free text NAMING WHAT THE MEMBER ALLEGEDLY DID — the most sensitive free
    // text on their record. The governance FACTS (action, reason_code, actor, timestamps,
    // rejoin_permitted_at) are RETAINED deliberately: FR-6's rejoin lock and the audit trail both
    // depend on the row, and they are bounded non-PII vocabulary. Only the prose goes.
    const { captured, pariwar } = await run();
    const set = setFor(captured, memberModerationActions);
    expect(await dec(set['decisionNoteCiphertext'], pariwar, 'member_moderation')).toBe(
      ANONYMIZED_SENTINEL,
    );
    for (const retained of [
      'action',
      'reasonCode',
      'actorId',
      'actorDisplay',
      'rejoinPermittedAt',
      'actedAt',
    ]) {
      expect(set).not.toHaveProperty(retained);
    }
  });

  it('member_identities: mobile_ciphertext → sentinel; RETAINS mobile_blind_index (AC4)', async () => {
    const { captured } = await run();
    const set = setFor(captured, memberIdentities);
    expect(await dec(set['mobileCiphertext'], MEMBER_IDENTITY_NAMESPACE, 'member_mobile')).toBe(
      ANONYMIZED_SENTINEL,
    );
    // The rejoin-lock key is NEVER touched — clearing it would silently break the 12-month lock (AC4).
    expect(set).not.toHaveProperty('mobileBlindIndex');
  });

  it('member_kyc_profiles: name/dob → sentinel; photo + aadhaar_masked_id → NULL', async () => {
    const { captured, pariwar } = await run();
    const set = setFor(captured, memberKycProfiles);
    expect(await dec(set['nameCiphertext'], pariwar, 'member_kyc')).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(set['dobCiphertext'], pariwar, 'member_kyc')).toBe(ANONYMIZED_SENTINEL);
    expect(set['photoCiphertext']).toBeNull();
    expect(set['aadhaarMaskedId']).toBeNull();
  });

  it('member_addresses: address_line → sentinel', async () => {
    const { captured, pariwar } = await run();
    const set = setFor(captured, memberAddresses);
    expect(await dec(set['addressLineCiphertext'], pariwar, 'member_address')).toBe(
      ANONYMIZED_SENTINEL,
    );
  });

  it('member_nominees: name/mobile → sentinel; address → NULL', async () => {
    const { captured, pariwar } = await run();
    const set = setFor(captured, memberNominees);
    expect(await dec(set['nameCiphertext'], pariwar, 'member_nominee')).toBe(ANONYMIZED_SENTINEL);
    expect(await dec(set['mobileCiphertext'], pariwar, 'member_nominee')).toBe(ANONYMIZED_SENTINEL);
    expect(set['addressCiphertext']).toBeNull();
  });

  it('member_medical_disclosures: conditions → sentinel; additional_context → NULL', async () => {
    const { captured, pariwar } = await run();
    const set = setFor(captured, memberMedicalDisclosures);
    expect(await dec(set['disclosedConditionsCiphertext'], pariwar, 'member_medical')).toBe(
      ANONYMIZED_SENTINEL,
    );
    expect(set['additionalContextCiphertext']).toBeNull();
  });

  it('member_withdrawals: reason_text → NULL; reason_code + rejoin columns NOT touched (AC4)', async () => {
    const { captured } = await run();
    const set = setFor(captured, memberWithdrawals);
    expect(set['reasonTextCiphertext']).toBeNull();
    // The rejoin-lock columns + the non-PII reason_code are never written by anonymization.
    expect(set).not.toHaveProperty('reasonCode');
    expect(set).not.toHaveProperty('rejoinPermittedAt');
    expect(set).not.toHaveProperty('withdrawnAt');
    expect(set).not.toHaveProperty('aadhaarHmac');
  });

  it('sentinel is a fixed non-PII marker (safe past the PII-scrape gate)', () => {
    expect(ANONYMIZED_SENTINEL).toBe('[anonymized]');
  });
});
