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
  GroundInspectionCertificateChangedError,
  GroundInspectionClaimNotInVerificationError,
  GroundInspectionDeathDateInFutureError,
  GroundInspectionDeathDateRequiredError,
  GroundInspectionDeathFactsInvalidError,
  GroundInspectionNoCurrentCertificateError,
  GroundInspectionOriginalCertificateRequiredError,
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
import { PARIWAR_A, enterAppScope, seedDeathCertificate } from '../_helpers.js';

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

/**
 * ⭐ Story 6.26a (GI4 / GI5) — a completion's FQ11 record + the family's date, against `uploadId` (the claim's current
 * certificate). The date is a fixed past day (⛔ never after "today" in India time).
 */
const completeInput = (groundInspectionId: string, uploadId: string, over: Record<string, unknown> = {}) => ({
  pariwarId: PARIWAR_A,
  groundInspectionId: groundInspectionId as never,
  actingActorId: INSPECTOR,
  originalCertificateVerdict: 'matches' as const,
  comparedCertificateUploadId: uploadId,
  deathDate: {
    plaintext: '2026-06-01',
    ciphertext: 'enc:v1:death-date',
    index: 'fixture-death-date-index:2026-06-01',
    source: 'family_statement' as const,
  },
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
    // Story 6.26a (GI4) — AMENDED to the new shape: a completion now also needs the original-certificate record
    // against the claim's CURRENT certificate, so the claim gets one and the photo is the original's.
    const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const a = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));
    const gid = a.groundInspection.groundInspectionId;

    await expect(completeGroundInspection(client, completeInput(gid, uploadId))).rejects.toBeInstanceOf(
      GroundInspectionPhotoRequiredError,
    );
    expect(await countEvents(tx, cid, 'claim.ground_inspection_completed')).toBe(0);

    await addGroundInspectionPhoto(client, {
      pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
      storageObjectKey: 'k1', contentType: 'image/jpeg', byteSize: 100, photoKind: 'original_certificate',
    });
    const done = await completeGroundInspection(client, completeInput(gid, uploadId));
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

  it('AC3 photo limit (`-286` H2): a capped assignment still takes ONE original_certificate photo per CURRENT certificate — and ⛔ none with no current certificate', async () => {
    const { client } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);
    const a = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));
    const gid = a.groundInspection.groundInspectionId;

    for (let i = 0; i < MAX_GROUND_INSPECTION_PHOTOS; i += 1) {
      await addGroundInspectionPhoto(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, storageObjectKey: `s${i}`, contentType: 'image/png', byteSize: 10 });
    }
    // ⛔ No current certificate ⇒ ⛔ no reserved slot (a NULL-stamped original never counts — H1).
    await client.query('SAVEPOINT cap_no_cert');
    await expect(
      addGroundInspectionPhoto(client, {
        pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
        storageObjectKey: 'cert-0', contentType: 'image/png', byteSize: 10, photoKind: 'original_certificate',
      }),
    ).rejects.toBeInstanceOf(GroundInspectionPhotoLimitError);
    await client.query('ROLLBACK TO SAVEPOINT cap_no_cert');
    const { uploadId: u1 } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    // The 21st, reserved for the mandatory kind, is accepted...
    const certificatePhoto = await addGroundInspectionPhoto(client, {
      pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
      storageObjectKey: 'cert-1', contentType: 'image/png', byteSize: 10, photoKind: 'original_certificate',
    });
    expect(certificatePhoto.photoKind).toBe('original_certificate');
    expect(certificatePhoto.certificateUploadId).toBe(u1);
    // ...but the reservation is used up: a second original_certificate photo is still over the cap.
    await client.query('SAVEPOINT cap_second');
    await expect(
      addGroundInspectionPhoto(client, {
        pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
        storageObjectKey: 'cert-2', contentType: 'image/png', byteSize: 10, photoKind: 'original_certificate',
      }),
    ).rejects.toBeInstanceOf(GroundInspectionPhotoLimitError);
    await client.query('ROLLBACK TO SAVEPOINT cap_second');
    // The family replaces the certificate ⇒ ONE more slot, for the NEW certificate's original (else the assignment
    // could never complete against it), and then ⛔ another.
    const { uploadId: u2 } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
    const second = await addGroundInspectionPhoto(client, {
      pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
      storageObjectKey: 'cert-3', contentType: 'image/png', byteSize: 10, photoKind: 'original_certificate',
    });
    expect(second.certificateUploadId).toBe(u2);
    await expect(
      addGroundInspectionPhoto(client, {
        pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
        storageObjectKey: 'cert-4', contentType: 'image/png', byteSize: 10, photoKind: 'original_certificate',
      }),
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

  it('review 2a: findings + photo on a claim that has LEFT the inspection window (→ `denied`) throw GroundInspectionClaimNotInVerificationError', async () => {
    const { client } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveToVerification(client, cid, mid);
    const a = await scheduleGroundInspection(client, scheduleInput(cid, { idempotencyKey: randomUUID() }));
    const gid = a.groundInspection.groundInspectionId;

    // Advance the claim out of the window (assignment row itself is still 'scheduled').
    // ⚠ AMENDED by Story 6.26a (GI3, `-283` A1): `verifier_review` is now INSIDE the inspection write window (the
    // claim review window), so the claim is driven ON to `denied` — the state this test means by "left".
    for (const [from, to, eventType] of [
      ['verification_in_progress', 'verifier_review', 'claim.verifier_reviewing'],
      ['verifier_review', 'denied', 'claim.verifier_denied'],
    ] as const) {
      await projectClaimState(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        deceasedMemberId: mid,
        intakeChannels: ['member_app'],
        claimantActorId: null,
        eventType,
        payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system' },
        actorId: null,
      });
    }

    // Both evidence-authoring writers now guard the claim state (2a), not just the assignment status.
    await expect(
      recordGroundInspectionFindings(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, structuredFindings: { residence_confirmed: 'yes' } }),
    ).rejects.toBeInstanceOf(GroundInspectionClaimNotInVerificationError);
    await expect(
      addGroundInspectionPhoto(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, storageObjectKey: 'k1', contentType: 'image/jpeg', byteSize: 100 }),
    ).rejects.toBeInstanceOf(GroundInspectionClaimNotInVerificationError);
  });

  // ── Story 6.26a (GI4 / GI5 / GI12; AC4, AC5) — the original certificate and the dates ────────────────────────
  describe('Story 6.26a — the inspector\'s original-certificate record and the date of death', () => {
    /** A claim in verification with a current certificate and ONE scheduled assignment of `stage`. */
    async function scheduled(stage: 'initial' | 'certificate_check' = 'initial', photo: 'original_certificate' | 'site' | null = 'original_certificate') {
      const { client, tx } = getTx();
      const cid = toClaimId(randomUUID());
      await enterAppScope(client, PARIWAR_A);
      await driveToVerification(client, cid, toMemberId(randomUUID()));
      const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
      const gid = (await scheduleGroundInspection(client, scheduleInput(cid, { inspectionStage: stage }))).groundInspection.groundInspectionId;
      if (photo !== null) {
        await addGroundInspectionPhoto(client, {
          pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
          storageObjectKey: `k-${randomUUID()}`, contentType: 'image/jpeg', byteSize: 100, photoKind: photo,
        });
      }
      return { client, tx, cid, gid, uploadId };
    }
    /** Run `fn` in a savepoint and roll it back — a refusal leaves ⛔ nothing. */
    async function refuses(client: ReturnType<typeof getTx>['client'], fn: () => Promise<unknown>, match: (e: unknown) => boolean) {
      await client.query('SAVEPOINT gi_refusal');
      await expect(fn()).rejects.toSatisfy(match);
      await client.query('ROLLBACK TO SAVEPOINT gi_refusal');
    }
    const missing = (what: string) => (e: unknown) => e instanceof GroundInspectionOriginalCertificateRequiredError && e.missing === what;
    const invalid = (what: string) => (e: unknown) => e instanceof GroundInspectionDeathFactsInvalidError && e.detail === what;

    it('GI4 — a photo defaults to `site`; ⛔ no `original_certificate` photo, ⛔ no verdict, ⛔ no compared upload ⇒ refused with the missing item', async () => {
      const site = await scheduled('initial', 'site');
      const [photo] = await site.tx.select().from(schema.claimGroundInspectionPhotos).where(eq(schema.claimGroundInspectionPhotos.groundInspectionId, site.gid));
      expect(photo!.photoKind).toBe('site');
      await refuses(site.client, () => completeGroundInspection(site.client, completeInput(site.gid, site.uploadId)), missing('photo'));
      const s = await scheduled();
      await refuses(s.client, () => completeGroundInspection(s.client, completeInput(s.gid, s.uploadId, { originalCertificateVerdict: null })), missing('verdict'));
      await refuses(s.client, () => completeGroundInspection(s.client, completeInput(s.gid, s.uploadId, { comparedCertificateUploadId: null })), missing('compared_certificate'));
      expect(await countEvents(s.tx, s.cid, 'claim.ground_inspection_completed')).toBe(0);
    });

    it('GI4 — a compared upload that is ⛔ no longer CURRENT ⇒ `certificate_changed`; ⛔ no current upload at all ⇒ `no_current_certificate`', async () => {
      const s = await scheduled();
      // The family replaces the certificate after the inspector opened it: a NEW upload becomes current.
      await seedDeathCertificate(s.client, { pariwarId: PARIWAR_A, claimCaseId: s.cid });
      await refuses(s.client, () => completeGroundInspection(s.client, completeInput(s.gid, s.uploadId)), (e) => e instanceof GroundInspectionCertificateChangedError);

      const { client, tx } = getTx();
      const cid = toClaimId(randomUUID());
      await enterAppScope(client, PARIWAR_A);
      await driveToVerification(client, cid, toMemberId(randomUUID()));
      const gid = (await scheduleGroundInspection(client, scheduleInput(cid))).groundInspection.groundInspectionId;
      await addGroundInspectionPhoto(client, {
        pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
        storageObjectKey: `k-${randomUUID()}`, contentType: 'image/jpeg', byteSize: 100, photoKind: 'original_certificate',
      });
      await refuses(client, () => completeGroundInspection(client, completeInput(gid, randomUUID())), (e) => e instanceof GroundInspectionNoCurrentCertificateError);
      expect(await countEvents(tx, cid, 'claim.ground_inspection_completed')).toBe(0);
    });

    it('⭐ `-286` H1 — an original\'s photo is STAMPED with the current upload; after a replacement the earlier photo ⛔ never counts, a new one does', async () => {
      const s = await scheduled();
      const stamps = async () =>
        (await s.tx.select().from(schema.claimGroundInspectionPhotos).where(eq(schema.claimGroundInspectionPhotos.groundInspectionId, s.gid)))
          .map((p) => ({ kind: p.photoKind, stamp: p.certificateUploadId }));
      await addGroundInspectionPhoto(s.client, {
        pariwarId: PARIWAR_A, groundInspectionId: s.gid, actingActorId: INSPECTOR,
        storageObjectKey: `k-${randomUUID()}`, contentType: 'image/jpeg', byteSize: 100, photoKind: 'site',
      });
      // The original's photo carries the certificate current when it was taken; a site photo carries ⛔ none.
      expect(await stamps()).toEqual(expect.arrayContaining([{ kind: 'original_certificate', stamp: s.uploadId }, { kind: 'site', stamp: null }]));
      // The family replaces the certificate; the inspector re-compares against the NEW one — the old photo ⛔ never counts.
      const { uploadId: u2 } = await seedDeathCertificate(s.client, { pariwarId: PARIWAR_A, claimCaseId: s.cid });
      await refuses(s.client, () => completeGroundInspection(s.client, completeInput(s.gid, u2)), missing('photo'));
      // A photo of the NEW certificate's original ⇒ completes, compared against it.
      await addGroundInspectionPhoto(s.client, {
        pariwarId: PARIWAR_A, groundInspectionId: s.gid, actingActorId: INSPECTOR,
        storageObjectKey: `k-${randomUUID()}`, contentType: 'image/jpeg', byteSize: 100, photoKind: 'original_certificate',
      });
      const done = await completeGroundInspection(s.client, completeInput(s.gid, u2.toUpperCase()));
      expect(done.groundInspection.comparedCertificateUploadId).toBe(u2);
    });

    it('GI5 — ⛔ no date ⇒ `death_date_required`; after the day of completion (India time, the injected clock) ⇒ `death_date_in_future`; an unreal date / a bad time / a source off its stage ⇒ invalid', async () => {
      const s = await scheduled();
      const date = (plaintext: string, source: 'family_statement' | 'original_certificate' = 'family_statement') => ({
        plaintext, ciphertext: 'enc:v1:d', index: `idx:${plaintext}`, source,
      });
      await refuses(s.client, () => completeGroundInspection(s.client, completeInput(s.gid, s.uploadId, { deathDate: null })), (e) => e instanceof GroundInspectionDeathDateRequiredError);
      // 2026-06-02T00:30+05:30 is still 2026-06-01 in UTC but ALREADY the 2nd in India: the 2nd is today, the 3rd is not.
      const now = new Date('2026-06-01T19:00:00.000Z');
      await refuses(s.client, () => completeGroundInspection(s.client, completeInput(s.gid, s.uploadId, { deathDate: date('2026-06-03'), now })), (e) => e instanceof GroundInspectionDeathDateInFutureError);
      await refuses(s.client, () => completeGroundInspection(s.client, completeInput(s.gid, s.uploadId, { deathDate: date('2026-02-30') })), invalid('invalid_date'));
      await refuses(s.client, () => completeGroundInspection(s.client, completeInput(s.gid, s.uploadId, { deathTime: { plaintext: '24:00', ciphertext: 'enc:v1:t' } })), invalid('invalid_time'));
      await refuses(s.client, () => completeGroundInspection(s.client, completeInput(s.gid, s.uploadId, { deathDate: date('2026-05-01', 'original_certificate') })), invalid('source_mismatch'));
      // The India-time "today" is admitted.
      const done = await completeGroundInspection(s.client, completeInput(s.gid, s.uploadId, { deathDate: date('2026-06-02'), now }));
      expect(done.groundInspection.status).toBe('completed');
      // Review 2026-10-07: `completedAt` shares the SAME clock the future-date check just validated against —
      // never the real wall clock when the caller injects one.
      expect(done.groundInspection.completedAt?.toISOString()).toBe(now.toISOString());
    });

    it('AC5 — the dates are stored ONLY as ciphertext + index (⛔ no plaintext date in any column); the time is optional; the photo counts are returned', async () => {
      const s = await scheduled();
      const done = await completeGroundInspection(
        s.client,
        completeInput(s.gid, s.uploadId, { deathTime: { plaintext: '14:30', ciphertext: 'enc:v1:time' } }),
      );
      expect(done).toMatchObject({ photoCount: 1, originalCertificatePhotoCount: 1 });
      const { rows } = await s.client.query<Record<string, unknown>>('SELECT * FROM claim_ground_inspections WHERE ground_inspection_id = $1', [s.gid]);
      const row = rows[0]!;
      expect(row).toMatchObject({
        status: 'completed',
        original_certificate_verdict: 'matches',
        compared_certificate_upload_id: s.uploadId,
        death_date_ciphertext: 'enc:v1:death-date',
        death_time_ciphertext: 'enc:v1:time',
        death_date_source: 'family_statement',
        death_date_index: 'fixture-death-date-index:2026-06-01',
      });
      for (const [col, v] of Object.entries(row)) {
        expect(String(v), col).not.toContain('2026-06-01T');
        if (col !== 'death_date_index') expect(String(v), col).not.toBe('2026-06-01');
        expect(String(v), col).not.toBe('14:30');
      }
    });

    it('GI12 — a `certificate_check` completes on the original-certificate record + the PRINTED date alone, and REFUSES a time', async () => {
      const s = await scheduled('certificate_check');
      const printed = { plaintext: '2026-05-20', ciphertext: 'enc:v1:printed', index: 'idx:2026-05-20', source: 'original_certificate' as const };
      await refuses(
        s.client,
        () => completeGroundInspection(s.client, completeInput(s.gid, s.uploadId, { deathDate: printed, deathTime: { plaintext: '10:00', ciphertext: 'enc:v1:t' } })),
        invalid('time_not_allowed'),
      );
      const done = await completeGroundInspection(s.client, completeInput(s.gid, s.uploadId, { deathDate: printed }));
      expect(done.groundInspection).toMatchObject({ status: 'completed', deathDateSource: 'original_certificate', deathTimeCiphertext: null });
    });

    it('GI4 — `original_certificate_not_produced` records as an `evidence_unavailable` refusal with its mandatory note (⛔ never with `photo_refused`)', async () => {
      const s = await scheduled();
      await refuses(
        s.client,
        () => recordGroundInspectionRefusal(s.client, {
          pariwarId: PARIWAR_A, groundInspectionId: s.gid, actingActorId: INSPECTOR,
          disposition: 'photo_refused', refusalReason: 'original_certificate_not_produced', notesCiphertext: 'enc:v1:n',
        }),
        (e) => e instanceof GroundInspectionRefusalReasonError,
      );
      const row = await recordGroundInspectionRefusal(s.client, {
        pariwarId: PARIWAR_A, groundInspectionId: s.gid, actingActorId: INSPECTOR,
        disposition: 'evidence_unavailable', refusalReason: 'original_certificate_not_produced', notesCiphertext: 'enc:v1:not-produced',
      });
      expect(row).toMatchObject({ status: 'evidence_unavailable', refusalReason: 'original_certificate_not_produced' });
    });
  });

  // ── Story 6.26a (GI3, `-283` A1 / A5; AC3) — the WINDOW ───────────────────────────────────────────────────────
  describe('Story 6.26a — the inspection write window (`CLAIM_REVIEW_WINDOW_STATES` + `state_trustee_approved` while R9-routed)', () => {
    /** Drive a claim FROM `verification_in_progress` to `target` through REAL events (the projector replays the stream,
     *  so a forced `current_state` would be rewritten by the next event). */
    const PATHS: Record<string, [string, string, string, Record<string, unknown>?][]> = {
      verifier_review: [['verification_in_progress', 'verifier_review', 'claim.verifier_reviewing']],
      verifier_approved: [
        ['verification_in_progress', 'verifier_review', 'claim.verifier_reviewing'],
        ['verifier_review', 'verifier_approved', 'claim.verifier_approved'],
      ],
      denied: [
        ['verification_in_progress', 'verifier_review', 'claim.verifier_reviewing'],
        ['verifier_review', 'denied', 'claim.verifier_denied'],
      ],
    };
    PATHS['appeal_stage_1'] = [...PATHS['denied']!, ['denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated']];
    PATHS['reversed'] = [...PATHS['appeal_stage_1']!, ['appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' }]];
    PATHS['state_trustee_freeze'] = [...PATHS['verifier_approved']!, ['verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen']];
    PATHS['state_trustee_approved'] = [
      ...PATHS['state_trustee_freeze']!,
      ['state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved'],
    ];
    PATHS['approved'] = [...PATHS['state_trustee_approved']!, ['state_trustee_approved', 'approved', 'claim.approved']];
    async function driveTo(client: ReturnType<typeof getTx>['client'], cid: ClaimId, mid: MemberId, target: string) {
      for (const [from, to, eventType, extra] of target === 'settled'
        ? [...PATHS['approved']!, ['approved', 'settled', 'claim.settled', { deceased_member_id: mid }] as const]
        : PATHS[target]!) {
        await projectClaimState(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          deceasedMemberId: mid,
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...(extra ?? {}) } as never,
          actorId: null,
        });
      }
    }
    async function routeToR9Raw(client: ReturnType<typeof getTx>['client'], cid: string) {
      await client.query(
        `INSERT INTO claim_state_trustee_decisions (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
         VALUES ($1, $2, 'routing', 'routed_to_r9', 'r9_special_case', $3, 'Pariwar Admin')`,
        [cid, PARIWAR_A, ADMIN],
      );
    }

    it('every writer REFUSES in `denied`, `appeal_stage_1`, `state_trustee_approved` (⛔ R9-routed), `approved` and `settled` — the KEPT error', async () => {
      for (const state of ['denied', 'appeal_stage_1', 'state_trustee_approved', 'approved', 'settled']) {
        const { client } = getTx();
        const cid = toClaimId(randomUUID());
        const mid = toMemberId(randomUUID());
        await enterAppScope(client, PARIWAR_A);
        await driveToVerification(client, cid, mid);
        const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
        const gid = (await scheduleGroundInspection(client, scheduleInput(cid))).groundInspection.groundInspectionId;
        await driveTo(client, cid, mid, state);
        const notInWindow = (e: unknown) => e instanceof GroundInspectionClaimNotInVerificationError && e.currentState === state;
        const attempts: [string, () => Promise<unknown>][] = [
          ['schedule', () => scheduleGroundInspection(client, scheduleInput(cid))],
          ['reschedule', () => rescheduleGroundInspection(client, { ...scheduleInput(cid), groundInspectionId: gid })],
          ['findings', () => recordGroundInspectionFindings(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, structuredFindings: { residence_confirmed: 'yes' } })],
          ['photo', () => addGroundInspectionPhoto(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, storageObjectKey: 'k', contentType: 'image/jpeg', byteSize: 1 })],
          ['complete', () => completeGroundInspection(client, completeInput(gid, uploadId))],
          ['refusal', () => recordGroundInspectionRefusal(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, disposition: 'photo_refused', refusalReason: 'family_refused_photography', notesCiphertext: 'enc:v1:n' })],
        ];
        for (const [name, attempt] of attempts) {
          await client.query('SAVEPOINT window_refusal');
          await expect(attempt(), `${name} in ${state}`).rejects.toSatisfy(notInWindow);
          await client.query('ROLLBACK TO SAVEPOINT window_refusal');
        }
      }
    });

    it('every window state ADMITS the writers, and the events carry `from_state === to_state ===` the claim\'s ACTUAL state', async () => {
      for (const state of ['verifier_review', 'verifier_approved', 'reversed', 'state_trustee_freeze', 'state_trustee_approved']) {
        const { client, tx } = getTx();
        const cid = toClaimId(randomUUID());
        const mid = toMemberId(randomUUID());
        await enterAppScope(client, PARIWAR_A);
        await driveToVerification(client, cid, mid);
        const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId: cid });
        await driveTo(client, cid, mid, state);
        // `state_trustee_approved` is admitted ONLY while the claim carries a live `routed_to_r9` routing row.
        if (state === 'state_trustee_approved') await routeToR9Raw(client, cid);
        const first = (await scheduleGroundInspection(client, scheduleInput(cid))).groundInspection.groundInspectionId;
        const { groundInspection } = await rescheduleGroundInspection(client, { ...scheduleInput(cid), groundInspectionId: first });
        const gid = groundInspection.groundInspectionId;
        await recordGroundInspectionFindings(client, { pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR, structuredFindings: { residence_confirmed: 'yes' } });
        await addGroundInspectionPhoto(client, {
          pariwarId: PARIWAR_A, groundInspectionId: gid, actingActorId: INSPECTOR,
          storageObjectKey: `k-${randomUUID()}`, contentType: 'image/jpeg', byteSize: 100, photoKind: 'original_certificate',
        });
        await completeGroundInspection(client, completeInput(gid, uploadId));
        const events = await tx
          .select()
          .from(schema.eventsLog)
          .where(eq(schema.eventsLog.streamId, cid));
        const gi = events.filter((e) => e.eventType.startsWith('claim.ground_inspection_'));
        expect(gi.map((e) => e.eventType), state).toEqual([
          'claim.ground_inspection_scheduled',
          'claim.ground_inspection_scheduled',
          'claim.ground_inspection_completed',
        ]);
        for (const e of gi) expect(e.payload, state).toMatchObject({ from_state: state, to_state: state });
        const [claimRow] = await tx.select().from(schema.claims).where(eq(schema.claims.claimCaseId, cid));
        expect(claimRow!.currentState).toBe(state); // identity — the state never moves
      }
    });

    it('`state_trustee_approved` WITHOUT a live routing row is refused — and a SUPERSEDED routing row is ⛔ live', async () => {
      const { client } = getTx();
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await enterAppScope(client, PARIWAR_A);
      await driveToVerification(client, cid, mid);
      await driveTo(client, cid, mid, 'state_trustee_approved');
      await routeToR9Raw(client, cid);
      await client.query(`UPDATE claim_state_trustee_decisions SET superseded_at = now() WHERE claim_case_id = $1`, [cid]);
      await expect(scheduleGroundInspection(client, scheduleInput(cid))).rejects.toBeInstanceOf(GroundInspectionClaimNotInVerificationError);
    });
  });
});