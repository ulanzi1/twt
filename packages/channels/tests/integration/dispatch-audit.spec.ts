// Dispatch audit lines — live-DB integration (Story 5.1, Task 7; AC7 + AI-4-3(c)/(d); :5433).
//
// Drives the REAL production audit path: `createAuditPort(servicePool)` → `writeAuditEntry` (own-committing
// hash-chain writer) + `createRenderedMessageHash` → the domain blind-index HMAC. Asserts the two audit
// lines land in `audit_log_entries` and that the per-channel line's hash is the PII-safe HMAC, never a raw
// sha256 of the rendered message.
//
// ⚠ writeAuditEntry COMMITS its own transaction (advisory-lock chain writer) — committed rows accumulate in
// the GLOBAL chain. Assertions key on the rows WE wrote (by our unique per-alert `resourceLocator`), never
// on absolute counts (Live-DB test gotchas).

import { randomUUID } from 'node:crypto';

import { Alert } from '@twt/contracts';
import { canonicalJsonStringify, createDb, encryption, schema, type Db } from '@twt/domain';
import { asc, like } from 'drizzle-orm';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  alertPayloadDigest,
  createAuditPort,
  createRenderedMessageHash,
  dispatch,
  render,
  sha256Hex,
  type DispatchDeps,
  type SendTarget,
} from '../../src/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const HMAC_KEY_REF: encryption.KmsKeyRef = { resourceName: 'fake/alert-hmac' };
const TARGETS: Partial<Record<string, SendTarget>> = {
  push: { channel: 'push', address: 'device-token', platform: 'android' },
  sms: { channel: 'sms', address: '+919999999999' },
};

describe.skipIf(!hasDatabase)('dispatch audit lines (live DB) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  let deps: DispatchDeps;
  const kms = createFakeKms();

  function createFakeKms(): encryption.KmsProvider {
    return encryption.createFakeKmsProvider({
      kekBytes: new Uint8Array(32).fill(7),
      hmacKeyBytes: new Uint8Array(32).fill(9),
    });
  }

  beforeAll(() => {
    if (!hasDatabase) return;
    const created = createDb(DATABASE_URL!, { ssl: false, max: 4 });
    db = created.db;
    pool = created.pool;
    deps = {
      resolveDelivery: () => Promise.resolve(TARGETS),
      hashRendered: createRenderedMessageHash({ kms, hmacKeyRef: HMAC_KEY_REF }),
      audit: createAuditPort(pool),
    };
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it('writes one dispatch line + one per sent channel, with an HMAC (not raw sha256) per-channel hash', async () => {
    const alertId = randomUUID();
    const pariwarId = randomUUID();
    const alert = Alert.parse({
      alert_id: alertId,
      pariwar_id: pariwarId,
      member_id: randomUUID(),
      alert_category: 'alert_published',
      time_critical: false,
      provenance_refs: {},
      created_at: '2026-07-05T10:00:00.000Z',
      created_by_actor: 'system',
      payload_data: { title: 'Monsoon drive', body: 'Join us this Saturday.' },
    });

    await dispatch(alert, deps);

    const rows = await db
      .select({
        action: schema.auditLogEntries.action,
        resourceLocator: schema.auditLogEntries.resourceLocator,
        requestPayloadHash: schema.auditLogEntries.requestPayloadHash,
        responseStatus: schema.auditLogEntries.responseStatus,
      })
      .from(schema.auditLogEntries)
      .where(like(schema.auditLogEntries.resourceLocator, `alert:${alertId}%`))
      .orderBy(asc(schema.auditLogEntries.seq));

    const dispatchLines = rows.filter((r) => r.action === 'alert.dispatch');
    const sendLines = rows.filter((r) => r.action === 'alert.channel_send');
    expect(dispatchLines).toHaveLength(1);
    expect(sendLines).toHaveLength(2); // push + sms (the two channels with targets)

    // Dispatch line carries the payload digest (canonical-JSON sha256 — non-PII payload).
    expect(dispatchLines[0]!.requestPayloadHash).toBe(alertPayloadDigest(alert));

    // Per-channel line carries the PII-safe HMAC (AI-4-3(c)) — recompute it and confirm it matches, and is
    // NOT the brute-forceable raw sha256 of the rendered message.
    const pushLine = sendLines.find((r) => r.resourceLocator.includes('channel=push'))!;
    const rendered = render(alert, 'push');
    const expectedHmac = await encryption.blindIndex(
      'alert_rendered',
      canonicalJsonStringify(rendered),
      { pariwarId },
      kms,
      HMAC_KEY_REF,
    );
    expect(pushLine.requestPayloadHash).toBe(expectedHmac);
    expect(pushLine.requestPayloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(pushLine.requestPayloadHash).not.toBe(sha256Hex(canonicalJsonStringify(rendered)));
  });
});
