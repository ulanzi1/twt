// Data-export build worker + hygiene vacuum — live-DB integration (Story 3.11, Task 9).
//
// Drives runDataExportBuild + runDataExportVacuum against real Postgres (:5433) with a fake KMS. The
// worker opens its own withPariwarScope tx on the pool (as in production), so seed data is COMMITTED
// and cleaned up by deleting the member (FK cascade sweeps the export). Assertions:
//   · build → the row flips to `ready`, artifact_ciphertext is a `enc:v1:` envelope (NOT a readable
//     ZIP), expires_at = ready_at + 24h, and the artifact decrypts back to a valid ZIP (jszip loads it).
//   · a missing row → the worker returns `failed` (no phantom `ready`).
//   · vacuum → zeroes artifact_ciphertext for a consumed row + flips a past-window row to `expired`.

import { randomUUID } from 'node:crypto';

import { createDb, encryption, withPariwarScope, type CreatedDb } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import JSZip from 'jszip';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  runDataExportBuild,
  runDataExportVacuum,
  type DataExportBuildDeps,
} from '../src/data-export.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

function fakeEncryption(): Pick<DataExportBuildDeps, 'kms' | 'kekRef'> {
  return {
    kms: encryption.createFakeKmsProvider({
      kekBytes: new Uint8Array(32).fill(3),
      hmacKeyBytes: new Uint8Array(32).fill(5),
    }),
    kekRef: { resourceName: 'fake:jobs-test-kek' },
  };
}

