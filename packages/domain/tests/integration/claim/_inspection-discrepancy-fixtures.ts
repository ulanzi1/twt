// Story 6.27d — the SHARED domain fixture for the inspector's discrepancy specs (policy + domain).
//
// ⭐ A PRE-0147 COMPLETED ROW (R1). 0147's completed-row CHECK is `NOT VALID` — a completed FULL row written before it
// can carry a NULL `death_date_source` (and ⛔ no family account), but every NEW write is checked, so ⛔ no writer can make
// one. The fixture reproduces history exactly: drop the CHECK, complete the row with a NULL source, re-add the CHECK by its
// OWN catalog definition (`pg_get_constraintdef` — `… NOT VALID`), all in the CALLER's transaction (the superuser role).
// ⚠ The DDL takes an ACCESS EXCLUSIVE lock on `claim_ground_inspections` until the caller's transaction ends — call it
// in a short transaction; `lock_timeout` bounds the wait.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';

import { addGroundInspectionPhoto, completeGroundInspection, scheduleGroundInspection } from '../../../src/claim/index.js';
import type { ClaimId, GroundInspectionId, PariwarId } from '../../../src/ids/index.js';
import { currentUploadIdOf, fixtureDeathDateIndex, fixtureInspectionDeathDateCiphertext } from '../_helpers.js';

const COMPLETED_FACTS_CHECK = 'claim_ground_inspections_completed_death_facts_check';

export async function forceLegacyCompletedNullSource(client: pg.PoolClient, pariwarId: string, groundInspectionId: string): Promise<void> {
  const { rows } = await client.query<{ def: string }>(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1 AND conrelid = 'claim_ground_inspections'::regclass`,
    [COMPLETED_FACTS_CHECK],
  );
  const def = rows[0]?.def;
  if (!def || !/NOT VALID$/.test(def)) throw new Error(`[forceLegacyCompletedNullSource] unexpected ${COMPLETED_FACTS_CHECK}: ${def}`);
  await client.query(`SET LOCAL lock_timeout = '10s'`);
  await client.query(`ALTER TABLE claim_ground_inspections DROP CONSTRAINT ${COMPLETED_FACTS_CHECK}`);
  await client.query(
    `UPDATE claim_ground_inspections
        SET status = 'completed', completed_at = clock_timestamp(), death_date_source = NULL, death_date_ciphertext = NULL,
            death_date_index = NULL, death_time_ciphertext = NULL, original_certificate_verdict = NULL, compared_certificate_upload_id = NULL
      WHERE pariwar_id = $1 AND ground_inspection_id = $2`,
    [pariwarId, groundInspectionId],
  );
  await client.query(`ALTER TABLE claim_ground_inspections ADD CONSTRAINT ${COMPLETED_FACTS_CHECK} ${def}`);
}

/** A family date in the past that every fixture neighbour date is measured against. */
export const FAMILY_DATE = '2026-06-15';

/**
 * In `twt_app` scope, on a claim in the window with a CURRENT certificate: schedule ONE assignment for `inspector`
 * through the REAL writer and add its `original_certificate` photo. Returns the assignment id.
 */
export async function scheduleWithOriginalPhoto(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  opts: { readonly inspector: string; readonly stage?: 'initial' | 'corroboration' | 'certificate_check' },
): Promise<GroundInspectionId> {
  const uploadId = await currentUploadIdOf(client, pariwarId, claimCaseId);
  if (uploadId === null) throw new Error('[scheduleWithOriginalPhoto] the claim has no current certificate');
  const { groundInspection } = await scheduleGroundInspection(client, {
    claimCaseId,
    pariwarId,
    district: 'Patna',
    inspectionStage: opts.stage ?? 'initial',
    inspectionSiteType: 'family_residence',
    inspectorActorId: opts.inspector,
    scheduledAt: new Date('2026-07-10T12:00:00Z'),
    scheduledByActor: opts.inspector,
    idempotencyKey: randomUUID(),
  });
  const gid = groundInspection.groundInspectionId;
  await addGroundInspectionPhoto(client, {
    pariwarId,
    groundInspectionId: gid,
    actingActorId: opts.inspector,
    storageObjectKey: `fixture/ground-inspection/${gid}/original-certificate.jpg`,
    contentType: 'image/jpeg',
    byteSize: 1024,
    photoKind: 'original_certificate',
    comparedCertificateUploadId: uploadId,
  });
  return gid;
}

/** In `twt_app` scope: complete `gid` through the REAL writer — the family's `date` on a full visit, the printed date on
 *  a `certificate_check` — indexed with the fixture's ONE index function (6.27b Trap 3). */
export async function completeWithDate(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  gid: GroundInspectionId,
  opts: { readonly actor: string; readonly date?: string; readonly certificateCheck?: boolean; readonly override?: boolean },
) {
  const date = opts.date ?? FAMILY_DATE;
  const uploadId = (await currentUploadIdOf(client, pariwarId, claimCaseId))!;
  return completeGroundInspection(client, {
    pariwarId,
    groundInspectionId: gid,
    actingActorId: opts.actor,
    ...(opts.override ? { override: { byActorId: opts.actor } } : {}),
    originalCertificateVerdict: 'matches',
    comparedCertificateUploadId: uploadId,
    deathDate: {
      plaintext: date,
      ciphertext: fixtureInspectionDeathDateCiphertext(date),
      index: fixtureDeathDateIndex(date),
      source: opts.certificateCheck ? 'original_certificate' : 'family_statement',
    },
  });
}
