// Trustee-Lite list + signals — E2E (Story 10.11; AC1/AC6/AC7/AC8/AC10). (:5433)
//
// Proves the aggregate against real Postgres:
//   · AC1 — the six reads COMPOSE in one request (one scope tx), producing one normalized shape, with
//     real seeded rows for cycle-freeze, concealment-adjacent freeze cases, R9 routing, appeals and
//     moderation.
//   · AC6 — the per-section capability filter, as a 403-WITHOUT / 200-WITH revert pair per section:
//       – `auditor` (a Pariwar grant carrying NONE of the six keys) → 403 for the whole surface;
//       – `pariwar_admin` → 200 with five of six sections PRESENT and `concealment` ABSENT;
//       – `super_admin` → 200 with ALL SIX present, which is the "with" half of the concealment pair;
//       – `district_admin` → 403. It HOLDS `claim.verify` + `claim.appeal_review`, but at a `district`
//         scopeCeiling, and a district-ceiling grant cannot satisfy a pariwar-dimension check
//         ([[project_rbac_geo_scope_containment]]). Pinned here so the deferral cannot be reversed
//         silently by a future bundle edit — exactly as Story 10.10 pins its own inert-grant finding.
//     Every absent section is ABSENT, never present-and-empty: an empty array would be an existence
//     oracle telling an unprivileged caller how many items they cannot see.
//   · AC10 — `listOpenAppealCasesForPariwar` against REAL appeal rows: stage + stage-entry instant
//     surface, and a TERMINAL journey drops out of the list.
//   · AC8 — the response carries no `*_ciphertext` key, even though the seeded cycle-freeze case has a
//     rationale ciphertext stored on its verifier decision.
//   · Cross-Pariwar denial — a grant in P1 buys nothing in P2.
//
// ⚠ Own-committing seed writes; a fresh random pariwarId per test; users/role_grants/claims cleaned in
// afterAll. Assert MEMBERSHIP, not counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { claim as claimDomain, ids, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

interface SeededPariwar {
  p: string;
  claimCaseId: string;
  r9ClaimId: string;
  memberId: string;
}

/** The six row sections plus the violator arm, as the response names them. */
const ROW_SECTIONS = [
  'cycle_freeze',
  'r9_voting',
  'concealment',
  'appeal',
  'reconciliation',
  'moderation',
] as const;

