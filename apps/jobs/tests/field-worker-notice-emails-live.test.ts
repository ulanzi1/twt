// Story 13.1g — the move-notice EMAIL's sweep and child against the live DB (Task 4.2; AC3, AC5, AC9; decision `2026-11-12-463` AD3-AD6,
// AD13; ADR-0045). 11b.4a's harness shape: own-committing (the sweep reads COMMITTED rows across tenants), an injected clock, a FAKE provider
// that captures `to`, a capturing queue, a fresh Pariwar per test whose id is the sweep's `pariwarAllowlist`. ⭐ REAL envelopes: each
// officer's address is encrypted under the admin email's Tier-1 context with the SAME jobs KMS deps the child decrypts with. ⭐ Every notice is
// written by 13.1d's REAL commands, so the recipient set is the shipped one.
// ⚠ EVERY leg here runs as the test superuser (BYPASSRLS): it proves BEHAVIOUR, ⛔ production privilege (AD13 / TR7). The production login's
// posture is roster Row 26's; the one leg on a real RLS-bound login (`role = twt_app`) proves the step-0 refusal only.

import { randomUUID } from 'node:crypto';

import { encryption, fieldWorker, ids, rbac, withPariwarScope } from '@twt/domain';
import type { JobEnvelope } from '@twt/queue';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import { ClaimCorrectionTransientError } from '../src/scheduler/claim-correction-reminders.js';
import { fieldWorkerNoticeEmailLink, renderFieldWorkerNoticeEmail } from '../src/scheduler/field-worker-notice-email-templates.js';
import {
  FIELD_WORKER_NOTICE_EMAIL_QUEUES,
  runFieldWorkerNoticeEmailChild,
  runFieldWorkerNoticeEmailSweep,
  type FieldWorkerNoticeEmailDeps,
  type FieldWorkerNoticeEmailPayload,
} from '../src/scheduler/field-worker-notice-emails.js';
import { createFakeStaffEmailClient, type FakeStaffEmailClient } from '../src/scheduler/staff-email-client.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const MIN = 60_000;
const ORIGIN = 'https://admin.twt.example';
const enc = buildJobsEncryptionDeps('field-worker-notice-email-live-pepper');

// The REAL selector, unless a leg injects a fault into it (the `42501` leg).
const hook = vi.hoisted(() => ({ selectFault: null as null | Error }));
vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    fieldWorker: {
      ...actual.fieldWorker,
      selectDueFieldWorkerNoticeEmails: (...a: Parameters<typeof actual.fieldWorker.selectDueFieldWorkerNoticeEmails>) =>
        hook.selectFault !== null ? Promise.reject(hook.selectFault) : actual.fieldWorker.selectDueFieldWorkerNoticeEmails(...a),
    },
  };
});

