// KYC substrate behaviour — live-DB integration (Story 3.3a, Task 3 / Task 6).
//
// Drives the domain accessors against real Postgres inside the per-test BEGIN/ROLLBACK
// envelope. Two families:
//   · digilocker_public_certs — GLOBAL cert cache: upsert + read + re-fetch + deactivate
//     work UNDER `twt_app` with NO `app.pariwar_id` set (proves the global posture — a
//     tenant-scoped policy would return 0 rows here).
//   · kyc_transactions — TENANT-scoped: insert/read-by-id/read-by-state/update under
//     PARIWAR_A scope, and a cross-tenant RLS probe (a PARIWAR_B row is invisible under
//     PARIWAR_A scope). `SET LOCAL ROLE twt_app` sheds the Docker superuser (which
//     bypasses RLS). Assert membership, not exact counts; never DROP SCHEMA.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { memberId as toMemberId } from '../../../src/ids/index.js';
import {
  deactivateDigiLockerCert,
  getActiveCertByKeyId,
  getKycTransaction,
  getKycTransactionByState,
  insertKycTransaction,
  listActiveCerts,
  updateKycTransactionStatus,
  upsertDigiLockerCert,
  // Story 8.16 (AC2) — the governed mode write + its reader.
  resolvePublicNamePresentationMode,
  setPublicNamePresentationMode,
} from '../../../src/kyc/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

const NOT_AFTER = new Date('2030-01-01T00:00:00Z');

describe.skipIf(!hasDatabase)('KYC substrate — digilocker_public_certs (GLOBAL, no scope)', () => {
  setupLiveDb();

  it('upserts + reads a cert under twt_app with NO pariwar scope (proves global posture)', async () => {
    const { tx, client } = getTx();
    await enterAppRoleNoScope(client); // shed superuser; do NOT set app.pariwar_id

    const keyId = `key-${randomUUID()}`;
    const inserted = await upsertDigiLockerCert(tx, {
      keyId,
      pem: '-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----',
      notAfter: NOT_AFTER,
      subject: 'CN=UIDAI',
    });
    expect(inserted.certId).toBeTruthy();
    expect(inserted.isActive).toBe(true);

    const found = await getActiveCertByKeyId(tx, keyId);
    expect(found?.keyId).toBe(keyId);
    expect(found?.subject).toBe('CN=UIDAI');
  });

  it('re-fetch (upsert on key_id conflict) refreshes pem + bumps fetched_at', async () => {
    const { tx, client } = getTx();
    await enterAppRoleNoScope(client);

    const keyId = `key-${randomUUID()}`;
    const first = await upsertDigiLockerCert(tx, {
      keyId,
      pem: 'PEM-V1',
      notAfter: NOT_AFTER,
      fetchedAt: new Date('2026-01-01T00:00:00Z'),
    });
    const second = await upsertDigiLockerCert(tx, {
      keyId,
      pem: 'PEM-V2',
      notAfter: NOT_AFTER,
      fetchedAt: new Date('2026-06-25T00:00:00Z'),
    });

    expect(second.certId).toBe(first.certId); // same row (upsert, not a new row)
    expect(second.pem).toBe('PEM-V2');
    expect(second.fetchedAt.getTime()).toBeGreaterThan(first.fetchedAt.getTime());
  });

  it('deactivate hides the cert from getActiveCertByKeyId (row preserved, not deleted)', async () => {
    const { tx, client } = getTx();
    await enterAppRoleNoScope(client);

    const keyId = `key-${randomUUID()}`;
    await upsertDigiLockerCert(tx, { keyId, pem: 'PEM', notAfter: NOT_AFTER });
    expect(await getActiveCertByKeyId(tx, keyId)).not.toBeNull();

    const deactivated = await deactivateDigiLockerCert(tx, keyId);
    expect(deactivated?.isActive).toBe(false);
    expect(await getActiveCertByKeyId(tx, keyId)).toBeNull(); // no longer "active"
  });

  it('listActiveCerts includes a freshly-upserted active cert (membership)', async () => {
    const { tx, client } = getTx();
    await enterAppRoleNoScope(client);

    const keyId = `key-${randomUUID()}`;
    await upsertDigiLockerCert(tx, { keyId, pem: 'PEM', notAfter: NOT_AFTER });

    const active = await listActiveCerts(tx, { limit: 200 });
    expect(active.map((c) => c.keyId)).toContain(keyId);
  });
});

