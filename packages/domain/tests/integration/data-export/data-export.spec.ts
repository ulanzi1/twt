// data_exports store accessors + assembleMemberExport — live-DB integration (Story 3.11, Task 9).
//
// Drives the domain data-export accessors + the section-assembly core against real Postgres inside the
// per-test BEGIN/ROLLBACK envelope. Families:
//   · store round-trip — insert `pending`; findActiveExport returns it; a second insert + findActive
//     still returns ONE active; markExportConsumed is a one-time conditional UPDATE (second call loses).
//   · assemble — assembleMemberExport returns the seven files + manifest; the two not-yet-sourced files
//     carry the schema-stable empty placeholder; decrypted Tier-1 PII (KYC name) appears in profile.json
//     (fixture ciphertext → plaintext via a fake KMS); a WITHDRAWN member still assembles a valid payload.
//   · cross-tenant RLS — a PARIWAR_B export row is invisible under PARIWAR_A scope.
//   · FK cascade (RTBF, Story 3.12) — deleting the member sweeps its data_exports row.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  createFakeKmsProvider,
  encryptTier1,
  serializeEnvelope,
} from '../../../src/encryption/index.js';
import type { KmsKeyRef, KmsProvider } from '../../../src/encryption/kms-provider.js';
import {
  assembleMemberExport,
  findActiveExport,
  getExportForMember,
  insertDataExport,
  markExportConsumed,
} from '../../../src/data-export/index.js';
import { dataExportId as toDataExportId, memberId as toMemberId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember } from '../_helpers.js';

const NOW = new Date('2026-07-02T10:00:00Z');

function fakeKms(): { kms: KmsProvider; kekRef: KmsKeyRef } {
  const kms = createFakeKmsProvider({
    kekBytes: new Uint8Array(32).fill(7),
    hmacKeyBytes: new Uint8Array(32).fill(9),
  });
  return { kms, kekRef: { resourceName: 'fake:data-export-test-kek' } };
}

describe.skipIf(!hasDatabase)('data_exports store + assemble — RLS + cascade + decrypt (:5433)', () => {
  setupLiveDb();

  it('store: insert pending → findActiveExport resolves it; markExportConsumed is one-time', async () => {
    const { tx, client } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    await enterAppScope(client, PARIWAR_A);
    const memberId = toMemberId(mid);

    const row = await insertDataExport(tx, {
      memberId,
      pariwarId: PARIWAR_A,
      requestedAt: NOW,
    });
    expect(row.status).toBe('pending');

    const active = await findActiveExport(tx, memberId, NOW);
    expect(active?.exportId).toBe(row.exportId);

    // Move it to `ready` so markExportConsumed has a consumable row.
    const exportId = toDataExportId(row.exportId);
    await tx
      .update(schema.dataExports)
      .set({ status: 'ready', readyAt: NOW, expiresAt: new Date(NOW.getTime() + 86_400_000) })
      .where(eq(schema.dataExports.exportId, exportId));

    // One-time: first consume wins, second loses the race.
    expect(await markExportConsumed(tx, exportId, memberId, NOW)).toBe(true);
    expect(await markExportConsumed(tx, exportId, memberId, NOW)).toBe(false);

    // Once consumed, it is no longer "active".
    expect(await findActiveExport(tx, memberId, NOW)).toBeNull();
  });

  it('assemble: seven files + manifest; empty placeholders; decrypted KYC name in profile', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef } = fakeKms();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid, state: 'active', stateEventVersion: 4 });
    const memberId = toMemberId(mid);

    // Seed a KYC profile with a Tier-1-encrypted name/dob (fixture ciphertext → plaintext on assemble).
    const name = 'Asha Devi';
    const dob = '1990-01-15';
    const encField = async (v: string): Promise<string> =>
      serializeEnvelope(
        await encryptTier1(
          Buffer.from(v, 'utf-8'),
          { pariwarId: PARIWAR_A, fieldClass: 'member_kyc' },
          kms,
          kekRef,
        ),
      );
    await tx.insert(schema.memberKycProfiles).values({
      memberId,
      pariwarId: PARIWAR_A,
      nameCiphertext: await encField(name),
      dobCiphertext: await encField(dob),
      verificationStrength: 'aadhaar_kyc',
      source: 'digilocker',
    });

    await enterAppScope(client, PARIWAR_A);
    const sections = await assembleMemberExport(
      tx,
      { kms, kekRef },
      { exportId: randomUUID(), memberId, pariwarId: PARIWAR_A, now: NOW },
    );

    // All seven files + manifest present.
    for (const f of [
      'profile.json',
      'consent_records.json',
      'payment_receipts.json',
      'event_stream.json',
      'audit_history.json',
      'contribution_history.json',
      'claim_history.json',
      'manifest.json',
    ]) {
      expect(sections[f]).toBeDefined();
    }

    // The two not-yet-sourced files carry the schema-stable empty placeholder.
    expect(sections['contribution_history.json']).toEqual({
      records: [],
      _status: 'no_source_system_at_this_epic',
      _wired_by: 'Epic 8',
    });
    expect(sections['claim_history.json']).toEqual({
      records: [],
      _status: 'no_source_system_at_this_epic',
      _wired_by: 'Epic 6',
    });

    // Decrypted Tier-1 PII appears in profile.json (member is the legitimate audience).
    const profile = sections['profile.json'] as { kyc: { name: string; dob: string } | null };
    expect(profile.kyc?.name).toBe(name);
    expect(profile.kyc?.dob).toBe(dob);

    // Manifest names all seven files + the schema version.
    const manifest = sections['manifest.json'] as { files: string[]; schemaVersion: number };
    expect(manifest.files).toHaveLength(7);
    expect(manifest.schemaVersion).toBe(1);
  });

  it('assemble: a WITHDRAWN member still produces a valid payload (export up to withdrawal point)', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef } = fakeKms();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid, state: 'withdrawn', stateEventVersion: 6 });
    await enterAppScope(client, PARIWAR_A);

    const sections = await assembleMemberExport(
      tx,
      { kms, kekRef },
      { exportId: randomUUID(), memberId: toMemberId(mid), pariwarId: PARIWAR_A, now: NOW },
    );
    const profile = sections['profile.json'] as { state: string | null };
    expect(profile.state).toBe('withdrawn');
    expect(sections['manifest.json']).toBeDefined();
  });

  it('RLS: a PARIWAR_B export row is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();
    const midB = randomUUID();
    await seedMember(tx, PARIWAR_B, { memberId: midB });
    // Seed the B-tenant export as superuser (RLS bypassed) BEFORE entering A scope.
    const bRow = await insertDataExport(tx, {
      memberId: toMemberId(midB),
      pariwarId: PARIWAR_B,
      requestedAt: NOW,
    });

    await enterAppScope(client, PARIWAR_A);
    const invisible = await getExportForMember(tx, toDataExportId(bRow.exportId), toMemberId(midB));
    expect(invisible).toBeNull();
  });

  it('FK cascade (RTBF): deleting the member sweeps its data_exports row', async () => {
    const { tx } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    const memberId = toMemberId(mid);
    const row = await insertDataExport(tx, { memberId, pariwarId: PARIWAR_A, requestedAt: NOW });

    // Delete as superuser (pre-scope) — the FK cascade removes the export.
    await tx.delete(schema.members).where(eq(schema.members.memberId, memberId));
    const after = await tx
      .select()
      .from(schema.dataExports)
      .where(eq(schema.dataExports.exportId, toDataExportId(row.exportId)));
    expect(after).toHaveLength(0);
  });
});
