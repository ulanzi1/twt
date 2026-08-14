// Member data-export routes — E2E (Story 3.11, Task 9; AC1/AC3/AC4).
//
// Drives the three data-export routes through `app.inject`:
//   · POST   — creates a `pending` row + enqueues DATA_EXPORT_BUILD (spy the capturing queue) + is
//     idempotent (a second request returns the SAME exportId, no second job).
//   · GET :id — session only (NO step-up).
//   · GET :id/download — step-up gated ('data_export'): 403 auth.step_up_required WITHOUT elevation; a
//     'withdrawal' elevation does NOT satisfy it (cross-context isolation, 3.9 P8); WITH a matching
//     elevation streams application/zip + stamps consumed_at; a SECOND download → 410 consumed; an
//     expired export → 410 expired.
// Audit lines carry NO exported PII (assert non-PII context only).

import { randomUUID } from 'node:crypto';

import { encryption } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import * as memberAuthRepo from '../../../src/modules/auth/member/member-auth.repo.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { ids, member as memberDomain } from '@twt/domain';

import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;
const BASE = '/api/v1/member/data-export';

/** Seed a bare member row (committed) — the export routes only need the member to exist. */
async function seedMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  await t.pool.query(
    `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 4)`,
    [memberId, pariwarId],
  );
  return { memberId, pariwarId };
}

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

async function elevate(t: TestApp, memberId: string, actionContext: string): Promise<void> {
  await memberAuthRepo.insertElevation(t.deps.pool, {
    memberId,
    actionContext,
    elevatedUntil: new Date(Date.now() + 5 * 60 * 1000),
  });
}

/** Insert a `ready` export with an envelope-encrypted artifact (same fake KEK the download decrypts). */
async function seedReadyExport(
  t: TestApp,
  memberId: string,
  pariwarId: string,
  plaintext: Buffer,
  opts: { expiresAt?: Date } = {},
): Promise<string> {
  const ct = await encryption.encryptTier1(
    plaintext,
    { pariwarId, fieldClass: 'data_export' },
    t.deps.encryption.kms,
    t.deps.encryption.kekRef,
  );
  const serialized = encryption.serializeEnvelope(ct);
  const expiresAt = opts.expiresAt ?? new Date(Date.now() + 86_400_000);
  const res = await t.pool.query<{ export_id: string }>(
    `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at, ready_at, expires_at, artifact_ciphertext, artifact_bytes)
     VALUES ($1, $2, 'ready', now(), now(), $3, $4, $5) RETURNING export_id`,
    [memberId, pariwarId, expiresAt.toISOString(), serialized, plaintext.length],
  );
  return res.rows[0]!.export_id;
}