describe.skipIf(!hasDatabase)('data-export build + vacuum — live DB (:5433)', () => {
  let pool: pg.Pool;
  let created: CreatedDb;

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
    pool = created.pool;
  });
  afterAll(() => pool.end());

  /** Seed an active member + a `pending` data_exports row (committed). Returns ids. */
  async function seedPendingExport(): Promise<{ memberId: string; pariwarId: string; exportId: string }> {
    const memberId = randomUUID();
    const pariwarId = randomUUID();
    let exportId = '';
    // runDataExportVacuum discovers tenants via `SELECT pariwar_id FROM pariwar_passport`
    // (data-export.ts) — without this row the vacuum sweep never visits this test's
    // pariwarId at all, so its seeded data_exports rows are structurally invisible to it.
    await pool.query(
      `INSERT INTO pariwar_passport
         (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
       VALUES ($1, 'Test Pariwar EN', 'परीक्षण परिवार', 'Test Welfare Trust', $2, 'en')
       ON CONFLICT (pariwar_id) DO NOTHING`,
      [pariwarId, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' })],
    );
    await withPariwarScope(pool, pariwarId, async (_tx, client) => {
      await client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 4)`,
        [memberId, pariwarId],
      );
      const res = await client.query<{ export_id: string }>(
        `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at)
         VALUES ($1, $2, 'pending', now()) RETURNING export_id`,
        [memberId, pariwarId],
      );
      exportId = res.rows[0]!.export_id;
    });
    return { memberId, pariwarId, exportId };
  }

  async function cleanup(memberId: string): Promise<void> {
    await pool.query(`DELETE FROM members WHERE member_id = $1`, [memberId]);
  }

  async function row(exportId: string): Promise<{
    status: string;
    artifact_ciphertext: string | null;
    ready_at: Date | null;
    expires_at: Date | null;
    artifact_bytes: number | null;
  }> {
    const r = await pool.query(
      `SELECT status, artifact_ciphertext, ready_at, expires_at, artifact_bytes FROM data_exports WHERE export_id = $1`,
      [exportId],
    );
    return r.rows[0];
  }

  it('build: flips row to ready, envelope-encrypts the ZIP, expires_at = ready_at + 24h', async () => {
    const enc = fakeEncryption();
    const { memberId, pariwarId, exportId } = await seedPendingExport();
    try {
      const now = new Date('2026-07-02T09:00:00Z');
      const envelope: JobEnvelope<{ exportId: string }> = {
        requestId: randomUUID(),
        pariwarId,
        actorId: memberId,
        traceId: randomUUID(),
        payload: { exportId },
      };
      const result = await runDataExportBuild({ pool, ...enc, now: () => now }, envelope);
      expect(result.status).toBe('ready');

      const r = await row(exportId);
      expect(r.status).toBe('ready');
      expect(r.artifact_ciphertext).toMatch(/^enc:v1:/); // ciphertext at rest, NOT a readable ZIP
      expect(r.ready_at?.toISOString()).toBe(now.toISOString());
      expect(r.expires_at?.toISOString()).toBe(new Date(now.getTime() + 86_400_000).toISOString());
      expect(r.artifact_bytes).toBeGreaterThan(0);

      // Decrypt the artifact back to a valid ZIP that contains all eight files.
      const ct = encryption.parseEnvelope(r.artifact_ciphertext!);
      const bytes = await encryption.decryptTier1(
        ct,
        { pariwarId, fieldClass: 'data_export' },
        enc.kms,
        enc.kekRef,
      );
      const zip = await JSZip.loadAsync(Buffer.from(bytes));
      expect(Object.keys(zip.files).sort()).toEqual([
        'audit_history.json',
        'claim_history.json',
        'consent_records.json',
        'contribution_history.json',
        'event_stream.json',
        'manifest.json',
        'payment_receipts.json',
        'profile.json',
      ]);
    } finally {
      await cleanup(memberId);
    }
  });

  it('build: a missing row → failed (no phantom ready)', async () => {
    const enc = fakeEncryption();
    const { memberId, pariwarId } = await seedPendingExport();
    try {
      const envelope: JobEnvelope<{ exportId: string }> = {
        requestId: randomUUID(),
        pariwarId,
        actorId: memberId,
        traceId: randomUUID(),
        payload: { exportId: randomUUID() }, // no such row
      };
      const result = await runDataExportBuild({ pool, ...enc }, envelope);
      expect(result.status).toBe('failed');
    } finally {
      await cleanup(memberId);
    }
  });

  it('vacuum: zeroes a consumed artifact + flips a past-window row to expired', async () => {
    const { memberId, pariwarId, exportId } = await seedPendingExport();
    try {
      const vacuumNow = new Date('2026-07-02T12:00:00Z');
      const past = new Date(vacuumNow.getTime() - 3_600_000); // 1 hour before vacuumNow
      // A consumed, ready row that still holds ciphertext → should be zeroed.
      await pool.query(
        `UPDATE data_exports SET status='ready', artifact_ciphertext='enc:v1:xxx', ready_at=now(),
           expires_at=now() + interval '24 hours', consumed_at=now() WHERE export_id=$1`,
        [exportId],
      );
      // A second, past-window unconsumed row → should flip to expired + be zeroed.
      let expiredId = '';
      await withPariwarScope(pool, pariwarId, async (_tx, client) => {
        const r = await client.query<{ export_id: string }>(
          `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at, ready_at, expires_at, artifact_ciphertext)
           VALUES ($1, $2, 'ready', now(), now(), $3, 'enc:v1:yyy') RETURNING export_id`,
          [memberId, pariwarId, past.toISOString()],
        );
        expiredId = r.rows[0]!.export_id;
      });

      const res = await runDataExportVacuum({ pool, now: () => vacuumNow });
      expect(res.zeroed).toBeGreaterThanOrEqual(2);

      expect((await row(exportId)).artifact_ciphertext).toBeNull();
      const expired = await row(expiredId);
      expect(expired.status).toBe('expired');
      expect(expired.artifact_ciphertext).toBeNull();
    } finally {
      await cleanup(memberId);
    }
  });
  // Live-DB suite timeout: these tests run several sequential live-DB round-trips (setup +
  // build/vacuum + row assertions) against a shared :5433 container; under concurrent `turbo`/
  // `ci:local` load they can exceed the 5s vitest default. 20s removes the contention flake without
  // masking a real hang (see apps/jobs/tests/audit/integrity-check.test.ts precedent).
}, { timeout: 20000 });