describe.skipIf(!hasDatabase)('trustee-lite list + signals — E2E (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const createdPariwars: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    app = await buildServer(deps);
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
      if (createdPariwars.length > 0) {
        await c.query(`DELETE FROM member_moderation_actions WHERE pariwar_id = ANY($1)`, [createdPariwars]);
        await c.query(`DELETE FROM claim_appeals WHERE pariwar_id = ANY($1)`, [createdPariwars]);
        await c.query(`DELETE FROM claim_state_trustee_decisions WHERE pariwar_id = ANY($1)`, [createdPariwars]);
        await c.query(`DELETE FROM claim_verifier_decisions WHERE pariwar_id = ANY($1)`, [createdPariwars]);
        await c.query(`DELETE FROM claims WHERE pariwar_id = ANY($1)`, [createdPariwars]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  // ── Auth + grants ──────────────────────────────────────────────────────────────────────────────

  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `tl-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName: 'Trustee One' });
    createdUserIds.push(userId);
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

  async function grant(
    userId: string,
    pariwarId: string,
    role: string,
    opts: { dimension?: string; value?: string | null } = {},
  ): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
        [userId, pariwarId, role, opts.dimension ?? 'pariwar', opts.value === undefined ? pariwarId : opts.value],
      );
    } finally {
      c.release();
    }
  }

  async function actorWith(pariwarId: string, role: string, opts: { dimension?: string; value?: string | null } = {}): Promise<Client> {
    const a = await authenticate();
    await grant(a.userId, pariwarId, role, opts);
    return a.client;
  }

  // ── Seeding ────────────────────────────────────────────────────────────────────────────────────

  /**
   * Drive a claim through the REAL projector to `verifier_approved` — the cycle-freeze
   * `ready_to_freeze` bucket. Using the projector (rather than a raw INSERT with
   * `app.claim_state_writer` forced on) keeps the test honest: the guard that makes
   * `claims.current_state` projector-only stays exercised, not bypassed.
   */
  async function seedApprovedClaim(pariwarId: string): Promise<{ claimCaseId: string; deceasedMemberId: string }> {
    const claimCaseId = randomUUID();
    const deceasedMemberId = randomUUID();
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const base = {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId: ids.memberId(deceasedMemberId),
        intakeChannels: ['member_app'] as const,
        claimantActorId: null,
        actorId: null,
      };
      const project = (eventType: string, payload: Json) =>
        claimDomain.projectClaimState(scopeTx.client, {
          ...base,
          eventType: eventType as Parameters<typeof claimDomain.projectClaimState>[1]['eventType'],
          payload,
        });
      await project('claim.intake_initiated', {
        from_state: null, to_state: 'intake_pending', trigger: 'test_seed', actor: 'system',
        deceased_member_id: deceasedMemberId, intake_channel: 'member_app', claimant_actor_id: null,
      });
      await project('claim.intake_converged', { from_state: 'intake_pending', to_state: 'intake_converged', trigger: 'test_seed', actor: 'system' });
      await project('claim.documents_received', { from_state: 'intake_converged', to_state: 'documents_pending', trigger: 'test_seed', actor: 'system' });
      await project('claim.peer_mesh_pinged', {
        from_state: 'documents_pending', to_state: 'verification_in_progress', trigger: 'test_seed', actor: 'system',
        selected_member_ids: [randomUUID()], metric_id: 'test-metric', metric_version: 1,
      });
      await project('claim.verifier_reviewing', { from_state: 'verification_in_progress', to_state: 'verifier_review', trigger: 'test_seed', actor: 'operator' });
      await project('claim.verifier_approved', { from_state: 'verifier_review', to_state: 'verifier_approved', trigger: 'test_seed', actor: 'operator' });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return { claimCaseId, deceasedMemberId };
  }

  /** A LIVE verifier decision carrying a rationale CIPHERTEXT — the AC8 leak probe's bait. */
  async function seedVerifierDecision(pariwarId: string, claimCaseId: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO claim_verifier_decisions
           (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
         VALUES ($1, $2, 'approved', 'other', $3, $4, 'Verifier One')`,
        [claimCaseId, pariwarId, 'enc:v1:SECRET-RATIONALE-DO-NOT-LEAK', randomUUID()],
      );
    } finally {
      c.release();
    }
  }

  /** A live `routed_to_r9` routing row — the R9 voting queue's selection criterion. */
  async function seedR9Routing(pariwarId: string, claimCaseId: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO claim_state_trustee_decisions
           (claim_case_id, pariwar_id, phase, outcome, reason_code, actor_id, actor_display)
         VALUES ($1, $2, 'routing', 'routed_to_r9', 'r9_special_case', $3, 'Trustee Two')`,
        [claimCaseId, pariwarId, randomUUID()],
      );
    } finally {
      c.release();
    }
  }

  /** An appeal journey anchor. `status` drives whether it belongs in the OPEN list. */
  async function seedAppeal(
    pariwarId: string,
    claimCaseId: string,
    opts: { stage?: '1' | '2' | '3'; status?: 'open' | 'reversed' | 'upheld_final' } = {},
  ): Promise<string> {
    const appealId = randomUUID();
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO claim_appeals (appeal_id, claim_case_id, pariwar_id, current_stage, initiated_by_actor, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [appealId, claimCaseId, pariwarId, opts.stage ?? '1', randomUUID(), opts.status ?? 'open'],
      );
    } finally {
      c.release();
    }
    return appealId;
  }

  /**
   * An ACTIVE member, driven through the REAL member projector (the 10.10 spec's `seedActiveMember`).
   * `member_moderation_actions.member_id` carries an FK to `members`, so a moderation row needs a real
   * member behind it — a bare random UUID is rejected by the constraint.
   */
  async function seedActiveMember(pariwarId: string): Promise<string> {
    const memberId = randomUUID();
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const mid = ids.memberId(memberId);
      const pid = ids.pariwarId(pariwarId);
      const project = (eventType: string, payload: Json) =>
        memberDomain.projectMemberState(scopeTx.client, {
          memberId: mid,
          pariwarId: pid,
          eventType: eventType as Parameters<typeof memberDomain.projectMemberState>[1]['eventType'],
          actorId: memberId,
          payload,
        });
      await project('member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' });
      await project('member.kyc_completed', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc', actor: 'member' });
      await project('member.vyawastha_shulk_paid', {
        from_state: 'pending-fee', to_state: 'lock-in', trigger: 'fee_paid', actor: 'member',
        utr: 'UTR123', amount_inr: 110,
      });
      await project('member.lock_in_expired', {
        from_state: 'lock-in', to_state: 'active', trigger: 'lock_in_expired', actor: 'system', kyc_verified: true,
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return memberId;
  }

  /** A suspended member — the moderation section's source (Story 10.10 Decision 9). */
  async function seedModeratedMember(pariwarId: string): Promise<string> {
    const memberId = await seedActiveMember(pariwarId);
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO member_moderation_actions
           (pariwar_id, member_id, action, reason_code, rationale_ciphertext, actor_id, actor_display, acted_at)
         VALUES ($1, $2, 'suspend', 'r7-contribution-discipline', $3, $4, 'Trustee Three', now() - interval '10 days')`,
        [pariwarId, memberId, 'enc:v1:SECRET-MODERATION-RATIONALE', randomUUID()],
      );
    } finally {
      c.release();
    }
    return memberId;
  }

  const url = (p: string) => `/api/v1/p/${p}/admin/trustee-lite`;

  /** A tenant seeded with one of each source the aggregator reads. */
  async function seededPariwar(): Promise<SeededPariwar> {
    const p = randomUUID();
    createdPariwars.push(p);
    const { claimCaseId } = await seedApprovedClaim(p);
    await seedVerifierDecision(p, claimCaseId);
    const r9 = await seedApprovedClaim(p);
    await seedR9Routing(p, r9.claimCaseId);
    await seedAppeal(p, claimCaseId, { stage: '2' });
    const memberId = await seedModeratedMember(p);
    return { p, claimCaseId, r9ClaimId: r9.claimCaseId, memberId };
  }

  /**
   * ⚠ COST DISCIPLINE — the shared read-only fixture, built ONCE.
   *
   * Every assertion below except the cross-Pariwar isolation pair is a READ against the SAME seeded
   * tenant, so seeding per test bought nothing and cost a great deal: each `authenticate()` runs a
   * real argon2id hash and each seeded claim drives six projector appends. Measured on this branch, a
   * per-test fixture pushed the whole @twt/api suite from ~44s to ~220s and started timing OTHER
   * specs out at their 20s ceiling under concurrency
   * ([[project_ci_local_concurrency_oversubscription]]) — a genuine regression this spec caused, not
   * an inherited flake. One shared fixture + one client per role removes it. The surface is read-only,
   * so sharing is also SAFE: no test here mutates state another could observe.
   */
  let shared: SeededPariwar;
  let superAdmin: Client;
  let pariwarAdmin: Client;
  let auditor: Client;
  let districtAdmin: Client;

  beforeAll(async () => {
    shared = await seededPariwar();
    superAdmin = await actorWith(shared.p, 'super_admin', { dimension: 'global', value: null });
    pariwarAdmin = await actorWith(shared.p, 'pariwar_admin');
    auditor = await actorWith(shared.p, 'auditor');
    districtAdmin = await actorWith(shared.p, 'district_admin', { dimension: 'district', value: 'Patna' });
  });

  async function fetchAs(client: Client, p: string): Promise<{ status: number; body: Json }> {
    const res = await client.inject({ method: 'GET', url: url(p) });
    return { status: res.statusCode, body: res.statusCode === 200 ? (res.json() as Json) : (res.json() as Json) };
  }

  // ── AC1 — the six reads compose ────────────────────────────────────────────────────────────────

  describe('AC1 — six sources compose into one shape in one request', () => {
    it('a super_admin sees ALL SIX row sections plus the violator arm', async () => {
      const { p, claimCaseId, r9ClaimId, memberId } = shared;
      const { status, body } = await fetchAs(superAdmin, p);
      expect(status).toBe(200);
      for (const section of ROW_SECTIONS) {
        expect(body[section], `${section} must be present for a super_admin`).toBeDefined();
      }
      expect(body.violator_flags).toBeDefined();
      expect(typeof body.evaluated_at).toBe('string');

      // The seeded rows actually surface — assert MEMBERSHIP, never counts (own-committing writers
      // from other specs can add rows to a shared table, but never to THIS random pariwar).
      const freezeIds = (body.cycle_freeze as Array<Json>).map((r) => r.resource_id);
      expect(freezeIds).toContain(claimCaseId);
      expect((body.r9_voting as Array<Json>).map((r) => r.resource_id)).toContain(r9ClaimId);
      expect((body.appeal as Array<Json>).map((r) => r.resource_id)).toContain(claimCaseId);
      expect((body.moderation as Array<Json>).map((r) => r.resource_id)).toContain(memberId);
    });

    it('every row carries the normalized shape, and undated sources carry explicit nulls (AC2)', async () => {
      const { p, claimCaseId } = shared;
      const { body } = await fetchAs(superAdmin, p);

      const freeze = (body.cycle_freeze as Array<Json>).find((r) => r.resource_id === claimCaseId)!;
      expect(Object.keys(freeze).sort()).toEqual([
        'age_ms', 'category', 'claim_case_id', 'cross_link_kind', 'deadline_at',
        'label', 'raised_at', 'resource_id', 'severity', 'source_key',
      ]);
      // Cycle-freeze defines no deadline, no instant and therefore no severity.
      expect(freeze.deadline_at).toBeNull();
      expect(freeze.raised_at).toBeNull();
      expect(freeze.age_ms).toBeNull();
      expect(freeze.severity).toBeNull();
      expect(freeze.cross_link_kind).toBe('cycle_freeze');
    });

    it('AC3 — a moderation row is aged but carries NO deadline and NO severity', async () => {
      const { p, memberId } = shared;
      const { body } = await fetchAs(superAdmin, p);

      const row = (body.moderation as Array<Json>).find((r) => r.resource_id === memberId)!;
      expect(row.raised_at).not.toBeNull();
      expect(row.age_ms).toBeGreaterThan(0);
      expect(row.deadline_at).toBeNull();
      expect(row.severity).toBeNull();
    });

    // ── THE 10.24 SEAM FLIP (Story 10.24, Task 6; AC5) ────────────────────────────────────────
    //
    // 10.11 shipped this arm as `detection_unavailable` and NAMED the one call site that would change
    // when the contribution-fact producer landed. It landed; this is the assertion that moved with it.
    //
    // ⚠ `detection_unavailable` is NOT gone and NOT dead — it is now reachable for a genuine
    // PER-MEMBER gap rather than as a deployment-wide statement (10.24 D6), and
    // `summarizeViolatorFlags` still degrades the WHOLE section rather than showing a partial list.
    // The AC4 invariant this test has always protected is unchanged: the section NEVER renders as a
    // bare empty array whose meaning is ambiguous — it is always a DISCRIMINATED status.
    it('AC4/10.24 — the violator arm now runs detection, and reports a DISCRIMINATED status either way', async () => {
      const { body } = await fetchAs(superAdmin, shared.p);

      const violator = body.violator_flags as Json;
      expect(['ok', 'detection_unavailable']).toContain(violator.status);
      if (violator.status === 'ok') {
        // Detection RAN. `members` carries only members holding >=1 applied R7 clause; this Pariwar
        // seeds no R7 clause versions, so the honest answer is an evaluated-and-empty list.
        expect(Array.isArray(violator.members)).toBe(true);
        expect(violator).not.toHaveProperty('producer');
      } else {
        // The gap arm still NAMES what is missing rather than showing a bare hole.
        expect(typeof violator.producer).toBe('string');
        expect(violator).not.toHaveProperty('members');
      }
    });

    it('10.24 — the flip is LIVE: the candidate scan actually ran (never the hardcoded sentinel)', async () => {
      // The specific regression this guards: reverting the handler to
      // `{ status: 'unavailable', producer: CONTRIBUTION_UNAVAILABLE.producer }` would make the arm
      // permanently `detection_unavailable` with a producer literal, which is indistinguishable from
      // a real per-member gap unless something asserts the scan ran. With no R7 clause versions seeded
      // for this Pariwar the scan resolves zero clauses and returns zero candidates, which
      // `summarizeViolatorFlags` reports as an EVALUATED empty list — a status the hardcoded sentinel
      // could never produce.
      const { body } = await fetchAs(superAdmin, shared.p);
      const violator = body.violator_flags as Json;
      expect(violator.status).toBe('ok');
      expect(violator.members).toEqual([]);
    });
  });

  // ── AC10 — the one new domain read, against real rows ──────────────────────────────────────────

  describe('AC10 — listOpenAppealCasesForPariwar against real appeal rows', () => {
    it('surfaces an OPEN journey with its stage and a DERIVED deadline', async () => {
      const p = randomUUID();
      createdPariwars.push(p);
      const { claimCaseId } = await seedApprovedClaim(p);
      await seedAppeal(p, claimCaseId, { stage: '2' });
      const client = await actorWith(p, 'pariwar_admin');

      const { body } = await fetchAs(client, p);
      const row = (body.appeal as Array<Json>).find((r) => r.resource_id === claimCaseId)!;
      expect(row, 'the open appeal must surface').toBeDefined();
      expect(row.label).toContain('stage_2');
      expect(row.claim_case_id).toBe(claimCaseId);
      // Stage 2's SLA is 21 days off the stage-entry instant — a real, derived deadline.
      expect(row.deadline_at).not.toBeNull();
      expect(row.raised_at).not.toBeNull();
      expect(row.severity).not.toBeNull();
      const gapDays = (new Date(row.deadline_at as string).getTime() - new Date(row.raised_at as string).getTime()) / 86_400_000;
      expect(Math.round(gapDays)).toBe(21);
    });

    it('a TERMINAL journey (reversed / upheld_final) drops out — it needs no trustee attention', async () => {
      const p = randomUUID();
      createdPariwars.push(p);
      const open = await seedApprovedClaim(p);
      const closed = await seedApprovedClaim(p);
      await seedAppeal(p, open.claimCaseId, { status: 'open' });
      await seedAppeal(p, closed.claimCaseId, { status: 'reversed' });
      const client = await actorWith(p, 'pariwar_admin');

      const ids = (((await fetchAs(client, p)).body.appeal as Array<Json>) ?? []).map((r) => r.resource_id);
      expect(ids).toContain(open.claimCaseId);
      expect(ids).not.toContain(closed.claimCaseId);
    });
  });

  // ── AC6 — the per-section capability filter ────────────────────────────────────────────────────

  describe('AC6 — sections are OMITTED, not emptied, and zero keys is a 403', () => {
    it('an auditor (Pariwar grant, NONE of the six keys) is denied the whole surface', async () => {
      const { status, body } = await fetchAs(auditor, shared.p);
      expect(status).toBe(403);
      // NOT a 200 with an empty body: "you may see nothing" must not render as "there is nothing".
      expect(body).not.toHaveProperty('cycle_freeze');
    });

    it('REVERT PAIR — pariwar_admin sees five sections; `concealment` is ABSENT, not empty', async () => {
      const { status, body } = await fetchAs(pariwarAdmin, shared.p);
      expect(status).toBe(200);

      for (const section of ['cycle_freeze', 'r9_voting', 'appeal', 'reconciliation', 'moderation'] as const) {
        expect(body[section], `${section} must be present for a pariwar_admin`).toBeDefined();
      }
      // `claim.verify` is a DISTRICT-dimension key; pariwar_admin does not carry it at all. The
      // section is absent — the key is missing from the JSON entirely, not present as `[]`.
      expect('concealment' in body, 'concealment must be ABSENT, not present-and-empty').toBe(false);
      expect(body.concealment).toBeUndefined();
    });

    it('REVERT PAIR — the same request as a super_admin DOES carry `concealment`', async () => {
      // The "with" half: the section's absence above is caused by the grant, not by the seeding.
      const { status, body } = await fetchAs(superAdmin, shared.p);
      expect(status).toBe(200);
      expect('concealment' in body).toBe(true);
      expect(Array.isArray(body.concealment)).toBe(true);
    });

    it('a district_admin is DENIED — a district-ceiling grant cannot satisfy a pariwar-dimension check', async () => {
      // DEFERRED, not broken ([[project_rbac_geo_scope_containment]]): district_admin holds
      // `claim.verify` + `claim.appeal_review`, but only at a `district` scopeCeiling. Pinned so a
      // future bundle edit that "fixes" this cannot land silently — it will fail HERE first.
      expect((await fetchAs(districtAdmin, shared.p)).status).toBe(403);
    });

    it('the violator arm is gated with the moderation section (both on `member.moderate`)', async () => {
      expect((await fetchAs(auditor, shared.p)).status).toBe(403);

      const { body } = await fetchAs(pariwarAdmin, shared.p);
      expect(body.moderation).toBeDefined();
      expect(body.violator_flags).toBeDefined();
    });

    it('an unauthenticated caller is 401, not 403', async () => {
      const anon = makeClient(app);
      const res = await anon.inject({ method: 'GET', url: url(shared.p) });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Cross-Pariwar denial ───────────────────────────────────────────────────────────────────────

  describe('cross-Pariwar isolation', () => {
    it('a pariwar_admin grant in P1 buys nothing in P2', async () => {
      const p1 = shared.p;
      const { p: p2 } = await seededPariwar();
      const client = pariwarAdmin;
      expect((await fetchAs(client, p1)).status).toBe(200);
      // 404, not 403 — and deliberately so. `scopeResolutionHook` denies BEFORE this module's
      // per-section filter ever runs: zero grants in the target Pariwar means "not a member (or the
      // Pariwar is absent)", and answering 403 there would confirm the tenant EXISTS to a caller with
      // no standing in it (the shipped no-enumeration-oracle convention,
      // middleware/scope-resolution/index.ts:47-49). Stricter than a 403, not weaker.
      expect((await fetchAs(client, p2)).status).toBe(404);
    });

    it('a tenant sees ONLY its own rows', async () => {
      const { p: p1, memberId: m1 } = shared;
      const { memberId: m2 } = await seededPariwar();
      const ids = ((await fetchAs(pariwarAdmin, p1)).body.moderation as Array<Json>).map((r) => r.resource_id);
      expect(ids).toContain(m1);
      expect(ids).not.toContain(m2);
    });
  });

  // ── AC8 — no ciphertext, no decryption ─────────────────────────────────────────────────────────

  describe('AC8 — an ID + non-PII summary surface', () => {
    it('the response body contains no ciphertext key and no stored ciphertext VALUE', async () => {
      const res = await superAdmin.inject({ method: 'GET', url: url(shared.p) });
      const raw = res.body;

      // The seeded verifier decision + moderation action both carry a rationale ciphertext. Neither
      // may appear, in any form — this is the whole point of the aggregator staying an index.
      expect(raw).not.toContain('SECRET-RATIONALE-DO-NOT-LEAK');
      expect(raw).not.toContain('SECRET-MODERATION-RATIONALE');
      expect(raw).not.toContain('ciphertext');
      expect(raw).not.toContain('enc:v1:');
    });

    it('the handler makes ZERO encryption calls', async () => {
      // The structural half: no ciphertext in the body could also be achieved by decrypting and then
      // dropping the value. Counting the port calls proves the path never touches the crypto boundary
      // at all — the 10.4 lesson (this request path carries ADMIN-identity keys).
      const enc = deps.encryption as unknown as Record<string, unknown>;
      const calls: string[] = [];
      const originals = new Map<string, unknown>();
      for (const key of Object.keys(enc)) {
        const value = enc[key];
        if (typeof value !== 'function') continue;
        originals.set(key, value);
        enc[key] = (...args: unknown[]) => {
          calls.push(key);
          return (value as (...a: unknown[]) => unknown)(...args);
        };
      }
      try {
        expect((await fetchAs(superAdmin, shared.p)).status).toBe(200);
        expect(calls, `the trustee-lite path called deps.encryption: ${calls.join(', ')}`).toEqual([]);
      } finally {
        for (const [key, value] of originals) enc[key] = value;
      }
    });
  });

  // ── AC1 — the source reads are used as shipped ─────────────────────────────────────────────────

  describe('the shipped source reads are consumed unmodified', () => {
    it('the aggregator agrees with getCycleFreezePending called directly', async () => {
      // If a future edit "improved" the shipped read, this comparison drifts — which is the point.
      const { p, claimCaseId } = shared;
      const { body } = await fetchAs(superAdmin, p);

      const scopeTx = await openScopeTx(deps, p);
      let direct: Awaited<ReturnType<typeof claimDomain.getCycleFreezePending>>;
      try {
        direct = await claimDomain.getCycleFreezePending(scopeTx.tx, ids.pariwarId(p));
      } finally {
        await closeScopeTx(scopeTx, false);
      }
      const directIds = [...direct.readyToFreeze, ...direct.escalated, ...direct.votedPendingCommit].map(
        (c) => c.claimCaseId,
      );
      expect(directIds).toContain(claimCaseId);
      expect((body.cycle_freeze as Array<Json>).map((r) => r.resource_id).sort()).toEqual(directIds.sort());
    });

    it('the aggregator agrees with listModeratedMembersForPariwar called directly', async () => {
      const { p, memberId } = shared;
      const { body } = await fetchAs(pariwarAdmin, p);

      const scopeTx = await openScopeTx(deps, p);
      let direct: Awaited<ReturnType<typeof memberDomain.moderation.listModeratedMembersForPariwar>>;
      try {
        direct = await memberDomain.moderation.listModeratedMembersForPariwar(scopeTx.tx, ids.pariwarId(p));
      } finally {
        await closeScopeTx(scopeTx, false);
      }
      expect(direct.map((e) => e.memberId)).toContain(memberId);
      expect((body.moderation as Array<Json>).map((r) => r.resource_id).sort()).toEqual(
        direct.map((e) => String(e.memberId)).sort(),
      );
    });
  });
});
