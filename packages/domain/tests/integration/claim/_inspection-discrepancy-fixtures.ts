// Story 6.27d — the SHARED domain fixture for the inspector's discrepancy specs (policy + domain).
//
// A PRE-0147 completed row has a NULL source, admitted historically by 0147's NOT VALID CHECK.
// Each connection shadows the public inspection table with a temporary copy of its own fixture row. We drop/re-add
// the CHECK only on that private table. Domain reads and invoker parent-guard triggers resolve this connection-local
// relation, while the public table, its constraints, and all other sessions remain untouched. No shared DDL lock upgrade.
// ON COMMIT DROP plus the caller's rollback removes the historical fixture.
// ⭐ Code review round 2 (R2-5): the guards' unqualified lookup reaches the shadow only through name resolution, so
//   (a) the copy and the rewrite each assert ONE row (an empty shadow would hide every inspection — a vacuous refusal);
//   (b) ONE shadow per transaction (a second CREATE would 42P07, and the shadow hides every OTHER inspection row);
//   (c) `DISCARD PLANS` — a plpgsql plan cached on this pooled connection BEFORE the shadow existed would keep reading the
//       public row (a new relation earlier in the search path never invalidates a cached plan);
//   (d) every leg that relies on the shadow pairs its refusal with `shadowAsCompletedFullVisit` — the SAME guard admitting
//       the same shadow once its source is `family_statement`, proving the refusal came from the source, ⛔ the public row.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';

import { addGroundInspectionPhoto, completeGroundInspection, scheduleGroundInspection } from '../../../src/claim/index.js';
import type { ClaimId, GroundInspectionId, PariwarId } from '../../../src/ids/index.js';
import { currentUploadIdOf, fixtureDeathDateIndex, fixtureInspectionDeathDateCiphertext } from '../_helpers.js';

const COMPLETED_FACTS_CHECK = 'claim_ground_inspections_completed_death_facts_check';

export async function forceLegacyCompletedNullSource(client: pg.PoolClient, pariwarId: string, groundInspectionId: string): Promise<void> {
  const { rows } = await client.query<{ def: string }>(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1 AND conrelid = 'public.claim_ground_inspections'::regclass`,
    [COMPLETED_FACTS_CHECK],
  );
  const def = rows[0]?.def;
  if (!def || !/NOT VALID$/.test(def)) throw new Error(`[forceLegacyCompletedNullSource] unexpected ${COMPLETED_FACTS_CHECK}: ${def}`);
  const active = await client.query<{ r: string | null }>(`SELECT to_regclass('pg_temp.claim_ground_inspections')::text AS r`);
  if (active.rows[0]?.r !== null) throw new Error('[forceLegacyCompletedNullSource] a shadow is already active — ONE historical row per transaction');
  await client.query(`CREATE TEMP TABLE claim_ground_inspections
    (LIKE public.claim_ground_inspections INCLUDING DEFAULTS INCLUDING CONSTRAINTS) ON COMMIT DROP`);
  await client.query(`GRANT SELECT ON pg_temp.claim_ground_inspections TO twt_app`);
  const copied = await client.query(`INSERT INTO pg_temp.claim_ground_inspections
    SELECT * FROM public.claim_ground_inspections WHERE pariwar_id = $1 AND ground_inspection_id = $2`, [pariwarId, groundInspectionId]);
  if (copied.rowCount !== 1) throw new Error(`[forceLegacyCompletedNullSource] copied ${copied.rowCount} rows, expected 1`);
  await client.query(`ALTER TABLE pg_temp.claim_ground_inspections DROP CONSTRAINT ${COMPLETED_FACTS_CHECK}`);
  const rewritten = await client.query(
    `UPDATE pg_temp.claim_ground_inspections
        SET status = 'completed', completed_at = clock_timestamp(), death_date_source = NULL, death_date_ciphertext = NULL,
            death_date_index = NULL, death_time_ciphertext = NULL, original_certificate_verdict = NULL, compared_certificate_upload_id = NULL
      WHERE pariwar_id = $1 AND ground_inspection_id = $2`,
    [pariwarId, groundInspectionId],
  );
  if (rewritten.rowCount !== 1) throw new Error(`[forceLegacyCompletedNullSource] rewrote ${rewritten.rowCount} rows, expected 1`);
  await client.query(`ALTER TABLE pg_temp.claim_ground_inspections ADD CONSTRAINT ${COMPLETED_FACTS_CHECK} ${def}`);
  await client.query('DISCARD PLANS');
}

/**
 * R2-5 (d) — the POSITIVE CONTROL for a `forceLegacyCompletedNullSource` leg: rewrite the SAME shadow row as a completed
 * FULL visit (`family_statement`, with the 0147 facts its NOT VALID CHECK re-checks on UPDATE). Run as the shadow's owner
 * (the superuser — `RESET ROLE` first). After it, the guards and the domain reads must ADMIT / FIND the assignment.
 */
export async function shadowAsCompletedFullVisit(client: pg.PoolClient, pariwarId: string, groundInspectionId: string): Promise<void> {
  const r = await client.query(
    `UPDATE pg_temp.claim_ground_inspections
        SET death_date_source = 'family_statement', death_date_ciphertext = 'enc:v1:shadow', original_certificate_verdict = 'matches',
            compared_certificate_upload_id = gen_random_uuid()
      WHERE pariwar_id = $1 AND ground_inspection_id = $2 AND status = 'completed'`,
    [pariwarId, groundInspectionId],
  );
  if (r.rowCount !== 1) throw new Error(`[shadowAsCompletedFullVisit] rewrote ${r.rowCount} rows, expected 1`);
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
