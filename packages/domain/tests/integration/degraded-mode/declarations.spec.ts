// pariwar_degraded_mode_declarations accessors — live-DB integration (Story 5.8, Task 1/7; AC1).
//
// Drives the domain degraded-mode accessors against real Postgres inside the per-test BEGIN/ROLLBACK
// envelope. Families:
//   · declare + computed-active window — getActiveDegradedMode returns a declaration within its window;
//     before effective_from / after expires_at / after revocation ⇒ null; expires_at = null ⇒ open-ended.
//   · idempotent revoke — revoking an already-revoked row is a no-op.
//   · single-active-per-Pariwar (auto-revoke-on-declare) — a second declare auto-revokes the first; revoking
//     the second returns null (NOT a fallback to the auto-revoked first — the overlap-bug regression test).
//   · cross-tenant RLS — a PARIWAR_B declaration is invisible under PARIWAR_A scope.
//
// NOTE: this is a sequential, single-connection suite — it covers the auto-revoke LOGIC, not the advisory
// lock's race protection (a true concurrent regression needs multiple independent transactions; noted as a
// known test gap in the story, not a defect).

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  declareDegradedMode,
  getActiveDegradedMode,
  revokeDegradedMode,
} from '../../../src/degraded-mode/index.js';
import { pariwarId as toPariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const MODE = 'cycle_open_sms_bridge';

describe.skipIf(!hasDatabase)('pariwar_degraded_mode_declarations accessors — window + single-active + RLS (:5433)', () => {
  setupLiveDb();

  it('declare → getActiveDegradedMode returns it within its window; before/after ⇒ null', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const effectiveFrom = new Date('2026-07-07T10:00:00.000Z');
    const expiresAt = new Date('2026-07-07T14:00:00.000Z');
    const row = await declareDegradedMode(tx, {
      pariwarId: toPariwarId(PARIWAR_A),
      mode: MODE,
      effectiveFrom,
      expiresAt,
      declaredByActor: null,
      reason: 'push infra down',
    });
    expect(row.mode).toBe(MODE);

    // Within the window ⇒ active.
    const active = await getActiveDegradedMode(tx, toPariwarId(PARIWAR_A), new Date('2026-07-07T12:00:00.000Z'));
    expect(active).not.toBeNull();
    expect(active!.id).toBe(row.id);

    // Before effective_from ⇒ null.
    expect(await getActiveDegradedMode(tx, toPariwarId(PARIWAR_A), new Date('2026-07-07T09:59:00.000Z'))).toBeNull();
    // After expires_at ⇒ null.
    expect(await getActiveDegradedMode(tx, toPariwarId(PARIWAR_A), new Date('2026-07-07T14:00:01.000Z'))).toBeNull();
  });

  it('expires_at = null ⇒ active until revoked', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const effectiveFrom = new Date('2026-07-07T10:00:00.000Z');
    const row = await declareDegradedMode(tx, {
      pariwarId: toPariwarId(PARIWAR_A),
      mode: MODE,
      effectiveFrom,
      expiresAt: null,
      declaredByActor: null,
      reason: 'open-ended',
    });

    // Active far into the future (no expiry).
    expect((await getActiveDegradedMode(tx, toPariwarId(PARIWAR_A), new Date('2027-01-01T00:00:00.000Z')))!.id).toBe(row.id);

    // Revoke ⇒ null thereafter.
    await revokeDegradedMode(tx, { declarationId: row.id, revokedByActor: null, at: new Date('2026-07-08T00:00:00.000Z') });
    expect(await getActiveDegradedMode(tx, toPariwarId(PARIWAR_A), new Date('2027-01-01T00:00:00.000Z'))).toBeNull();
  });

  it('revokeDegradedMode on an already-revoked row is a no-op (idempotent)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const row = await declareDegradedMode(tx, {
      pariwarId: toPariwarId(PARIWAR_A),
      mode: MODE,
      effectiveFrom: new Date('2026-07-07T10:00:00.000Z'),
      expiresAt: null,
      declaredByActor: null,
      reason: 'r',
    });
    const firstAt = new Date('2026-07-08T00:00:00.000Z');
    expect(await revokeDegradedMode(tx, { declarationId: row.id, revokedByActor: null, at: firstAt })).toBe(true);
    // A second revoke does NOT error, reports false (nothing changed), and does NOT change the recorded revoked_at.
    await expect(
      revokeDegradedMode(tx, { declarationId: row.id, revokedByActor: null, at: new Date('2026-07-09T00:00:00.000Z') }),
    ).resolves.toBe(false);
    const [after] = await tx
      .select()
      .from(schema.pariwarDegradedModeDeclarations)
      .where(eq(schema.pariwarDegradedModeDeclarations.id, row.id));
    expect(after!.revokedAt!.toISOString()).toBe(firstAt.toISOString());
  });

  it('single-active-per-Pariwar: a second declare auto-revokes the first; revoking the second ⇒ null (no fallback)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const first = await declareDegradedMode(tx, {
      pariwarId: toPariwarId(PARIWAR_A),
      mode: MODE,
      effectiveFrom: new Date('2026-07-07T10:00:00.000Z'),
      expiresAt: null,
      declaredByActor: null,
      reason: 'first',
    });
    // Declare AGAIN while the first is still active ⇒ the first is auto-revoked.
    const second = await declareDegradedMode(tx, {
      pariwarId: toPariwarId(PARIWAR_A),
      mode: MODE,
      effectiveFrom: new Date('2026-07-07T11:00:00.000Z'),
      expiresAt: null,
      declaredByActor: null,
      reason: 'second',
    });

    const at = new Date('2026-07-07T12:00:00.000Z');
    const active = await getActiveDegradedMode(tx, toPariwarId(PARIWAR_A), at);
    expect(active!.id).toBe(second.id); // only the second is active

    // The first was auto-revoked (revoked_at set to the second's effective_from).
    const [firstRow] = await tx
      .select()
      .from(schema.pariwarDegradedModeDeclarations)
      .where(eq(schema.pariwarDegradedModeDeclarations.id, first.id));
    expect(firstRow!.revokedAt).not.toBeNull();

    // Revoking the currently-active (second) declaration ⇒ getActive is null — NOT a fallback to the
    // auto-revoked first. This is the regression test for the overlap bug the auto-revoke prevents.
    await revokeDegradedMode(tx, { declarationId: second.id, revokedByActor: null, at });
    expect(await getActiveDegradedMode(tx, toPariwarId(PARIWAR_A), at)).toBeNull();
  });

  it('a future-dated auto-revoke does NOT blank out current coverage (Review Finding regression)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const first = await declareDegradedMode(tx, {
      pariwarId: toPariwarId(PARIWAR_A),
      mode: MODE,
      effectiveFrom: new Date('2026-07-07T10:00:00.000Z'),
      expiresAt: null,
      declaredByActor: null,
      reason: 'first',
    });
    // Declare a REPLACEMENT that only becomes effective far in the future.
    const future = new Date('2026-07-10T00:00:00.000Z');
    const second = await declareDegradedMode(tx, {
      pariwarId: toPariwarId(PARIWAR_A),
      mode: MODE,
      effectiveFrom: future,
      expiresAt: null,
      declaredByActor: null,
      reason: 'second (future-dated)',
    });

    // Right now (before `future`), the FIRST declaration must still read as active — a future-dated
    // replacement must not blank out current coverage until its own effective_from actually arrives.
    const now = new Date('2026-07-07T12:00:00.000Z');
    const activeNow = await getActiveDegradedMode(tx, toPariwarId(PARIWAR_A), now);
    expect(activeNow!.id).toBe(first.id);

    // At/after `future`, the SECOND declaration is the one that reads active.
    const activeAtFuture = await getActiveDegradedMode(tx, toPariwarId(PARIWAR_A), future);
    expect(activeAtFuture!.id).toBe(second.id);
  });

  it('cross-tenant RLS: a PARIWAR_B declaration is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();

    // Seed B's declaration as superuser (RLS bypassed) BEFORE entering A's scope.
    await tx.insert(schema.pariwarDegradedModeDeclarations).values({
      pariwarId: toPariwarId(PARIWAR_B),
      mode: MODE,
      effectiveFrom: new Date('2026-07-07T10:00:00.000Z'),
      expiresAt: null,
      declaredByActor: null,
      reason: 'b-only',
    });

    await enterAppScope(client, PARIWAR_A);
    // Under A's scope, B's declaration is invisible.
    expect(await getActiveDegradedMode(tx, toPariwarId(PARIWAR_B), new Date('2026-07-07T12:00:00.000Z'))).toBeNull();
  });
});
