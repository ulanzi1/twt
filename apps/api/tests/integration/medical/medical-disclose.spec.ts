// Medical disclosure E2E (live DB :5433) — Story 3.5 (Task 10; AC1–AC6).
//
// Drives the full surface through `app.inject`:
//   · submit (1 condition + ack) → ONE member.medical_disclosed event (non-PII payload,
//     from_state===to_state), ONE consent_records row (medical_disclosure_ack, consent_artifact_ref
//     === the resolved niy.concealment.r14 clause_version_id, audit_id non-null pointing at a real
//     chain line), ONE member_medical_disclosures row (Tier-1 encrypted) — and NO condition code in
//     the event / audit / at-rest plaintext (R1). The recorded ima_list_version is the SERVER-
//     resolved clause_version_id (a stale client value is ignored).
//   · zero-conditions submit is valid (count 0, still emits event + consent + disclosure — R5).
//   · re-submit APPENDS a 2nd disclosure (history grows — AC4, append-only).
//   · unknown IMA code → 400; ack=false → 400.
//   · AC6 atomicity — ima-list-clause-absent → 409 with NO partial writes; concealment-clause-
//     absent → 409 with NO partial writes (for each: no event, no consent, no disclosure row).
//   · terminal-state → 409; status GET no-PII echo-back; ima-list GET catalog + 503 when absent;
//     no token → 401.
//
// Member creation is Story 3.6 (R2) — the harness SEEDS a member + a token + BOTH clauses into the
// member's REAL Pariwar (R6 — the seed only populates the synthetic Pariwar).

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { createMedicalHandlers } from '../../../src/modules/medical/medical.handlers.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

const ACK_EN = 'EN ACK COPY — concealment may cause denial.';
const ACK_HI = 'HI ACK COPY — छिपाने पर दावा अस्वीकार हो सकता है।';

/** Seed BOTH medical clauses into the member's REAL Pariwar (committed, superuser bypasses RLS).
 * Pass `{ imaList: false }` / `{ concealment: false }` to omit one (the AC6 absence tests). */
async function seedMedicalClauses(
  t: TestApp,
  pariwarId: string,
  opts: { imaList?: boolean; concealment?: boolean } = {},
): Promise<{ imaVersion: string | null; concealVersion: string | null }> {
  const out: { imaVersion: string | null; concealVersion: string | null } = {
    imaVersion: null,
    concealVersion: null,
  };
  const insert = async (clauseId: string, payload: Json): Promise<string> => {
    const cvid = randomUUID();
    await t.pool.query(
      `INSERT INTO clause_versions
         (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
       VALUES ($1, $2, $3, 1, '2025-01-01T00:00:00Z', $4::jsonb, 'pool')`,
      [cvid, clauseId, pariwarId, JSON.stringify(payload)],
    );
    return cvid;
  };
  if (opts.imaList !== false) {
    out.imaVersion = await insert('niy.medical.ima-list', {
      rule_code: 'IMA-LIST',
      conditions: [
        { code: 'ckd', label_en: 'Chronic kidney disease', label_hi: 'गुर्दा रोग' },
        { code: 'malignancy', label_en: 'Cancer / malignancy', label_hi: 'कैंसर' },
      ],
      provisional: true,
    });
  }
  if (opts.concealment !== false) {
    out.concealVersion = await insert('niy.concealment.r14', {
      rule_code: 'R14',
      ack_text_en: ACK_EN,
      ack_text_hi: ACK_HI,
      never_auto_deny: true,
      provisional: true,
    });
  }
  return out;
}

/** Seed a member in `pending-fee` (signup_initiated → kyc_manual_fallback), committed. */
async function seedMemberPendingFee(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.signup_initiated', actorId: memberId,
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.kyc_manual_fallback', actorId: memberId,
      payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' },
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { memberId, pariwarId };
}

/** Seed a WITHDRAWN (terminal) member: pending-kyc → pending-fee → lock-in → active → withdrawn. */
async function seedWithdrawnMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.signup_initiated', actorId: memberId,
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.kyc_manual_fallback', actorId: memberId,
      payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.vyawastha_shulk_paid', actorId: memberId,
      payload: { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'payment', actor: 'member', utr: 'TEST-UTR-0000', amount_inr: 1000 },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.lock_in_expired', actorId: null,
      payload: { from_state: 'lock-in', to_state: 'active', trigger: 'lock_in_expiry', actor: 'system', kyc_verified: true },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.withdrawal_completed', actorId: memberId,
      payload: { from_state: 'active', to_state: 'withdrawn', trigger: 'withdrawal', actor: 'member' },
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { memberId, pariwarId };
}

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

