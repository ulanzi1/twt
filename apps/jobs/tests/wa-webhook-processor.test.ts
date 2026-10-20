// WhatsApp inbound-webhook processor — live-DB integration (Story 5.4, Task 5; AC3/AC4).
//
// Drives processWebhookEvent against real Postgres (own-committing, cross-tenant on the service pool — the
// worker holds no request scope). Seeds a PENDING/ACTIVE opt-in directly (RLS bypassed under the test login),
// persists a Meta webhook event, processes it, and asserts the state-machine + consent + audit outcomes.

import { randomUUID } from 'node:crypto';

import { claim, createDb } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { memberMobileBlindIndex, normalizeMobile, processWebhookEvent, runWaWebhookProcessorTick } from '../src/wa-webhook-processor.js';
import { cleanupClaims, seedReturnedClaim } from './_claim-correction-seed.js';

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
      { pool, db: created.db, enc },
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
      { pool, db: created.db, enc },
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
      { pool, db: created.db, enc },
      { eventId: randomUUID(), pariwarId, rawPayload },
    );
    // Unmatched → PENDING unchanged.
    expect(await stateOf(optInId)).toBe('PENDING');
  });
});

// ── Story 6.37d (AC7; WS10, WS11; I7, I8) — the CLAIM branch: before, and independent of, the member lookup ─────────────────
describe.skipIf(!hasDatabase)('wa-webhook-processor — the claim-contact branch (Story 6.37d, live :5433)', () => {
  let created: ReturnType<typeof createDb>;
  let pool: pg.Pool;
  const enc = buildJobsEncryptionDeps('wa-webhook-claim-test-pepper');
  const claims: string[] = [];
  const members: string[] = [];
  const pariwars: string[] = [];
  const PNID = 'pnid-claim-branch';
  const MOBILE = '9876543210';
  const FROM = '919876543210';

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { max: 4, ssl: false });
    pool = created.pool;
  });
  afterAll(async () => {
    try {
      await pool.query('DELETE FROM claim_contact_wa_stops WHERE pariwar_id = ANY($1::uuid[])', [pariwars]);
      await pool.query('DELETE FROM whatsapp_send_status WHERE pariwar_id = ANY($1::uuid[])', [pariwars]);
      await pool.query('DELETE FROM member_wa_opt_in WHERE pariwar_id = ANY($1::uuid[])', [pariwars]);
      await pool.query('DELETE FROM pariwar_wa_config WHERE pariwar_id = ANY($1::uuid[])', [pariwars]);
      await cleanupClaims(pool, claims, members);
    } finally {
      await pool.end();
    }
  });

  const deps = () => ({ pool, db: created.db, enc });

  async function pariwar(): Promise<string> {
    const pid = randomUUID();
    pariwars.push(pid);
    await pool.query(`INSERT INTO pariwar_wa_config (pariwar_id, enabled, phone_number_id, access_token_secret_name) VALUES ($1, true, $2, 'tok')`, [pid, PNID]);
    return pid;
  }
  async function optIn(pariwarId: string, state: 'ACTIVE' | 'EXPIRED_24H_WINDOW'): Promise<string> {
    const blindIndex = await memberMobileBlindIndex(MOBILE, enc);
    const res = await pool.query<{ opt_in_id: string }>(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, window_expires_at, matched_at)
       VALUES ($1, $2, $3, $4, $5, now() + interval '24 hours', now()) RETURNING opt_in_id`,
      [pariwarId, randomUUID(), state, `TWT-${randomUUID().slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'A')}`, blindIndex],
    );
    return res.rows[0]!.opt_in_id;
  }
  const stateOf = async (optInId: string) => (await pool.query<{ state: string }>(`SELECT state FROM member_wa_opt_in WHERE opt_in_id = $1`, [optInId])).rows[0]!.state;
  const claimHash = (pariwarId: string) => claim.correctionNumberHash(`+91${MOBILE}`, pariwarId, enc);
  const stopsOf = async (pariwarId: string) =>
    (await pool.query<{ recipient_number_hash: string }>(`SELECT recipient_number_hash FROM claim_contact_wa_stops WHERE pariwar_id = $1`, [pariwarId])).rows;
  const auditCount = async (pariwarId: string, action: string) =>
    Number((await pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM audit_log_entries WHERE pariwar_id = $1 AND action = $2`, [pariwarId, action])).rows[0]!.n);

  /** A claim send row to the MOBILE (the claim-space hash), `accepted` with `wamid` — or in flight (⛔ wamid). */
  async function claimSend(pariwarId: string, o: { readonly wamid?: string } = {}): Promise<string> {
    const s = await seedReturnedClaim(pool, pariwarId, enc, {});
    claims.push(s.claimCaseId);
    members.push(s.deceasedMemberId);
    const hash = await claimHash(pariwarId);
    const { rows } = await pool.query<{ ladder_id: string }>(
      `INSERT INTO claim_contact_ladders (pariwar_id, claim_case_id, chase, run_id, return_decision_id, person_key, recipient_number_hash,
         origin_row_id, origin_sent_on, whatsapp_step, sms2_due_on)
       VALUES ($1, $2, 'correction', gen_random_uuid(), gen_random_uuid(), 'claimant', $3, gen_random_uuid(), '2026-10-01', 'sent', '2026-10-03')
       RETURNING ladder_id`,
      [pariwarId, s.claimCaseId, hash],
    );
    const accepted = o.wamid !== undefined;
    const send = await pool.query<{ send_id: string }>(
      `INSERT INTO claim_contact_wa_sends (ladder_id, pariwar_id, claim_case_id, chase, recipient_number_hash, template_name, locale, send_outcome,
         claimed_at, claimed_by_job, aging_since, send_started_at, provider_message_id)
       VALUES ($1, $2, $3, 'correction', $4, 'tpl', 'en', $5, now(), 'job', now(), $6, $7) RETURNING send_id`,
      [rows[0]!.ladder_id, pariwarId, s.claimCaseId, hash, accepted ? 'accepted' : 'attempting', accepted ? new Date() : null, o.wamid ?? null],
    );
    return send.rows[0]!.send_id;
  }
  const statusRow = async (sendId: string) =>
    (await pool.query<{ delivered_at: Date | null; failed_at: Date | null; failure_code: string | null }>(
      `SELECT delivered_at, failed_at, failure_code FROM claim_contact_wa_sends WHERE send_id = $1`,
      [sendId],
    )).rows[0]!;

  const inbound = (body: string, pnid: string | null = PNID) => ({
    entry: [{ changes: [{ value: { ...(pnid !== null ? { metadata: { phone_number_id: pnid } } : {}), messages: [{ from: FROM, type: 'text', text: { body } }] } }] }],
  });
  const statusPayload = (wamid: string, status: string, code?: number) => ({
    entry: [{ changes: [{ value: { metadata: { phone_number_id: PNID }, statuses: [{ id: wamid, status, recipient_id: FROM, ...(code !== undefined ? { errors: [{ code }] } : {}) }] } }] }],
  });
  async function event(pariwarId: string, rawPayload: unknown): Promise<string> {
    const { rows } = await pool.query<{ event_id: string }>(
      `INSERT INTO wa_inbound_webhook_events (pariwar_id, raw_payload, signature_verified) VALUES ($1, $2, true) RETURNING event_id`,
      [pariwarId, JSON.stringify(rawPayload)],
    );
    return rows[0]!.event_id;
  }
  const process = async (pariwarId: string, rawPayload: unknown, eventId?: string) =>
    processWebhookEvent(deps(), { eventId: eventId ?? (await event(pariwarId, rawPayload)), pariwarId, rawPayload });

  it('⭐ (a) a NON-member\'s STOP records a claim-contact stop in the LADDER\'s hash space (the DOMAIN normalizeMobile — ⛔ the member index) and audits it with its own action; a replay records ⛔ a second', async () => {
    const pid = await pariwar();
    const eventId = await event(pid, inbound('STOP'));
    await process(pid, inbound('STOP'), eventId);
    expect(await stopsOf(pid)).toEqual([{ recipient_number_hash: await claimHash(pid) }]);
    expect(await auditCount(pid, 'claim_contact.wa_stopped')).toBe(1);
    await process(pid, inbound('STOP'), eventId);
    expect(await stopsOf(pid)).toHaveLength(1);
    expect(await auditCount(pid, 'claim_contact.wa_stopped')).toBe(1);
  });

  it('⭐ (b) a member with an ACTIVE opt-in: the claim stop is recorded AND the member path runs as `main` stands (REVOKED)', async () => {
    const pid = await pariwar();
    const optInId = await optIn(pid, 'ACTIVE');
    await process(pid, inbound('रोको'));
    expect(await stopsOf(pid)).toHaveLength(1);
    expect(await stateOf(optInId)).toBe('REVOKED');
  });

  it('⭐ (c) an EXPIRED member: the claim stop is recorded; the member row is as `main` stands (row 5-12 will change it under `-364` condition 3)', async () => {
    const pid = await pariwar();
    const optInId = await optIn(pid, 'EXPIRED_24H_WINDOW');
    const before = await stateOf(optInId);
    await process(pid, inbound('stop'));
    expect(await stopsOf(pid)).toHaveLength(1);
    expect(await stateOf(optInId)).toBe(before);
  });

  it('⭐ R1 — ONE inbound event batching STOPs from TWO senders records TWO stops (one per sender hash); a replay of that event records ⛔ more', async () => {
    const pid = await pariwar();
    const MOBILE_2 = '9812345670';
    const batched = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: PNID },
                messages: [
                  { from: FROM, type: 'text', text: { body: 'STOP' } },
                  { from: `91${MOBILE_2}`, type: 'text', text: { body: 'STOP' } },
                ],
              },
            },
          ],
        },
      ],
    };
    const eventId = await event(pid, batched);
    await process(pid, batched, eventId);
    const want = [await claimHash(pid), await claim.correctionNumberHash(`+91${MOBILE_2}`, pid, enc)].sort();
    expect((await stopsOf(pid)).map((r) => r.recipient_number_hash).sort()).toEqual(want);
    expect(await auditCount(pid, 'claim_contact.wa_stopped')).toBe(2);
    await process(pid, batched, eventId);
    expect(await stopsOf(pid)).toHaveLength(2);
    expect(await auditCount(pid, 'claim_contact.wa_stopped')).toBe(2);
  });

  it('⭐ round 2 (P4) — a claim STOP that FAILS to record raises `contact_ladder.stop_unrecorded` (ids only, ⛔ the number); the member path still runs', async () => {
    const pid = await pariwar();
    const optInId = await optIn(pid, 'ACTIVE');
    let first = true;
    const kms = Object.create(enc.kms) as typeof enc.kms;
    kms.computeHmac = async (...a: Parameters<typeof enc.kms.computeHmac>) => {
      if (first) {
        first = false; // the claim-space hash is the FIRST HMAC of a STOP; the member blind index follows
        throw new Error('kms unavailable');
      }
      return enc.kms.computeHmac(...a);
    };
    const alarms: string[] = [];
    const payload = inbound('STOP');
    const eventId = await event(pid, payload);
    await processWebhookEvent({ ...deps(), enc: { ...enc, kms }, onAlarm: (m: string) => alarms.push(m) }, { eventId, pariwarId: pid, rawPayload: payload });
    expect(await stopsOf(pid)).toHaveLength(0);
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toContain('contact_ladder.stop_unrecorded');
    expect(alarms[0]).toContain(eventId);
    expect(alarms[0]).not.toContain(MOBILE);
    expect(await stateOf(optInId)).toBe('REVOKED');
  });

  it('⭐ R4 / -369 d4 — after a number ROTATION (the callback\'s phone_number_id is ⛔ today\'s): a claim wamid\'s block stays the CLAIM\'s (the member opt-in UNCHANGED) and a delivery still lands on its row', async () => {
    const pid = await pariwar();
    const optInId = await optIn(pid, 'ACTIVE');
    const blocked = await claimSend(pid, { wamid: 'wamid.ROTATED-BLOCK' });
    const delivered = await claimSend(pid, { wamid: 'wamid.ROTATED-DELIVERED' });
    const rotated = (wamid: string, status: string, code?: number) => ({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: 'pnid-before-rotation' },
                statuses: [{ id: wamid, status, recipient_id: FROM, ...(code !== undefined ? { errors: [{ code }] } : {}) }],
              },
            },
          ],
        },
      ],
    });
    await process(pid, rotated('wamid.ROTATED-BLOCK', 'failed', 131026));
    expect(await stateOf(optInId)).toBe('ACTIVE');
    expect(await statusRow(blocked)).toMatchObject({ failure_code: '131026' });
    await process(pid, rotated('wamid.ROTATED-DELIVERED', 'delivered'));
    expect((await statusRow(delivered)).delivered_at).not.toBeNull();
  });

  it('⭐ T26 — the change\'s phone_number_id is NOT the Pariwar\'s (or absent) ⇒ ⛔ claim action; the member path still runs', async () => {
    const pid = await pariwar();
    const optInId = await optIn(pid, 'ACTIVE');
    await process(pid, inbound('STOP', 'pnid-of-another-pariwar'));
    await process(pid, inbound('STOP', null));
    expect(await stopsOf(pid)).toHaveLength(0);
    expect(await stateOf(optInId)).toBe('REVOKED');
  });

  it('⭐ I7 — a block-coded `failed` for a CLAIM wamid to a number that is ALSO an ACTIVE member ⇒ the member opt-in UNCHANGED; the claim row records failed_at + the code', async () => {
    const pid = await pariwar();
    const optInId = await optIn(pid, 'ACTIVE');
    const sendId = await claimSend(pid, { wamid: 'wamid.CLAIM-BLOCK' });
    await process(pid, statusPayload('wamid.CLAIM-BLOCK', 'failed', 131026));
    expect(await stateOf(optInId)).toBe('ACTIVE');
    expect(await statusRow(sendId)).toMatchObject({ failure_code: '131026' });
    expect((await statusRow(sendId)).failed_at).not.toBeNull();
  });

  it('the SAME status for a MEMBER-only wamid still blocks as today', async () => {
    const pid = await pariwar();
    const optInId = await optIn(pid, 'ACTIVE');
    await process(pid, statusPayload('wamid.MEMBER-ONLY', 'failed', 131026));
    expect(await stateOf(optInId)).toBe('BLOCKED_BY_META');
  });

  it('⭐ WS11 (2) — a block code with ⛔ wamid match, to a recipient with a RECENT claim send in flight (⛔ wamid yet) ⇒ the member revoke SKIPPED (matched by the claim-space hash)', async () => {
    const pid = await pariwar();
    const optInId = await optIn(pid, 'ACTIVE');
    await claimSend(pid);
    await process(pid, statusPayload('wamid.UNKNOWN-TO-US', 'failed', 131049));
    expect(await stateOf(optInId)).toBe('ACTIVE');
  });

  it('⭐ `read` WITHOUT `delivered` ⇒ delivered_at set; a duplicate `delivered` (Meta\'s retries) changes nothing', async () => {
    const pid = await pariwar();
    const sendId = await claimSend(pid, { wamid: 'wamid.READ-ONLY' });
    await process(pid, statusPayload('wamid.READ-ONLY', 'read'));
    const first = (await statusRow(sendId)).delivered_at;
    expect(first).not.toBeNull();
    await process(pid, statusPayload('wamid.READ-ONLY', 'delivered'));
    expect((await statusRow(sendId)).delivered_at).toEqual(first);
  });

  it('⭐ the stop hash and the ladder hash AGREE for one number written several ways — both through the DOMAIN normalizeMobile', async () => {
    const pid = randomUUID();
    const { encryption } = await import('@twt/domain');
    const hashes = await Promise.all(
      ['+919876543210', '919876543210', '9876543210', '+91 98765 43210'].map((raw) => claim.correctionNumberHash(encryption.normalizeMobile(raw)!, pid, enc)),
    );
    expect(new Set(hashes).size).toBe(1);
    expect(hashes[0]).toBe(await claim.correctionNumberHash('+919876543210', pid, enc));
  });

  it('⭐ the RLS-bound-role refusal ends the tick BEFORE any event is claimed (⛔ marked processed — ⛔ a fall-through to the member path)', async () => {
    const pid = await pariwar();
    const eventId = await event(pid, inbound('STOP'));
    const bound = createDb(`${DATABASE_URL!}${DATABASE_URL!.includes('?') ? '&' : '?'}options=-c%20role%3Dtwt_app`, { max: 1, ssl: false });
    try {
      const r = await runWaWebhookProcessorTick({ pool: bound.pool, db: bound.db, enc });
      expect(r).toMatchObject({ drained: 0, refused: true });
    } finally {
      await bound.pool.end();
    }
    const { rows } = await pool.query<{ processed_at: Date | null }>(`SELECT processed_at FROM wa_inbound_webhook_events WHERE event_id = $1`, [eventId]);
    expect(rows[0]!.processed_at).toBeNull();
    await pool.query(`UPDATE wa_inbound_webhook_events SET processed_at = now() WHERE event_id = $1`, [eventId]);
  });
});
