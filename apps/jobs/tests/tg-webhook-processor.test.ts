// Telegram inbound-update processor — live-DB integration (Story 5.5, Task 7/11; AC4/AC8/AC10).
//
// Drives processWebhookEvent against real Postgres (own-committing, cross-tenant on the service pool — the
// worker holds no request scope). Seeds a PENDING/ACTIVE opt-in directly (RLS bypassed under the test login),
// persists a Telegram update event, processes it, and asserts the state-machine + consent + audit outcomes.

import { randomUUID } from 'node:crypto';

import { createDb } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { processWebhookEvent } from '../src/tg-webhook-processor.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('tg-webhook-processor — live DB (:5433)', () => {
  let created: ReturnType<typeof createDb>;
  let pool: pg.Pool;

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
    pool = created.pool;
  });
  afterAll(() => pool.end());

  const CHAT = '55500042';

  async function seedPending(pariwarId: string, memberId: string, code: string): Promise<string> {
    const res = await pool.query<{ opt_in_id: string }>(
      `INSERT INTO member_telegram_opt_in (pariwar_id, member_id, state, verification_code)
         VALUES ($1, $2, 'PENDING', $3) RETURNING opt_in_id`,
      [pariwarId, memberId, code],
    );
    return res.rows[0]!.opt_in_id;
  }

  async function seedActive(pariwarId: string, memberId: string, chatId: string): Promise<string> {
    const res = await pool.query<{ opt_in_id: string }>(
      `INSERT INTO member_telegram_opt_in (pariwar_id, member_id, state, verification_code, chat_id, matched_at)
         VALUES ($1, $2, 'ACTIVE', $3, $4, now()) RETURNING opt_in_id`,
      [pariwarId, memberId, `TWT-${randomUUID().slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'A')}`, chatId],
    );
    return res.rows[0]!.opt_in_id;
  }

  async function stateOf(optInId: string): Promise<string> {
    const r = await pool.query<{ state: string }>(
      `SELECT state FROM member_telegram_opt_in WHERE opt_in_id = $1`,
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

  it('inbound /start match → ACTIVE + chat_id captured + consent recorded + audit line', async () => {
    const pariwarId = randomUUID();
    const memberId = randomUUID();
    const code = 'TWT-ABCDEFGH';
    const optInId = await seedPending(pariwarId, memberId, code);

    const rawPayload = { update_id: 1, message: { text: `/start ${code}`, chat: { id: Number(CHAT) } } };
    const evt = await pool.query<{ event_id: string }>(
      `INSERT INTO telegram_inbound_webhook_events (pariwar_id, raw_payload, signature_verified)
         VALUES ($1, $2, true) RETURNING event_id`,
      [pariwarId, JSON.stringify(rawPayload)],
    );

    await processWebhookEvent(
      { pool, db: created.db },
      { eventId: evt.rows[0]!.event_id, pariwarId, rawPayload },
    );

    expect(await stateOf(optInId)).toBe('ACTIVE');
    const chat = await pool.query<{ chat_id: string }>(
      `SELECT chat_id FROM member_telegram_opt_in WHERE opt_in_id = $1`,
      [optInId],
    );
    expect(chat.rows[0]!.chat_id).toBe(CHAT);
    const consent = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM consent_records WHERE pariwar_id = $1 AND subject_id = $2 AND consent_type = 'telegram_opt_in' AND revoked_at IS NULL`,
      [pariwarId, memberId],
    );
    expect(Number(consent.rows[0]!.n)).toBe(1);
    expect(await auditCount(pariwarId, 'member.telegram_opt_in_activated')).toBeGreaterThanOrEqual(1);

    // Event marked processed.
    const proc = await pool.query<{ processed_at: string | null }>(
      `SELECT processed_at FROM telegram_inbound_webhook_events WHERE event_id = $1`,
      [evt.rows[0]!.event_id],
    );
    expect(proc.rows[0]!.processed_at).not.toBeNull();
  });

  it('inbound /stop → ACTIVE opt-in REVOKED + audit line', async () => {
    const pariwarId = randomUUID();
    const memberId = randomUUID();
    const optInId = await seedActive(pariwarId, memberId, CHAT);

    const rawPayload = { update_id: 2, message: { text: '  /stop ', chat: { id: Number(CHAT) } } };
    await processWebhookEvent(
      { pool, db: created.db },
      { eventId: randomUUID(), pariwarId, rawPayload },
    );

    expect(await stateOf(optInId)).toBe('REVOKED');
    expect(await auditCount(pariwarId, 'member.telegram_opt_in_revoked')).toBeGreaterThanOrEqual(1);
  });

  it('my_chat_member block (kicked) → ACTIVE opt-in BLOCKED + audit line', async () => {
    const pariwarId = randomUUID();
    const memberId = randomUUID();
    const optInId = await seedActive(pariwarId, memberId, CHAT);

    const rawPayload = {
      update_id: 3,
      my_chat_member: { chat: { id: Number(CHAT) }, new_chat_member: { status: 'kicked' } },
    };
    await processWebhookEvent(
      { pool, db: created.db },
      { eventId: randomUUID(), pariwarId, rawPayload },
    );

    expect(await stateOf(optInId)).toBe('BLOCKED');
    expect(await auditCount(pariwarId, 'member.telegram_opt_in_blocked')).toBeGreaterThanOrEqual(1);
  });

  it('a /start code matching no PENDING is a no-op (never a wrong-member ACTIVE)', async () => {
    const pariwarId = randomUUID();
    const memberId = randomUUID();
    const optInId = await seedPending(pariwarId, memberId, 'TWT-REALREAL');

    const rawPayload = { update_id: 4, message: { text: '/start TWT-WRONG123', chat: { id: 99 } } };
    await processWebhookEvent(
      { pool, db: created.db },
      { eventId: randomUUID(), pariwarId, rawPayload },
    );
    expect(await stateOf(optInId)).toBe('PENDING');
  });
});