async function injectJson(
  t: TestApp,
  method: 'GET' | 'POST',
  url: string,
  token?: string,
): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({
    method,
    url,
    headers: { origin: 'http://localhost:3001', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

async function injectRaw(
  t: TestApp,
  url: string,
  token: string,
): Promise<{ status: number; contentType: string; payload: Buffer; body: Json }> {
  const res = await t.app.inject({
    method: 'GET',
    url,
    headers: { origin: 'http://localhost:3001', authorization: `Bearer ${token}` },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return {
    status: res.statusCode,
    contentType: String(res.headers['content-type'] ?? ''),
    payload: res.rawPayload,
    body,
  };
}

describe.skipIf(!hasDatabase)('Member data export — E2E (:5433)', () => {
  it('AC1: POST creates a pending row, enqueues the build job, and is idempotent', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);

      const first = await injectJson(t, 'POST', BASE, tok);
      expect(first.status).toBe(200);
      expect(first.body.status).toBe('pending');
      const exportId = String(first.body.exportId);
      // The build job was enqueued exactly once with this exportId.
      expect(t.dataExportQueue.enqueued).toHaveLength(1);
      expect((t.dataExportQueue.last?.payload as Json | undefined)?.exportId).toBe(exportId);

      // Idempotent: a second request while one is in flight returns the SAME export, no second job.
      const second = await injectJson(t, 'POST', BASE, tok);
      expect(second.status).toBe(200);
      expect(second.body.exportId).toBe(exportId);
      expect(t.dataExportQueue.enqueued).toHaveLength(1);

      // Audit: requested emitted with NON-PII context (export_id/status), no exported field value.
      const requested = t.auditSink.ofType('member_data_export.requested');
      expect(requested).toHaveLength(1);
      expect((requested[0]!.context as Json).export_id).toBe(exportId);
    } finally {
      await teardown(t);
    }
  });

  it('AC3: GET :id status needs a session only (no step-up)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);
      const created = await injectJson(t, 'POST', BASE, tok);
      const id = String(created.body.exportId);

      const status = await injectJson(t, 'GET', `${BASE}/${id}`, tok);
      expect(status.status).toBe(200);
      expect(status.body.exportId).toBe(id);
      expect(status.body.status).toBe('pending');
    } finally {
      await teardown(t);
    }
  });

  it('AC3: download is step-up gated (data_export) — 403 without; a withdrawal elevation does NOT satisfy', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);
      const id = await seedReadyExport(t, memberId, pariwarId, Buffer.from('PK-fake-zip'));

      const blocked = await injectRaw(t, `${BASE}/${id}/download`, tok);
      expect(blocked.status).toBe(403);
      expect(String((blocked.body.error as Json)?.code)).toBe('auth.step_up_required');

      // A DIFFERENT context does NOT satisfy the data_export gate (cross-context isolation).
      await elevate(t, memberId, 'withdrawal');
      const stillBlocked = await injectRaw(t, `${BASE}/${id}/download`, tok);
      expect(stillBlocked.status).toBe(403);
    } finally {
      await teardown(t);
    }
  });

  it('AC3/AC4: with a data_export elevation → streams application/zip, one-time (second → 410 consumed)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);
      const plaintext = Buffer.from('the-real-zip-bytes');
      const id = await seedReadyExport(t, memberId, pariwarId, plaintext);
      await elevate(t, memberId, 'data_export');

      const ok = await injectRaw(t, `${BASE}/${id}/download`, tok);
      expect(ok.status).toBe(200);
      expect(ok.contentType).toContain('application/zip');
      expect(ok.payload.equals(plaintext)).toBe(true);

      // consumed_at is now stamped.
      const consumed = await t.pool.query<{ consumed_at: Date | null }>(
        `SELECT consumed_at FROM data_exports WHERE export_id = $1`,
        [id],
      );
      expect(consumed.rows[0]!.consumed_at).not.toBeNull();

      // A SECOND download (elevation still fresh) → 410 consumed (one-time).
      const again = await injectRaw(t, `${BASE}/${id}/download`, tok);
      expect(again.status).toBe(410);
      expect(String((again.body.error as Json)?.code)).toBe('data_export.consumed');

      // Audit: downloaded emitted with NON-PII context only.
      const dl = t.auditSink.ofType('member_data_export.downloaded');
      expect(dl).toHaveLength(1);
      expect((dl[0]!.context as Json).export_id).toBe(id);
    } finally {
      await teardown(t);
    }
  });

  it('AC3: an expired export (ready, expiresAt in past) → 410 data_export.expired', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);
      const id = await seedReadyExport(t, memberId, pariwarId, Buffer.from('zip'), {
        expiresAt: new Date(Date.now() - 3_600_000),
      });
      await elevate(t, memberId, 'data_export');

      const res = await injectRaw(t, `${BASE}/${id}/download`, tok);
      expect(res.status).toBe(410);
      expect(String((res.body.error as Json)?.code)).toBe('data_export.expired');
    } finally {
      await teardown(t);
    }
  });

  it('AC3: a vacuum-expired export (status=expired, no ciphertext) → 410 data_export.expired', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);
      // Simulate a row the vacuum has already processed: status flipped to 'expired', artifact zeroed.
      const res = await t.pool.query<{ export_id: string }>(
        `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at, ready_at, expires_at)
         VALUES ($1, $2, 'expired', now(), now(), now() - interval '25 hours') RETURNING export_id`,
        [memberId, pariwarId],
      );
      const id = res.rows[0]!.export_id;
      await elevate(t, memberId, 'data_export');

      const r = await injectRaw(t, `${BASE}/${id}/download`, tok);
      expect(r.status).toBe(410);
      expect(String((r.body.error as Json)?.code)).toBe('data_export.expired');
    } finally {
      await teardown(t);
    }
  });
});

