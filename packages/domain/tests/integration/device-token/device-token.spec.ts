// member_device_tokens accessors — live-DB integration (Story 5.2, Task 7; AC3, AC5).
//
// Drives the domain device-token accessors against real Postgres inside the per-test BEGIN/ROLLBACK
// envelope. Families:
//   · encrypt + blind-index round-trip — upsert stores Tier-1 ciphertext (NOT the raw token) + a 64-hex
//     blind index; the ciphertext decrypts back to the raw token under the SAME (pariwarId, field-class).
//   · app-open rebuild — registering a NEW same-platform token marks the principal's prior token `stale`;
//     re-registering the SAME token is idempotent (stays active, one row).
//   · markInvalid — flips a token to `invalid`; it drops out of listActiveTokens.
//   · cross-tenant RLS — a PARIWAR_B token is invisible under PARIWAR_A scope.
//   · FK cascade (RTBF, Story 3.12) — deleting the member sweeps its device tokens.
//   · cleanup prune — purgeExpiredDeviceTokens deletes stale>7d / invalid>30d, keeps fresh + active.
//
// The token is encrypted + blind-indexed here with the domain primitives (fake KMS) under the field-class
// the app layer uses ('member_device_token', apps/api context.ts) — the accessor takes ciphertext as the
// app route does.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  blindIndex,
  createFakeKmsProvider,
  decryptTier1,
  encryptTier1,
  parseEnvelope,
  serializeEnvelope,
} from '../../../src/encryption/index.js';
import type { KmsKeyRef, KmsProvider } from '../../../src/encryption/kms-provider.js';
import {
  listActiveTokens,
  markInvalid,
  purgeExpiredDeviceTokens,
  upsertActiveToken,
} from '../../../src/device-token/index.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember } from '../_helpers.js';

const FIELD_CLASS = 'member_device_token';

function fakeKms(): { kms: KmsProvider; kekRef: KmsKeyRef; hmacKeyRef: KmsKeyRef } {
  const kms = createFakeKmsProvider({
    kekBytes: new Uint8Array(32).fill(5),
    hmacKeyBytes: new Uint8Array(32).fill(6),
  });
  return { kms, kekRef: { resourceName: 'fake:device-token-kek' }, hmacKeyRef: { resourceName: 'fake:device-token-hmac' } };
}

async function encToken(kms: KmsProvider, kekRef: KmsKeyRef, token: string, pariwarId: string): Promise<string> {
  const ct = await encryptTier1(Buffer.from(token, 'utf-8'), { pariwarId, fieldClass: FIELD_CLASS }, kms, kekRef);
  return serializeEnvelope(ct);
}

async function biToken(kms: KmsProvider, hmacKeyRef: KmsKeyRef, token: string, pariwarId: string): Promise<string> {
  return blindIndex(FIELD_CLASS, token, { pariwarId }, kms, hmacKeyRef);
}

