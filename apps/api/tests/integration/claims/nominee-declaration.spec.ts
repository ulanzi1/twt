// The nominee declaration HISTORY surface — E2E (:5433). Story 6.20 (Task 4 / Task 5 / Task 9;
// AC3, AC4, AC7, AC9, AC11 (iii), D10, D14).
//
// Drives every new admin route through a real admin session (passkey login + a role grant + scope):
//   · each route is refused WITHOUT a session (401 — the non-human/system-actor denial), refused to a role
//     without its key (403), and refused across Pariwars (403 — cross-tenant);
//   · the timeline carries METADATA only (⛔ no name, mobile, address, date) and ⛔ no highlight; the
//     snapshots decrypt ON DEMAND and audit with ids only;
//   · the determination validates against D6 (a lying mark is a typed 409) and returns the new status;
//   · the correction runs raise (helpline) → District Admin → Pariwar Admin through HTTP; `other` is a
//     typed 409 at the raise; a correction on a claim that does not exist is a 404 (⚠ a 404, ⛔ not a
//     "refusal" — asserted as exactly that, per AC11);
//   · the member-app raise is Ravi-mode (the claim's deceased is the session) behind the `nominee_change` step-up;
//   · ⭐ AC11(iii) — the `-239` REFUSAL ON SUSPICION: the District Admin denies with the dedicated reason
//     code, the Pariwar Admin SEES it on the read surface (⛔ never asked to approve), and it is
//     APPEALABLE ONCE, the refuser disqualified from reviewing their own refusal.

import { randomUUID } from 'node:crypto';

import { claim, cycleCalendar, ids, member as memberDomain, nominee } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as memberAuthRepo from '../../../src/modules/auth/member/member-auth.repo.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { encryptVerifierRationale } from '../../../src/modules/claims/verifier-decision-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { encryptNomineeField } from '../../../src/modules/nominee/nominee-crypto.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const PRE = new Date('2026-01-10T06:00:00.000Z');
const POST_DEATH = new Date('2026-06-10T06:00:00.000Z');
const CERT = '2026-05-01';

