// Shepherd assignment — live-DB integration (Story 6.12, Task 8; AC1/AC2/AC5/AC8/AC9).
//
// Drives the domain writers (assignShepherd / reassignShepherd / resolveShepherdCandidates / getLiveShepherd)
// against real Postgres under PARIWAR_A scope, inside the per-test BEGIN/ROLLBACK (nothing persists).
// Asserts MEMBERSHIP / explicit values, never DROP SCHEMA (per [[project_live_db_test_gotchas]]).
//
// Seeding: users + role_grants are inserted BEFORE enterAppScope (as the Docker superuser test role, RLS
// bypassed, full privileges); the claim is then driven to verification_in_progress via the real projector
// under app scope, and the writers run under app scope (so RLS + the tenant predicate are exercised).

import { randomUUID } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import {
  NoEligibleShepherdError,
  ShepherdAssignmentInvalidClaimStateError,
  ShepherdSelfAssignmentError,
  assignShepherd,
  getLiveShepherd,
  projectClaimState,
  reassignShepherd,
  resolveShepherdCandidates,
} from '../../../src/claim/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClaim } from '../_helpers.js';

const DISTRICT = 'Jaipur';
// Deterministic actor ids — the candidate tiebreak is `users.id ASC`, so ADMIN_A < ADMIN_B.
const ADMIN_A = '1a111111-1111-1111-1111-111111111111';
const ADMIN_B = '2b222222-2222-2222-2222-222222222222';
const ADMIN_NO_NAME = '3c333333-3333-3333-3333-333333333333';
const ADMIN_NO_CONTACT = '4d444444-4444-4444-4444-444444444444';
const ADMIN_OTHER_PARIWAR = '5e555555-5555-5555-5555-555555555555';

interface SeedAdmin {
  id: string;
  displayName: string | null;
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
  pariwarId?: string;
  district?: string;
}

/** Seed a users row + a district_admin role_grant (superuser, pre-scope). */
async function seedAdmin(tx: ReturnType<typeof getTx>['tx'], a: SeedAdmin): Promise<void> {
  await tx.insert(schema.users).values({
    id: a.id as never,
    identityType: 'admin',
    status: 'active',
    displayName: a.displayName,
    contactPhone: a.contactPhone ?? null,
    contactWhatsapp: a.contactWhatsapp ?? null,
  });
  await tx.insert(schema.roleGrants).values({
    userId: a.id as never,
    pariwarId: (a.pariwarId ?? PARIWAR_A) as never,
    role: 'district_admin',
    scopeDimension: 'district',
    scopeValue: a.district ?? DISTRICT,
  });
}

/** Drive a fresh claim to `verification_in_progress` via the real projector. */
async function driveToVerification(
  client: ReturnType<typeof getTx>['client'],
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
): Promise<void> {
  const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    projectClaimState(client, {
      claimCaseId,
      pariwarId: PARIWAR_A,
      deceasedMemberId,
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
      actorId: null,
    });
  await emit(null, 'intake_pending', 'claim.intake_initiated', {
    deceased_member_id: deceasedMemberId,
    intake_channel: 'member_app',
    claimant_actor_id: null,
  });
  await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
  await emit('intake_converged', 'documents_pending', 'claim.documents_received');
  await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
    selected_member_ids: [randomUUID()],
    metric_id: 'district_cohort_v1',
    metric_version: 1,
  });
}

async function liveRows(tx: ReturnType<typeof getTx>['tx'], claimCaseId: ClaimId) {
  return tx
    .select()
    .from(schema.claimShepherdAssignments)
    .where(
      and(
        eq(schema.claimShepherdAssignments.claimCaseId, claimCaseId),
        isNull(schema.claimShepherdAssignments.supersededAt),
      ),
    );
}

async function shepherdEvents(tx: ReturnType<typeof getTx>['tx'], streamId: string) {
  return tx
    .select()
    .from(schema.eventsLog)
    .where(and(eq(schema.eventsLog.streamId, streamId), eq(schema.eventsLog.eventType, 'claim.shepherd_assigned')));
}