describe.skipIf(!hasDatabase)('KYC substrate — kyc_transactions (TENANT-scoped)', () => {
  setupLiveDb();

  function newTxnInput(state: string) {
    return {
      memberId: toMemberId(randomUUID()),
      pariwarId: PARIWAR_A,
      provider: 'digilocker',
      intent: 'signup',
      state,
      codeVerifier: 'pkce-verifier-secret',
      redirectUri: 'https://app.twt.local/kyc/callback',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  it('insert under PARIWAR_A scope; read back by id + by state', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const state = `state-${randomUUID()}`;
    const inserted = await insertKycTransaction(tx, newTxnInput(state));
    expect(inserted.status).toBe('pending');
    expect(inserted.provider).toBe('digilocker');

    const byId = await getKycTransaction(tx, PARIWAR_A, inserted.transactionId);
    expect(byId?.transactionId).toBe(inserted.transactionId);

    const byState = await getKycTransactionByState(tx, PARIWAR_A, state);
    expect(byState?.transactionId).toBe(inserted.transactionId);
    expect(byState?.codeVerifier).toBe('pkce-verifier-secret');
  });

  it('updateKycTransactionStatus moves pending → verified', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const state = `state-${randomUUID()}`;
    const inserted = await insertKycTransaction(tx, newTxnInput(state));

    const updated = await updateKycTransactionStatus(tx, PARIWAR_A, inserted.transactionId, 'verified');
    expect(updated?.status).toBe('verified');

    const reread = await getKycTransaction(tx, PARIWAR_A, inserted.transactionId);
    expect(reread?.status).toBe('verified');
  });

  it('cross-tenant RLS: a PARIWAR_B transaction is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();

    // Seed a PARIWAR_B transaction as the Docker superuser (RLS bypassed, before scope).
    const stateB = `state-b-${randomUUID()}`;
    await insertKycTransaction(tx, {
      ...newTxnInput(stateB),
      pariwarId: PARIWAR_B,
    });

    // Enter PARIWAR_A scope (sheds superuser → RLS now enforced).
    await enterAppScope(client, PARIWAR_A);

    // RLS hides B's row from A's scope — a raw, tenant-predicate-free SELECT sees 0.
    const raw = await client.query('SELECT count(*)::int AS n FROM kyc_transactions WHERE state = $1', [
      stateB,
    ]);
    expect(raw.rows[0].n).toBe(0);

    // And the accessor (tenant predicate = A) also resolves nothing for B's state.
    expect(await getKycTransactionByState(tx, PARIWAR_A, stateB)).toBeNull();
  });
});

// ── Story 8.16 (AC2) — the STORED name is untouched by a member-facing form change ─────────────────
//
// ⭐ THE SUBSTRATE-LEVEL HALF of the byte-identity obligation. Story 8.16 makes the MEMBER-facing
// surfaces read the same `public_name_presentation_mode` the public ones read, which widens what that
// governed setting reaches. `2026-08-19-136` cl.2's bound is what stops the widening from becoming a
// second identity system: ONE stored name, N presentation modes — the form is decided at render, and
// `member_kyc_profiles.name_ciphertext` is never written by any of it.
//
// ⚠ This asserts it at the SUBSTRATE (the governed write path itself never touches the column). Its
// counterpart asserts it end-to-end THROUGH the real member render, in
// `apps/api/tests/integration/contributions/member-name-form-parity.spec.ts` — the two are different
// claims, and neither implies the other: a mode WRITE could be clean while a RENDER path wrote back.
describe.skipIf(!hasDatabase)('KYC substrate — a presentation-mode flip never writes a NAME', () => {
  setupLiveDb();

  it('the stored ciphertext is BYTE-IDENTICAL across a form change and back (`-136` cl.2)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const mid = toMemberId(randomUUID());
    await client.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`,
      [mid, PARIWAR_A],
    );
    // The name of RECORD. Its plaintext is irrelevant here — what matters is that these exact bytes
    // survive. (An opaque literal rather than a real envelope: this test is about who WRITES the
    // column, not about the crypto, and a literal makes the byte comparison unambiguous.)
    const STORED = 'enc:v1:the-name-of-record';
    await client.query(
      `INSERT INTO member_kyc_profiles (member_id, pariwar_id, name_ciphertext, dob_ciphertext,
                                        aadhaar_masked_id, verification_strength, source)
       VALUES ($1, $2, $3, 'enc:v1:dob', 'XXXX1234', 'aadhaar_kyc', 'digilocker')`,
      [mid, PARIWAR_A, STORED],
    );
    const readName = async (): Promise<string> => {
      const { rows } = await client.query<{ name_ciphertext: string }>(
        `SELECT name_ciphertext FROM member_kyc_profiles WHERE member_id = $1`,
        [mid],
      );
      if (!rows[0]) throw new Error('no KYC row');
      return rows[0].name_ciphertext;
    };
    const before = Buffer.from(await readName(), 'utf8');

    const governed = (mode: 'full_name' | 'shielded_name') => ({
      pariwarId: PARIWAR_A as never,
      mode,
      changedByActor: null,
      changedByDisplay: null,
      rationale: 'test — the form is a render decision, never a record edit',
      auditId: randomUUID(),
    });

    // → shielded → back to full. `-136` cl.3: it moves in BOTH directions, never a one-way ratchet.
    await setPublicNamePresentationMode(tx, governed('shielded_name'));
    expect(await resolvePublicNamePresentationMode(tx, PARIWAR_A as never)).toBe('shielded_name');
    await setPublicNamePresentationMode(tx, governed('full_name'));
    expect(await resolvePublicNamePresentationMode(tx, PARIWAR_A as never)).toBe('full_name');

    expect(Buffer.from(await readName(), 'utf8').equals(before)).toBe(true);

    // And the upsert stayed ONE row — a mode change is an edit to a setting, not an append-only log
    // that would let two rows disagree about what a Pariwar has chosen.
    const { rows } = await client.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM pariwar_public_name_presentation WHERE pariwar_id = $1`,
      [PARIWAR_A],
    );
    expect(rows[0]?.n).toBe('1');
  });
});
