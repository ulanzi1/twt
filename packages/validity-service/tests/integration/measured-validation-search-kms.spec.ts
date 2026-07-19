// AI-4-1 — 4.7 admin-search + per-row Tier-1 KMS decryption p95 harness (framework; live DB) (:5433).
//
// Closes AI-4-1's 4.7 + KMS-cost gap (CR-4.6-D2/D3). The existing search bench (`search-projection-bench
// .spec.ts`) seeds NO identity rows, so it measures ONLY the AR-65 page query and NEVER exercises the
// per-row Tier-1 KMS decryption — the dominant ~5s@4L cost. THIS harness seeds a Tier-1 mobile ciphertext
// AND a Tier-1 KYC-name ciphertext per member and measures `searchMembers` (the compound-read-model page)
// PLUS BOTH per-row decrypts — the real admin-search display path's full cost.
//
// D1 resolved (review, 2026-07-17): the measured op replicates `adminMemberSearch`'s (apps/api/src/
// modules/member-validity/handlers.ts) FULL per-row cost — searchMembers + the anonymized-suppression
// branch + BOTH per-row Tier-1 decrypts (mobile via `decryptMobile`, name via `decryptKycField`) + the ONE
// per-search audit write — reimplemented directly over `@twt/domain` primitives (audit.writeAuditEntry,
// encryption.*) rather than importing apps/api's handler closure, which is Fastify-`FastifyRequest`-
// coupled and would invert the `apps/api` → `@twt/validity-service` dependency direction (apps/api already
// depends on @twt/validity-service; the reverse would be a real dependency-graph inversion, not just an
// awkward import). `decryptMobile`/`decryptKycField` are themselves thin wrappers over this same
// `@twt/domain` `encryption` module, so this reproduces the identical KMS operations at the identical
// encryption contexts (see `framework/seed.ts`'s `AdminSearchEncryption`).
//
// D2 resolved (review, 2026-07-17): the adapter is now resolved via `resolveAdminSearchEncryption()`
// (`KMS_TEST_MODE=live` → real Cloud KMS, mirroring `apps/api/src/deps.ts`'s `buildEncryptionDeps`), so a
// `MEASURED_VALIDATION=1` pre-launch run WITH `KMS_TEST_MODE=live` set actually produces a `cloud-kms`-
// labelled number instead of always silently falling back to the fake adapter.

import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { audit, createDb, ids, member as memberDomain, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  buildRecord,
  envInt,
  gitCommit,
  measureP95,
  pgServerVersion,
  recordEvidence,
  type BenchmarkConfig,
} from '@twt/measured-validation';
import {
  resolveAdminSearchEncryption,
  seedSearchMembers,
  type AdminSearchEncryption,
} from '../framework/seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const isPreLaunch = process.env['MEASURED_VALIDATION'] === '1';

const SCALE = envInt('MEASURED_VALIDATION_SCALE', isPreLaunch ? 400_000 : 60);
const ITERATIONS = envInt('MEASURED_VALIDATION_ITERS', isPreLaunch ? 200 : 60);
const CONCURRENCY = envInt('MEASURED_VALIDATION_CONCURRENCY', 8);
const PAGE = 200; // the AR-65 browse page size (MemberSearchRequest limit cap) — recorded as config.n below.
const WARMUP = 10;
/** AR-65 admin-search budget = ~5s@4L (the same loose ceiling the existing search bench uses). */
const BUDGET_MS = 5000;
const COMMITTED_DOC = join(dirname(fileURLToPath(import.meta.url)), '..', 'bench', 'p95-budget.md');

