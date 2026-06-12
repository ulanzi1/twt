// Off-site audit-log mirror tests — Story 1.10 Task 10.3 (AC-3).
//
// Pure unit tests cover the fakes + env resolution. The live-DB integration test
// (skipped without DATABASE_URL) writes audit rows via @twt/domain.writeAuditEntry
// then mirrors them, asserting watermark advance, seq-encoded append-only object
// naming, and idempotent re-push. Assertions key on OUR rows (by audit_id /
// seq), never on absolute global-chain counts, so a concurrent writer (e.g. the
// domain suite under `turbo run test`) cannot make them flaky.

import { createHash, randomUUID } from 'node:crypto';

import { audit } from '@twt/domain';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createInMemoryMirrorTarget,
  createInMemoryWatermarkStore,
  pushNewAuditLinesToMirror,
  resolveMirrorTargetFromEnv,
} from '../../src/audit/mirror.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

describe('in-memory MirrorTarget (Object Retention Lock semantics)', () => {
  it('stores an object and rejects overwriting the same name', async () => {
    const target = createInMemoryMirrorTarget();
    await target.putObject('audit/segment-1.jsonl', Buffer.from('a'));
    expect(target.objects.has('audit/segment-1.jsonl')).toBe(true);
    await expect(target.putObject('audit/segment-1.jsonl', Buffer.from('b'))).rejects.toThrow(
      /overwrite/i,
    );
  });
});

describe('in-memory WatermarkStore', () => {
  it('reads the initial value and advances', async () => {
    const wm = createInMemoryWatermarkStore(5);
    expect(await wm.getLastMirroredSeq()).toBe(5);
    await wm.setLastMirroredSeq(42);
    expect(await wm.getLastMirroredSeq()).toBe(42);
  });
});

describe('resolveMirrorTargetFromEnv', () => {
  const prior = process.env['MIRROR_MODE'];
  afterAll(() => {
    if (prior === undefined) delete process.env['MIRROR_MODE'];
    else process.env['MIRROR_MODE'] = prior;
  });

  it('fake mode yields a working in-memory target', async () => {
    process.env['MIRROR_MODE'] = 'fake';
    const target = await resolveMirrorTargetFromEnv();
    await expect(target.putObject('x', Buffer.from('y'))).resolves.toBeUndefined();
  });

  it('rejects an unknown MIRROR_MODE', async () => {
    process.env['MIRROR_MODE'] = 'bogus';
    await expect(resolveMirrorTargetFromEnv()).rejects.toThrow(/MIRROR_MODE/);
  });
});

describe.skipIf(!hasDatabase)('pushNewAuditLinesToMirror (live DB)', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, ssl: false });
    pool.on('error', (err) => console.error('[mirror-test pool]', err.message));
  });
  afterAll(() => pool.end());

  it('mirrors our new rows into one append-only object, advances the watermark, and re-push is idempotent', async () => {
    const pariwar = randomUUID();
    const written = [];
    for (let i = 0; i < 4; i++) {
      written.push(
        await audit.writeAuditEntry(pool, {
          pariwarId: pariwar,
          actorId: null,
          actorRole: null,
          action: 'test.mirror_write',
          resourceLocator: `res/${randomUUID()}`,
          requestPayloadHash: sha256Hex(randomUUID()),
          responseStatus: 200,
        }),
      );
    }
    const myIds = written.map((r) => r.auditId);
    const minSeq = Math.min(...written.map((r) => r.seq));
    const maxSeq = Math.max(...written.map((r) => r.seq));

    const target = createInMemoryMirrorTarget();
    // Start just before our first row so the first mirror run carries all of ours.
    const watermark = createInMemoryWatermarkStore(minSeq - 1);

    const first = await pushNewAuditLinesToMirror({ servicePool: pool, target, watermark });
    expect(first.objectName).not.toBeNull();
    expect(first.fromSeq).toBe(minSeq - 1);
    expect(first.toSeq).toBeGreaterThanOrEqual(maxSeq);
    expect(first.pushedCount).toBeGreaterThanOrEqual(4);

    // The object name encodes the seq range; the body is one line per pushed row,
    // and every one of OUR audit ids is present.
    expect(first.objectName).toContain(String(minSeq).padStart(20, '0'));
    const body = target.objects.get(first.objectName!)!.toString('utf-8');
    expect(body.trimEnd().split('\n')).toHaveLength(first.pushedCount);
    for (const id of myIds) expect(body).toContain(id);

    // Re-run: watermark has advanced past our rows → none of ours are re-pushed,
    // and the fromSeq continues from the prior toSeq (idempotent, no overwrite).
    const second = await pushNewAuditLinesToMirror({ servicePool: pool, target, watermark });
    expect(second.fromSeq).toBe(first.toSeq);
    if (second.objectName) {
      const secondBody = target.objects.get(second.objectName)!.toString('utf-8');
      for (const id of myIds) expect(secondBody).not.toContain(id);
    }
  });
});
