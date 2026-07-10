// Ground inspection — live-DB integration (Story 6.7, Task 7; AC1–AC6).
//
// Drives the domain writers (schedule/reschedule/findings/photo/complete/refusal) + the read
// accessor against real Postgres under PARIWAR_A scope, inside the per-test BEGIN/ROLLBACK
// (nothing persists). Asserts MEMBERSHIP / explicit values, never DROP SCHEMA; per
// [[project_live_db_test_gotchas]]. The PII columns hold caller-supplied ciphertext (the route
// encrypts before insert — here we pass opaque `enc:…` markers and assert they store as-is).

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';

/** UUID actor ids — `events_log.actor_id` is a uuid column (the projector writes the acting actor
 *  there), and the inspector-identity guard compares acting actor === inspector, so both are UUIDs. */
const INSPECTOR = '99999999-9999-9999-9999-999999999999';
const ADMIN = '88888888-8888-8888-8888-888888888888';
import {
  GroundInspectionClaimNotInVerificationError,
  GroundInspectionDistrictImmutableError,
  GroundInspectionIdempotencyMismatchError,
  GroundInspectionNotActiveError,
  GroundInspectionPhotoLimitError,
  GroundInspectionPhotoRequiredError,
  GroundInspectionRefusalReasonError,
  MAX_GROUND_INSPECTION_PHOTOS,
  addGroundInspectionPhoto,
  completeGroundInspection,
  getClaimGroundInspection,
  projectClaimState,
  recordGroundInspectionFindings,
  recordGroundInspectionRefusal,
  rescheduleGroundInspection,
  scheduleGroundInspection,
} from '../../../src/claim/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

/** Drive a fresh claim to `verification_in_progress` via the real projector (so replay is correct). */
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

const scheduleInput = (claimCaseId: ClaimId, over: Record<string, unknown> = {}) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  district: 'Patna',
  inspectionStage: 'initial' as const,
  inspectionSiteType: 'family_residence' as const,
  inspectorActorId: INSPECTOR,
  scheduledAt: new Date('2026-07-10T12:00:00Z'),
  locationCiphertext: 'enc:v1:location',
  familyContactCiphertext: 'enc:v1:contact',
  notesCiphertext: null,
  scheduledByActor: ADMIN,
  idempotencyKey: randomUUID(),
  ...over,
});

async function countEvents(tx: ReturnType<typeof getTx>['tx'], streamId: string, eventType: string): Promise<number> {
  const rows = await tx
    .select()
    .from(schema.eventsLog)
    .where(and(eq(schema.eventsLog.streamId, streamId), eq(schema.eventsLog.eventType, eventType)));
  return rows.length;
}

