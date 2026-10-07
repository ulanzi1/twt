// Migrations 0147 + 0148 — the inspector's original-certificate record, the date / time of death, and the photo's
// certificate stamp: the DB-level backstops ASSERTED DIRECTLY (Story 6.26a; `-282` GI4 / GI5, `2026-10-07-286` H1;
// checklist family 5 — second code review 2026-10-07).
//
// ⚠ ⛔ Never inferred through the writers or the fixtures: each CHECK is refused by ITS OWN name, each FK refuses an
// orphan, and the catalog pins what the migrations chose on purpose — the completed-row CHECK is `NOT VALID` (a
// pre-6.26 completed row is ⛔ never backfilled) and both upload FKs are ON DELETE NO ACTION (a deleted upload must
// ⛔ never silently delete an inspection or its evidence).
//
// Live DB only (`twt-test-pg :5433`); each test runs in its own rolled-back transaction.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedClaim, seedDeathCertificate, seedMember } from '../_helpers.js';

/** A pg error's code, whether surfaced at the top level or wrapped by drizzle under `.cause`. */
function pgCode(err: unknown): string | undefined {
  return (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
}

/** The violated constraint's NAME — a CHECK leg must be refused by ITS check, ⛔ not a neighbour's. */
function pgConstraint(err: unknown): string | undefined {
  return (err as { constraint?: string }).constraint ?? (err as { cause?: { constraint?: string } }).cause?.constraint;
}

/** A claim with a current certificate and one scheduled assignment of each stage (PARIWAR_A scope). */
async function seedInspections() {
  const { tx, client } = getTx();
  const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
  const claimCaseId = await seedClaim(tx, PARIWAR_A, { deceasedMemberId: memberId, currentState: 'verification_in_progress' });
  await enterAppScope(client, PARIWAR_A);
  const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR_A, claimCaseId });
  // A raw row — the constraints are the subject, ⛔ not the writers (which would refuse first).
  const schedule = async (inspectionStage: 'initial' | 'certificate_check') =>
    (
      await client.query<{ id: string }>(
        `INSERT INTO claim_ground_inspections (claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type, inspector_actor_id, scheduled_at)
         VALUES ($1, $2, 'Patna', $3, 'family_residence', $4, now()) RETURNING ground_inspection_id AS id`,
        [claimCaseId, PARIWAR_A, inspectionStage, randomUUID()],
      )
    ).rows[0]!.id;
  return { client, claimCaseId, uploadId, visit: await schedule('initial'), check: await schedule('certificate_check') };
}

/** Run `fn` under a savepoint, roll it back, and return what it threw (or `undefined`). */
async function attempt(client: ReturnType<typeof getTx>['client'], fn: () => Promise<unknown>): Promise<unknown> {
  await client.query('SAVEPOINT gi_backstop');
  const err = await fn().then(
    () => undefined,
    (e: unknown) => e,
  );
  await client.query('ROLLBACK TO SAVEPOINT gi_backstop');
  return err;
}