// ── Story 10.21 (AC12) — the terminal guard on the MEMBER self-service enqueue path ────────────────
//
// ⛔ THIS CLOSES A SHIPPED DEFECT, NOT A HYPOTHETICAL. Three facts combined to make this reachable:
//   · `requireMemberSession` is a STATELESS JWT verify — no DB read, no lifecycle check;
//   · `anonymizeMember` revokes NOTHING (zero refresh-token / elevation / session writes), so an
//     already-issued access token keeps working for the rest of its ~15-minute TTL; and
//   · this handler had NO lifecycle check, while `assemble.ts` reads `members` by id with no state
//     predicate.
// So within their token window an ERASED member could enqueue a rebuild of the very dossier the
// erasure had just zeroed — re-opening the artifact class AC11 exists to close.
//
// ⚠ The wider defect (RTBF revokes no session) is NOT closed by this and is recorded in
// `deferred-work.md` with a named successor story. This AC closes only the `data_exports` surface.
describe.skipIf(!hasDatabase)('Story 10.21 (AC12) — terminal members cannot enqueue an export', () => {
  /**
   * Seed a member at a terminal lifecycle state THROUGH THE EVENT STREAM.
   *
   * ⛔ NOT by inserting a `members` row with the state set. The guard resolves state by REPLAYING the
   * event stream (`getMemberStateAt` — the same source the shipped `assertAnonymizable` RTBF guard
   * uses), so a row-only fixture replays to `pending-kyc` and the test would assert 409 against a
   * member the system does not consider terminal at all. That is a fixture bug that looks exactly like
   * a missing guard, so it is called out here.
   */
  async function seedTerminalMember(
    t: TestApp,
    state: 'withdrawn' | 'anonymized',
  ): Promise<{ memberId: string; pariwarId: string }> {
    const memberId = randomUUID();
    const pariwarId = randomUUID();
    const scopeTx = await openScopeTx(t.deps, pariwarId);
    try {
      const mid = ids.memberId(memberId);
      const pid = ids.pariwarId(pariwarId);
      const audit = (from: string | null, to: string, trigger: string, actor: string, extra = {}) => ({
        from_state: from,
        to_state: to,
        trigger,
        actor,
        ...extra,
      });
      const project = (eventType: string, payload: unknown) =>
        memberDomain.projectMemberState(scopeTx.client, {
          memberId: mid,
          pariwarId: pid,
          eventType: eventType as never,
          actorId: memberId,
          payload: payload as never,
        });
      await project('member.signup_initiated', audit(null, 'pending-kyc', 'signup', 'member'));
      await project('member.kyc_completed', audit('pending-kyc', 'pending-fee', 'kyc', 'member'));
      await project(
        'member.vyawastha_shulk_paid',
        audit('pending-fee', 'lock-in', 'fee_paid', 'member', { utr: 'UTR-T', amount_inr: 110 }),
      );
      await project(
        'member.lock_in_expired',
        audit('lock-in', 'active', 'lock_in_expired', 'system', { kyc_verified: true }),
      );
      await project('member.withdrawal_completed', audit('active', 'withdrawn', 'withdraw', 'member'));
      if (state === 'anonymized') {
        await project('member.rtbf_anonymized', audit('withdrawn', 'anonymized', 'rtbf_request', 'member'));
      }
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return { memberId, pariwarId };
  }

  for (const state of ['anonymized', 'withdrawn'] as const) {
    it(`a ${state} member holding a live token gets 409 data_export.member_terminal — and NO row is created`, async () => {
      const t = await createTestApp();
      try {
        const { memberId, pariwarId } = await seedTerminalMember(t, state);
        // ⭐ The token is issued the ordinary way. That is the point: erasure does not invalidate it,
        // so this is exactly the request an erased member could make today.
        const tok = token(t, memberId, pariwarId);

        const res = await injectJson(t, 'POST', '/api/v1/member/data-export', tok);

        expect(res.status).toBe(409);
        // ⛔ The code is `data_export.member_terminal`, following the five shipped TERMINAL_STATES
        // guards — NOT an `rtbf.already_anonymized`-shaped code, which would tell a client the wrong
        // thing about what happened on a non-RTBF route.
        expect(String((res.body.error as Json)?.code)).toBe('data_export.member_terminal');

        // ⭐ THE LOAD-BEARING ASSERTION: no row. A 409 that still created a `pending` row would leave
        // the dossier rebuildable AND would wedge the member behind the one-pending-per-member index.
        const rows = await t.pool.query('SELECT export_id FROM data_exports WHERE member_id = $1', [
          memberId,
        ]);
        expect(rows.rowCount).toBe(0);
      } finally {
        await teardown(t);
      }
    });
  }

  it('a LIVE member is unaffected — the guard is additive, not a regression', async () => {
    // ⛔ Revert-sanity for the guard itself: if this fails, the terminal set was widened too far and
    // ordinary members can no longer exercise their access right at all.
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t); // 'active'
      const tok = token(t, memberId, pariwarId);
      const res = await injectJson(t, 'POST', '/api/v1/member/data-export', tok);
      expect(res.status).not.toBe(409);
    } finally {
      await teardown(t);
    }
  });
});
