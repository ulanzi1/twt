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
import { seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
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

  /** This claim's audit lines of one type — filtered by the claim, ⛔ never the shared sink's total. */
  const auditsFor = (type: string, claimCaseId: string) =>
    td.auditSink.ofType(type).filter((e) => (e.context as Json | undefined)?.claim_case_id === claimCaseId);

  /** Every 6.20 admin route for (p, c), each with a STRUCTURALLY VALID body (Fastify validates before the chain). */
  function allRoutes(p: string, c: string): readonly [string, string, Json | undefined][] {
    const corr = randomUUID();
    const decision = { outcome: 'approve', note: 'n' };
    const raiseBody = { rank: 1, proposed: { name: 'Asha Devi', relationship: 'spouse', mobile: '9876543210' }, note: 'n' };
    const determination = { certificate_date: CERT, marks: [], note: 'n', watermark: { rank1: 1, rank2: null }, expected_live_determination_id: null };
    return [
      ['GET', `/api/v1/p/${p}/admin/nominee-refusals`, undefined],
      ['GET', `/api/v1/p/${p}/admin/nominee-corrections/pending`, undefined],
      ['GET', `${base(p, c)}/nominee-declaration`, undefined],
      ['GET', `${base(p, c)}/nominee-declaration/snapshots`, undefined],
      ['POST', `${base(p, c)}/nominee-determination`, determination],
      ['GET', `${base(p, c)}/nominee-corrections`, undefined],
      ['POST', `${base(p, c)}/nominee-corrections`, raiseBody],
      ['POST', `${base(p, c)}/nominee-corrections/${corr}/district-decision`, decision],
      ['POST', `${base(p, c)}/nominee-corrections/${corr}/pariwar-decision`, decision],
    ];
  }

  /** How many determinations / corrections Pariwar `p` holds for claim `c` (read as the superuser). */
  async function writesOn(c: string): Promise<{ determinations: number; corrections: number }> {
    const r = await td.pool.query<{ d: number; c: number }>(
      `SELECT (SELECT count(*)::int FROM nominee_determinations WHERE claim_case_id = $1) AS d,
              (SELECT count(*)::int FROM nominee_corrections WHERE claim_case_id = $1) AS c`,
      [c],
    );
    return { determinations: r.rows[0]!.d, corrections: r.rows[0]!.c };
  }

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

  it('⭐ family 3 — CROSS-PARIWAR: an actor of Pariwar X holding EVERY key reaches NONE of the nine routes for Pariwar Y (⛔ no body, ⛔ no write)', async () => {
    const x = await world();
    const y = await world();
    // A caller who holds every relevant key — in X. ⛔ None of it may reach Y.
    const { client, userId } = await actor(x.pariwarId, 'district_admin', 'district', x.district, 'Anita (District Admin)');
    for (const role of ['helpline_operator', 'pariwar_admin']) {
      await td.pool.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, 'pariwar', $4)`,
        [userId, x.pariwarId, role, x.pariwarId],
      );
    }
    for (const [method, url, payload] of allRoutes(y.pariwarId, y.claimCaseId)) {
      const res = await client.inject({ method: method as 'GET' | 'POST', url, payload });
      // The scope middleware refuses a Pariwar the caller holds no grant in — 404 (⛔ existence never
      // confirmed) or 403. ⛔ Never a 2xx, and ⛔ never a body naming Y's claim.
      expect([403, 404], `${method} ${url}`).toContain(res.statusCode);
      expect(res.body, `${method} ${url}`).not.toContain(y.claimCaseId);
    }
    expect(await writesOn(y.claimCaseId)).toEqual({ determinations: 0, corrections: 0 });
    // ⭐ POSITIVE CONTROL (code review 2026-09-24b) — the SAME client, with the SAME grants, DOES reach X: the
    // refusals above are the tenant boundary, ⛔ not a session or grants that never took.
    expect((await client.inject({ method: 'GET', url: `/api/v1/p/${x.pariwarId}/admin/nominee-refusals` })).statusCode).toBe(200);
    expect((await client.inject({ method: 'GET', url: `/api/v1/p/${x.pariwarId}/admin/nominee-corrections/pending` })).statusCode).toBe(200);
    expect((await client.inject({ method: 'GET', url: `${base(x.pariwarId, x.claimCaseId)}/nominee-declaration` })).statusCode).toBe(200);
  });

  it('⭐ family 3 — a TAMPERED session naming a non-human actor id is DENIED on every route, ⛔ never treated as the human (the verifier-decision pattern)', async () => {
    const w = await world();
    const { client, userId } = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Real Human');
    await td.pool.query(`UPDATE admin_sessions SET sess = jsonb_set(sess, '{userId}', to_jsonb($1::text)) WHERE user_id = $2`, [
      randomUUID(),
      userId,
    ]);
    for (const [method, url, payload] of allRoutes(w.pariwarId, w.claimCaseId)) {
      const res = await client.inject({ method: method as 'GET' | 'POST', url, payload });
      // The swapped id holds no membership in this Pariwar: `scopeResolutionHook` treats it as any non-member —
      // EXACTLY 404, the precedent this cites (`verifier-decision.spec.ts`). ⛔ A 401 would pass without ever
      // reaching scope resolution (code review 2026-09-24b).
      expect(res.statusCode, `${method} ${url}`).toBe(404);
    }
    expect(await writesOn(w.claimCaseId)).toEqual({ determinations: 0, corrections: 0 });
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
    // Family 8 — the read is audited, naming the claim (a `claim:<uuid>` locator), with ids only.
    const [line] = auditsFor('admin_nominee_declaration.timeline_read', w.claimCaseId);
    expect(line).toMatchObject({ resourceLocator: `claim:${w.claimCaseId}`, context: { version_count: 2 } });
  });

  it('⭐ D10 — the snapshots DECRYPT on demand, and the audit line carries ids only', async () => {
    const w = await world();
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const res = await client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-declaration/snapshots` });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { snapshots: Json[] }).snapshots[0]).toMatchObject({ name: { state: 'readable', value: 'Asha Devi' } });
    // ⭐ THIS claim's line — ⛔ not "any snapshots line anywhere in the shared sink".
    const audits = auditsFor('admin_nominee_declaration.snapshots_read', w.claimCaseId);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ resourceLocator: `claim:${w.claimCaseId}` });
    expect(JSON.stringify(audits)).not.toContain('Asha');
    expect(JSON.stringify(audits)).not.toContain('9876543210');
  });

  // ── AC4 — the determination ───────────────────────────────────────────────────────────────────
  it('⭐ AC4 — an honest determination is recorded (201) and the declaration becomes EFFECTIVE', async () => {
    const w = await world({ declarations: [PRE, POST_DEATH] });
    const { client } = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const res = await determineHonestly(client, w.pariwarId, w.claimCaseId);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ stands_count: 1, discarded_count: 1, declaration_status: 'effective' });
    // Family 8 — `_recorded`, naming the claim and the determination; ⛔ no date.
    const [line] = auditsFor('admin_claim.nominee_determination_recorded', w.claimCaseId);
    expect(line).toMatchObject({
      resourceLocator: `claim:${w.claimCaseId}`,
      context: { determination_id: (res.json() as Json).determination_id, stands_count: 1, discarded_count: 1 },
    });
    expect(JSON.stringify(line)).not.toContain(CERT);
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
    // Family 8 — a refused write is audited too, with its bounded reason code.
    expect(auditsFor('admin_claim.nominee_determination_rejected', w.claimCaseId)).toEqual([
      expect.objectContaining({ context: expect.objectContaining({ reason: 'inconsistent_mark' }) }),
    ]);
    expect(auditsFor('admin_claim.nominee_determination_recorded', w.claimCaseId)).toEqual([]);
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

    // ⭐ Family 8 — EVERY step left its line, naming the claim and the correction (non-empty, so the
    // "no name" check below cannot pass vacuously on an empty list).
    const lines = [
      ...auditsFor('admin_claim.nominee_correction_raised', w.claimCaseId),
      ...auditsFor('admin_claim.nominee_correction_district_decided', w.claimCaseId),
      ...auditsFor('admin_claim.nominee_correction_pariwar_decided', w.claimCaseId),
      ...auditsFor('admin_nominee_correction.list_read', w.claimCaseId),
    ];
    expect(lines.map((l) => l.type).sort()).toEqual([
      'admin_claim.nominee_correction_district_decided',
      'admin_claim.nominee_correction_pariwar_decided',
      'admin_claim.nominee_correction_raised',
      'admin_nominee_correction.list_read',
    ]);
    expect(auditsFor('admin_claim.nominee_correction_raised', w.claimCaseId)[0]).toMatchObject({
      actorId: helpline.userId,
      resourceLocator: `claim:${w.claimCaseId}`,
      context: { correction_id, rank: 1, raised_via: 'helpline' },
    });
    expect(auditsFor('admin_claim.nominee_correction_pariwar_decided', w.claimCaseId)[0]).toMatchObject({
      actorId: pa.userId,
      context: { correction_id, outcome: 'approve', step: 'applied' },
    });
    // ⛔ No name, ⛔ no mobile, ⛔ no note on any of them.
    for (const pii of ['Asha', '9876543210', 'Maiden', 'Passbook', 'Agreed']) expect(JSON.stringify(lines)).not.toContain(pii);
  });

  it('⭐⭐ AC11(i) — a raise against an `other` nominee is a typed 409 AT THE RAISE', async () => {
    const w = await world({ relationship: 'other' });
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const helpline = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');
    expect((await determineHonestly(da.client, w.pariwarId, w.claimCaseId)).statusCode).toBe(201);
    const res = await helpline.client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/nominee-corrections`,
      payload: { rank: 1, proposed: { name: 'Asha Kumari', relationship: 'spouse', mobile: '9876543210' }, note: 'n' },
    });
    expect(res.statusCode).toBe(409);
    expect(errCode(res.json() as Json)).toBe('nominee_correction.relationship_other');
    expect(auditsFor('admin_claim.nominee_correction_rejected', w.claimCaseId)).toEqual([
      expect.objectContaining({ context: expect.objectContaining({ step: 'raise', reason: 'relationship_other' }) }),
    ]);
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
    expect((await determineHonestly(da.client, w.pariwarId, w.claimCaseId)).statusCode).toBe(201);
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
    expect(auditsFor('member_claim.nominee_correction_raised', w.claimCaseId)).toEqual([
      expect.objectContaining({ actorId: w.memberId, context: expect.objectContaining({ raised_via: 'member_app' }) }),
    ]);

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
    expect(auditsFor('member_claim.nominee_correction_rejected', w.claimCaseId)).toEqual([
      expect.objectContaining({ actorId: other, context: expect.objectContaining({ reason: 'claim_not_found' }) }),
    ]);
  });

  it('⭐ family 3 / D9 — the member-app raise: ⛔ no session is a 401; a session WITHOUT a fresh `nominee_change` step-up is a 403 step-up (and writes nothing)', async () => {
    const w = await world();
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    expect((await determineHonestly(da.client, w.pariwarId, w.claimCaseId)).statusCode).toBe(201);
    const url = `/api/v1/member/claims/${w.claimCaseId}/nominee-corrections`;
    const payload = { rank: 1, proposed: { name: 'Asha Kumari', relationship: 'spouse', mobile: '9876543210' }, note: 'Maiden name.' };
    const anon = await app.inject({ method: 'POST', url, payload, headers: { origin: 'http://localhost:3001' } });
    expect(anon.statusCode).toBe(401);
    // A valid member session — but ⛔ no elevation for `nominee_change` (AR-24).
    const tok = signAccessToken(app, { memberId: w.memberId, pariwarId: w.pariwarId, deviceId: 'd' }, 15 * 60 * 1000);
    const noStepUp = await app.inject({ method: 'POST', url, payload, headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001' } });
    expect(noStepUp.statusCode).toBe(403);
    expect(errCode(noStepUp.json() as Json)).toBe('auth.step_up_required');
    // ⭐ An elevation for a DIFFERENT action does not satisfy it.
    await memberAuthRepo.insertElevation(deps.pool, { memberId: w.memberId, actionContext: 'medical_change', elevatedUntil: new Date(Date.now() + 300_000) });
    const wrongContext = await app.inject({ method: 'POST', url, payload, headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001' } });
    expect(wrongContext.statusCode).toBe(403);
    expect(await writesOn(w.claimCaseId)).toEqual({ determinations: 1, corrections: 0 });
  });

  it('⭐ family 3 — a member session of ANOTHER Pariwar reaches ⛔ nothing on this claim (404, no write)', async () => {
    const w = await world();
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    expect((await determineHonestly(da.client, w.pariwarId, w.claimCaseId)).statusCode).toBe(201);
    const outsider = await world(); // a real member, in a DIFFERENT Pariwar
    await memberAuthRepo.insertElevation(deps.pool, { memberId: outsider.memberId, actionContext: 'nominee_change', elevatedUntil: new Date(Date.now() + 300_000) });
    const tok = signAccessToken(app, { memberId: outsider.memberId, pariwarId: outsider.pariwarId, deviceId: 'd' }, 15 * 60 * 1000);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/member/claims/${w.claimCaseId}/nominee-corrections`,
      payload: { rank: 1, proposed: { name: 'Asha Kumari', relationship: 'spouse', mobile: '9876543210' }, note: 'n' },
      headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001' },
    });
    expect(res.statusCode).toBe(404);
    expect(await writesOn(w.claimCaseId)).toEqual({ determinations: 1, corrections: 0 });
  });

  // ── AC5 — the approval gate's 409, through HTTP ──────────────────────────────────────────────
  it('⭐ AC5 — an UNDETERMINED claim\'s approval is a typed 409 `nominee_determination_required`, naming WHY (`never_determined`)', async () => {
    const w = await world();
    // Two accounts, ⛔ no determination — the fixture's `determination: 'skip'` (T16) reaches exactly this.
    await seedNomineeNameCheck(deps, w.pariwarId, w.claimCaseId, { determination: 'skip', accountsOnly: true });
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const res = await da.client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/verifier-decision`,
      payload: { outcome: 'approved', reason_code: 'r8_90pct_met' },
    });
    expect(res.statusCode).toBe(409);
    const body = res.json() as Json;
    expect(errCode(body)).toBe('verifier_decision.nominee_determination_required');
    expect((body.error as Json).details).toEqual({ reason: 'never_determined' });
    // …and the names read says so too, ⛔ not merely an empty list (all four non-effective states list nobody).
    const names = await da.client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-name-check` });
    expect(names.statusCode).toBe(200);
    expect(names.json()).toMatchObject({ declaration_status: 'undetermined' });
  });

  it('⭐ AC4 / `-239` — a post-death refusal WITHOUT a discarded version is a typed 409 `post_death_refusal_ungrounded`', async () => {
    const w = await world(); // ONE pre-death version — nothing to discard
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    expect((await determineHonestly(da.client, w.pariwarId, w.claimCaseId)).statusCode).toBe(201);
    const res = await da.client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/verifier-decision`,
      payload: { outcome: 'denied', reason_code: 'post_death_nominee_change', rationale: 'Suspicious.' },
    });
    expect(res.statusCode).toBe(409);
    expect(errCode(res.json() as Json)).toBe('verifier_decision.post_death_refusal_ungrounded');
  });

  // ── AC11(iii) — the refusal on suspicion (`-239`) ─────────────────────────────────────────────
  it('⭐⭐ AC11(iii) — the District Admin REFUSES on suspicion; the Pariwar Admin SEES it (⛔ never approves it); appealable ONCE', async () => {
    const w = await world({ declarations: [PRE, POST_DEATH] });
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const pa = await actor(w.pariwarId, 'pariwar_admin', 'pariwar', w.pariwarId, 'Kalpana (Pariwar Admin)');
    // A `discarded` version exists — asserted, ⛔ assumed: the refusal below is only grounded because of it.
    const determined = await determineHonestly(da.client, w.pariwarId, w.claimCaseId);
    expect(determined.statusCode).toBe(201);
    expect(determined.json()).toMatchObject({ discarded_count: 1 });

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
    // ⛔ It is a notification surface for the Pariwar Admin — a District Admin without the Pariwar Admin's
    // correction key (`NOMINEE_CORRECTION_PARIWAR_KEY`, reused as the refusal-view key) is refused.
    expect((await da.client.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/admin/nominee-refusals` })).statusCode).toBe(403);
    // ⭐ Family 8 — ONE line per decrypted rationale, naming ITS claim (the 6.18 `queue_note_read` precedent);
    // ⛔ never the rationale itself.
    const rationaleLines = auditsFor('admin_nominee_refusal.rationale_read', w.claimCaseId);
    expect(rationaleLines).toEqual([expect.objectContaining({ actorId: pa.userId, resourceLocator: `claim:${w.claimCaseId}` })]);
    expect(JSON.stringify(rationaleLines)).not.toContain('2026-06-10');

    // ⭐ Appealable ONCE (6.16), and the refuser is disqualified from reviewing their own refusal.
    await inScope(w.pariwarId, async (s) => {
      await expect(claim.assertAppealInitiable(s.tx, ids.pariwarId(w.pariwarId), ids.claimId(w.claimCaseId))).resolves.toBeUndefined();
      const deciders = await claim.getOriginalDeciderActorIds(s.tx, ids.pariwarId(w.pariwarId), ids.claimId(w.claimCaseId));
      expect(claim.isOriginalDecider(deciders, da.userId)).toBe(true);
    });
    const appeal = () =>
      inScope(w.pariwarId, (s) =>
        claim.initiateAppeal(s.client, {
          claimCaseId: ids.claimId(w.claimCaseId),
          pariwarId: ids.pariwarId(w.pariwarId),
          initiatedByActor: w.memberId,
          initiatedOnBehalf: false,
          actor: 'member',
        }),
      );
    await expect(appeal()).resolves.toMatchObject({ claimState: expect.any(String) });
    // ⭐ ONCE — proven by the ONCE-RULE itself (code review 2026-09-24b). Straight after the first appeal the
    // claim is no longer `denied`, so a second attempt would be refused by the STATE guard
    // (`AppealNotDeniedError`) and never reach D-F. Bring it back to `denied` — stage 1 UPHOLDS the refusal —
    // so the only thing left to refuse the second appeal is "a journey already exists".
    await inScope(w.pariwarId, (s) =>
      claim.projectClaimState(s.client, {
        claimCaseId: ids.claimId(w.claimCaseId),
        pariwarId: ids.pariwarId(w.pariwarId),
        deceasedMemberId: ids.memberId(w.memberId),
        intakeChannels: ['helpline'],
        claimantActorId: null,
        eventType: 'claim.appeal_stage1_reviewed' as never,
        payload: { from_state: 'appeal_stage_1', to_state: 'denied', trigger: 'seed', actor: 'system', decision: 'upheld' } as never,
        actorId: null,
      }),
    );
    await expect(appeal()).rejects.toBeInstanceOf(claim.AppealAlreadyExhaustedError);
    await inScope(w.pariwarId, async (s) => {
      await expect(claim.assertAppealInitiable(s.tx, ids.pariwarId(w.pariwarId), ids.claimId(w.claimCaseId))).rejects.toBeInstanceOf(
        claim.AppealAlreadyExhaustedError,
      );
    });
  });

  // ── Code review 2026-09-24b ─────────────────────────────────────────────────────────────────────
  it('⭐⭐ AC4 — a failure mid-way through the determination leaves NEITHER the row, the items nor the event — proven at the REAL transaction boundary, from a second connection', async () => {
    const w = await world();
    const cid = ids.claimId(w.claimCaseId);
    const pid = ids.pariwarId(w.pariwarId);
    const input = await inScope(w.pariwarId, async (s) => {
      const versions = await nominee.listNomineeDeclarationVersions(s.tx, pid, ids.memberId(w.memberId));
      return {
        claimCaseId: cid,
        pariwarId: pid,
        certificateDate: CERT,
        certificateDateCiphertext: 'enc:v1:certificate-date',
        noteCiphertext: 'enc:v1:note',
        marks: versions.map((v) => ({ versionId: v.versionId, mark: 'stands' as const })),
        watermark: { rank1: 1, rank2: null },
        expectedLiveDeterminationId: null,
        actorId: randomUUID(),
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator' as const,
      };
    });
    // The handler's own pattern (`openScopeTx` → write → `closeScopeTx(…, ok)`): the event schema refuses the
    // actor AFTER the row and items are written — the whole transaction must go.
    // ⭐ The EVENT's schema refuses it — pinned by type (adversarial review 2026-09-24b: `toThrow()` accepted any
    // error, including one thrown before any write). That it fails AFTER the row + items is proven in the domain
    // spec; ⚠ `inScope` is the same `openScopeTx` / `closeScopeTx(…, false)` pair the handler composes — this
    // proves that pair's rollback, ⛔ not the handler's `ok` bookkeeping (covered by construction there).
    // ⭐ Review 2026-09-24c: the ZodError alone could also come from an entry-point check that writes nothing,
    // leaving "zero afterwards" vacuous. So INSIDE the transaction the row is shown to EXIST after the failure
    // (it failed MID-WAY), and only then is the transaction abandoned — through the real `closeScopeTx(…, false)`.
    let insideAfterFailure = -1;
    await expect(
      inScope(w.pariwarId, async (s) => {
        const err = await claim.recordNomineeDetermination(s.client, { ...input, actor: 'not-an-actor' as never }).then(
          () => undefined,
          (e: unknown) => e,
        );
        expect((err as Error | undefined)?.name).toBe('ZodError');
        insideAfterFailure = Number(
          (await s.client.query('SELECT count(*)::int AS n FROM nominee_determinations WHERE claim_case_id = $1', [w.claimCaseId])).rows[0].n,
        );
        throw err;
      }),
    ).rejects.toSatisfy((e: unknown) => (e as Error).name === 'ZodError');
    expect(insideAfterFailure, 'the failure came AFTER the row was written').toBe(1);
    const events = async () =>
      (
        await td.pool.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_determination_recorded'`,
          [w.claimCaseId],
        )
      ).rows[0]!.n;
    const items = async () =>
      (
        await td.pool.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM nominee_determination_items i JOIN nominee_determinations d USING (determination_id) WHERE d.claim_case_id = $1`,
          [w.claimCaseId],
        )
      ).rows[0]!.n;
    expect(await writesOn(w.claimCaseId)).toEqual({ determinations: 0, corrections: 0 });
    expect(await items()).toBe(0);
    expect(await events()).toBe(0);
    // POSITIVE CONTROL — the same input, well-formed, COMMITS all three.
    await inScope(w.pariwarId, (s) => claim.recordNomineeDetermination(s.client, input));
    expect(await writesOn(w.claimCaseId)).toEqual({ determinations: 1, corrections: 0 });
    expect(await items()).toBe(1);
    expect(await events()).toBe(1);
  });

  it('⭐ family 8 — an actor with NO display name is BLOCKED on the determination and on BOTH correction steps, each audited `_rejected` (⛔ nothing written)', async () => {
    const w = await world();
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const helpline = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');
    const pa = await actor(w.pariwarId, 'pariwar_admin', 'pariwar', w.pariwarId, 'Kalpana (Pariwar Admin)');
    const unnamed = (userId: string) => td.pool.query(`UPDATE users SET display_name = NULL WHERE id = $1`, [userId]);
    const named = (userId: string, n: string) => td.pool.query(`UPDATE users SET display_name = $2 WHERE id = $1`, [userId, n]);

    // (1) The determination — refused BEFORE the domain is reached (`resolveDisplay`), and still audited.
    await unnamed(da.userId);
    const refused = await determineHonestly(da.client, w.pariwarId, w.claimCaseId);
    expect(refused.statusCode).toBe(409);
    expect(errCode(refused.json() as Json)).toBe('admin.display_name_missing');
    expect(auditsFor('admin_claim.nominee_determination_rejected', w.claimCaseId)).toHaveLength(1);
    expect(await writesOn(w.claimCaseId)).toEqual({ determinations: 0, corrections: 0 });

    // A named District Admin determines; the helpline raises.
    await named(da.userId, 'Anita (District Admin)');
    expect((await determineHonestly(da.client, w.pariwarId, w.claimCaseId)).statusCode).toBe(201);
    const raise = await helpline.client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/nominee-corrections`,
      payload: { rank: 1, proposed: { name: 'Asha Kumari', relationship: 'spouse', mobile: '9876543210' }, note: 'Maiden name.' },
    });
    expect(raise.statusCode).toBe(201);
    const { correction_id } = raise.json() as { correction_id: string };
    const decide = (c: Client, which: 'district' | 'pariwar') =>
      c.inject({
        method: 'POST',
        url: `${base(w.pariwarId, w.claimCaseId)}/nominee-corrections/${correction_id}/${which}-decision`,
        payload: { outcome: 'approve', note: 'Seen.' },
      });
    const stepOf = async () =>
      (await td.pool.query<{ step: string }>(`SELECT step FROM nominee_corrections WHERE correction_id = $1`, [correction_id])).rows[0]!.step;

    // (2) Step 1 without a name.
    await unnamed(da.userId);
    const s1 = await decide(da.client, 'district');
    expect([s1.statusCode, errCode(s1.json() as Json)]).toEqual([409, 'admin.display_name_missing']);
    expect(await stepOf()).toBe('da_pending');
    await named(da.userId, 'Anita (District Admin)');
    expect((await decide(da.client, 'district')).statusCode).toBe(200);

    // (3) Step 2 without a name.
    await unnamed(pa.userId);
    const s2 = await decide(pa.client, 'pariwar');
    expect([s2.statusCode, errCode(s2.json() as Json)]).toEqual([409, 'admin.display_name_missing']);
    expect(await stepOf()).toBe('pa_pending');
    const rejected = auditsFor('admin_claim.nominee_correction_rejected', w.claimCaseId);
    expect(rejected.map((e) => (e.context as Json).step)).toEqual(['district', 'pariwar']);
  });

  it('⭐ the timeline says what THIS viewer may do (a verifier: nothing; a District Admin: determine + step 1) and how many requests wait — metadata only', async () => {
    const w = await world();
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const verifier = await actor(w.pariwarId, 'verifier', 'district', w.district, 'Vikram (Verifier)');
    const helpline = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');
    expect((await determineHonestly(da.client, w.pariwarId, w.claimCaseId)).statusCode).toBe(201);
    const read = async (c: Client) => {
      const res = await c.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-declaration` });
      expect(res.statusCode).toBe(200);
      return res.json() as { viewer: Json; pending_corrections: Json };
    };
    expect((await read(da.client)).viewer).toEqual({ can_determine: true, can_decide_district: true });
    expect((await read(verifier.client)).viewer).toEqual({ can_determine: false, can_decide_district: false });
    expect((await read(da.client)).pending_corrections).toEqual({ da_pending: 0, pa_pending: 0 });
    await helpline.client.inject({
      method: 'POST',
      url: `${base(w.pariwarId, w.claimCaseId)}/nominee-corrections`,
      payload: { rank: 1, proposed: { name: 'Asha Kumari', relationship: 'spouse', mobile: '9876543210' }, note: 'Maiden name.' },
    });
    const after = await da.client.inject({ method: 'GET', url: `${base(w.pariwarId, w.claimCaseId)}/nominee-declaration` });
    expect((after.json() as Json).pending_corrections).toEqual({ da_pending: 1, pa_pending: 0 });
    // ⛔ Still metadata only — the count carries no name.
    expect(after.body).not.toContain('Asha');
  });

  it('⭐ the helpline raise finds the claim from the SELECTED member (BigDev 2026-09-24b) — the raise key only, ⛔ another Pariwar\'s member is empty', async () => {
    const w = await world();
    const other = await world();
    const helpline = await actor(w.pariwarId, 'helpline_operator', 'pariwar', w.pariwarId, 'Harsh (Helpline)');
    const da = await actor(w.pariwarId, 'district_admin', 'district', w.district, 'Anita (District Admin)');
    const url = (p: string, m: string) => `/api/v1/p/${p}/admin/members/${m}/nominee-corrections/claims`;

    const res = await helpline.client.inject({ method: 'GET', url: url(w.pariwarId, w.memberId) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      member_id: w.memberId,
      claims: [{ claim_case_id: w.claimCaseId, claim_state: 'verifier_review', created_at: expect.any(String) }],
    });
    // ⛔ No PII in the list.
    expect(res.body).not.toContain('Asha');
    // Another Pariwar's member, asked from THIS Pariwar ⇒ nothing (RLS + the explicit predicate).
    const cross = await helpline.client.inject({ method: 'GET', url: url(w.pariwarId, other.memberId) });
    expect(cross.statusCode).toBe(200);
    expect((cross.json() as { claims: unknown[] }).claims).toEqual([]);
    // ⛔ Not the District Admin's to read (the raise key), and ⛔ not without a session.
    expect((await da.client.inject({ method: 'GET', url: url(w.pariwarId, w.memberId) })).statusCode).toBe(403);
    expect((await makeClient(app).inject({ method: 'GET', url: url(w.pariwarId, w.memberId) })).statusCode).toBe(401);
  });
});