describe.skipIf(!hasDatabase)('migrations 0147 + 0148 — ground-inspection death facts + photo stamp: DB backstops', { timeout: 20000 }, () => {
  setupLiveDb();

  it('the catalog: the completed-row CHECK is NOT VALID (⛔ never backfilled); every other new constraint is validated; both upload FKs are ON DELETE NO ACTION', async () => {
    const { client } = getTx();
    const rows = await client.query<{ conname: string; convalidated: boolean; confdeltype: string }>(
      `SELECT conname, convalidated, confdeltype::text AS confdeltype FROM pg_constraint WHERE conname = ANY($1)`,
      [
        [
          'claim_ground_inspections_completed_death_facts_check',
          'claim_ground_inspections_death_date_source_stage_check',
          'claim_ground_inspections_death_time_source_check',
          'claim_ground_inspections_compared_certificate_upload_id_fk',
          'claim_ground_inspection_photos_certificate_upload_id_fk',
          'claim_ground_inspection_photos_certificate_stamp_kind_check',
        ],
      ],
    );
    const by = Object.fromEntries(rows.rows.map((r) => [r.conname, r]));
    expect(Object.keys(by)).toHaveLength(6);
    expect(by['claim_ground_inspections_completed_death_facts_check']!.convalidated).toBe(false);
    for (const name of [
      'claim_ground_inspections_death_date_source_stage_check',
      'claim_ground_inspections_death_time_source_check',
      'claim_ground_inspections_compared_certificate_upload_id_fk',
      'claim_ground_inspection_photos_certificate_upload_id_fk',
      'claim_ground_inspection_photos_certificate_stamp_kind_check',
    ]) {
      expect(by[name]!.convalidated, name).toBe(true);
    }
    // 'a' = NO ACTION — ⛔ never CASCADE (a deleted upload would silently delete evidence) and ⛔ never SET NULL.
    expect(by['claim_ground_inspections_compared_certificate_upload_id_fk']!.confdeltype).toBe('a');
    expect(by['claim_ground_inspection_photos_certificate_upload_id_fk']!.confdeltype).toBe('a');
  });

  it('⭐ family 5 — every CHECK refuses by its OWN name (23514), including the NULL-source hole on the time (review 2026-10-07)', async () => {
    const { client, uploadId, visit, check } = await seedInspections();
    const set = (gid: string, assignments: string) => () =>
      client.query(`UPDATE claim_ground_inspections SET ${assignments} WHERE ground_inspection_id = $1`, [gid]);
    const legs: [string, string, () => Promise<unknown>][] = [
      // A completed row with ⛔ no FQ11 record / ⛔ no date — each missing piece on its own.
      ['completed, nothing recorded', 'claim_ground_inspections_completed_death_facts_check', set(visit, `status = 'completed', completed_at = now()`)],
      [
        'completed, ⛔ no verdict',
        'claim_ground_inspections_completed_death_facts_check',
        set(visit, `status = 'completed', completed_at = now(), compared_certificate_upload_id = '${uploadId}', death_date_source = 'family_statement', death_date_ciphertext = 'enc:v1:d'`),
      ],
      [
        'completed, ⛔ no compared upload',
        'claim_ground_inspections_completed_death_facts_check',
        set(visit, `status = 'completed', completed_at = now(), original_certificate_verdict = 'matches', death_date_source = 'family_statement', death_date_ciphertext = 'enc:v1:d'`),
      ],
      [
        'completed, ⛔ no date',
        'claim_ground_inspections_completed_death_facts_check',
        set(visit, `status = 'completed', completed_at = now(), original_certificate_verdict = 'matches', compared_certificate_upload_id = '${uploadId}', death_date_source = 'family_statement'`),
      ],
      // The date's source follows the stage.
      ['a visit with the printed date', 'claim_ground_inspections_death_date_source_stage_check', set(visit, `death_date_source = 'original_certificate'`)],
      ['a certificate check with the family\'s date', 'claim_ground_inspections_death_date_source_stage_check', set(check, `death_date_source = 'family_statement'`)],
      // A time is the family's statement only — and a NULL source ⛔ never lets one through.
      ['a time with a NULL source', 'claim_ground_inspections_death_time_source_check', set(visit, `death_time_ciphertext = 'enc:v1:t'`)],
      ['a time on a certificate check', 'claim_ground_inspections_death_time_source_check', set(check, `death_date_source = 'original_certificate', death_time_ciphertext = 'enc:v1:t'`)],
      // `-286` H1 — a site photo carries ⛔ no certificate stamp.
      [
        'a stamped site photo',
        'claim_ground_inspection_photos_certificate_stamp_kind_check',
        () =>
          client.query(
            `INSERT INTO claim_ground_inspection_photos (ground_inspection_id, pariwar_id, storage_object_key, content_type, byte_size, photo_kind, certificate_upload_id)
             VALUES ($1, $2, $3, 'image/jpeg', 10, 'site', $4)`,
            [visit, PARIWAR_A, `k/${randomUUID()}`, uploadId],
          ),
      ],
    ];
    for (const [label, name, fn] of legs) {
      const err = await attempt(client, fn);
      expect(pgCode(err), label).toBe('23514');
      expect(pgConstraint(err), label).toBe(name);
    }
    // The positive twins pass: a complete visit row, and a stamped original photo.
    expect(
      await attempt(
        client,
        set(visit, `status = 'completed', completed_at = now(), original_certificate_verdict = 'does_not_match', compared_certificate_upload_id = '${uploadId}', death_date_source = 'family_statement', death_date_ciphertext = 'enc:v1:d', death_time_ciphertext = 'enc:v1:t'`),
      ),
    ).toBeUndefined();
    expect(
      await attempt(client, () =>
        client.query(
          `INSERT INTO claim_ground_inspection_photos (ground_inspection_id, pariwar_id, storage_object_key, content_type, byte_size, photo_kind, certificate_upload_id)
           VALUES ($1, $2, $3, 'image/jpeg', 10, 'original_certificate', $4)`,
          [visit, PARIWAR_A, `k/${randomUUID()}`, uploadId],
        ),
      ),
    ).toBeUndefined();
  });

  it('⭐ family 5 — both upload FKs refuse an orphan (23503)', async () => {
    const { client, visit } = await seedInspections();
    const ghost = randomUUID();
    const legs: [string, () => Promise<unknown>][] = [
      ['inspection → compared upload', () => client.query(`UPDATE claim_ground_inspections SET compared_certificate_upload_id = $2 WHERE ground_inspection_id = $1`, [visit, ghost])],
      [
        'photo → certificate stamp',
        () =>
          client.query(
            `INSERT INTO claim_ground_inspection_photos (ground_inspection_id, pariwar_id, storage_object_key, content_type, byte_size, photo_kind, certificate_upload_id)
             VALUES ($1, $2, $3, 'image/jpeg', 10, 'original_certificate', $4)`,
            [visit, PARIWAR_A, `k/${randomUUID()}`, ghost],
          ),
      ],
    ];
    for (const [label, fn] of legs) {
      expect(pgCode(await attempt(client, fn)), label).toBe('23503');
    }
  });
});
