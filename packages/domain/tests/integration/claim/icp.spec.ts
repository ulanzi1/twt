// Intake Convergence Point (ICP) — live-DB integration (Story 6.4, Task 10; AC1/AC3/AC4/AC5/AC7/AC9).
//
// Drives the REAL tryConverge resolution matrix + the merge/override writers + the read accessors
// against Postgres under PARIWAR_A scope, inside the per-test BEGIN/ROLLBACK (nothing persists).
// Asserts MEMBERSHIP / explicit values, never DROP SCHEMA ([[project_live_db_test_gotchas]]).
//
// The single convergence model under test:
//   · lone intake       → mint + intake_initiated + intake_converged (attempt `converged`);
//   · same-channel retry → idempotent no-op (no new attempt, no event);
//   · cross-channel      → attempt `pending`, NO mint/freeze/event, returns existing canonical;
//   · authorized merge   → channel union + attempt `converged`, NO lifecycle event;
//   · authorized override → distinct claim minted + override ledger row + aggregate overlay stays frozen.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import {
  convergeIntakeAttempt,
  getClaimCase,
  getConvergenceCandidate,
  getIntakeAttempt,
  getPendingIntakeAttempts,
  overrideIntakeAttempt,
  tryConverge,
  CONVERGENCE_WINDOW_DAYS,
} from '../../../src/claim/index.js';
import { getMemberAccountOverlay } from '../../../src/member/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClaim } from '../_helpers.js';

