// WhatsApp inbound-webhook processor — live-DB integration (Story 5.4, Task 5; AC3/AC4).
//
// Drives processWebhookEvent against real Postgres (own-committing, cross-tenant on the service pool — the
// worker holds no request scope). Seeds a PENDING/ACTIVE opt-in directly (RLS bypassed under the test login),
// persists a Meta webhook event, processes it, and asserts the state-machine + consent + audit outcomes.

import { randomUUID } from 'node:crypto';

import { createDb } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { memberMobileBlindIndex, normalizeMobile, processWebhookEvent } from '../src/wa-webhook-processor.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

// ⚠ This worker's normalizeMobile is a BYTE-IDENTICAL reproduction of apps/api's
// apps/api/src/modules/auth/shared/mobile-index.ts normalizeMobile (apps/jobs cannot import apps/api — see the
// module header). These are the SAME two fixture arrays asserted there
// (apps/api/tests/unit/member-auth-primitives.test.ts, "normalizeMobile" describe block) — a drift in either
// implementation's output for these inputs fails ITS OWN suite, catching the two copies falling out of sync.
describe('normalizeMobile parity (mirrors apps/api/tests/unit/member-auth-primitives.test.ts)', () => {
  it('canonicalises common Indian formats to +91XXXXXXXXXX', () => {
    for (const raw of ['+91 98765 43210', '09876543210', '9876543210', '+919876543210', '(91) 98765-43210']) {
      expect(normalizeMobile(raw)).toBe('+919876543210');
    }
  });

  it('rejects non-Indian-mobile inputs', () => {
    for (const raw of ['12345', '1234567890', '+1 415 555 0100', '00000000000', 'abcdefghij']) {
      expect(normalizeMobile(raw)).toBeNull();
    }
  });
});

describe.skipIf(!hasDatabase)('wa-webhook-processor — live DB (:5433)', () => {
  let created: ReturnType<typeof createDb>;
  let pool: pg.Pool;
  const enc = buildJobsEncryptionDeps('wa-webhook-test-pepper');
  const workerEnc = { kms: enc.kms, hmacKeyRef: enc.hmacKeyRef };

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
    pool = created.pool;
  });
  afterAll(() => pool.end());

  const MOBILE = '9876543210';
  const FROM = '919876543210'; // Meta sends E.164 without the leading '+'

  async function seedPending(pariwarId: string, memberId: string, phrase: string): Promise<string> {
    const blindIndex = await memberMobileBlindIndex(MOBILE, workerEnc);
    const res = await pool.query<{ opt_in_id: string }>(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index)
         VALUES ($1, $2, 'PENDING', $3, $4) RETURNING opt_in_id`,
      [pariwarId, memberId, phrase, blindIndex],
    );
    return res.rows[0]!.opt_in_id;
  }

  async function seedActive(pariwarId: string, memberId: string): Promise<string> {
    const blindIndex = await memberMobileBlindIndex(MOBILE, workerEnc);
    const res = await pool.query<{ opt_in_id: string }>(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index,
         window_expires_at, matched_at) VALUES ($1, $2, 'ACTIVE', $3, $4, now() + interval '24 hours', now())
         RETURNING opt_in_id`,
      [pariwarId, memberId, `TWT-${randomUUID().slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'A')}`, blindIndex],
    );
    return res.rows[0]!.opt_in_id;
  }

  async function stateOf(optInId: string): Promise<string> {
    const r = await pool.query<{ state: string }>(
      `SELECT state FROM member_wa_opt_in WHERE opt_in_id = $1`,
      [optInId],
    );
    return r.rows[0]!.state;
  }

  async function auditCount(pariwarId: string, action: string): Promise<number> {
    const r = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM audit_log_entries WHERE pariwar_id = $1 AND action = $2`,
      [pariwarId, action],
    );
    return Number(r.rows[0]!.n);
  }

  it('inbound phrase match → ACTIVE + consent recorded + audit line', async () => {
    const pariwarId = randomUUID();
    const memberId = randomUUID();
    const phrase = 'TWT-ABCDEFGH';
    const optInId = await seedPending(pariwarId, memberId, phrase);

    const rawPayload = {
      entry: [{ changes: [{ value: { messages: [{ from: FROM, type: 'text', text: { body: phrase } }] } }] }],
    };
    const evt = await pool.query<{ event_id: string }>(
      `INSERT INTO wa_inbound_webhook_events (pariwar_id, raw_payload, signature_verified)
         VALUES ($1, $2, true) RETURNING event_id`,
      [pariwarId, JSON.stringify(rawPayload)],
    );

    await processWebhookEvent(
      { pool, db: created.db, enc: workerEnc },
      { eventId: evt.rows[0]!.event_id, pariwarId, rawPayload },
    );

    expect(await stateOf(optInId)).toBe('ACTIVE');
    const consent = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM consent_records WHERE pariwar_id = $1 AND subject_id = $2 AND consent_type = 'whatsapp_opt_in' AND revoked_at IS NULL`,
      [pariwarId, memberId],
    );
    expect(Number(consent.rows[0]!.n)).toBe(1);
    expect(await auditCount(pariwarId, 'member.wa_opt_in_activated')).toBeGreaterThanOrEqual(1);

    // Event marked processed.
    const proc = await pool.query<{ processed_at: string | null }>(
      `SELECT processed_at FROM wa_inbound_webhook_events WHERE event_id = $1`,
      [evt.rows[0]!.event_id],
    );
    expect(proc.rows[0]!.processed_at).not.toBeNull();
  });

  it('inbound STOP → ACTIVE opt-in REVOKED + audit line', async () => {
    const pariwarId = randomUUID();
    const memberId = randomUUID();
    const optInId = await seedActive(pariwarId, memberId);

    const rawPayload = {
      entry: [{ changes: [{ value: { messages: [{ from: FROM, type: 'text', text: { body: '  STOP ' } }] } }] }],
    };
    await processWebhookEvent(
      { pool, db: created.db, enc: workerEnc },
      { eventId: randomUUID(), pariwarId, rawPayload },
    );

    expect(await stateOf(optInId)).toBe('REVOKED');
    expect(await auditCount(pariwarId, 'member.wa_opt_in_revoked')).toBeGreaterThanOrEqual(1);
  });

  it('a phrase matching no PENDING is a no-op (never a wrong-member ACTIVE)', async () => {
    const pariwarId = randomUUID();
    const memberId = randomUUID();
    const optInId = await seedPending(pariwarId, memberId, 'TWT-REALREAL');

    const rawPayload = {
      entry: [{ changes: [{ value: { messages: [{ from: FROM, type: 'text', text: { body: 'TWT-WRONG123' } }] } }] }],
    };
    await processWebhookEvent(
      { pool, db: created.db, enc: workerEnc },
      { eventId: randomUUID(), pariwarId, rawPayload },
    );
    // Unmatched → PENDING unchanged.
    expect(await stateOf(optInId)).toBe('PENDING');
  });
});