async function inject(
  t: TestApp,
  method: 'GET' | 'POST',
  url: string,
  opts: { payload?: Json; token?: string } = {},
): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({
    method,
    url,
    payload: opts.payload,
    headers: {
      origin: 'http://localhost:3001',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

async function eventTypes(t: TestApp, memberId: string): Promise<string[]> {
  const res = await t.pool.query<{ event_type: string }>(
    `SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version`,
    [memberId],
  );
  return res.rows.map((r) => r.event_type);
}

async function disclosureCount(t: TestApp, memberId: string): Promise<number> {
  const r = await t.pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM member_medical_disclosures WHERE member_id = $1`,
    [memberId],
  );
  return r.rows[0]?.n ?? 0;
}

async function consentRows(t: TestApp, memberId: string): Promise<Json[]> {
  const r = await t.pool.query<Json>(
    `SELECT consent_type, consent_artifact_ref, audit_id, consent_payload, granted_via_actor
       FROM consent_records WHERE subject_id = $1 AND consent_type = 'medical_disclosure_ack'`,
    [memberId],
  );
  return r.rows;
}

describe.skipIf(!hasDatabase)('Medical disclosure — E2E (:5433)', () => {
  it('AC1/AC2/AC3/AC6: submit 1 condition + ack → event + consent (audit-or-throw) + encrypted row; no PII', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const { imaVersion, concealVersion } = await seedMedicalClauses(t, pariwarId);

      const res = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        // A deliberately STALE client imaListVersion — the server's resolved version must win.
        payload: {
          conditionCodes: ['ckd'],
          additionalContext: 'mild, well-managed',
          imaListVersion: 'client-stale-version',
          acknowledged: true,
          ackLocale: 'en',
        },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(200);
      expect(res.body.historyCount).toBe(1);
      expect(res.body.latest).toMatchObject({
        imaListVersion: imaVersion, // SERVER-resolved, not the stale client value
        conditionCount: 1,
        hasAdditionalContext: true,
        ackLocale: 'en',
      });

      // Lifecycle UNCHANGED (non-transition marker — R4).
      const st = await t.pool.query<{ state: string }>(`SELECT state FROM members WHERE member_id = $1`, [memberId]);
      expect(st.rows[0]?.state).toBe('pending-fee');

      // ONE member.medical_disclosed event; non-PII payload; from_state===to_state.
      expect((await eventTypes(t, memberId)).filter((e) => e === 'member.medical_disclosed').length).toBe(1);
      const ev = await t.pool.query<{ payload: Json }>(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'member.medical_disclosed'`,
        [memberId],
      );
      expect(ev.rows[0]?.payload).toMatchObject({
        from_state: 'pending-fee',
        to_state: 'pending-fee',
        ima_list_version: imaVersion,
        condition_count: 1,
        acknowledged: true,
        ack_locale: 'en',
      });
      expect(JSON.stringify(ev.rows[0]?.payload)).not.toContain('ckd'); // NO condition code in the event

      // ONE consent_records row: medical_disclosure_ack, ref = niy.concealment.r14 cvid, audit_id non-null.
      const consents = await consentRows(t, memberId);
      expect(consents).toHaveLength(1);
      expect(consents[0]).toMatchObject({
        consent_type: 'medical_disclosure_ack',
        consent_artifact_ref: concealVersion,
        granted_via_actor: 'member_self',
      });
      expect(consents[0]?.audit_id).not.toBeNull();
      // The exact acknowledged wording is recorded as checkboxTextShown (provenance).
      expect(JSON.stringify(consents[0]?.consent_payload)).toContain(ACK_EN);

      // The consent's audit_id points at a REAL chain line written by writeAuditEntry.
      const auditId = (consents[0] as { audit_id: string }).audit_id;
      const auditLine = await t.pool.query<{ action: string; request_payload_hash: string }>(
        `SELECT action, request_payload_hash FROM audit_log_entries WHERE audit_id = $1`,
        [auditId],
      );
      expect(auditLine.rows[0]?.action).toBe('member_medical.disclosed');
      expect(auditLine.rows[0]?.request_payload_hash).not.toContain('ckd'); // hash is NON-PII

      // ONE member_medical_disclosures row, Tier-1 ENCRYPTED at rest (plaintext never present).
      const row = await t.pool.query<{ disclosed_conditions_ciphertext: string; additional_context_ciphertext: string; condition_count: number; ima_list_version: string }>(
        `SELECT disclosed_conditions_ciphertext, additional_context_ciphertext, condition_count, ima_list_version
           FROM member_medical_disclosures WHERE member_id = $1`,
        [memberId],
      );
      expect(row.rows).toHaveLength(1);
      expect(row.rows[0]?.condition_count).toBe(1);
      expect(row.rows[0]?.ima_list_version).toBe(imaVersion);
      expect(row.rows[0]?.disclosed_conditions_ciphertext).not.toContain('ckd');
      expect(row.rows[0]?.additional_context_ciphertext).not.toContain('mild');

      // emitAuthAudit fired with NO PII context.
      expect(t.auditSink.ofType('member_medical.disclosed').length).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(t.auditSink.events)).not.toContain('ckd');
      expect(JSON.stringify(t.auditSink.events)).not.toContain('mild');
    } finally {
      await teardown(t);
    }
  });

  it('R5: zero-conditions submit is valid — count 0, still emits event + consent + disclosure', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const { imaVersion } = await seedMedicalClauses(t, pariwarId);

      const res = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: { conditionCodes: [], imaListVersion: imaVersion, acknowledged: true, ackLocale: 'hi' },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(200);
      expect(res.body.latest).toMatchObject({ conditionCount: 0, hasAdditionalContext: false, ackLocale: 'hi' });
      expect(res.body.historyCount).toBe(1);

      expect((await eventTypes(t, memberId)).filter((e) => e === 'member.medical_disclosed').length).toBe(1);
      expect(await consentRows(t, memberId)).toHaveLength(1);
      const r5rows = await t.pool.query<{ condition_count: number }>(
        `SELECT condition_count FROM member_medical_disclosures WHERE member_id = $1`,
        [memberId],
      );
      expect(r5rows.rows).toHaveLength(1);
      expect(r5rows.rows[0]?.condition_count).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC4: re-submit APPENDS a 2nd disclosure (history grows — append-only)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const { imaVersion } = await seedMedicalClauses(t, pariwarId);
      const tok = token(t, memberId, pariwarId);

      const first = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: { conditionCodes: ['ckd'], imaListVersion: imaVersion, acknowledged: true, ackLocale: 'en' },
        token: tok,
      });
      expect(first.status).toBe(200);
      expect(first.body.historyCount).toBe(1);

      const second = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: { conditionCodes: ['ckd', 'malignancy'], imaListVersion: imaVersion, acknowledged: true, ackLocale: 'en' },
        token: tok,
      });
      expect(second.status).toBe(200);
      expect(second.body.historyCount).toBe(2); // history GREW (append-only, not replaced)
      expect(second.body.latest).toMatchObject({ conditionCount: 2 });

      // TWO events, TWO consent rows, TWO disclosure rows (membership: distinct condition counts).
      expect((await eventTypes(t, memberId)).filter((e) => e === 'member.medical_disclosed').length).toBe(2);
      expect(await consentRows(t, memberId)).toHaveLength(2);
      const disclosureRows = await t.pool.query<{ condition_count: number }>(
        `SELECT condition_count FROM member_medical_disclosures WHERE member_id = $1`,
        [memberId],
      );
      expect(disclosureRows.rows.map((r) => r.condition_count).sort((a, b) => a - b)).toEqual([1, 2]);
    } finally {
      await teardown(t);
    }
  });

  it('rejects an unknown IMA condition code (400)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const { imaVersion } = await seedMedicalClauses(t, pariwarId);

      const res = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: { conditionCodes: ['ckd', 'not-a-real-code'], imaListVersion: imaVersion, acknowledged: true, ackLocale: 'en' },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(400);
      expect(String((res.body.error as Json)?.code)).toBe('medical.unknown_condition_code');
      // No partial writes.
      expect(await disclosureCount(t, memberId)).toBe(0);
      expect(await consentRows(t, memberId)).toHaveLength(0);
      expect((await eventTypes(t, memberId)).filter((e) => e === 'member.medical_disclosed').length).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  // AC2 has TWO enforcement layers: the contract's `z.literal(true)` (rejects over HTTP, below) AND
  // the handler's own `medical.acknowledgment_required` guard (the next test). The HTTP path can
  // only ever exercise the contract layer — so the handler guard, which Story 3.9 relies on when it
  // re-runs the submit SERVICE behind step-up, gets its own direct-call test.
  it('AC2: the contract layer rejects a false acknowledgment over HTTP (400)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const { imaVersion } = await seedMedicalClauses(t, pariwarId);

      const res = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: { conditionCodes: [], imaListVersion: imaVersion, acknowledged: false, ackLocale: 'en' },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(400);
      expect(await disclosureCount(t, memberId)).toBe(0);
      expect(await consentRows(t, memberId)).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC2: the handler server-enforces the ack independently of the contract (defense-in-depth for 3.9)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      await seedMedicalClauses(t, pariwarId);
      const handlers = createMedicalHandlers(t.deps);

      // Call the SERVICE directly with acknowledged:false — bypassing the Fastify `z.literal(true)`
      // gate — to prove the handler's own guard fires (the branch 3.9 re-runs behind step-up). The
      // guard runs before openScopeTx, so nothing is written.
      const fakeRequest = {
        body: { conditionCodes: [], imaListVersion: 'x', acknowledged: false, ackLocale: 'en' },
        requestContext: { actorId: memberId, pariwarId, traceId: null },
      } as unknown as Parameters<typeof handlers.submit>[0];
      await expect(handlers.submit(fakeRequest)).rejects.toMatchObject({
        code: 'medical.acknowledgment_required',
      });
      expect(await disclosureCount(t, memberId)).toBe(0);
      expect(await consentRows(t, memberId)).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('rejects duplicate conditionCodes (400 — conditionCodes must be unique)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const { imaVersion } = await seedMedicalClauses(t, pariwarId);

      const res = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: {
          conditionCodes: ['ckd', 'ckd'],
          imaListVersion: imaVersion,
          acknowledged: true,
          ackLocale: 'en',
        },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(400);
      expect(await disclosureCount(t, memberId)).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('rejects an invalid ackLocale value (400)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const { imaVersion } = await seedMedicalClauses(t, pariwarId);

      const res = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: {
          conditionCodes: [],
          imaListVersion: imaVersion,
          acknowledged: true,
          ackLocale: 'fr',
        },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(400);
      expect(await disclosureCount(t, memberId)).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC6: ima-list clause absent → 409 with NO partial writes', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      // Seed ONLY the concealment clause — the IMA list is unprovisioned.
      await seedMedicalClauses(t, pariwarId, { imaList: false });

      const res = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: { conditionCodes: [], imaListVersion: 'x', acknowledged: true, ackLocale: 'en' },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('medical.ima_list_unavailable');
      // NO partial writes — atomic failure (AC6).
      expect(await disclosureCount(t, memberId)).toBe(0);
      expect(await consentRows(t, memberId)).toHaveLength(0);
      expect((await eventTypes(t, memberId)).filter((e) => e === 'member.medical_disclosed').length).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC6: concealment clause absent → 409 with NO partial writes', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      // Seed ONLY the IMA list — the concealment clause is unprovisioned.
      const { imaVersion } = await seedMedicalClauses(t, pariwarId, { concealment: false });

      const res = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: { conditionCodes: ['ckd'], imaListVersion: imaVersion, acknowledged: true, ackLocale: 'en' },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('medical.concealment_clause_unavailable');
      // NO partial writes — atomic failure (AC6).
      expect(await disclosureCount(t, memberId)).toBe(0);
      expect(await consentRows(t, memberId)).toHaveLength(0);
      expect((await eventTypes(t, memberId)).filter((e) => e === 'member.medical_disclosed').length).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('rejects disclosure for a member in a terminal state (409)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedWithdrawnMember(t);
      await seedMedicalClauses(t, pariwarId);

      const res = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: { conditionCodes: [], imaListVersion: 'x', acknowledged: true, ackLocale: 'en' },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(409);
      expect(String((res.body.error as Json)?.code)).toBe('medical.member_terminal');
      expect(await disclosureCount(t, memberId)).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('GET status returns the latest disclosure as a NON-PII summary (no echo-back)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const { imaVersion } = await seedMedicalClauses(t, pariwarId);
      await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: { conditionCodes: ['ckd'], additionalContext: 'secret-detail', imaListVersion: imaVersion, acknowledged: true, ackLocale: 'en' },
        token: token(t, memberId, pariwarId),
      });

      const get = await inject(t, 'GET', '/api/v1/member/medical-disclosure', { token: token(t, memberId, pariwarId) });
      expect(get.status).toBe(200);
      expect(get.body.historyCount).toBe(1);
      expect(get.body.latest).toMatchObject({ conditionCount: 1, hasAdditionalContext: true, ackLocale: 'en' });
      // No raw condition codes / free-text echoed back.
      expect(JSON.stringify(get.body)).not.toContain('ckd');
      expect(JSON.stringify(get.body)).not.toContain('secret-detail');
    } finally {
      await teardown(t);
    }
  });

  it('GET ima-list returns the catalog + ack copy; 503 when the registry is unprovisioned', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const tok = token(t, memberId, pariwarId);

      // Unprovisioned (no clauses seeded) → 503.
      const before = await inject(t, 'GET', '/api/v1/member/medical-disclosure/ima-list', { token: tok });
      expect(before.status).toBe(503);

      const { imaVersion } = await seedMedicalClauses(t, pariwarId);
      const after = await inject(t, 'GET', '/api/v1/member/medical-disclosure/ima-list', { token: tok });
      expect(after.status).toBe(200);
      expect(after.body.version).toBe(imaVersion);
      expect((after.body.conditions as Json[]).map((c) => c.code)).toEqual(['ckd', 'malignancy']);
      expect(after.body.ackText).toMatchObject({ en: ACK_EN, hi: ACK_HI });
    } finally {
      await teardown(t);
    }
  });

  it('GET ima-list 503s when ONLY the concealment clause is unprovisioned (partial provisioning)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      // IMA list resolves but the concealment clause is absent — the handler's SECOND 503 branch.
      await seedMedicalClauses(t, pariwarId, { concealment: false });

      const res = await inject(t, 'GET', '/api/v1/member/medical-disclosure/ima-list', {
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(503);
      expect(String((res.body.error as Json)?.code)).toBe('medical.concealment_clause_service_unavailable');
    } finally {
      await teardown(t);
    }
  });

  it('GET status returns the empty shape for a member who has never disclosed (200)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);

      const get = await inject(t, 'GET', '/api/v1/member/medical-disclosure', {
        token: token(t, memberId, pariwarId),
      });
      expect(get.status).toBe(200);
      expect(get.body).toMatchObject({ latest: null, historyCount: 0 });
    } finally {
      await teardown(t);
    }
  });

  it('rejects additionalContext longer than the 2000-char cap (400)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberPendingFee(t);
      const { imaVersion } = await seedMedicalClauses(t, pariwarId);

      const res = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: {
          conditionCodes: [],
          additionalContext: 'a'.repeat(2001),
          imaListVersion: imaVersion,
          acknowledged: true,
          ackLocale: 'en',
        },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(400);
      expect(await disclosureCount(t, memberId)).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('requires a member session (401 without a token)', async () => {
    const t = await createTestApp();
    try {
      const res = await inject(t, 'POST', '/api/v1/member/medical-disclosure', {
        payload: { conditionCodes: [], imaListVersion: 'x', acknowledged: true, ackLocale: 'en' },
      });
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
  // Live-DB suite timeout: several tests here run multiple sequential live-DB round-trips (seed +
  // HTTP submit + event/consent/row assertions) against a shared :5433 container; under concurrent
  // `turbo`/`ci:local` load they can exceed the 5s vitest default (observed 2026-07-11 during Story
  // 6.8's ci:local verification — passes in isolation). 20s removes the contention flake without
  // masking a real hang (see apps/jobs/tests/audit/integrity-check.test.ts precedent).
}, { timeout: 20000 });