describe.skipIf(!hasDatabase)('AI-4-1 — admin-search + per-row KMS decrypt p95 (framework; live DB) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  let enc: AdminSearchEncryption;
  const pariwarId = ids.pariwarId(randomUUID());
  const scratchDir = mkdtempSync(join(tmpdir(), 'mv-search-kms-'));

  beforeAll(async () => {
    if (!hasDatabase) return;
    const created = createDb(DATABASE_URL!, { ssl: false, max: Math.max(8, CONCURRENCY + 2) });
    db = created.db;
    pool = created.pool;
    enc = resolveAdminSearchEncryption();
    await seedSearchMembers(pool, { scale: SCALE, pariwarId, encryption: enc });
  }, isPreLaunch ? 600_000 : 120_000);

  afterAll(async () => {
    if (!hasDatabase) return;
    // Deleting members cascades member_search_projection + member_identities + member_kyc_profiles (FK
    // ON DELETE CASCADE).
    await pool.query('DELETE FROM members WHERE pariwar_id = $1', [pariwarId]).catch(() => undefined);
    await pool.query('DELETE FROM events_log WHERE pariwar_id = $1', [pariwarId]).catch(() => undefined);
    await pool.end();
    rmSync(scratchDir, { recursive: true, force: true });
  });

  it('sanity: the seeded ciphertext round-trips through the resolved adapter (decrypt CORRECTNESS, not just cost)', async () => {
    const [row] = await memberDomain.searchMembers(db, { pariwarId, criteria: { by: 'pariwar' }, limit: 1, offset: 0 });
    expect(row?.mobileCiphertext).toBeTruthy();
    expect(row?.nameCiphertext).toBeTruthy();
    await expect(enc.decryptMobile(row!.mobileCiphertext!)).resolves.toMatch(/^\+9198\d{8}$/);
    await expect(enc.decryptKycName(row!.nameCiphertext!, pariwarId)).resolves.toMatch(/^Synthetic Member \d+$/);
  });

  it(
    'measures + records the admin-search + per-row KMS decrypt p95 (the ~5s@4L budget)',
    async () => {
      // The measured op replicates adminMemberSearch's FULL per-row cost: the compound-read-model page
      // query, the anonymized-suppression branch (no synthetic member here is anonymized, but the branch
      // itself is exercised on every row, matching the real handler's shape), per-row mobile + KYC-name
      // Tier-1 decrypt (each degrading independently via .catch, mirroring the handler's per-row try/catch
      // so one bad ciphertext never fails the whole page), and the ONE audit write a real search leaves.
      // NOTE: `audit.writeAuditEntry` holds a GLOBAL advisory lock (the hash-chain writer) — this is
      // genuinely part of the production cost of every real search request (production searches contend
      // on the same lock), so it stays IN the measured/timed op rather than being hoisted out for a
      // friendlier number. Smoke-scale ITERATIONS (60) bounds the total serialized lock-hold time.
      const searchAndDecrypt = async (offset: number): Promise<void> => {
        const rows = await memberDomain.searchMembers(db, { pariwarId, criteria: { by: 'pariwar' }, limit: PAGE, offset });
        await Promise.all(
          rows.map(async (r) => {
            const anonymized = r.state === 'anonymized';
            if (!anonymized && r.mobileCiphertext !== null) {
              await enc.decryptMobile(r.mobileCiphertext).catch(() => undefined);
            }
            if (!anonymized && r.nameCiphertext !== null) {
              await enc.decryptKycName(r.nameCiphertext, pariwarId).catch(() => undefined);
            }
          }),
        );
        const criteriaHash = createHash('sha256').update(`pariwar:${pariwarId}`).digest('hex');
        await audit.writeAuditEntry(pool, {
          pariwarId,
          actorId: null,
          actorRole: null,
          action: 'member.search',
          resourceLocator: `pariwar/${pariwarId}/members?by=pariwar&n=${rows.length}`,
          requestPayloadHash: criteriaHash,
          responseStatus: 200,
          traceId: null,
        });
      };

      const pageCount = Math.max(1, Math.ceil(SCALE / PAGE));
      const results = await measureP95((i) => searchAndDecrypt((i % pageCount) * PAGE), {
        iterations: ITERATIONS,
        concurrency: CONCURRENCY,
        warmup: WARMUP,
      });

      const config: BenchmarkConfig = {
        n: PAGE, // the browse page size — the op-shape parameter comparability depends on (review fix).
        m: SCALE,
        concurrency: CONCURRENCY,
        iterations: ITERATIONS,
        warmup: WARMUP,
        // The adapter that ACTUALLY produced this run's decrypt cost (fake by default; `cloud-kms` only
        // when KMS_TEST_MODE=live resolved a real provider) — no longer a hardcoded label (review fix D2).
        cryptoAdapter: enc.cryptoAdapter,
        env: isPreLaunch ? 'pre-launch-4L' : 'ci-local-smoke',
        dbVersion: await pgServerVersion(pool),
      };
      const record = buildRecord({
        metric: 'admin-search-kms-p95',
        config,
        gitCommit: gitCommit(),
        results,
        budgetMs: BUDGET_MS,
        recordedAt: new Date().toISOString(),
      });

      recordEvidence(isPreLaunch ? COMMITTED_DOC : join(scratchDir, 'evidence.md'), record);
      console.log('[AI-4-1 admin-search-kms-p95]', JSON.stringify(record.results), 'adapter=', config.cryptoAdapter, 'scale=', SCALE);

      expect(results.count).toBe(ITERATIONS);
      expect(results.p95).toBeLessThan(BUDGET_MS); // ~5s@4L (fail + remediation note at pre-launch scale)
    },
    isPreLaunch ? 600_000 : 90_000,
  );
});
