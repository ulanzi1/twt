// Reports-export build worker + hygiene vacuum — live-DB integration (Story 10.7, AC2/AC3/AC5/AC6).
//
// Drives runReportExportBuild + runReportExportVacuum against real Postgres (:5433) with a fake KMS. The
// worker re-loads the actor's grants + re-resolves scope, assembles the roster scope-respectingly, masks
// (Tier-1 never decrypted), serializes CSV, and envelope-encrypts the artifact. Assertions:
//   · build → the row flips to `ready`; artifact_ciphertext is an `enc:v1:` envelope (NOT readable CSV);
//     row_count = the actor's in-scope members; the artifact decrypts to a CSV containing only the
//     district-scoped member; a `report.generated` audit line carries the export's traceId (membership,
//     not count — the chain self-commits + accumulates, [[project_live_db_test_gotchas]]).
//   · a missing row → the worker returns `failed` (no phantom `ready`).
//   · vacuum → zeroes artifact_ciphertext for a consumed row + flips a past-window row to `expired`.

import { randomUUID } from 'node:crypto';

import { createDb, encryption, withPariwarScope, type CreatedDb } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  runReportExportBuild,
  runReportExportVacuum,
  type ReportExportBuildDeps,
} from '../src/reports-export.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const REPORT_FIELD_CLASS = 'report_export';

function fakeEncryption(): Pick<ReportExportBuildDeps, 'kms' | 'kekRef'> {
  return {
    kms: encryption.createFakeKmsProvider({
      kekBytes: new Uint8Array(32).fill(3),
      hmacKeyBytes: new Uint8Array(32).fill(5),
    }),
    kekRef: { resourceName: 'fake:jobs-test-kek' },
  };
}