describe.skipIf(!hasDatabase)('ground inspection (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('AC1: schedule persists an assignment (PII ciphertext as-stored) + appends the scheduled event; state stays verification_in_progress', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);

    const { groundInspection, created } = await scheduleGroundInspection(client, scheduleInput(cid));
    expect(created).toBe(true);
    expect(groundInspection.status).toBe('scheduled');
    expect(groundInspection.district).toBe('Patna');
    // PII stored as the ciphertext the caller supplied (never plaintext).
    expect(groundInspection.locationCiphertext).toBe('enc:v1:location');
    expect(groundInspection.familyContactCiphertext).toBe('enc:v1:contact');

    // The scheduled event landed with the enriched id, and the claim stayed in verification.
    expect(await countEvents(tx, cid, 'claim.ground_inspection_scheduled')).toBe(1);
    const claimRow = await tx.select().from(schema.claims).where(eq(schema.claims.claimCaseId, cid));
    expect(claimRow[0]?.currentState).toBe('verification_in_progress');
  });

  it('D3 guard: schedule on a non-verification claim throws + persists NO row and NO event', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    // Only drive to documents_pending (NOT verification).
    await projectClaimState(client, {
      claimCaseId: cid, pariwarId: PARIWAR_A, deceasedMemberId: mid, intakeChannels: ['member_app'], claimantActorId: null,
      eventType: 'claim.intake_initiated',
      payload: { from_state: null, to_state: 'intake_pending', trigger: 't', actor: 'system', deceased_member_id: mid, intake_channel: 'member_app', claimant_actor_id: null },
      actorId: null,
    });

    await expect(scheduleGroundInspection(client, scheduleInput(cid))).rejects.toBeInstanceOf(
      GroundInspectionClaimNotInVerificationError,
    );
    const rows = await tx.select().from(schema.claimGroundInspections).where(eq(schema.claimGroundInspections.claimCaseId, cid));
    expect(rows).toHaveLength(0);
    expect(await countEvents(tx, cid, 'claim.ground_inspection_scheduled')).toBe(0);
  });

  it('schedule idempotency (sequential): same key → SAME assignment, exactly one row + one event; a fresh key → a new assignment', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);

    const key = randomUUID();
    const first = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: key }));
    const replay = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: key }));
    expect(replay.created).toBe(false);
    expect(replay.groundInspection.groundInspectionId).toBe(first.groundInspection.groundInspectionId);
    expect(await countEvents(tx, cid, 'claim.ground_inspection_scheduled')).toBe(1);

    const fresh = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));
    expect(fresh.groundInspection.groundInspectionId).not.toBe(first.groundInspection.groundInspectionId);
    expect(await countEvents(tx, cid, 'claim.ground_inspection_scheduled')).toBe(2);
  });

  it('D5: multiple parallel assignments coexist — SAME district and DIFFERENT district (no active-uniqueness)', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);

    const a = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID(), inspectionSiteType: 'family_residence' }));
    const b = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID(), inspectionSiteType: 'workplace' })); // same district, legal
    const c = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID(), district: 'Vaishali' })); // different district

    const rows = await tx.select().from(schema.claimGroundInspections).where(eq(schema.claimGroundInspections.claimCaseId, cid));
    const ids = rows.map((r) => r.groundInspectionId);
    expect(ids).toEqual(expect.arrayContaining([a.groundInspection.groundInspectionId, b.groundInspection.groundInspectionId, c.groundInspection.groundInspectionId]));
    expect(rows.every((r) => r.status === 'scheduled')).toBe(true);
  });

  it('D5 reschedule: supersedes a SPECIFIC assignment + inserts the replacement with the supersedes back-reference; siblings untouched', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);

    const target = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));
    const sibling = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));

    const replacement = await rescheduleGroundInspection(client, {
      pariwarId: PARIWAR_A,
      groundInspectionId: target.groundInspection.groundInspectionId,
      idempotencyKey: randomUUID(),
      district: 'Patna',
      inspectionStage: 'corroboration',
      inspectionSiteType: 'family_residence',
      inspectorActorId: 'inspector-2', // reassignment is legal
      scheduledAt: new Date('2026-07-11T09:00:00Z'),
      scheduledByActor: ADMIN,
    });

    const rows = await tx.select().from(schema.claimGroundInspections).where(eq(schema.claimGroundInspections.claimCaseId, cid));
    const byId = new Map(rows.map((r) => [r.groundInspectionId, r]));
    expect(byId.get(target.groundInspection.groundInspectionId)?.status).toBe('superseded');
    expect(byId.get(sibling.groundInspection.groundInspectionId)?.status).toBe('scheduled'); // untouched
    const rep = byId.get(replacement.groundInspection.groundInspectionId);
    expect(rep?.status).toBe('scheduled');
    expect(rep?.supersedesGroundInspectionId).toBe(target.groundInspection.groundInspectionId);
    expect(rep?.inspectorActorId).toBe('inspector-2');
  });

  it('terminal immutability: any mutating verb on a superseded/completed assignment throws GroundInspectionNotActiveError', async () => {
    const { client } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);
    const a = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));
    const gid = a.groundInspection.groundInspectionId;

    // Supersede it, then try to record findings on the (now superseded) target.
    await rescheduleGroundInspection(client, {
      pariwarId: PARIWAR_A, groundInspectionId: gid, idempotencyKey: randomUUID(),
      district: 'Patna', inspectionStage: 'initial', inspectionSiteType: 'family_residence',
      inspectorActorId: INSPECTOR, scheduledAt: new Date('2026-07-11T09:00:00Z'), scheduledByActor: ADMIN,
    });
    await expect(
      recordGroundInspectionFindings(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, structuredFindings: { residence_confirmed: 'yes' } }),
    ).rejects.toBeInstanceOf(GroundInspectionNotActiveError);
  });

  it('AC4 mandatory photo: complete with ZERO photos throws + stays scheduled + no completed event; with ≥1 photo → completed + event', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);
    const a = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));
    const gid = a.groundInspection.groundInspectionId;

    await expect(
      completeGroundInspection(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR }),
    ).rejects.toBeInstanceOf(GroundInspectionPhotoRequiredError);
    expect(await countEvents(tx, cid, 'claim.ground_inspection_completed')).toBe(0);

    await addGroundInspectionPhoto(client, {
      pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
      storageObjectKey: 'k1', contentType: 'image/jpeg', byteSize: 100,
    });
    const done = await completeGroundInspection(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR });
    expect(done.groundInspection.status).toBe('completed');
    expect(done.photoCount).toBe(1);
    expect(await countEvents(tx, cid, 'claim.ground_inspection_completed')).toBe(1);
  });

  it('AC3 photo limit: the 21st photo is rejected under the row lock', async () => {
    const { client } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);
    const a = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));
    const gid = a.groundInspection.groundInspectionId;

    for (let i = 0; i < MAX_GROUND_INSPECTION_PHOTOS; i += 1) {
      await addGroundInspectionPhoto(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, storageObjectKey: `k${i}`, contentType: 'image/png', byteSize: 10 });
    }
    await expect(
      addGroundInspectionPhoto(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, storageObjectKey: 'k-over', contentType: 'image/png', byteSize: 10 }),
    ).rejects.toBeInstanceOf(GroundInspectionPhotoLimitError);
  });

  it('AC4a refusal: a valid (disposition, reason) pair + mandatory note sets the disposition, emits NO completed event; a mismatched pair is rejected', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);
    const a = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));
    const gid = a.groundInspection.groundInspectionId;

    // Mismatched pair → rejected (family_refused_photography only pairs with photo_refused).
    await expect(
      recordGroundInspectionRefusal(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, disposition: 'evidence_unavailable', refusalReason: 'family_refused_photography', notesCiphertext: 'enc:v1:note' }),
    ).rejects.toBeInstanceOf(GroundInspectionRefusalReasonError);
    // Missing note → rejected.
    await expect(
      recordGroundInspectionRefusal(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, disposition: 'photo_refused', refusalReason: 'family_refused_photography', notesCiphertext: '' }),
    ).rejects.toBeInstanceOf(GroundInspectionRefusalReasonError);

    const refused = await recordGroundInspectionRefusal(client, {
      pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
      disposition: 'photo_refused', refusalReason: 'family_refused_photography', notesCiphertext: 'enc:v1:note',
    });
    expect(refused.status).toBe('photo_refused');
    expect(refused.refusalReason).toBe('family_refused_photography');
    expect(await countEvents(tx, cid, 'claim.ground_inspection_completed')).toBe(0);
  });

  it('AC5 read accessor: returns assignments + photos (ciphertext/keys as-stored); a claim with no inspection → []', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const emptyCid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);
    const a = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));
    await addGroundInspectionPhoto(client, { pariwarId: PARIWAR_A, groundInspectionId: a.groundInspection.groundInspectionId, actingActorId: INSPECTOR, storageObjectKey: 'photo-key-1', contentType: 'image/jpeg', byteSize: 42, captionCiphertext: 'enc:v1:caption' });

    const read = await getClaimGroundInspection(tx, PARIWAR_A, cid);
    expect(read).toHaveLength(1);
    expect(read[0]?.inspection.locationCiphertext).toBe('enc:v1:location'); // as-stored (not decrypted)
    expect(read[0]?.photos[0]?.storageObjectKey).toBe('photo-key-1'); // as-stored (route mints the signed URL)
    expect(read[0]?.photos[0]?.captionCiphertext).toBe('enc:v1:caption');

    // Absence-is-a-signal: a claim with no inspection reads empty.
    expect(await getClaimGroundInspection(tx, PARIWAR_A, emptyCid)).toEqual([]);
  });

  // ── Review follow-ups (bmad-code-review 2026-07-10): the two new domain guards + the 2a state guard ──

  it('review 1a: a reschedule that changes district throws GroundInspectionDistrictImmutableError; the target stays scheduled, no replacement, no new event', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);
    const target = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));
    const gid = target.groundInspection.groundInspectionId;

    await expect(
      rescheduleGroundInspection(client, {
        pariwarId: PARIWAR_A,
        groundInspectionId: gid,
        idempotencyKey: randomUUID(),
        district: 'Vaishali', // ≠ the target's Patna — a district change is forbidden on reschedule (1a)
        inspectionStage: 'initial',
        inspectionSiteType: 'family_residence',
        inspectorActorId: INSPECTOR,
        scheduledAt: new Date('2026-07-11T09:00:00Z'),
        scheduledByActor: ADMIN,
      }),
    ).rejects.toBeInstanceOf(GroundInspectionDistrictImmutableError);

    // Target untouched (still scheduled, still Patna); no replacement row minted; only the original event.
    const rows = await tx.select().from(schema.claimGroundInspections).where(eq(schema.claimGroundInspections.claimCaseId, cid));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('scheduled');
    expect(rows[0]?.district).toBe('Patna');
    expect(await countEvents(tx, cid, 'claim.ground_inspection_scheduled')).toBe(1);
  });

  it('review #3 (schedule): replaying an Idempotency-Key with a DIFFERENT payload throws GroundInspectionIdempotencyMismatchError; the original is untouched', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);

    const key = randomUUID();
    const first = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: key })); // district Patna
    // Same key, different district → the client reused the key for a genuinely different request.
    await expect(
      scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: key, district: 'Vaishali' })),
    ).rejects.toBeInstanceOf(GroundInspectionIdempotencyMismatchError);

    // No silent no-op, no second row: the original assignment stands unchanged.
    const rows = await tx.select().from(schema.claimGroundInspections).where(eq(schema.claimGroundInspections.claimCaseId, cid));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.groundInspectionId).toBe(first.groundInspection.groundInspectionId);
    expect(rows[0]?.district).toBe('Patna');
  });

  it('review #3 (reschedule): replaying the reschedule key with a DIFFERENT replacement inspector throws GroundInspectionIdempotencyMismatchError', async () => {
    const { client } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);
    const target = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));

    const key = randomUUID();
    const base = {
      pariwarId: PARIWAR_A,
      groundInspectionId: target.groundInspection.groundInspectionId,
      district: 'Patna',
      inspectionStage: 'corroboration' as const,
      inspectionSiteType: 'family_residence' as const,
      scheduledAt: new Date('2026-07-11T09:00:00Z'),
      scheduledByActor: ADMIN,
    };
    const replacement = await rescheduleGroundInspection(client, { ...base, idempotencyKey: key, inspectorActorId: INSPECTOR });
    expect(replacement.created).toBe(true);
    // Same key, different replacement inspector → mismatch (a valid replay must be byte-identical).
    await expect(
      rescheduleGroundInspection(client, { ...base, idempotencyKey: key, inspectorActorId: ADMIN }),
    ).rejects.toBeInstanceOf(GroundInspectionIdempotencyMismatchError);
  });

  it('review 2a: findings + photo on a claim that has LEFT verification_in_progress throw GroundInspectionClaimNotInVerificationError', async () => {
    const { client } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);
    const a = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));
    const gid = a.groundInspection.groundInspectionId;

    // Advance the claim out of verification (assignment row itself is still 'scheduled').
    await projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      deceasedMemberId: mid,
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: 'claim.verifier_reviewing',
      payload: { from_state: 'verification_in_progress', to_state: 'verifier_review', trigger: 'test', actor: 'system' },
      actorId: null,
    });

    // Both evidence-authoring writers now guard the claim state (2a), not just the assignment status.
    await expect(
      recordGroundInspectionFindings(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, structuredFindings: { residence_confirmed: 'yes' } }),
    ).rejects.toBeInstanceOf(GroundInspectionClaimNotInVerificationError);
    await expect(
      addGroundInspectionPhoto(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, storageObjectKey: 'k1', contentType: 'image/jpeg', byteSize: 100 }),
    ).rejects.toBeInstanceOf(GroundInspectionClaimNotInVerificationError);
  });
});