describe.skipIf(!hasDatabase)('shepherd assignment (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('AUTO-assigns exactly one live shepherd; the event is an IDENTITY annotation; the row snapshots display+contact', async () => {
    const { client, tx } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const deceasedMemberId = toMemberId(randomUUID());
    await seedAdmin(tx, { id: ADMIN_A, displayName: 'Anita Sharma', contactPhone: '+919000000001', contactWhatsapp: '+919000000002' });
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, claimCaseId, deceasedMemberId);

    const result = await assignShepherd(client, { claimCaseId, pariwarId: PARIWAR_A, district: DISTRICT });
    expect(result.idempotentNoop).toBe(false);
    // Identity — the claim stays verification_in_progress.
    expect(result.claimState).toBe('verification_in_progress');

    const rows = await liveRows(tx, claimCaseId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.shepherdActorId).toBe(ADMIN_A);
    expect(rows[0]!.shepherdDisplay).toBe('Anita Sharma');
    expect(rows[0]!.shepherdContactPhone).toBe('+919000000001');
    expect(rows[0]!.assignmentReason).toBe('initial');

    // PII discipline (AC8): the event carries actor id + district ONLY — never the name/phone/WhatsApp.
    const events = await shepherdEvents(tx, claimCaseId);
    expect(events).toHaveLength(1);
    const payload = events[0]!.payload as Record<string, unknown>;
    expect(payload['shepherd_actor_id']).toBe(ADMIN_A);
    expect(payload['assignment_reason']).toBe('initial');
    expect(payload['supersedes_assignment_id']).toBeNull();
    expect(payload['district']).toBe(DISTRICT);
    expect(JSON.stringify(payload)).not.toContain('Anita');
    expect(JSON.stringify(payload)).not.toContain('+9190000');
  });

  it('workload-balances (least live count) with a deterministic actor-id tiebreak', async () => {
    const { client, tx } = getTx();
    const claim1 = toClaimId(randomUUID());
    const claim2 = toClaimId(randomUUID());
    const m1 = toMemberId(randomUUID());
    const m2 = toMemberId(randomUUID());
    await seedAdmin(tx, { id: ADMIN_A, displayName: 'A', contactPhone: '+919000000001' });
    await seedAdmin(tx, { id: ADMIN_B, displayName: 'B', contactPhone: '+919000000002' });
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, claim1, m1);
    await driveToVerification(client, claim2, m2);

    // claim1: both load 0 → tiebreak actor-id ASC → ADMIN_A.
    const r1 = await assignShepherd(client, { claimCaseId: claim1, pariwarId: PARIWAR_A, district: DISTRICT });
    expect(r1.assignment.shepherdActorId).toBe(ADMIN_A);
    // claim2: ADMIN_A now load 1, ADMIN_B load 0 → least-loaded → ADMIN_B.
    const r2 = await assignShepherd(client, { claimCaseId: claim2, pariwarId: PARIWAR_A, district: DISTRICT });
    expect(r2.assignment.shepherdActorId).toBe(ADMIN_B);
  });

  it('workload EXCLUDES a live assignment whose own claim has reached a terminal state (Review Finding)', async () => {
    const { client, tx } = getTx();
    await seedAdmin(tx, { id: ADMIN_A, displayName: 'A', contactPhone: '+919000000001' });
    await seedAdmin(tx, { id: ADMIN_B, displayName: 'B', contactPhone: '+919000000002' });
    await enterAppScope(client, PARIWAR_A);

    // A SETTLED (terminal) claim, seeded directly (the state guard now blocks a real assignShepherd call
    // against a settled claim — this row simulates one that was assigned BEFORE the claim later settled).
    const settledClaimId = toClaimId(await seedClaim(tx, PARIWAR_A, { currentState: 'settled' }));
    await tx.insert(schema.claimShepherdAssignments).values({
      claimCaseId: settledClaimId,
      pariwarId: PARIWAR_A,
      shepherdActorId: ADMIN_A,
      shepherdDisplay: 'A',
      shepherdContactPhone: '+919000000001',
      assignmentReason: 'initial',
    });

    // ADMIN_A nominally holds ONE live (superseded_at IS NULL) row, but its claim is settled — workload
    // must read 0, not 1, or ADMIN_A would be permanently penalized for a long-closed claim.
    const candidates = await resolveShepherdCandidates(tx, PARIWAR_A, DISTRICT);
    const a = candidates.find((c) => c.shepherdActorId === ADMIN_A);
    const b = candidates.find((c) => c.shepherdActorId === ADMIN_B);
    expect(a?.liveCount).toBe(0);
    expect(b?.liveCount).toBe(0);

    // A NEW claim needing assignment sees both candidates tied at 0 → the deterministic actor-id tiebreak
    // picks ADMIN_A — proving the terminal-claim row never skewed the pick away from ADMIN_A.
    const freshClaimId = toClaimId(randomUUID());
    const freshMemberId = toMemberId(randomUUID());
    await driveToVerification(client, freshClaimId, freshMemberId);
    const result = await assignShepherd(client, { claimCaseId: freshClaimId, pariwarId: PARIWAR_A, district: DISTRICT });
    expect(result.assignment.shepherdActorId).toBe(ADMIN_A);
  });

  it('SKIPS an uncontactable candidate (no name / no channel); a name+one-channel admin IS eligible', async () => {
    const { client, tx } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const m = toMemberId(randomUUID());
    // Nameless + both-channels-null are ineligible; only the WhatsApp-only ADMIN_A is contactable.
    await seedAdmin(tx, { id: ADMIN_NO_NAME, displayName: null, contactPhone: '+919000000009' });
    await seedAdmin(tx, { id: ADMIN_NO_CONTACT, displayName: 'No Contact', contactPhone: null, contactWhatsapp: null });
    await seedAdmin(tx, { id: ADMIN_A, displayName: 'WhatsApp Only', contactPhone: null, contactWhatsapp: '+919000000002' });
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, claimCaseId, m);

    const candidates = await resolveShepherdCandidates(tx, PARIWAR_A, DISTRICT);
    expect(candidates.map((c) => c.shepherdActorId)).toEqual([ADMIN_A]);

    const result = await assignShepherd(client, { claimCaseId, pariwarId: PARIWAR_A, district: DISTRICT });
    expect(result.assignment.shepherdActorId).toBe(ADMIN_A);
    expect(result.assignment.shepherdContactWhatsapp).toBe('+919000000002');
  });

  it('throws NoEligibleShepherdError when the whole in-scope pool is empty/uncontactable', async () => {
    const { client, tx } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const m = toMemberId(randomUUID());
    // Only an admin in ANOTHER Pariwar + an uncontactable in-scope admin.
    await seedAdmin(tx, { id: ADMIN_OTHER_PARIWAR, displayName: 'Elsewhere', contactPhone: '+919000000001', pariwarId: PARIWAR_B });
    await seedAdmin(tx, { id: ADMIN_NO_CONTACT, displayName: 'No Contact', contactPhone: null, contactWhatsapp: null });
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, claimCaseId, m);

    await expect(
      assignShepherd(client, { claimCaseId, pariwarId: PARIWAR_A, district: DISTRICT }),
    ).rejects.toBeInstanceOf(NoEligibleShepherdError);
    expect(await liveRows(tx, claimCaseId)).toHaveLength(0);
  });

  it('a cross-Pariwar district_admin is NEVER chosen (RLS + explicit predicate)', async () => {
    const { client, tx } = getTx();
    await seedAdmin(tx, { id: ADMIN_OTHER_PARIWAR, displayName: 'Elsewhere', contactPhone: '+919000000001', pariwarId: PARIWAR_B });
    await enterAppScope(client, PARIWAR_A);
    const candidates = await resolveShepherdCandidates(tx, PARIWAR_A, DISTRICT);
    expect(candidates).toHaveLength(0);
  });

  it('is idempotent — a redelivered auto-assign is a no-op (one row, one event)', async () => {
    const { client, tx } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const m = toMemberId(randomUUID());
    await seedAdmin(tx, { id: ADMIN_A, displayName: 'Anita', contactPhone: '+919000000001' });
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, claimCaseId, m);

    const first = await assignShepherd(client, { claimCaseId, pariwarId: PARIWAR_A, district: DISTRICT });
    expect(first.idempotentNoop).toBe(false);
    const second = await assignShepherd(client, { claimCaseId, pariwarId: PARIWAR_A, district: DISTRICT });
    expect(second.idempotentNoop).toBe(true);
    expect(await liveRows(tx, claimCaseId)).toHaveLength(1);
    expect(await shepherdEvents(tx, claimCaseId)).toHaveLength(1);
  });

  it('reassigns with atomic supersession + a linked re-emit; the member read follows', async () => {
    const { client, tx } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const m = toMemberId(randomUUID());
    await seedAdmin(tx, { id: ADMIN_A, displayName: 'Anita', contactPhone: '+919000000001' });
    await seedAdmin(tx, { id: ADMIN_B, displayName: 'Bhavna', contactPhone: '+919000000002' });
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, claimCaseId, m);
    const initial = await assignShepherd(client, { claimCaseId, pariwarId: PARIWAR_A, district: DISTRICT });

    const re = await reassignShepherd(client, {
      claimCaseId,
      pariwarId: PARIWAR_A,
      district: DISTRICT,
      targetShepherdActorId: ADMIN_B,
      targetDisplay: 'Bhavna',
      targetContactPhone: '+919000000002',
      targetContactWhatsapp: null,
      assignmentReason: 'reassignment',
      actor: 'operator',
      actorId: ADMIN_A,
    });
    expect(re.previousShepherdActorId).toBe(ADMIN_A);
    expect(re.assignment.supersedesAssignmentId).toBe(initial.assignment.assignmentId);

    // Exactly one live row (ADMIN_B); the prior is superseded but retained.
    const live = await liveRows(tx, claimCaseId);
    expect(live).toHaveLength(1);
    expect(live[0]!.shepherdActorId).toBe(ADMIN_B);

    // The re-emit is the SAME event type carrying the linkage.
    const events = await shepherdEvents(tx, claimCaseId);
    expect(events).toHaveLength(2);
    const rePayload = events[1]!.payload as Record<string, unknown>;
    expect(rePayload['previous_shepherd_actor_id']).toBe(ADMIN_A);
    expect(rePayload['supersedes_assignment_id']).toBe(initial.assignment.assignmentId);
    expect(rePayload['assignment_reason']).toBe('reassignment');

    // The member read surfaces the LIVE shepherd + contact snapshot.
    const shepherd = await getLiveShepherd(tx, PARIWAR_A, claimCaseId);
    expect(shepherd).toMatchObject({ shepherdActorId: ADMIN_B, displayName: 'Bhavna' });
    expect(shepherd!.contact).toEqual({ phone: '+919000000002', whatsapp: null });
  });

  it('rejects an actor-initiated self-assignment (actor === target)', async () => {
    const { client, tx } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const m = toMemberId(randomUUID());
    await seedAdmin(tx, { id: ADMIN_A, displayName: 'Anita', contactPhone: '+919000000001' });
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, claimCaseId, m);
    await assignShepherd(client, { claimCaseId, pariwarId: PARIWAR_A, district: DISTRICT });

    await expect(
      reassignShepherd(client, {
        claimCaseId,
        pariwarId: PARIWAR_A,
        district: DISTRICT,
        targetShepherdActorId: ADMIN_A,
        targetDisplay: 'Anita',
        targetContactPhone: '+919000000001',
        targetContactWhatsapp: null,
        assignmentReason: 'reassignment',
        actor: 'operator',
        actorId: ADMIN_A,
      }),
    ).rejects.toBeInstanceOf(ShepherdSelfAssignmentError);
  });

  it('getLiveShepherd returns null for a claim with no shepherd (pre-verification not_assigned)', async () => {
    const { client, tx } = getTx();
    const claimCaseId = toClaimId(randomUUID());
    const m = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, claimCaseId, m);
    expect(await getLiveShepherd(tx, PARIWAR_A, claimCaseId)).toBeNull();
  });

  it('rejects auto-assign on a PRE-VERIFICATION claim (Review Finding — the state guard)', async () => {
    const { client, tx } = getTx();
    await seedAdmin(tx, { id: ADMIN_A, displayName: 'Anita', contactPhone: '+919000000001' });
    await enterAppScope(client, PARIWAR_A);
    const claimCaseId = toClaimId(await seedClaim(tx, PARIWAR_A, { currentState: 'documents_pending' }));

    await expect(
      assignShepherd(client, { claimCaseId, pariwarId: PARIWAR_A, district: DISTRICT }),
    ).rejects.toThrow(ShepherdAssignmentInvalidClaimStateError);
    expect(await liveRows(tx, claimCaseId)).toHaveLength(0);
  });

  it('rejects reassignment on a SETTLED (terminal) claim (Review Finding — the state guard)', async () => {
    const { client, tx } = getTx();
    await seedAdmin(tx, { id: ADMIN_A, displayName: 'Anita', contactPhone: '+919000000001' });
    await seedAdmin(tx, { id: ADMIN_B, displayName: 'Bhavna', contactPhone: '+919000000002' });
    await enterAppScope(client, PARIWAR_A);
    const claimCaseId = toClaimId(await seedClaim(tx, PARIWAR_A, { currentState: 'settled' }));

    await expect(
      reassignShepherd(client, {
        claimCaseId,
        pariwarId: PARIWAR_A,
        district: DISTRICT,
        targetShepherdActorId: ADMIN_B,
        targetDisplay: 'Bhavna',
        targetContactPhone: '+919000000002',
        targetContactWhatsapp: null,
        assignmentReason: 'reassignment',
        actor: 'operator',
        actorId: ADMIN_A,
      }),
    ).rejects.toThrow(ShepherdAssignmentInvalidClaimStateError);
    expect(await liveRows(tx, claimCaseId)).toHaveLength(0);
  });
});
