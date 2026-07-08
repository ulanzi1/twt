// Claim lifecycle — live-DB integration (Story 6.1, Task 9; AC3/AC4/AC5).
//
// Drives the projector, the time-travel read, the AC3 trigger, and the AC5 overlay
// seam against real Postgres under PARIWAR_A scope, inside the per-test BEGIN/ROLLBACK
// (nothing persists). Asserts MEMBERSHIP / explicit values, never DROP SCHEMA; per
// [[project_live_db_test_gotchas]]. Twin of member-lifecycle.spec.ts.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import {
  getClaimByDeceasedMember,
  getClaimCase,
  getClaimStateAt,
  isClaimStateDirectWriteError,
  projectClaimState,
} from '../../../src/claim/index.js';
import { getMemberAccountOverlay } from '../../../src/member/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClaim } from '../_helpers.js';

/** Build the §1.14 audit-shape payload an emitter supplies (extra fields merged in). */
const audit = (
  from: string | null,
  to: string,
  trigger: string,
  actor: 'member' | 'operator' | 'trustee' | 'system',
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

describe.skipIf(!hasDatabase)('claim lifecycle (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('projector appends + projects state in ONE tx (intake → intake_pending → intake_converged)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = randomUUID();

    const r1 = await projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      deceasedMemberId: toMemberId(mid),
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: 'claim.intake_initiated',
      payload: audit(null, 'intake_pending', 'nominee filed', 'member', {
        deceased_member_id: mid,
        intake_channel: 'member_app',
        claimant_actor_id: null,
      }),
      actorId: null,
      auditId: 'audit-r1',
    });
    expect(r1.eventVersion).toBe(1);
    expect(r1.state).toBe('intake_pending');
    // AC4: the caller-supplied auditId threads straight through, transport-free.
    expect(r1.auditId).toBe('audit-r1');

    const r2 = await projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      deceasedMemberId: toMemberId(mid),
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: 'claim.intake_converged',
      payload: audit('intake_pending', 'intake_converged', 'ICP dedup', 'system'),
      actorId: null,
    });
    expect(r2.eventVersion).toBe(2);
    expect(r2.state).toBe('intake_converged');
    // auditId is optional — omitting it echoes back undefined, not a default/placeholder.
    expect(r2.auditId).toBeUndefined();

    // The cached claims row reflects the projected state + version (same tx view).
    const rows = await tx.select().from(schema.claims).where(eq(schema.claims.claimCaseId, cid));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.currentState).toBe('intake_converged');
    expect(rows[0]?.stateEventVersion).toBe(2);
    expect(rows[0]?.deceasedMemberId).toBe(mid);
    expect(rows[0]?.intakeChannels).toEqual(['member_app']);

    // Both events landed on the claim's stream.
    const events = await tx
      .select()
      .from(schema.eventsLog)
      .where(eq(schema.eventsLog.streamId, cid));
    expect(events).toHaveLength(2);

    // getClaimCase convenience read returns the cached row under scope.
    const cached = await getClaimCase(tx, PARIWAR_A, cid);
    expect(cached?.currentState).toBe('intake_converged');
  });

  it('AC3: a direct UPDATE claims SET current_state without the projector guard is REJECTED', async () => {
    const { client } = getTx();
    const cid = randomUUID();
    // Seed a claim row as the (RLS-bypassing) superuser before entering app scope.
    await seedClaim(getTx().tx, PARIWAR_A, { claimCaseId: cid, currentState: 'intake_pending' });
    await enterAppScope(client, PARIWAR_A);

    // Raw UPDATE without setting app.claim_state_writer = 'on' → trigger RAISEs P0001.
    const err = await client
      .query("UPDATE claims SET current_state = 'approved' WHERE claim_case_id = $1", [cid])
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe('P0001');
    expect((err as Error).message).toContain('claims.current_state direct write rejected');
    expect(isClaimStateDirectWriteError(err)).toBe(true);
  });

  it('AC3: a non-state UPDATE (updated_at only) is NOT rejected by the trigger', async () => {
    const { client } = getTx();
    const cid = randomUUID();
    await seedClaim(getTx().tx, PARIWAR_A, { claimCaseId: cid, currentState: 'intake_pending' });
    await enterAppScope(client, PARIWAR_A);
    // current_state unchanged → NEW.current_state IS NOT DISTINCT FROM OLD → no RAISE.
    await expect(
      client.query('UPDATE claims SET updated_at = now() WHERE claim_case_id = $1', [cid]),
    ).resolves.toBeDefined();
  });

  it('AC3: getClaimStateAt replays up to — not exceeding — the timestamp', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = randomUUID();
    const T1 = new Date('2026-01-01T00:00:00Z');
    const T2 = new Date('2026-02-01T00:00:00Z');
    const T3 = new Date('2026-03-01T00:00:00Z');
    await seedEventAt(tx, cid, PARIWAR_A, 'claim.intake_initiated', 1, T1, audit(null, 'intake_pending', 'i', 'member', { deceased_member_id: mid, intake_channel: 'member_app', claimant_actor_id: null }));
    await seedEventAt(tx, cid, PARIWAR_A, 'claim.intake_converged', 2, T2, audit('intake_pending', 'intake_converged', 'c', 'system'));
    await seedEventAt(tx, cid, PARIWAR_A, 'claim.documents_received', 3, T3, audit('intake_converged', 'documents_pending', 'd', 'operator'));
    await enterAppScope(client, PARIWAR_A);

    expect(await getClaimStateAt(tx, cid, new Date('2025-12-31T00:00:00Z'))).toBe('intake_pending'); // before any event (degenerate → initial)
    expect(await getClaimStateAt(tx, cid, new Date('2026-01-15T00:00:00Z'))).toBe('intake_pending');
    expect(await getClaimStateAt(tx, cid, new Date('2026-02-15T00:00:00Z'))).toBe('intake_converged');
    expect(await getClaimStateAt(tx, cid, new Date('2026-03-15T00:00:00Z'))).toBe('documents_pending');
  });

  it('AC3: replay orders by event_version, NOT occurred_at (ties are deterministic)', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = randomUUID();
    const SAME = new Date('2026-05-01T00:00:00Z');
    await seedEventAt(tx, cid, PARIWAR_A, 'claim.intake_initiated', 1, SAME, audit(null, 'intake_pending', 'i', 'member', { deceased_member_id: mid, intake_channel: 'member_app', claimant_actor_id: null }));
    await seedEventAt(tx, cid, PARIWAR_A, 'claim.intake_converged', 2, SAME, audit('intake_pending', 'intake_converged', 'c', 'system'));
    await enterAppScope(client, PARIWAR_A);
    expect(await getClaimStateAt(tx, cid, SAME)).toBe('intake_converged');
  });

  it('AC5 (load-bearing): projector-emitted claim.intake_initiated freezes the member account; settled clears it', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());

    // No claim events yet → not frozen (the overlay seam returns the default).
    const before = await getMemberAccountOverlay(tx, mid, new Date());
    expect(before).toEqual({ accountFrozen: false, frozenSince: null });

    // Drive the REAL projector — the intake payload carries deceased_member_id, which is
    // exactly what member/overlay.ts queries by name. End-to-end seam proof.
    await projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      deceasedMemberId: mid,
      intakeChannels: ['helpline'],
      claimantActorId: null,
      eventType: 'claim.intake_initiated',
      payload: audit(null, 'intake_pending', 'nominee filed', 'operator', {
        deceased_member_id: mid,
        intake_channel: 'helpline',
        claimant_actor_id: null,
      }),
      actorId: null,
    });
    const frozen = await getMemberAccountOverlay(tx, mid, new Date());
    expect(frozen.accountFrozen).toBe(true);
    expect(frozen.frozenSince).not.toBeNull();

    // A settled event on the same claim clears the overlay.
    // Advance the claim to `approved` first (the reducer only settles from approved),
    // then settle — proving the projector's settled event is the overlay UNFREEZE type.
    for (const [eventType, payload] of [
      ['claim.intake_converged', audit('intake_pending', 'intake_converged', 'c', 'system')],
      ['claim.documents_received', audit('intake_converged', 'documents_pending', 'd', 'operator')],
      ['claim.peer_mesh_pinged', audit('documents_pending', 'verification_in_progress', 'p', 'system')],
      ['claim.verifier_reviewing', audit('verification_in_progress', 'verifier_review', 'r', 'operator')],
      ['claim.verifier_approved', audit('verifier_review', 'verifier_approved', 'a', 'operator')],
      ['claim.state_trustee_frozen', audit('verifier_approved', 'state_trustee_freeze', 'f', 'trustee')],
      ['claim.state_trustee_approved', audit('state_trustee_freeze', 'state_trustee_approved', 'v', 'trustee')],
      ['claim.approved', audit('state_trustee_approved', 'approved', 'commit', 'trustee')],
      ['claim.settled', audit('approved', 'settled', 'disbursed', 'system', { deceased_member_id: mid })],
    ] as const) {
      await projectClaimState(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        deceasedMemberId: mid,
        intakeChannels: ['helpline'],
        claimantActorId: null,
        eventType: eventType as never,
        payload,
        actorId: null,
      });
    }
    const cleared = await getMemberAccountOverlay(tx, mid, new Date());
    expect(cleared.accountFrozen).toBe(false);
    expect(cleared.frozenSince).toBeNull();

    // And the claim reached the terminal settled state.
    const cached = await getClaimCase(tx, PARIWAR_A, cid);
    expect(cached?.currentState).toBe('settled');
  });

  it('AC5: claim.denied_no_appeal is the OTHER unfreeze type (clears the overlay)', async () => {
    const { client, tx } = getTx();
    const cid = randomUUID();
    const mid = toMemberId(randomUUID());
    const FREEZE = new Date('2026-06-01T00:00:00Z');
    const CLEAR = new Date('2026-06-05T00:00:00Z');
    // Seed a freeze then a denied_no_appeal directly (both on the claim stream).
    await seedEventAt(tx, cid, PARIWAR_A, 'claim.intake_initiated', 1, FREEZE, { deceased_member_id: mid });
    await seedEventAt(tx, cid, PARIWAR_A, 'claim.denied_no_appeal', 2, CLEAR, { deceased_member_id: mid });
    await enterAppScope(client, PARIWAR_A);

    expect((await getMemberAccountOverlay(tx, mid, FREEZE)).accountFrozen).toBe(true);
    expect((await getMemberAccountOverlay(tx, mid, CLEAR)).accountFrozen).toBe(false);
  });

  it('6.2 review fix: getClaimByDeceasedMember excludes TERMINAL claims (settled/denied) so a death can be re-filed', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // A death whose ONLY claim already reached a terminal state → no live intake found, so a
    // fresh member-app intake will mint a NEW claim_case_id rather than silently re-attaching
    // to the stale terminal one (the review-flagged bug: the read previously had no state filter
    // at all, so a re-file after `denied`/`settled` would resolve to the dead claim).
    const deniedMid = toMemberId(randomUUID());
    await seedClaim(tx, PARIWAR_A, { deceasedMemberId: String(deniedMid), currentState: 'denied' });
    expect(await getClaimByDeceasedMember(tx, PARIWAR_A, deniedMid)).toBeUndefined();

    const settledMid = toMemberId(randomUUID());
    await seedClaim(tx, PARIWAR_A, { deceasedMemberId: String(settledMid), currentState: 'settled' });
    expect(await getClaimByDeceasedMember(tx, PARIWAR_A, settledMid)).toBeUndefined();

    // A death with a NON-terminal claim is still found (the idempotency guard's actual job).
    const pendingMid = toMemberId(randomUUID());
    const pendingCid = await seedClaim(tx, PARIWAR_A, {
      deceasedMemberId: String(pendingMid),
      currentState: 'documents_pending',
    });
    const found = await getClaimByDeceasedMember(tx, PARIWAR_A, pendingMid);
    expect(found?.claimCaseId).toBe(pendingCid);

    // A death with BOTH an earlier terminal claim and a later non-terminal one (e.g. a re-file
    // after denial) resolves to the LIVE one, not the terminal one, regardless of recency.
    const mixedMid = toMemberId(randomUUID());
    await seedClaim(tx, PARIWAR_A, { deceasedMemberId: String(mixedMid), currentState: 'denied' });
    const liveCid = await seedClaim(tx, PARIWAR_A, {
      deceasedMemberId: String(mixedMid),
      currentState: 'intake_pending',
    });
    const mixedFound = await getClaimByDeceasedMember(tx, PARIWAR_A, mixedMid);
    expect(mixedFound?.claimCaseId).toBe(liveCid);
  });

  it('AC5: cross-tenant — a PARIWAR_B claim intake naming a PARIWAR_A member does not freeze that member under PARIWAR_A scope', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    const claimStream = randomUUID();
    const INTAKE = new Date('2026-06-01T00:00:00Z');

    // Seed the claim event under PARIWAR_B (superuser, RLS bypassed).
    await seedEventAt(tx, claimStream, PARIWAR_B, 'claim.intake_initiated', 1, INTAKE, { deceased_member_id: mid });

    // Enter PARIWAR_A app scope — events_log RLS filters to pariwar_id = PARIWAR_A.
    await enterAppScope(client, PARIWAR_A);

    const overlay = await getMemberAccountOverlay(tx, mid, new Date('2026-06-10T00:00:00Z'));
    expect(overlay.accountFrozen).toBe(false);
    expect(overlay.frozenSince).toBeNull();
  });
});