describe.skipIf(!hasDatabase)('member_device_tokens accessors — RLS + rebuild + invalidate + cleanup (:5433)', () => {
  setupLiveDb();

  it('upsert stores Tier-1 ciphertext + a blind index; decrypt round-trips to the raw token', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef, hmacKeyRef } = fakeKms();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    await enterAppScope(client, PARIWAR_A);

    const token = 'fcm-android-token-abc123';
    const ciphertext = await encToken(kms, kekRef, token, PARIWAR_A);
    const bi = await biToken(kms, hmacKeyRef, token, PARIWAR_A);

    await upsertActiveToken(tx, {
      pariwarId: toPariwarId(PARIWAR_A),
      principalType: 'member',
      principalId: mid,
      memberId: toMemberId(mid),
      platform: 'android',
      tokenCiphertext: ciphertext,
      tokenBlindIndex: bi,
    });

    const rows = await listActiveTokens(tx, toPariwarId(PARIWAR_A), 'member', mid);
    expect(rows).toHaveLength(1);
    // Never the raw token at rest.
    expect(rows[0]!.tokenCiphertext).not.toContain(token);
    expect(rows[0]!.tokenBlindIndex).toMatch(/^[0-9a-f]{64}$/);
    // Round-trips under the SAME context.
    const back = await decryptTier1(parseEnvelope(rows[0]!.tokenCiphertext), { pariwarId: PARIWAR_A, fieldClass: FIELD_CLASS }, kms, kekRef);
    expect(Buffer.from(back).toString('utf-8')).toBe(token);
  });

  it('app-open rebuild: a NEW same-platform token marks the prior token stale (only the new one is active)', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef, hmacKeyRef } = fakeKms();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    await enterAppScope(client, PARIWAR_A);

    for (const token of ['token-old', 'token-new']) {
      await upsertActiveToken(tx, {
        pariwarId: toPariwarId(PARIWAR_A),
        principalType: 'member',
        principalId: mid,
        memberId: toMemberId(mid),
        platform: 'android',
        tokenCiphertext: await encToken(kms, kekRef, token, PARIWAR_A),
        tokenBlindIndex: await biToken(kms, hmacKeyRef, token, PARIWAR_A),
      });
    }

    const active = await listActiveTokens(tx, toPariwarId(PARIWAR_A), 'member', mid);
    expect(active).toHaveLength(1);
    const newBi = await biToken(kms, hmacKeyRef, 'token-new', PARIWAR_A);
    expect(active[0]!.tokenBlindIndex).toBe(newBi);

    // The old token row exists but is stale.
    const oldBi = await biToken(kms, hmacKeyRef, 'token-old', PARIWAR_A);
    const oldRows = await tx.select().from(schema.memberDeviceTokens).where(eq(schema.memberDeviceTokens.tokenBlindIndex, oldBi));
    expect(oldRows[0]!.status).toBe('stale');
  });

  it('re-registering the SAME token is idempotent (stays active, one row)', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef, hmacKeyRef } = fakeKms();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    await enterAppScope(client, PARIWAR_A);

    const input = {
      pariwarId: toPariwarId(PARIWAR_A),
      principalType: 'member' as const,
      principalId: mid,
      memberId: toMemberId(mid),
      platform: 'ios' as const,
      tokenCiphertext: await encToken(kms, kekRef, 'ios-tok', PARIWAR_A),
      tokenBlindIndex: await biToken(kms, hmacKeyRef, 'ios-tok', PARIWAR_A),
    };
    await upsertActiveToken(tx, input);
    await upsertActiveToken(tx, input);

    const active = await listActiveTokens(tx, toPariwarId(PARIWAR_A), 'member', mid);
    expect(active).toHaveLength(1);
    expect(active[0]!.status).toBe('active');
  });

  it('markInvalid flips the token to invalid → it drops out of listActiveTokens', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef, hmacKeyRef } = fakeKms();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    await enterAppScope(client, PARIWAR_A);

    const bi = await biToken(kms, hmacKeyRef, 'dead-token', PARIWAR_A);
    await upsertActiveToken(tx, {
      pariwarId: toPariwarId(PARIWAR_A),
      principalType: 'member',
      principalId: mid,
      memberId: toMemberId(mid),
      platform: 'android',
      tokenCiphertext: await encToken(kms, kekRef, 'dead-token', PARIWAR_A),
      tokenBlindIndex: bi,
    });

    expect(await markInvalid(tx, toPariwarId(PARIWAR_A), 'member', mid, 'android', bi)).toBe(1);
    expect(await listActiveTokens(tx, toPariwarId(PARIWAR_A), 'member', mid)).toHaveLength(0);
  });

  it('markInvalid (code-review fix): does NOT cross-invalidate a DIFFERENT principal sharing the identical blind index', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef, hmacKeyRef } = fakeKms();
    const midA = randomUUID();
    const midB = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: midA });
    await seedMember(tx, PARIWAR_A, { memberId: midB });
    await enterAppScope(client, PARIWAR_A);

    // Two DIFFERENT principals register the IDENTICAL raw token in the SAME Pariwar — same blind index
    // (an HMAC of (token, pariwarId) only), but two separate rows (the unique key includes principal_id).
    const sharedBi = await biToken(kms, hmacKeyRef, 'shared-token', PARIWAR_A);
    for (const mid of [midA, midB]) {
      await upsertActiveToken(tx, {
        pariwarId: toPariwarId(PARIWAR_A),
        principalType: 'member',
        principalId: mid,
        memberId: toMemberId(mid),
        platform: 'android',
        tokenCiphertext: await encToken(kms, kekRef, 'shared-token', PARIWAR_A),
        tokenBlindIndex: sharedBi,
      });
    }

    // Invalidating A's exact ownership tuple must NOT touch B's row, despite the identical blind index.
    expect(await markInvalid(tx, toPariwarId(PARIWAR_A), 'member', midA, 'android', sharedBi)).toBe(1);
    expect(await listActiveTokens(tx, toPariwarId(PARIWAR_A), 'member', midA)).toHaveLength(0);
    expect(await listActiveTokens(tx, toPariwarId(PARIWAR_A), 'member', midB)).toHaveLength(1);
  });

  it('cross-tenant RLS: a PARIWAR_B token is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef, hmacKeyRef } = fakeKms();
    const midA = randomUUID();
    const midB = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: midA });
    await seedMember(tx, PARIWAR_B, { memberId: midB });

    // Seed B's token as superuser (RLS bypassed) BEFORE entering A's scope.
    await tx.insert(schema.memberDeviceTokens).values({
      pariwarId: toPariwarId(PARIWAR_B),
      principalType: 'member',
      principalId: midB,
      memberId: toMemberId(midB),
      platform: 'android',
      tokenCiphertext: await encToken(kms, kekRef, 'b-token', PARIWAR_B),
      tokenBlindIndex: await biToken(kms, hmacKeyRef, 'b-token', PARIWAR_B),
      status: 'active',
    });

    await enterAppScope(client, PARIWAR_A);
    // Under A's scope, B's token is invisible.
    expect(await listActiveTokens(tx, toPariwarId(PARIWAR_B), 'member', midB)).toHaveLength(0);
  });

  it('FK cascade (RTBF): deleting the member sweeps its device tokens', async () => {
    // Run entirely as the Docker superuser (RLS bypassed) — this exercises the DB-level FK cascade, not
    // RLS. The scoped `twt_app` role has no DELETE grant on `members` (RTBF uses a dedicated path), so the
    // hard-delete + cascade is validated at the constraint level, superuser-side.
    const { tx } = getTx();
    const { kms, kekRef, hmacKeyRef } = fakeKms();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });

    await upsertActiveToken(tx, {
      pariwarId: toPariwarId(PARIWAR_A),
      principalType: 'member',
      principalId: mid,
      memberId: toMemberId(mid),
      platform: 'android',
      tokenCiphertext: await encToken(kms, kekRef, 'cascade-token', PARIWAR_A),
      tokenBlindIndex: await biToken(kms, hmacKeyRef, 'cascade-token', PARIWAR_A),
    });
    expect(await listActiveTokens(tx, toPariwarId(PARIWAR_A), 'member', mid)).toHaveLength(1);

    // RTBF hard-delete of the member cascades to its device tokens (ON DELETE CASCADE).
    await tx.delete(schema.members).where(eq(schema.members.memberId, toMemberId(mid)));
    expect(await listActiveTokens(tx, toPariwarId(PARIWAR_A), 'member', mid)).toHaveLength(0);
  });

  it('cleanup prune: purgeExpiredDeviceTokens deletes stale>7d / invalid>30d, keeps fresh + active', async () => {
    const { tx } = getTx();
    const { kms, kekRef, hmacKeyRef } = fakeKms();
    const mid = randomUUID();
    // Seed as superuser (no scope) so the purge (BYPASSRLS in prod; superuser here) sweeps.
    await seedMember(tx, PARIWAR_A, { memberId: mid });

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    async function seedToken(token: string, status: 'active' | 'stale' | 'invalid', ageDays: number): Promise<void> {
      await tx.insert(schema.memberDeviceTokens).values({
        pariwarId: toPariwarId(PARIWAR_A),
        principalType: 'member',
        principalId: mid,
        memberId: toMemberId(mid),
        platform: 'android',
        tokenCiphertext: await encToken(kms, kekRef, token, PARIWAR_A),
        tokenBlindIndex: await biToken(kms, hmacKeyRef, token, PARIWAR_A),
        status,
        lastSeenAt: new Date(now - ageDays * day),
      });
    }
    await seedToken('stale-old', 'stale', 10); // > 7d → pruned
    await seedToken('stale-fresh', 'stale', 2); // < 7d → kept
    await seedToken('invalid-old', 'invalid', 40); // > 30d → pruned
    await seedToken('active-old', 'active', 100); // active → never pruned

    // Run the prune on the tx client (sees uncommitted rows; superuser bypasses RLS like the service pool).
    const client = getTx().client as unknown as import('pg').Pool;
    const deleted = await purgeExpiredDeviceTokens(client);
    expect(deleted).toBe(2);

    const remaining = await tx
      .select()
      .from(schema.memberDeviceTokens)
      .where(and(eq(schema.memberDeviceTokens.principalId, mid)));
    const statuses = remaining.map((r) => r.status).sort();
    expect(statuses).toEqual(['active', 'stale']);
  });

  it('admin principal (AC3, AC7): upsert + app-open rebuild works identically for principalType=admin, memberId NULL', async () => {
    // Admin tokens have NO member row / no RTBF-cascade FK — memberId is NULL. The admin-global-namespace
    // pariwarId sentinel is an apps/api concern (ADMIN_GLOBAL_NAMESPACE); the domain accessor itself is
    // principal-type-agnostic, so any pariwarId exercises the same code path.
    const { tx, client } = getTx();
    const { kms, kekRef, hmacKeyRef } = fakeKms();
    const adminUserId = randomUUID();
    await enterAppScope(client, PARIWAR_A);

    for (const token of ['admin-token-old', 'admin-token-new']) {
      await upsertActiveToken(tx, {
        pariwarId: toPariwarId(PARIWAR_A),
        principalType: 'admin',
        principalId: adminUserId,
        memberId: null,
        platform: 'ios',
        tokenCiphertext: await encToken(kms, kekRef, token, PARIWAR_A),
        tokenBlindIndex: await biToken(kms, hmacKeyRef, token, PARIWAR_A),
      });
    }

    const active = await listActiveTokens(tx, toPariwarId(PARIWAR_A), 'admin', adminUserId);
    expect(active).toHaveLength(1);
    expect(active[0]!.memberId).toBeNull();
    const newBi = await biToken(kms, hmacKeyRef, 'admin-token-new', PARIWAR_A);
    expect(active[0]!.tokenBlindIndex).toBe(newBi);

    // markInvalid works the same way for an admin-owned row.
    expect(await markInvalid(tx, toPariwarId(PARIWAR_A), 'admin', adminUserId, 'ios', newBi)).toBe(1);
    expect(await listActiveTokens(tx, toPariwarId(PARIWAR_A), 'admin', adminUserId)).toHaveLength(0);
  });
});