describe.skipIf(!hasDatabase)('Story 13.1g — the move-notice email (live DB, own-committing; as the superuser)', { timeout: 90000 }, () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];
  const users: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[field-worker-notice-emails-live] idle client error:', err.message));
  });
  afterAll(async () => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      // Replica mode — the FKs and 0205's delete triggers are off; the email rows go FIRST (TR4: else an orphan outlives its notice).
      await c.query("SET LOCAL session_replication_role = 'replica'");
      const requests = (await c.query<{ id: string }>('SELECT move_request_id AS id FROM field_worker_move_requests WHERE pariwar_id = ANY($1::uuid[])', [pariwars])).rows.map((r) => r.id);
      const workers = (await c.query<{ id: string }>('SELECT field_worker_id AS id FROM field_workers WHERE pariwar_id = ANY($1::uuid[])', [pariwars])).rows.map((r) => r.id);
      await c.query('DELETE FROM field_worker_notice_emails WHERE pariwar_id = ANY($1::uuid[])', [pariwars]);
      await c.query('DELETE FROM field_worker_notices WHERE pariwar_id = ANY($1::uuid[])', [pariwars]);
      await c.query('DELETE FROM field_worker_move_requests WHERE pariwar_id = ANY($1::uuid[])', [pariwars]);
      await c.query('DELETE FROM field_workers WHERE pariwar_id = ANY($1::uuid[])', [pariwars]);
      await c.query('DELETE FROM events_log WHERE pariwar_id = ANY($1::uuid[]) AND stream_id = ANY($2::uuid[])', [pariwars, [...requests, ...workers]]);
      await c.query('DELETE FROM role_grants WHERE user_id = ANY($1::uuid[])', [users]);
      await c.query('DELETE FROM admin_credentials WHERE user_id = ANY($1::uuid[])', [users]);
      await c.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [users]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
      await pool.end();
    }
  }, 60_000);

  /** An officer with a REAL admin-email envelope (`address`: the STORED value — default a unique one) and ONE grant. */
  async function officer(pid: string, grant: { role: string; dim: string; value: string | null }, o: { address?: string; credentials?: boolean } = {}) {
    const id = randomUUID();
    users.push(id);
    const address = o.address ?? `officer-${id.slice(0, 8)}@trust.example`;
    await pool.query(`INSERT INTO users (id, identity_type, status) VALUES ($1, 'admin', 'active')`, [id]);
    if (o.credentials !== false) {
      const ct = await encryption.encryptTier1(Buffer.from(address, 'utf-8'), encryption.ADMIN_EMAIL_ENCRYPTION_CONTEXT, enc.kms, enc.kekRef);
      await pool.query(`INSERT INTO admin_credentials (user_id, email_ciphertext, email_blind_index, password_hash) VALUES ($1, $2, $3, 'hash')`, [
        id,
        encryption.serializeEnvelope(ct),
        `bidx-131g-live-${id}`,
      ]);
    }
    await pool.query('INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)', [id, pid, grant.role, grant.dim, grant.value]);
    return { id, address };
  }
  // ⚠ Keep this helper in a `.test.ts` (the `authorize(` fence).
  const verified = (pid: string, actorId: string, key: string, grant: { role: string; dim: string; value: string }, district: string) => {
    const r = rbac.authorize({
      actorId,
      grants: [{ pariwarId: pid, role: grant.role, scopeDimension: grant.dim as 'district' | 'pariwar', scopeValue: grant.value }],
      key,
      resource: { dimension: 'district', value: district, pariwarId: pid },
    });
    if (r === null) throw new Error(`the real check refused ${key}`);
    return r;
  };

  interface World {
    pid: string;
    pa: { id: string; address: string };
    daP: { id: string; address: string };
    daG: { id: string; address: string };
    /** A SECOND Gaya District Admin — an open Patna → Gaya tells both (two notices of one act). */
    daG2: { id: string; address: string };
    worker: (district?: string) => Promise<string>;
    open: (worker: string, to?: string) => Promise<string>;
  }
  async function world(): Promise<World> {
    const pid = randomUUID();
    pariwars.push(pid);
    const pa = await officer(pid, { role: 'pariwar_admin', dim: 'pariwar', value: pid });
    const daP = await officer(pid, { role: 'district_admin', dim: 'district', value: 'Patna' });
    const daG = await officer(pid, { role: 'district_admin', dim: 'district', value: 'Gaya' });
    const daG2 = await officer(pid, { role: 'district_admin', dim: 'district', value: 'Gaya' });
    await officer(pid, { role: 'district_admin', dim: 'district', value: 'Nalanda' });
    const P = ids.pariwarId(pid);
    const worker = async (district = 'Patna') => {
      const w = randomUUID();
      await withPariwarScope(pool, pid, (_db, client) =>
        fieldWorker.registerFieldWorker(client, {
          pariwarId: P,
          fieldWorkerId: ids.fieldWorkerId(w),
          auditId: randomUUID(),
          actor: 'operator',
          actorId: pa.id,
          nameCiphertext: 'enc:v1:name',
          mobileCiphertext: 'enc:v1:mobile',
          mobileBlindIndex: `idx-${w}`,
          registeredByDisplay: 'Asha Verma',
          district,
          authorization: verified(pid, pa.id, 'field_worker.register', { role: 'pariwar_admin', dim: 'pariwar', value: pid }, district),
        }),
      );
      return w;
    };
    const open = async (w: string, to = 'Gaya') => {
      const r = randomUUID();
      await withPariwarScope(pool, pid, (_db, client) =>
        fieldWorker.openFieldWorkerMoveRequest(client, {
          pariwarId: P,
          auditId: randomUUID(),
          actor: 'operator',
          actorId: daP.id,
          moveRequestId: ids.fieldWorkerMoveRequestId(r),
          fieldWorkerId: ids.fieldWorkerId(w),
          fromDistrict: 'Patna',
          toDistrict: to,
          authorization: verified(pid, daP.id, 'field_worker.request_move', { role: 'district_admin', dim: 'district', value: 'Patna' }, 'Patna'),
        }),
      );
      return r;
    };
    return { pid, pa, daP, daG, daG2, worker, open };
  }

  /** As the owner, triggers off — the notices' and requests' guards refuse a backdate for EVERY role. */
  async function asOwner(sql: string, params: unknown[]): Promise<void> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query(sql, params);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }

  interface Harness {
    deps: FieldWorkerNoticeEmailDeps;
    client: FakeStaffEmailClient;
    enqueued: { queue: string; data: JobEnvelope<FieldWorkerNoticeEmailPayload>; key: string | undefined }[];
    alarms: string[];
  }
  function harness(allow: readonly string[], over: Partial<FieldWorkerNoticeEmailDeps> = {}): Harness {
    const enqueued: Harness['enqueued'] = [];
    const alarms: string[] = [];
    const client = createFakeStaffEmailClient();
    const deps: FieldWorkerNoticeEmailDeps = {
      pool,
      encryption: enc,
      staffEmail: client,
      adminAppOrigin: ORIGIN,
      onAlarm: (m) => alarms.push(m),
      pariwarAllowlist: [...allow],
      ...over,
    };
    return { deps, client, enqueued, alarms };
  }
  const boss = (h: Harness) =>
    ({
      send: (queue: string, data: object, opts?: { singletonKey?: string }) => {
        h.enqueued.push({ queue, data: data as JobEnvelope<FieldWorkerNoticeEmailPayload>, key: opts?.singletonKey });
        return Promise.resolve(randomUUID());
      },
    }) as unknown as Parameters<typeof runFieldWorkerNoticeEmailSweep>[1];
  async function sweep(h: Harness) {
    h.enqueued.length = 0;
    return runFieldWorkerNoticeEmailSweep(h.deps, boss(h));
  }
  async function tick(h: Harness) {
    await sweep(h);
    const out = [];
    for (const e of [...h.enqueued]) out.push(await runFieldWorkerNoticeEmailChild(h.deps, e.data, randomUUID()));
    return out;
  }
  const notices = (pid: string) =>
    pool
      .query<{ notice_id: string; recipient_user_id: string; kind: fieldWorker.FieldWorkerNoticeKind }>(
        'SELECT notice_id, recipient_user_id, kind FROM field_worker_notices WHERE pariwar_id = $1 ORDER BY created_at, notice_id',
        [pid],
      )
      .then((r) => r.rows);
  const emailRow = (noticeId: string) =>
    pool
      .query<{ outcome: string; detail: string | null; attempt_count: number; may_have_sent: boolean; claimed_by_job: string | null; provider_message_id: string | null }>(
        'SELECT outcome, detail, attempt_count, may_have_sent, claimed_by_job, provider_message_id FROM field_worker_notice_emails WHERE notice_id = $1',
        [noticeId],
      )
      .then((r) => r.rows[0]);
  const envelope = (pariwarId: string, noticeId: string): JobEnvelope<FieldWorkerNoticeEmailPayload> => ({ pariwarId, requestId: 'r', actorId: null, traceId: 't', payload: { noticeId } });
  /** An `attempting` send row seeded by raw INSERT (11b.4a's form), claimed `claimedMinutesAgo`, aging from `agingMinutesAgo`. */
  const seedAttempting = (pid: string, noticeId: string, claimedMinutesAgo: number, agingMinutesAgo = claimedMinutesAgo) =>
    pool.query(
      `INSERT INTO field_worker_notice_emails (notice_id, pariwar_id, outcome, claimed_at, claimed_by_job, aging_since, detail)
       VALUES ($1, $2, 'attempting', now() - make_interval(mins => $3), 'job-crashed', now() - make_interval(mins => $4), 'transient:timeout')`,
      [noticeId, pid, claimedMinutesAgo, agingMinutesAgo],
    );

  it('⭐ ONE email per notice for EVERY kind (13.1d\'s real commands) — to the notice\'s recipient, the kind\'s text, the Move requests link; a re-run sends nothing; ⛔ address outside the provider', async () => {
    const w = await world();
    const P = ids.pariwarId(w.pid);
    // opened (Gaya) + accepted (the opener).
    const w1 = await w.worker();
    const r1 = await w.open(w1);
    await withPariwarScope(pool, w.pid, (_db, client) =>
      fieldWorker.acceptFieldWorkerMoveRequest(client, {
        pariwarId: P, auditId: randomUUID(), actor: 'operator', actorId: w.daG.id, moveRequestId: ids.fieldWorkerMoveRequestId(r1),
        authorization: verified(w.pid, w.daG.id, 'field_worker.answer_move_request', { role: 'district_admin', dim: 'district', value: 'Gaya' }, 'Gaya'),
      }),
    );
    // refused (the opener) + refused_admin (the PA).
    const r2 = await w.open(await w.worker());
    await withPariwarScope(pool, w.pid, (_db, client) =>
      fieldWorker.refuseFieldWorkerMoveRequest(client, {
        pariwarId: P, auditId: randomUUID(), actor: 'operator', actorId: w.daG.id, moveRequestId: ids.fieldWorkerMoveRequestId(r2), refusalReason: 'no_capacity',
        authorization: verified(w.pid, w.daG.id, 'field_worker.answer_move_request', { role: 'district_admin', dim: 'district', value: 'Gaya' }, 'Gaya'),
      }),
    );
    // escalated (the PA, the opener).
    const r3 = await w.open(await w.worker());
    await asOwner("UPDATE field_worker_move_requests SET opened_at = now() - interval '7 days 1 minute' WHERE move_request_id = $1", [r3]);
    await withPariwarScope(pool, w.pid, (_db, client) => fieldWorker.escalateStaleMoveRequest(client, { pariwarId: P, moveRequestId: ids.fieldWorkerMoveRequestId(r3), auditId: randomUUID() }));
    // superseded (B2: Gaya) + moved_by_pariwar_admin (Patna, Nalanda): a request Patna → Gaya, then the PA moves the worker to Nalanda.
    const w4 = await w.worker();
    await w.open(w4);
    await withPariwarScope(pool, w.pid, (_db, client) =>
      fieldWorker.postFieldWorker(client, {
        pariwarId: P, auditId: randomUUID(), actor: 'operator', actorId: w.pa.id, fieldWorkerId: ids.fieldWorkerId(w4), toDistrict: 'Nalanda', expectedFromDistrict: 'Patna', reasonCode: 'reassigned',
        authorization: verified(w.pid, w.pa.id, 'field_worker.move', { role: 'pariwar_admin', dim: 'pariwar', value: w.pid }, 'Nalanda'),
      }),
    );
    const all = await notices(w.pid);
    expect(new Set(all.map((n) => n.kind))).toEqual(new Set(fieldWorker.FIELD_WORKER_NOTICE_KINDS));

    const h = harness([w.pid]);
    const logs: string[] = [];
    const spies = (['log', 'info', 'warn', 'error'] as const).map((k) => vi.spyOn(console, k).mockImplementation((...x: unknown[]) => void logs.push(JSON.stringify(x))));
    let results;
    try {
      results = await tick(h);
    } finally {
      for (const s of spies) s.mockRestore();
    }
    expect(results).toEqual(all.map(() => ({ status: 'sent', outcome: 'accepted' })));
    expect(h.enqueued.every((e) => e.queue === FIELD_WORKER_NOTICE_EMAIL_QUEUES.SEND && e.key === e.data.payload.noticeId)).toBe(true);
    // Each notice: ONE message, to ITS recipient's address, carrying ITS kind's text and the Pariwar's link; ONE `accepted` row.
    const addressOf = new Map([w.pa, w.daP, w.daG, w.daG2].map((o) => [o.id, o.address]));
    const nalanda = (await pool.query<{ user_id: string }>("SELECT user_id FROM role_grants WHERE pariwar_id = $1 AND scope_value = 'Nalanda'", [w.pid])).rows[0]!.user_id;
    expect(h.client.sent).toHaveLength(all.length);
    for (const n of all) {
      const msg = h.client.sent.find((m) => m.reference === n.notice_id)!;
      expect(msg, n.kind).toBeDefined();
      if (n.recipient_user_id !== nalanda) expect(msg.to).toBe(addressOf.get(n.recipient_user_id));
      expect({ subject: msg.subject, text: msg.text }).toEqual(renderFieldWorkerNoticeEmail(n.kind, { link: fieldWorkerNoticeEmailLink(ORIGIN, w.pid) }));
      expect(await emailRow(n.notice_id)).toMatchObject({ outcome: 'accepted', attempt_count: 1, may_have_sent: false });
    }
    // ⛔ An address anywhere but the provider call.
    const leaked = JSON.stringify({ enqueued: h.enqueued, alarms: h.alarms, logs });
    for (const o of [w.pa, w.daP, w.daG, w.daG2]) expect(leaked).not.toContain(o.address);
    // Idempotent re-run: ⛔ due, ⛔ sent.
    expect(await tick(h)).toEqual([]);
    expect(h.client.sent).toHaveLength(all.length);
  });

  it('a HELD run (provider unset) writes ⛔ new row and PARKS an in-flight one, ONE alarm; the recovered run sends both and re-claims the parked row', async () => {
    const w = await world();
    await w.open(await w.worker());
    const [a, b] = await notices(w.pid);
    await seedAttempting(w.pid, a!.notice_id, 45); // a crashed send, past the 30-minute lease
    const h = harness([w.pid]);
    h.client.state.gap = 'config:provider_unset';
    const held = await sweep(h);
    expect(held).toMatchObject({ refused: false, failed: null, enqueued: 0, heldForConfig: 2 });
    expect(await emailRow(b!.notice_id)).toBeUndefined(); // TR5 — ⛔ row for the fresh notice
    expect(await emailRow(a!.notice_id)).toMatchObject({ outcome: 'attempting', claimed_by_job: 'sweep:held' });
    expect(h.alarms.filter((m) => m.includes('HELD'))).toHaveLength(1);
    h.client.state.gap = null;
    expect(await tick(h)).toEqual([
      { status: 'sent', outcome: 'accepted' },
      { status: 'sent', outcome: 'accepted' },
    ]);
    expect(await emailRow(a!.notice_id)).toMatchObject({ outcome: 'accepted', attempt_count: 2, may_have_sent: false });
    expect(await emailRow(b!.notice_id)).toMatchObject({ outcome: 'accepted', attempt_count: 1 });
  });

  it('a config gap of the ORIGIN holds too (6.25\'s): ⛔ enqueued, ⛔ row; the child\'s race guard writes nothing', async () => {
    const w = await world();
    await w.open(await w.worker());
    const [n] = await notices(w.pid);
    const h = harness([w.pid], { adminAppOrigin: 'http://not-https.example' });
    expect(await sweep(h)).toMatchObject({ enqueued: 0, heldForConfig: 2 });
    expect(await runFieldWorkerNoticeEmailChild(h.deps, envelope(w.pid, n!.notice_id), 'job-1')).toEqual({ status: 'held_config', reason: 'config:admin_app_origin_invalid' });
    expect(await emailRow(n!.notice_id)).toBeUndefined();
  });

  it('the Q-2 rule\'s exception, both ways: (i) a notice aged past the cutoff during a hold is NEVER emailed while one a day old IS; (ii) an un-parked `attempting` row 3+ IST days old is given up, alarmed by notice id, and never sent', async () => {
    const w = await world();
    await w.open(await w.worker());
    const [old, young] = await notices(w.pid);
    const h = harness([w.pid]);
    h.client.state.gap = 'config:provider_unset';
    await sweep(h); // the hold
    await asOwner("UPDATE field_worker_notices SET created_at = now() - interval '4 days' WHERE notice_id = $1", [old!.notice_id]);
    await asOwner("UPDATE field_worker_notices SET created_at = now() - interval '1 day' WHERE notice_id = $1", [young!.notice_id]);
    h.client.state.gap = null; // the release
    expect(await tick(h)).toEqual([{ status: 'sent', outcome: 'accepted' }]);
    expect(h.client.sent.map((m) => m.reference)).toEqual([young!.notice_id]);
    expect(await emailRow(old!.notice_id)).toBeUndefined(); // (i) ⛔ row, ⛔ send — ever
    expect(await tick(h)).toEqual([]);
    // (ii) a second Pariwar: a crashed send aging 4 days, claimed long ago, ⛔ parked.
    const w2 = await world();
    await w2.open(await w2.worker());
    const [s] = await notices(w2.pid);
    await seedAttempting(w2.pid, s!.notice_id, 4 * 24 * 60);
    const h2 = harness([w2.pid]);
    const out = await sweep(h2);
    expect(out.finalisedStuck).toBe(1);
    expect(h2.alarms.find((m) => m.includes('gave up'))).toContain(s!.notice_id);
    expect(await emailRow(s!.notice_id)).toMatchObject({ outcome: 'error', detail: 'exhausted:attempting_three_days', may_have_sent: true });
    // The other notice of that act is fresh and still sent; the given-up one never is.
    for (const e of [...h2.enqueued]) await runFieldWorkerNoticeEmailChild(h2.deps, e.data, randomUUID());
    expect(h2.client.sent.map((m) => m.reference)).not.toContain(s!.notice_id);
  });

  it('a TRANSIENT that may have sent, then success on the SAME job: `may_have_sent`, ONE "may have sent" alarm; a rejection is final', async () => {
    const w = await world();
    await w.open(await w.worker());
    const [a, b] = await notices(w.pid);
    const h = harness([w.pid]);
    let first = true;
    h.client.state.respond = () => {
      if (first) {
        first = false;
        return { kind: 'transient', detail: 'transient:timeout', held: false, mayHaveSent: true };
      }
      return { kind: 'final', outcome: 'accepted', providerMessageId: 'fake-ok' };
    };
    await expect(runFieldWorkerNoticeEmailChild(h.deps, envelope(w.pid, a!.notice_id), 'job-1')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(await emailRow(a!.notice_id)).toMatchObject({ outcome: 'attempting', detail: 'transient:timeout', may_have_sent: true });
    expect(await runFieldWorkerNoticeEmailChild(h.deps, envelope(w.pid, a!.notice_id), 'job-1')).toEqual({ status: 'sent', outcome: 'accepted' });
    expect(await emailRow(a!.notice_id)).toMatchObject({ outcome: 'accepted', attempt_count: 2, may_have_sent: true, provider_message_id: 'fake-ok' });
    expect(h.alarms.filter((m) => m.includes('may have sent'))).toHaveLength(1);
    h.client.state.respond = () => ({ kind: 'final', outcome: 'rejected', detail: 'rejected:400:TM_4001.SM_113' });
    expect(await runFieldWorkerNoticeEmailChild(h.deps, envelope(w.pid, b!.notice_id), 'job-2')).toEqual({ status: 'sent', outcome: 'rejected' });
    expect(await emailRow(b!.notice_id)).toMatchObject({ outcome: 'rejected', detail: 'rejected:400:TM_4001.SM_113' });
  });

  it('the address: an empty envelope ⇒ `error:no_address`; an unsendable one ⇒ `error:invalid_address`; ⛔ send', async () => {
    const pid = randomUUID();
    pariwars.push(pid);
    const pa = await officer(pid, { role: 'pariwar_admin', dim: 'pariwar', value: pid });
    const daP = await officer(pid, { role: 'district_admin', dim: 'district', value: 'Patna' });
    const empty = await officer(pid, { role: 'district_admin', dim: 'district', value: 'Gaya' }, { address: '  ' });
    const bad = await officer(pid, { role: 'district_admin', dim: 'district', value: 'Gaya' }, { address: '"x"<other@host.com>' });
    const w = randomUUID();
    const P = ids.pariwarId(pid);
    await withPariwarScope(pool, pid, async (_db, client) => {
      await fieldWorker.registerFieldWorker(client, {
        pariwarId: P, fieldWorkerId: ids.fieldWorkerId(w), auditId: randomUUID(), actor: 'operator', actorId: pa.id, nameCiphertext: 'enc:v1:name', mobileCiphertext: 'enc:v1:mobile',
        mobileBlindIndex: `idx-${w}`, registeredByDisplay: 'Asha Verma', district: 'Patna',
        authorization: verified(pid, pa.id, 'field_worker.register', { role: 'pariwar_admin', dim: 'pariwar', value: pid }, 'Patna'),
      });
      await fieldWorker.openFieldWorkerMoveRequest(client, {
        pariwarId: P, auditId: randomUUID(), actor: 'operator', actorId: daP.id, moveRequestId: ids.fieldWorkerMoveRequestId(randomUUID()), fieldWorkerId: ids.fieldWorkerId(w),
        fromDistrict: 'Patna', toDistrict: 'Gaya', authorization: verified(pid, daP.id, 'field_worker.request_move', { role: 'district_admin', dim: 'district', value: 'Patna' }, 'Patna'),
      });
    });
    const h = harness([pid]);
    const out = await tick(h);
    expect(out).toEqual(expect.arrayContaining([{ status: 'error', detail: 'error:no_address' }, { status: 'error', detail: 'error:invalid_address' }]));
    const byRecipient = new Map((await notices(pid)).map((n) => [n.recipient_user_id, n.notice_id]));
    expect(await emailRow(byRecipient.get(empty.id)!)).toMatchObject({ outcome: 'error', detail: 'error:no_address' });
    expect(await emailRow(byRecipient.get(bad.id)!)).toMatchObject({ outcome: 'error', detail: 'error:invalid_address' });
    expect(h.client.sent).toEqual([]);
  });

  it('Q4 at the child: a recipient suspended after the act is `skipped`, ⛔ sent; the other recipient of the act IS', async () => {
    const w = await world();
    await w.open(await w.worker());
    const gaya2 = (await notices(w.pid)).find((n) => n.recipient_user_id !== w.daG.id)!;
    await pool.query(`UPDATE users SET status = 'suspended' WHERE id = $1`, [w.daG.id]);
    const h = harness([w.pid]);
    const out = await tick(h);
    expect(out).toEqual(expect.arrayContaining([{ status: 'skipped', reason: 'not_eligible' }, { status: 'sent', outcome: 'accepted' }]));
    expect(h.client.sent.map((m) => m.reference)).toEqual([gaya2.notice_id]);
  });

  it('the race: two children for ONE notice at once ⇒ ONE send (the PK + the notice lock + the lease)', async () => {
    const w = await world();
    await w.open(await w.worker());
    const [n] = await notices(w.pid);
    const h = harness([w.pid]);
    const out = await Promise.all([
      runFieldWorkerNoticeEmailChild(h.deps, envelope(w.pid, n!.notice_id), 'job-A'),
      runFieldWorkerNoticeEmailChild(h.deps, envelope(w.pid, n!.notice_id), 'job-B'),
    ]);
    expect(out).toEqual(expect.arrayContaining([{ status: 'sent', outcome: 'accepted' }]));
    expect(out.filter((r) => r.status === 'sent')).toHaveLength(1);
    expect(h.client.sent.filter((m) => m.reference === n!.notice_id)).toHaveLength(1);
  });

  it('I7 — a notice of Pariwar A claimed under Pariwar B\'s envelope: a transient (alarmed), ⛔ row written, ⛔ sent', async () => {
    const w = await world();
    await w.open(await w.worker());
    const [n] = await notices(w.pid);
    const other = randomUUID();
    pariwars.push(other);
    const h = harness([w.pid]);
    await expect(runFieldWorkerNoticeEmailChild(h.deps, envelope(other, n!.notice_id), 'job-1')).rejects.toBeInstanceOf(ClaimCorrectionTransientError);
    expect(h.alarms).toEqual([expect.stringContaining(`the claim of the email for notice ${n!.notice_id} failed`)]);
    expect(await emailRow(n!.notice_id)).toBeUndefined();
    expect(h.client.sent).toEqual([]);
  });

  it('AD13 — a pool whose login is RLS-bound (role twt_app): ONE `rls_bound_role` alarm; nothing selected, parked, given up or sent', async () => {
    const w = await world();
    await w.open(await w.worker());
    const [a] = await notices(w.pid);
    await seedAttempting(w.pid, a!.notice_id, 4 * 24 * 60); // would be given up by an un-held run
    const bound = new pg.Pool({ connectionString: DATABASE_URL, max: 2, options: '-c role=twt_app' });
    try {
      expect((await bound.query<{ u: string }>('SELECT current_user AS u')).rows[0]!.u).toBe('twt_app'); // CONTROL
      const h = harness([w.pid], { pool: bound });
      expect(await sweep(h)).toMatchObject({ refused: true, enqueued: 0, scannedNotices: 0, finalisedStuck: 0 });
      expect(h.alarms).toEqual([expect.stringContaining('field_worker_notice_email.rls_bound_role')]);
      expect(h.client.sent).toEqual([]);
    } finally {
      await bound.end();
    }
    expect(await emailRow(a!.notice_id)).toMatchObject({ outcome: 'attempting', claimed_by_job: 'job-crashed' }); // ⛔ given up, ⛔ parked
  });

  it('AD13 — a `42501` from the selector (injected): ONE alarm carrying `code:42501`; ⛔ enqueued, ⛔ written', async () => {
    const w = await world();
    await w.open(await w.worker());
    const fault = Object.assign(new Error('permission denied for table field_worker_notices'), { code: '42501' });
    hook.selectFault = fault;
    try {
      const h = harness([w.pid]);
      expect(await sweep(h)).toMatchObject({ refused: false, failed: 'code:42501', enqueued: 0 });
      expect(h.alarms).toEqual([expect.stringContaining('field_worker_notice_email.sweep_failed:code:42501')]);
    } finally {
      hook.selectFault = null;
    }
    for (const n of await notices(w.pid)) expect(await emailRow(n.notice_id)).toBeUndefined();
  });

  it('the test-only allow-list: EMPTY ⇒ refused (alarmed), nothing swept', async () => {
    const h = harness([]);
    expect(await sweep(h)).toMatchObject({ enqueued: 0, scannedNotices: 0 });
    expect(h.alarms).toEqual([expect.stringContaining('`pariwarAllowlist` is EMPTY')]);
  });

  it('a minute later the clock moves on: an `attempting` row inside the lease is NOT re-claimed by another job (`held_by_other`)', async () => {
    const w = await world();
    await w.open(await w.worker());
    const [n] = await notices(w.pid);
    await seedAttempting(w.pid, n!.notice_id, 1);
    const h = harness([w.pid], { now: () => new Date(Date.now() + MIN) });
    expect(await runFieldWorkerNoticeEmailChild(h.deps, envelope(w.pid, n!.notice_id), 'job-other')).toEqual({ status: 'skipped', reason: 'held_by_other' });
    expect(h.client.sent).toEqual([]);
  });
});