const windowStart = (): Date => new Date(Date.now() - CONVERGENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

/** Count events on a claim's stream (tenant-scoped). */
async function streamLen(tx: ReturnType<typeof getTx>['tx'], streamId: string): Promise<number> {
  const rows = await tx
    .select()
    .from(schema.eventsLog)
    .where(eq(schema.eventsLog.streamId, streamId));
  return rows.length;
}

/** Append one overlay-relevant terminal event to a claim stream (app-scoped). */
async function appendEvent(
  tx: ReturnType<typeof getTx>['tx'],
  streamId: string,
  eventType: string,
  version: number,
  deceasedMemberId: string,
): Promise<void> {
  await tx.insert(schema.eventsLog).values({
    streamId,
    eventType,
    payload: { deceased_member_id: deceasedMemberId },
    eventVersion: version,
    actorId: null,
    pariwarId: PARIWAR_A,
  });
}

const base = (mid: ReturnType<typeof toMemberId>, channel: schema.ClaimIntakeChannel, auditId: string) => ({
  pariwarId: PARIWAR_A,
  deceasedMemberId: mid,
  intakeChannel: channel,
  actor: 'member' as const,
  claimantActorId: null,
  trigger: 'test_intake',
  actorId: null,
  auditId,
});

describe.skipIf(!hasDatabase)('ICP tryConverge resolution matrix (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('NO CANDIDATE → mints + intake_initiated + intake_converged; attempt `converged`; freeze fires', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());

    const r = await tryConverge(client, base(mid, 'member_app', 'a1'));
    expect(r.minted).toBe(true);
    expect(r.convergencePending).toBe(false);
    expect(r.state).toBe('intake_converged');
    expect(r.intakeAttemptId).not.toBeNull();

    const claim = await getClaimCase(tx, PARIWAR_A, toClaimId(r.claimCaseId));
    expect(claim?.currentState).toBe('intake_converged');
    expect(claim?.intakeChannels).toEqual(['member_app']);

    // claim.intake_converged appears EXACTLY ONCE; the stream is exactly [initiated, converged].
    const events = await tx
      .select()
      .from(schema.eventsLog)
      .where(eq(schema.eventsLog.streamId, r.claimCaseId));
    expect(events).toHaveLength(2);
    expect(events.filter((e) => e.eventType === 'claim.intake_converged')).toHaveLength(1);

    const attempt = await getIntakeAttempt(tx, PARIWAR_A, r.intakeAttemptId!);
    expect(attempt?.attemptStatus).toBe('converged');
    expect(attempt?.supersededByClaimCaseId).toBe(r.claimCaseId);
    expect(attempt?.resolvedAt).not.toBeNull();

    // /verify: the single account freeze fired (overlay state-agnostic).
    expect((await getMemberAccountOverlay(tx, mid, new Date())).accountFrozen).toBe(true);
  });

  it('SAME-CHANNEL RETRY → idempotent no-op: no new attempt, no event, returns existing canonical', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());

    const r1 = await tryConverge(client, base(mid, 'member_app', 'a1'));
    const r2 = await tryConverge(client, base(mid, 'member_app', 'a2'));

    expect(r2.minted).toBe(false);
    expect(r2.convergencePending).toBe(false);
    expect(r2.claimCaseId).toBe(r1.claimCaseId);
    expect(r2.intakeAttemptId).toBeNull();

    // Exactly ONE attempt row (the mint's converged attempt); no pending double-tap row.
    const attempts = await tx
      .select()
      .from(schema.intakeAttempts)
      .where(eq(schema.intakeAttempts.deceasedMemberId, mid));
    expect(attempts).toHaveLength(1);
    // Stream unchanged (still [initiated, converged]).
    expect(await streamLen(tx, r1.claimCaseId)).toBe(2);
  });

  it('CROSS-CHANNEL → attempt `pending`, NO mint/freeze/event; getPendingIntakeAttempts surfaces both channels', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());

    const r1 = await tryConverge(client, base(mid, 'member_app', 'a1'));
    const r2 = await tryConverge(client, base(mid, 'helpline', 'a2'));

    expect(r2.minted).toBe(false);
    expect(r2.convergencePending).toBe(true);
    expect(r2.claimCaseId).toBe(r1.claimCaseId); // second filer not blocked
    expect(r2.intakeAttemptId).not.toBeNull();

    // Canonical claim UNCHANGED: still [member_app], stream still 2 events (no second freeze/event).
    const claim = await getClaimCase(tx, PARIWAR_A, toClaimId(r1.claimCaseId));
    expect(claim?.intakeChannels).toEqual(['member_app']);
    expect(await streamLen(tx, r1.claimCaseId)).toBe(2);

    const pendingAttempt = await getIntakeAttempt(tx, PARIWAR_A, r2.intakeAttemptId!);
    expect(pendingAttempt?.attemptStatus).toBe('pending');
    expect(pendingAttempt?.intakeChannel).toBe('helpline');
    expect(pendingAttempt?.supersededByClaimCaseId).toBeNull();

    // The strip feed: the pending attempt + its cross-channel candidate claim.
    const pending = await getPendingIntakeAttempts(tx, PARIWAR_A);
    const view = pending.find((p) => String(p.attempt.intakeAttemptId) === String(r2.intakeAttemptId));
    expect(view).toBeDefined();
    expect(view!.attempt.intakeChannel).toBe('helpline');
    expect(
      view!.candidates.some(
        (c) => String(c.claimCaseId) === r1.claimCaseId && c.intakeChannels.includes('member_app'),
      ),
    ).toBe(true);

    // Single freeze survives.
    expect((await getMemberAccountOverlay(tx, mid, new Date())).accountFrozen).toBe(true);

    // A repeat cross-channel intake for the SAME channel dedups to the SAME pending attempt (no dup).
    const r3 = await tryConverge(client, base(mid, 'helpline', 'a3'));
    expect(String(r3.intakeAttemptId)).toBe(String(r2.intakeAttemptId));
    const helplineAttempts = await tx
      .select()
      .from(schema.intakeAttempts)
      .where(
        and(
          eq(schema.intakeAttempts.deceasedMemberId, mid),
          eq(schema.intakeAttempts.intakeChannel, 'helpline'),
        ),
      );
    expect(helplineAttempts).toHaveLength(1);
  });

  it('WINDOW BOUNDARY → a candidate older than 30 days is NOT converged onto (a fresh claim mints)', async () => {
    const { client, tx } = getTx();
    const mid = toMemberId(randomUUID());
    // Seed an old non-terminal claim (as superuser) then age it past the window.
    const oldCid = await seedClaim(tx, PARIWAR_A, {
      deceasedMemberId: String(mid),
      currentState: 'documents_pending',
    });
    // Age it 40 days back (superuser, pre-scope) — a non-state UPDATE the AC3 trigger ignores.
    await client.query(
      "UPDATE claims SET created_at = now() - interval '40 days' WHERE claim_case_id = $1",
      [oldCid],
    );
    await enterAppScope(client, PARIWAR_A);

    const cand = await getConvergenceCandidate(tx, PARIWAR_A, mid, windowStart());
    expect(cand).toBeUndefined(); // aged out of the window

    const r = await tryConverge(client, base(mid, 'helpline', 'a1'));
    expect(r.minted).toBe(true); // no in-window candidate → mints a fresh claim
    expect(r.claimCaseId).not.toBe(oldCid);
  });

  it('MERGE → union the channel + flip attempt `converged`; NO new lifecycle event; idempotent', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());

    const r1 = await tryConverge(client, base(mid, 'member_app', 'a1'));
    const r2 = await tryConverge(client, base(mid, 'helpline', 'a2')); // cross-channel pending

    const merge = await convergeIntakeAttempt(client, {
      intakeAttemptId: r2.intakeAttemptId!,
      pariwarId: PARIWAR_A,
      deceasedMemberId: mid,
      canonicalClaimCaseId: toClaimId(r1.claimCaseId),
      intakeChannel: 'helpline',
      resolvedByActor: randomUUID(),
      auditId: 'm1',
    });
    expect(merge.merged).toBe(true);
    expect([...merge.intakeChannels].sort()).toEqual(['helpline', 'member_app']);

    const claim = await getClaimCase(tx, PARIWAR_A, toClaimId(r1.claimCaseId));
    expect([...(claim?.intakeChannels ?? [])].sort()).toEqual(['helpline', 'member_app']);

    const attempt = await getIntakeAttempt(tx, PARIWAR_A, r2.intakeAttemptId!);
    expect(attempt?.attemptStatus).toBe('converged');
    expect(attempt?.supersededByClaimCaseId).toBe(r1.claimCaseId);

    // The merge appended NO lifecycle event — the claim stream length is unchanged.
    expect(await streamLen(tx, r1.claimCaseId)).toBe(2);
    // Single freeze intact.
    expect((await getMemberAccountOverlay(tx, mid, new Date())).accountFrozen).toBe(true);

    // Idempotent: re-merging an already-converged attempt is a no-op.
    const again = await convergeIntakeAttempt(client, {
      intakeAttemptId: r2.intakeAttemptId!,
      pariwarId: PARIWAR_A,
      deceasedMemberId: mid,
      canonicalClaimCaseId: toClaimId(r1.claimCaseId),
      intakeChannel: 'helpline',
      resolvedByActor: randomUUID(),
      auditId: 'm2',
    });
    expect(again.merged).toBe(false);
  });

  it('OVERRIDE → mints a distinct claim + ledger row; candidate skips the overridden claim; aggregate overlay stays frozen until BOTH terminal', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mid = toMemberId(randomUUID());

    const r1 = await tryConverge(client, base(mid, 'member_app', 'a1'));
    const r2 = await tryConverge(client, base(mid, 'helpline', 'a2')); // cross-channel pending

    const ov = await overrideIntakeAttempt(client, {
      intakeAttemptId: r2.intakeAttemptId!,
      pariwarId: PARIWAR_A,
      deceasedMemberId: mid,
      intakeChannel: 'helpline',
      againstClaimCaseId: toClaimId(r1.claimCaseId),
      reason: 'disputed re-file — distinct claimant',
      actor: 'operator',
      claimantActorId: null,
      decidedByActor: randomUUID(),
      auditId: 'o1',
    });
    expect(ov.newClaimCaseId).not.toBe(r1.claimCaseId);
    expect(ov.state).toBe('intake_converged');

    // The override ledger row (AC4).
    const overrides = await tx
      .select()
      .from(schema.convergenceOverrides)
      .where(eq(schema.convergenceOverrides.deceasedMemberId, mid));
    expect(overrides).toHaveLength(1);
    expect(overrides[0]?.againstClaimCaseId).toBe(r1.claimCaseId);
    expect(overrides[0]?.reason).toContain('disputed re-file');

    // The attempt is `overridden_separate`, superseded by the NEW distinct claim.
    const attempt = await getIntakeAttempt(tx, PARIWAR_A, r2.intakeAttemptId!);
    expect(attempt?.attemptStatus).toBe('overridden_separate');
    expect(attempt?.supersededByClaimCaseId).toBe(ov.newClaimCaseId);

    // TWO distinct canonical claims now exist for the death.
    const claims = await tx
      .select()
      .from(schema.claims)
      .where(eq(schema.claims.deceasedMemberId, mid));
    expect(claims).toHaveLength(2);

    // AC4: a fresh candidate lookup SKIPS the overridden-apart claim (r1) — it resolves to the new one.
    const cand = await getConvergenceCandidate(tx, PARIWAR_A, mid, windowStart());
    expect(cand?.claimCaseId).toBe(ov.newClaimCaseId);

    // ⚠ NORMATIVE: the aggregate overlay stays frozen while ANY claim is non-terminal.
    expect((await getMemberAccountOverlay(tx, mid, new Date())).accountFrozen).toBe(true);

    // Settle r1 ONLY → still frozen (the override claim is still open).
    await appendEvent(tx, r1.claimCaseId, 'claim.settled', 3, String(mid));
    expect((await getMemberAccountOverlay(tx, mid, new Date())).accountFrozen).toBe(true);

    // Terminate the override claim too → NOW the account unfreezes (the LAST claim reached terminal).
    await appendEvent(tx, ov.newClaimCaseId, 'claim.denied_no_appeal', 3, String(mid));
    expect((await getMemberAccountOverlay(tx, mid, new Date())).accountFrozen).toBe(false);
  });
});
