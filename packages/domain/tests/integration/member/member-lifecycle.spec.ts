// Member lifecycle — live-DB integration (Story 3.1, Task 9; AC2/AC3/AC4/AC5).
//
// Drives the projector, the time-travel read, the overlay seam, and the AC3 trigger
// against real Postgres under PARIWAR_A scope, inside the per-test BEGIN/ROLLBACK
// (nothing persists). Asserts MEMBERSHIP / explicit values, never DROP SCHEMA; per
// [[project_live_db_test_gotchas]].

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { memberId as toMemberId } from '../../../src/ids/index.js';
import {
  getMemberAccountOverlay,
  getMemberStateAt,
  isMemberStateDirectWriteError,
  projectMemberState,
} from '../../../src/member/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember } from '../_helpers.js';

/** Build the §1.14 audit-shape payload an emitter supplies (extra fields merged in). */
const audit = (
  from: string | null,
  to: string,
  trigger: string,
  actor: 'member' | 'system' | 'trustee',
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({ from_state: from, to_state: to, trigger, actor, ...extra });

/** Insert one events_log row directly (superuser path) with an explicit occurred_at. */
async function seedEventAt(
  tx: ReturnType<typeof getTx>['tx'],
  streamId: string,
  pariwarId: string,
  eventType: string,
  eventVersion: number,
  occurredAt: Date,
  payload: unknown = {},
): Promise<void> {
  await tx.insert(schema.eventsLog).values({
    streamId,
    eventType,
    payload,
    eventVersion,
    occurredAt,
    actorId: null,
    pariwarId,
  });
}

describe.skipIf(!hasDatabase)('member lifecycle (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('projector appends + projects state in ONE tx (signup → pending-kyc → pending-fee)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());

    const r1 = await projectMemberState(client, {
      memberId: mid,
      pariwarId: PARIWAR_A,
      eventType: 'member.signup_initiated',
      payload: audit(null, 'pending-kyc', 'signup form completed', 'member'),
      actorId: null,
    });
    expect(r1.eventVersion).toBe(1);
    expect(r1.state).toBe('pending-kyc');

    const r2 = await projectMemberState(client, {
      memberId: mid,
      pariwarId: PARIWAR_A,
      eventType: 'member.kyc_completed',
      payload: audit('pending-kyc', 'pending-fee', 'digilocker verified', 'system'),
      actorId: null,
    });
    expect(r2.eventVersion).toBe(2);
    expect(r2.state).toBe('pending-fee');

    // The cached members row reflects the projected state + version (same tx view).
    const rows = await tx.select().from(schema.members).where(eq(schema.members.memberId, mid));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.state).toBe('pending-fee');
    expect(rows[0]?.stateEventVersion).toBe(2);

    // Both events landed on the member's stream.
    const events = await tx
      .select()
      .from(schema.eventsLog)
      .where(eq(schema.eventsLog.streamId, mid));
    expect(events).toHaveLength(2);
  });

  it('lock_in_expired branches on kyc_verified (verified → active)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());
    const steps: Array<[string, Record<string, unknown>]> = [
      ['member.signup_initiated', audit(null, 'pending-kyc', 'signup', 'member')],
      ['member.kyc_completed', audit('pending-kyc', 'pending-fee', 'verified', 'system')],
      ['member.vyawastha_shulk_paid', audit('pending-fee', 'lock-in', 'paid', 'member', { utr: 'UTR1', amount_inr: 110 })],
      ['member.lock_in_expired', audit('lock-in', 'active', 'clock elapsed', 'system', { kyc_verified: true })],
    ];
    let last = '';
    for (const [eventType, payload] of steps) {
      const r = await projectMemberState(client, { memberId: mid, pariwarId: PARIWAR_A, eventType: eventType as never, payload, actorId: null });
      last = r.state;
    }
    expect(last).toBe('active');
    const rows = await tx.select().from(schema.members).where(eq(schema.members.memberId, mid));
    expect(rows[0]?.state).toBe('active');
  });

  it('AC3: a direct UPDATE members SET state without the projector guard is REJECTED', async () => {
    const { client } = getTx();
    const mid = randomUUID();
    // Seed a member row as the (RLS-bypassing) superuser before entering app scope.
    await seedMember(getTx().tx, PARIWAR_A, { memberId: mid, state: 'pending-kyc' });
    await enterAppScope(client, PARIWAR_A);

    // Raw UPDATE without setting app.member_state_writer = 'on' → trigger RAISEs P0001.
    const err = await client
      .query("UPDATE members SET state = 'active' WHERE member_id = $1", [mid])
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe('P0001');
    expect((err as Error).message).toContain('members.state direct write rejected');
    expect(isMemberStateDirectWriteError(err)).toBe(true);
  });

  it('AC4: getMemberStateAt replays up to — not exceeding — the timestamp', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    const T1 = new Date('2026-01-01T00:00:00Z');
    const T2 = new Date('2026-02-01T00:00:00Z');
    const T3 = new Date('2026-03-01T00:00:00Z');
    // Seed events with explicit, distinct occurred_at (superuser, before scope).
    await seedEventAt(tx, mid, PARIWAR_A, 'member.signup_initiated', 1, T1, audit(null, 'pending-kyc', 's', 'member'));
    await seedEventAt(tx, mid, PARIWAR_A, 'member.kyc_completed', 2, T2, audit('pending-kyc', 'pending-fee', 'k', 'system'));
    await seedEventAt(tx, mid, PARIWAR_A, 'member.vyawastha_shulk_paid', 3, T3, audit('pending-fee', 'lock-in', 'p', 'member', { utr: 'U', amount_inr: 110 }));
    await enterAppScope(client, PARIWAR_A);

    expect(await getMemberStateAt(tx, mid, new Date('2025-12-31T00:00:00Z'))).toBe('pending-kyc'); // before any event (degenerate → initial)
    expect(await getMemberStateAt(tx, mid, new Date('2026-01-15T00:00:00Z'))).toBe('pending-kyc');
    expect(await getMemberStateAt(tx, mid, new Date('2026-02-15T00:00:00Z'))).toBe('pending-fee');
    expect(await getMemberStateAt(tx, mid, new Date('2026-03-15T00:00:00Z'))).toBe('lock-in');
  });

  it('AC4: replay orders by event_version, NOT occurred_at (ties are deterministic)', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    const SAME = new Date('2026-05-01T00:00:00Z');
    // Two events at the IDENTICAL occurred_at; only event_version disambiguates them.
    await seedEventAt(tx, mid, PARIWAR_A, 'member.signup_initiated', 1, SAME, audit(null, 'pending-kyc', 's', 'member'));
    await seedEventAt(tx, mid, PARIWAR_A, 'member.kyc_completed', 2, SAME, audit('pending-kyc', 'pending-fee', 'k', 'system'));
    await enterAppScope(client, PARIWAR_A);
    expect(await getMemberStateAt(tx, mid, SAME)).toBe('pending-fee');
  });

  it('AC5: account-frozen overlay — not frozen by default; freezes on a claim intake naming the member', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    const claimStream = randomUUID();
    const INTAKE = new Date('2026-06-01T00:00:00Z');
    await enterAppScope(client, PARIWAR_A);

    // No claim events yet → not frozen (the seam returns the default).
    const before = await getMemberAccountOverlay(tx, mid, new Date('2026-06-10T00:00:00Z'));
    expect(before).toEqual({ accountFrozen: false, frozenSince: null });

    // Seed a claim.intake_initiated naming this member as the deceased subject (the
    // Story 6.1 contract). The seam query finds it → frozen.
    await tx.insert(schema.eventsLog).values({
      streamId: claimStream,
      eventType: 'claim.intake_initiated',
      payload: { deceased_member_id: mid },
      eventVersion: 1,
      occurredAt: INTAKE,
      actorId: null,
      pariwarId: PARIWAR_A,
    });
    const frozen = await getMemberAccountOverlay(tx, mid, new Date('2026-06-10T00:00:00Z'));
    expect(frozen.accountFrozen).toBe(true);
    expect(frozen.frozenSince).toEqual(INTAKE);

    // Bounded by the timestamp: a query BEFORE the intake is still not-frozen.
    const earlier = await getMemberAccountOverlay(tx, mid, new Date('2026-05-20T00:00:00Z'));
    expect(earlier.accountFrozen).toBe(false);
  });

  it('AC5: cross-tenant — a PARIWAR_B claim intake naming a PARIWAR_A member does not freeze that member under PARIWAR_A scope', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    const claimStream = randomUUID();
    const INTAKE = new Date('2026-06-01T00:00:00Z');

    // Seed the claim event under PARIWAR_B (superuser, RLS bypassed).
    await tx.insert(schema.eventsLog).values({
      streamId: claimStream,
      eventType: 'claim.intake_initiated',
      payload: { deceased_member_id: mid },
      eventVersion: 1,
      occurredAt: INTAKE,
      actorId: null,
      pariwarId: PARIWAR_B,
    });

    // Enter PARIWAR_A app scope — events_log RLS filters to pariwar_id = PARIWAR_A.
    await enterAppScope(client, PARIWAR_A);

    const overlay = await getMemberAccountOverlay(tx, mid, new Date('2026-06-10T00:00:00Z'));
    expect(overlay.accountFrozen).toBe(false);
    expect(overlay.frozenSince).toBeNull();
  });
});