describe.skipIf(!hasDatabase)('report-export build + vacuum — live DB (:5433)', () => {
  let pool: pg.Pool;
  let created: CreatedDb;

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
    pool = created.pool;
  });
  afterAll(() => pool.end());

  interface Seed {
    pariwarId: string;
    actorId: string;
    reportExportId: string;
    patnaMemberId: string;
    gayaMemberId: string;
  }

  /** Seed a tenant + a district_admin actor (Patna) + two members (Patna/Gaya) + a pending export. */
  async function seedPendingExport(): Promise<Seed> {
    const pariwarId = randomUUID();
    const actorId = randomUUID();
    const patnaMemberId = randomUUID();
    const gayaMemberId = randomUUID();
    let reportExportId = '';

    await pool.query(
      `INSERT INTO pariwar_passport
         (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
       VALUES ($1, 'Test Pariwar EN', 'परीक्षण परिवार', 'Test Welfare Trust', $2, 'en')
       ON CONFLICT (pariwar_id) DO NOTHING`,
      [pariwarId, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' })],
    );
    // The actor's global users row + a district_admin grant holding member.export_roster @ Patna.
    await pool.query(`INSERT INTO users (id, identity_type, status) VALUES ($1,'admin','active') ON CONFLICT DO NOTHING`, [actorId]);
    await pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
       VALUES ($1, $2, 'district_admin', 'district', 'Patna')`,
      [actorId, pariwarId],
    );
    await withPariwarScope(pool, pariwarId, async (_tx, client) => {
      for (const [mid, district] of [[patnaMemberId, 'Patna'], [gayaMemberId, 'Gaya']] as const) {
        await client.query(
          `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1,$2,'active',4)`,
          [mid, pariwarId],
        );
        await client.query(
          `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement) VALUES ($1,$2,$3,false)`,
          [mid, pariwarId, district],
        );
      }
      const res = await client.query<{ report_export_id: string }>(
        `INSERT INTO report_exports (pariwar_id, requested_by_actor_id, report_type, format, params_hash, status, requested_at)
         VALUES ($1,$2,'member_roster','csv','h1','pending', now()) RETURNING report_export_id`,
        [pariwarId, actorId],
      );
      reportExportId = res.rows[0]!.report_export_id;
    });
    return { pariwarId, actorId, reportExportId, patnaMemberId, gayaMemberId };
  }

  async function cleanup(s: Seed): Promise<void> {
    await pool.query(`DELETE FROM report_exports WHERE pariwar_id = $1`, [s.pariwarId]);
    await pool.query(`DELETE FROM member_postings WHERE pariwar_id = $1`, [s.pariwarId]);
    await pool.query(`DELETE FROM members WHERE pariwar_id = $1`, [s.pariwarId]);
    await pool.query(`DELETE FROM role_grants WHERE user_id = $1`, [s.actorId]);
  }

  async function row(id: string): Promise<{
    status: string;
    artifact_ciphertext: string | null;
    ready_at: Date | null;
    expires_at: Date | null;
    row_count: number | null;
  }> {
    const r = await pool.query(
      `SELECT status, artifact_ciphertext, ready_at, expires_at, row_count FROM report_exports WHERE report_export_id = $1`,
      [id],
    );
    return r.rows[0];
  }

  it('build: scope-respecting + masked + envelope-encrypted → ready, with a traceId-tagged audit line', async () => {
    const deps: ReportExportBuildDeps = { pool, ...fakeEncryption() };
    const s = await seedPendingExport();
    const traceId = `trace-${randomUUID()}`;
    try {
      const envelope: JobEnvelope<{ reportExportId: string }> = {
        requestId: 'req-1',
        pariwarId: s.pariwarId,
        actorId: s.actorId,
        traceId,
        payload: { reportExportId: s.reportExportId },
      };
      const result = await runReportExportBuild(deps, envelope);
      expect(result.status).toBe('ready');

      const r = await row(s.reportExportId);
      expect(r.status).toBe('ready');
      expect(r.ready_at).not.toBeNull();
      expect(r.expires_at).not.toBeNull();
      // A district_admin @ Patna sees ONLY the Patna member (scope-respecting; Gaya excluded).
      expect(r.row_count).toBe(1);
      // The artifact is an envelope, NOT readable CSV at rest.
      expect(r.artifact_ciphertext?.startsWith('enc:v1:')).toBe(true);

      // Decrypt → the CSV contains the Patna member, never the Gaya member (masking + scope).
      const ct = encryption.parseEnvelope(r.artifact_ciphertext!);
      const bytes = await encryption.decryptTier1(
        ct,
        { pariwarId: s.pariwarId, fieldClass: REPORT_FIELD_CLASS },
        deps.kms,
        deps.kekRef,
      );
      const csv = Buffer.from(bytes).toString('utf8');
      expect(csv).toContain(s.patnaMemberId);
      expect(csv).not.toContain(s.gayaMemberId);
      expect(csv).toContain('Patna');
      expect(csv).not.toContain('Gaya');

      // The build audit line carries the export's traceId (membership assertion, not a count).
      const audit = await pool.query<{ action: string }>(
        `SELECT action FROM audit_log_entries WHERE trace_id = $1 AND action = 'report.generated'`,
        [traceId],
      );
      expect(audit.rows.length).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanup(s);
    }
  });

  it('build: a missing row → failed (no phantom ready)', async () => {
    const deps: ReportExportBuildDeps = { pool, ...fakeEncryption() };
    const pariwarId = randomUUID();
    const result = await runReportExportBuild(deps, {
      requestId: 'r',
      pariwarId,
      actorId: randomUUID(),
      traceId: 't',
      payload: { reportExportId: randomUUID() },
    });
    expect(result.status).toBe('failed');
  });

  it('review finding: a pg-boss retry on an already-terminal row is reported as `skipped`, NOT `failed` (a healthy no-op must not look like a build failure)', async () => {
    const deps: ReportExportBuildDeps = { pool, ...fakeEncryption() };
    const s = await seedPendingExport();
    try {
      // Build it to `ready` once, then re-deliver the SAME job (the pg-boss retry scenario).
      const first = await runReportExportBuild(deps, {
        requestId: 'r',
        pariwarId: s.pariwarId,
        actorId: s.actorId,
        traceId: 't1',
        payload: { reportExportId: s.reportExportId },
      });
      expect(first.status).toBe('ready');

      const retry = await runReportExportBuild(deps, {
        requestId: 'r',
        pariwarId: s.pariwarId,
        actorId: s.actorId,
        traceId: 't2',
        payload: { reportExportId: s.reportExportId },
      });
      expect(retry.status).toBe('skipped');

      // The retry must not have re-run the build or clobbered the ready row.
      expect((await row(s.reportExportId)).status).toBe('ready');
    } finally {
      await cleanup(s);
    }
  });

  it('vacuum: zeroes a consumed row artifact + flips a past-window row to expired', async () => {
    const deps: ReportExportBuildDeps = { pool, ...fakeEncryption() };
    const s = await seedPendingExport();
    try {
      // Build it ready, then mark it consumed → the vacuum must zero its artifact.
      await runReportExportBuild(deps, {
        requestId: 'r',
        pariwarId: s.pariwarId,
        actorId: s.actorId,
        traceId: 't',
        payload: { reportExportId: s.reportExportId },
      });
      await pool.query(`UPDATE report_exports SET status='consumed', consumed_at=now() WHERE report_export_id=$1`, [s.reportExportId]);

      // A second past-window unconsumed ready row → the vacuum flips it to expired.
      let staleId = '';
      await withPariwarScope(pool, s.pariwarId, async (_tx, client) => {
        const res = await client.query<{ report_export_id: string }>(
          `INSERT INTO report_exports (pariwar_id, requested_by_actor_id, report_type, format, params_hash, status, requested_at, ready_at, expires_at, artifact_ciphertext)
           VALUES ($1,$2,'member_roster','csv','h2','ready', now(), now() - interval '25 hours', now() - interval '1 hour', 'enc:v1:stale')
           RETURNING report_export_id`,
          [s.pariwarId, s.actorId],
        );
        staleId = res.rows[0]!.report_export_id;
      });

      const out = await runReportExportVacuum({ pool });
      expect(out.zeroed).toBeGreaterThanOrEqual(1);
      expect(out.expired).toBeGreaterThanOrEqual(1);

      expect((await row(s.reportExportId)).artifact_ciphertext).toBeNull(); // consumed → zeroed
      expect((await row(staleId)).status).toBe('expired'); // past-window → expired
    } finally {
      await cleanup(s);
    }
  });

  it('review finding: the vacuum flips a stale (never-built) pending row to `failed`, freeing the idempotency index', async () => {
    const s = await seedPendingExport();
    try {
      // Simulate the orphan: a `pending` row whose `requested_at` is long past the stale-timeout (a
      // crash between the request handler's INSERT-commit and its enqueueBuild call, or a failed
      // enqueue whose compensating markReportExportFailed also failed).
      await pool.query(
        `UPDATE report_exports SET requested_at = now() - interval '2 hours' WHERE report_export_id = $1`,
        [s.reportExportId],
      );

      const out = await runReportExportVacuum({ pool });
      expect(out.stalePending).toBeGreaterThanOrEqual(1);

      const r = await row(s.reportExportId);
      expect(r.status).toBe('failed');
    } finally {
      await cleanup(s);
    }
  });

});