describe.skipIf(!hasDatabase)('Story 6.20 — the nominee declaration surface — E2E (:5433)', { timeout: 30000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let fakeWebauthn: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = await buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    app = await buildServer(deps);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function authenticate(displayName: string): Promise<{ client: Client; userId: string }> {
    const email = `nd-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    await service.setAdminDisplayName(deps, userId, displayName);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function actor(pariwarId: string, role: string, dim: 'district' | 'pariwar', value: string, name: string) {
    const { client, userId } = await authenticate(name);
    await td.pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
      [userId, pariwarId, role, dim, value],
    );
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    return { client, userId };
  }

  async function inScope<T>(pariwarId: string, fn: (s: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>): Promise<T> {
    const s = await openScopeTx(deps, pariwarId);
    try {
      const out = await fn(s);
      await closeScopeTx(s, true);
      return out;
    } catch (err) {
      await closeScopeTx(s, false);
      throw err;
    }
  }

  /**
   * A deceased member (a REAL member stream — a correction appends to it), a posting district, a
   * declaration of ONE nominee (real Tier-1 ciphertext) dated `at` for each entry of `declarations`,
   * and a claim driven to `verifier_review`.
   */
  async function world(opts: { relationship?: string; declarations?: Date[] } = {}) {
    const pariwarId = randomUUID();
    const district = `D-${randomUUID().slice(0, 8)}`;
    const memberId = randomUUID();
    const claimCaseId = randomUUID();
    await inScope(pariwarId, async (s) => {
      const mid = ids.memberId(memberId);
      const pid = ids.pariwarId(pariwarId);
      await memberDomain.projectMemberState(s.client, {
        memberId: mid,
        pariwarId: pid,
        eventType: 'member.signup_initiated',
        payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
        actorId: memberId,
      });
      await s.client.query(
        `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at) VALUES ($1, $2, $3, false, now())`,
        [memberId, pariwarId, district],
      );
      for (const [i, at] of (opts.declarations ?? [PRE]).entries()) {
        const row = {
          rank: 1 as const,
          splitPct: 100 as const,
          relationship: opts.relationship ?? 'spouse',
          nameCiphertext: await encryptNomineeField(i === 0 ? 'Asha Devi' : 'Mohan Lal', pariwarId, deps.encryption),
          mobileCiphertext: await encryptNomineeField('9876543210', pariwarId, deps.encryption),
          addressCiphertext: null,
        };
        await nominee.replaceMemberNominees(s.tx, { memberId: mid, pariwarId: pid, nominees: [row] });
        await nominee.appendMemberDeclarationVersions(s.tx, {
          memberId: mid,
          pariwarId: pid,
          plan: nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(s.tx, pid, mid), [1]),
          nominees: [row],
          recordedAt: at,
          eventVersion: null,
        });
      }
      const emit = (from: string | null, to: string, eventType: string, extra: Json = {}) =>
        claim.projectClaimState(s.client, {
          claimCaseId: ids.claimId(claimCaseId),
          pariwarId: pid,
          deceasedMemberId: mid,
          intakeChannels: ['helpline'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra } as never,
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: memberId, intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
    });
    return { pariwarId, district, memberId, claimCaseId };
  }

  const base = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}`;
  const errCode = (b: Json) => String((b.error as Json | undefined)?.code);

  async function timeline(client: Client, p: string, c: string) {
    const res = await client.inject({ method: 'GET', url: `${base(p, c)}/nominee-declaration` });
    expect(res.statusCode).toBe(200);
    return res.json() as {
      versions: { version_id: string; effective_at: string }[];
      watermark: { rank1: number | null; rank2: number | null };
      live_determination: { determination_id: string } | null;
      declaration_status: string;
    };
  }

  async function determineHonestly(client: Client, p: string, c: string) {
    const t = await timeline(client, p, c);
    const cutoff = cycleCalendar.istMidnightAt(CERT).getTime();
    return client.inject({
      method: 'POST',
      url: `${base(p, c)}/nominee-determination`,
      payload: {
        certificate_date: CERT,
        marks: t.versions.map((v) => ({ version_id: v.version_id, mark: new Date(v.effective_at).getTime() < cutoff ? 'stands' : 'discarded' })),
        note: 'Certificate dated 2026-05-01; the June change is after the death.',
        watermark: t.watermark,
        expected_live_determination_id: t.live_determination?.determination_id ?? null,
      },
    });
  }

  // ── The route chain on EVERY new admin route ──────────────────────────────────────────────────
  it('⭐ every new admin route refuses a caller with NO session (401 — the non-human / system-actor denial)', async () => {
    // ⚠ Each POST carries a STRUCTURALLY VALID body: Fastify validates BEFORE the preHandler chain, so an
    // invalid body would 400 and make this pass for the wrong reason.
    const { pariwarId, claimCaseId } = await world();
    const anon = makeClient(app);
    const cid = claimCaseId;
    const corr = randomUUID();
    const decision = { outcome: 'approve', note: 'n' };
    const raiseBody = { rank: 1, proposed: { name: 'Asha Devi', relationship: 'spouse', mobile: '9876543210' }, note: 'n' };
    const determination = { certificate_date: CERT, marks: [], note: 'n', watermark: { rank1: 1, rank2: null }, expected_live_determination_id: null };
    for (const [method, url, payload] of [
      ['GET', `/api/v1/p/${pariwarId}/admin/nominee-refusals`, undefined],
      ['GET', `/api/v1/p/${pariwarId}/admin/nominee-corrections/pending`, undefined],
      ['GET', `${base(pariwarId, cid)}/nominee-declaration`, undefined],
      ['GET', `${base(pariwarId, cid)}/nominee-declaration/snapshots`, undefined],
      ['POST', `${base(pariwarId, cid)}/nominee-determination`, determination],
      ['GET', `${base(pariwarId, cid)}/nominee-corrections`, undefined],
      ['POST', `${base(pariwarId, cid)}/nominee-corrections`, raiseBody],
      ['POST', `${base(pariwarId, cid)}/nominee-corrections/${corr}/district-decision`, decision],
      ['POST', `${base(pariwarId, cid)}/nominee-corrections/${corr}/pariwar-decision`, decision],
    ] as const) {
      const res = await anon.inject({ method, url, payload: payload as Json | undefined });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it('⛔ a role WITHOUT the view key is refused the timeline and snapshots (403)', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'block_admin', 'district', w.district, 'Block Admin');
    expect((await client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-declaration` })).statusCode).toBe(403);
    expect((await client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-declaration/snapshots` })).statusCode).toBe(403);
  });

  it('⛔ CROSS-PARIWAR — a District Admin of Pariwar X cannot reach Pariwar Y\'s claim on any route (403 / 404)', async () => {
    const x = await world();
    const y = await world();
    const { client } = await actor(x.pariwarId, 'district_admin', 'district', x.district, 'Anita (District Admin)');
    for (const url of [
      `${base(y.pariwarId, y.claimCaseId)}/nominee-declaration`,
      `${base(y.pariwarId, y.claimCaseId)}/nominee-declaration/snapshots`,
      `${base(y.pariwarId, y.claimCaseId)}/nominee-corrections`,
    ]) {
      // The scope middleware refuses a Pariwar the caller holds no grant in — as a 404 (⛔ existence is
      // never confirmed) or a 403. Either way ⛔ no body of Pariwar Y is returned.
      const res = await client.inject({ method: 'GET', url });
      expect([403, 404], url).toContain(res.statusCode);
      expect(res.body).not.toContain(y.claimCaseId.slice(0, 8) + '-');
    }
  });

  // ── AC3 — the timeline + the snapshots ────────────────────────────────────────────────────────
  it('⭐ AC3 — the timeline is METADATA ONLY (recorded_at AND effective_at), ⛔ no name and ⛔ no "after the death" label', async () => {
    const w = await world({ declarations: [PRE, POST_DEATH] });
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const res = await client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-declaration` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Json;
    expect(body).toMatchObject({ declaration_status: 'undetermined', live_determination: null, determination_recordable: true, watermark: { rank1: 2, rank2: null } });
    const versions = body.versions as Json[];
    expect(versions).toHaveLength(2);
    for (const v of versions) expect(Object.keys(v)).toEqual(expect.arrayContaining(['recorded_at', 'effective_at', 'source']));
    const text = res.body;
    for (const forbidden of ['Asha', 'Mohan', '9876543210', 'after_death', 'post_death', 'highlight', 'suggested']) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('⭐ D10 — the snapshots DECRYPT on demand, and the audit line carries ids only', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const res = await client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-declaration/snapshots` });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { snapshots: Json[] }).snapshots[0]).toMatchObject({ name: { state: 'readable', value: 'Asha Devi' } });
    const audits = td.auditSink.ofType('admin_nominee_declaration.snapshots_read');
    expect(audits.length).toBeGreaterThan(0);
    expect(JSON.stringify(audits)).not.toContain('Asha');
  });

  // ── AC4 — the determination ───────────────────────────────────────────────────────────────────
  it('⭐ AC4 — an honest determination is recorded (201) and the declaration becomes EFFECTIVE', async () => {
    const w = await world({ declarations: [PRE, POST_DEATH] });
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const res = await determineHonestly(client, w.pariwarId, w.claimCaseId);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ stands_count: 1, discarded_count: 1, declaration_status: 'effective' });
    // AC5 site C — the names read now shows the EFFECTIVE nominee (Asha), ⛔ not the post-death one.
    const names = await client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-name-check` });
    expect(names.statusCode).toBe(200);
    expect(names.body).toContain('Asha Devi');
    expect(names.body).not.toContain('Mohan Lal');
  });

  it('⛔ AC4 — a mark that disagrees with the certificate date is a typed 409 (a guard, ⛔ never corrected)', async () => {
    const w = await world({ declarations: [PRE, POST_DEATH] });
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const t = await timeline(client, w.pariwarId, w.claimCaseId);
    const res = await client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/nominee-determination`,
      payload: {
        certificate_date: CERT,
        marks: t.versions.map((v) => ({ version_id: v.version_id, mark: 'stands' })),
        note: 'Everything stands.',
        watermark: t.watermark,
        expected_live_determination_id: null,
      },
    });
    expect(res.statusCode).toBe(409);
    expect(errCode(res.json() as Json)).toBe('nominee_determination.inconsistent_mark');
  });

  it('⛔ a VERIFIER may read the timeline but may ⛔ NOT determine (403)', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'verifier', 'district', w.district, 'Vera (Verifier)');
    expect((await client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-declaration` })).statusCode).toBe(200);
    expect((await determineHonestly(client, w.pariwarId, w.claimCaseId)).statusCode).toBe(403);
  });

  // ── AC7 — the correction through HTTP ─────────────────────────────────────────────────────────
  it('⭐⭐ AC7 — helpline raises → District Admin approves → Pariwar Admin approves: APPLIED, target shown beside proposal', async () => {
    const w = await world();
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const helpline = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');
    const pa = await actor(w.pariwarId, 'pariwar_admin', 'pariwar', w.pariwarId, 'Kalpana (Pariwar Admin)');
    expect((await determineHonestly(da.client, w.pariwarId, w.claimCaseId)).statusCode).toBe(201);

    const raise = await helpline.client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/nominee-corrections`,
      payload: {
        rank: 1,
        proposed: { name: 'Asha Kumari', relationship: 'spouse', mobile: '9876543210' },
        note: 'Maiden name on the bank passbook.',
      },
    });
    expect(raise.statusCode).toBe(201);
    const { correction_id } = raise.json() as { correction_id: string };

    // ⛔ The District Admin cannot raise (CC2 — never the District Admin alone).
    const daRaise = await da.client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/nominee-corrections`,
      payload: { rank: 1, proposed: { name: 'X Y', relationship: 'spouse', mobile: '9876543210' }, note: 'n' },
    });
    expect(daRaise.statusCode).toBe(403);

    const list = await da.client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-corrections` });
    expect(list.statusCode).toBe(200);
    expect((list.json() as { corrections: Json[] }).corrections[0]).toMatchObject({
      step: 'da_pending',
      target: { relationship: 'spouse', name: { state: 'readable', value: 'Asha Devi' } },
      proposed: { relationship: 'spouse', name: { state: 'readable', value: 'Asha Kumari' } },
    });

    const step1 = await da.client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/nominee-corrections/${correction_id}/district-decision`,
      payload: { outcome: 'approve', note: 'Passbook seen.' },
    });
    expect(step1.statusCode).toBe(200);
    expect(step1.json()).toMatchObject({ step: 'pa_pending' });

    // ⭐ The Pariwar Admin's QUEUE finds it (they cannot open the verifier console); ⛔ no PII on it.
    const queue = await pa.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/nominee-corrections/pending` });
    expect(queue.statusCode).toBe(200);
    expect((queue.json() as { items: Json[] }).items).toEqual([
      expect.objectContaining({ correction_id, claim_case_id: w.claimCaseId, rank: 1, raised_via: 'helpline' }),
    ]);
    expect(queue.body).not.toContain('Asha');
    // ⛔ The District Admin holds no step-2 key, so the Pariwar Admin's queue is not theirs.
    expect((await da.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/nominee-corrections/pending` })).statusCode).toBe(403);

    const step2 = await pa.client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/nominee-corrections/${correction_id}/pariwar-decision`,
      payload: { outcome: 'approve', note: 'Agreed.' },
    });
    expect(step2.statusCode).toBe(200);
    expect(step2.json()).toMatchObject({ step: 'applied' });
    // D7 — the determination is superseded; the timeline says so.
    expect((await timeline(da.client, w.pariwarId, w.claimCaseId)).declaration_status).toBe('undetermined');
    // ⛔ No name reached any audit line.
    expect(JSON.stringify(td.auditSink.ofType('admin_claim.nominee_correction_raised'))).not.toContain('Asha');
  });

  it('⭐⭐ AC11(i) — a raise against an `other` nominee is a typed 409 AT THE RAISE', async () => {
    const w = await world({ relationship: 'other' });
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const helpline = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');
    await determineHonestly(da.client, w.pariwarId, w.claimCaseId);
    const res = await helpline.client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/nominee-corrections`,
      payload: { rank: 1, proposed: { name: 'Asha Kumari', relationship: 'spouse', mobile: '9876543210' }, note: 'n' },
    });
    expect(res.statusCode).toBe(409);
    expect(errCode(res.json() as Json)).toBe('nominee_correction.relationship_other');
  });

  it('⚠ a correction on a claim that does NOT exist is a 404 (asserted as a 404, ⛔ not called a refusal)', async () => {
    const w = await world();
    const helpline = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');
    const res = await helpline.client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, randomUUID())}/nominee-corrections`,
      payload: { rank: 1, proposed: { name: 'Asha Kumari', relationship: 'spouse', mobile: '9876543210' }, note: 'n' },
    });
    expect(res.statusCode).toBe(404);
    // ⛔ Non-vacuity: the 404 is the domain's own claim lookup, ⛔ not a route typo or a 500.
    expect(errCode(res.json() as Json)).toBe('nominee_correction.claim_not_found');
  });

  it('⭐ the FAMILY raises through the app (Ravi-mode + the nominee_change step-up); another member\'s claim is a 404', async () => {
    const w = await world();
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    await determineHonestly(da.client, w.pariwarId, w.claimCaseId);
    await memberAuthRepo.insertElevation(deps.pool, {
      memberId: w.memberId,
      actionContext: 'nominee_change',
      elevatedUntil: new Date(Date.now() + 5 * 60 * 1000),
    });
    const tok = signAccessToken(app, { memberId: w.memberId, pariwarId: w.pariwarId, deviceId: 'd' }, 15 * 60 * 1000);
    const payload = { rank: 1, proposed: { name: 'Asha Kumari', relationship: 'spouse', mobile: '9876543210' }, note: 'Maiden name.' };
    const ok = await app.inject({
      method: 'POST',
      url: `/api/v1/member/claims/${w.claimCaseId}/nominee-corrections`,
      payload,
      headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001' },
    });
    expect(ok.statusCode).toBe(201);
    expect(ok.json()).toMatchObject({ step: 'da_pending' });

    const other = randomUUID();
    await memberAuthRepo.insertElevation(deps.pool, { memberId: other, actionContext: 'nominee_change', elevatedUntil: new Date(Date.now() + 300_000) });
    const tok2 = signAccessToken(app, { memberId: other, pariwarId: w.pariwarId, deviceId: 'd' }, 15 * 60 * 1000);
    const miss = await app.inject({
      method: 'POST',
      url: `/api/v1/member/claims/${w.claimCaseId}/nominee-corrections`,
      payload,
      headers: { authorization: `Bearer ${tok2}`, origin: 'http://localhost:3001' },
    });
    expect(miss.statusCode).toBe(404);
  });

  // ── AC11(iii) — the refusal on suspicion (`-239`) ─────────────────────────────────────────────
  it('⭐⭐ AC11(iii) — the District Admin REFUSES on suspicion; the Pariwar Admin SEES it (⛔ never approves it); appealable ONCE', async () => {
    const w = await world({ declarations: [PRE, POST_DEATH] });
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const pa = await actor(w.pariwarId, 'pariwar_admin', 'pariwar', w.pariwarId, 'Kalpana (Pariwar Admin)');
    await determineHonestly(da.client, w.pariwarId, w.claimCaseId); // a `discarded` version exists

    // The refusal IS the shipped verifier denial with the dedicated code — ⛔ no parallel path.
    const rationale = 'Nominee changed on 2026-06-10, after the certificate date.';
    await inScope(w.pariwarId, async (s) =>
      claim.adjudicateClaim(s.client, {
        claimCaseId: ids.claimId(w.claimCaseId),
        pariwarId: ids.pariwarId(w.pariwarId),
        outcome: 'denied',
        reasonCode: 'post_death_nominee_change',
        rationaleCiphertext: await encryptVerifierRationale(rationale, w.pariwarId, deps.encryption),
        actorId: da.userId,
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator',
      }),
    );

    // ⭐ The Pariwar Admin's READ surface shows it, with the note and the reason.
    const list = await pa.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/nominee-refusals` });
    expect(list.statusCode).toBe(200);
    expect((list.json() as { items: Json[] }).items).toEqual([
      expect.objectContaining({
        claim_case_id: w.claimCaseId,
        claim_state: 'denied',
        refused_by_display: 'Anita (District Admin)',
        rationale: { state: 'readable', value: rationale },
      }),
    ]);
    // ⛔ It is a notification surface for the Pariwar Admin — a District Admin without `cycle.freeze` is refused.
    expect((await da.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/nominee-refusals` })).statusCode).toBe(403);

    // ⭐ Appealable ONCE (6.16), and the refuser is disqualified from reviewing their own refusal.
    await inScope(w.pariwarId, async (s) => {
      await expect(claim.assertAppealInitiable(s.tx, ids.pariwarId(w.pariwarId), ids.claimId(w.claimCaseId))).resolves.toBeUndefined();
      const deciders = await claim.getOriginalDeciderActorIds(s.tx, ids.pariwarId(w.pariwarId), ids.claimId(w.claimCaseId));
      expect(claim.isOriginalDecider(deciders, da.userId)).toBe(true);
    });
  });
});
