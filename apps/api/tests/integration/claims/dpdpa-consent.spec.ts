// Claim-time DPDPA consent — member-app E2E (live DB :5433) — Story 6.9 (Task 6).
//
// Drives the member-app consent step through the REAL guard chain [requireMemberSession] (NO step-up
// — consent is not a financial action) via `app.inject`:
//   · AC1/AC2 happy path: the ONE box → 201, ONE consent_records row (subject_id = deceased_member_id,
//     artifact_ref = claim_case_id, granted_via = member_self, payload = { server-canonical copy, locale }),
//     ONE claim.dpdpa_consent_recorded event (consent_types_granted only, NO PII), audit NON-PII;
//   · AC2 consent-copy integrity: the stored checkboxTextShown is the SERVER-resolved canonical copy;
//   · ⭐ the RETIREMENT, proved on the wire: a request still carrying a retired box → 400;
//   · D3a: claimTimeDpdpa:false → 400 (the processing consent is required to proceed);
//   · AC5 pre-adjudication guard: a verifier_approved claim → 409 dpdpa_consent.not_recordable;
//   · AC5 ownership: a member cannot record onto ANOTHER member's claim → 404;
//   · ⭐ AC3 revoke still works on a PRE-EXISTING grant — the D7(a) property;
//   · the member-session guard: no token → 401.
//
// ⭐⭐ MIGRATED BY STORY 11b.9 — and read the discriminator before "fixing" anything here.
// `2026-08-28-162` cl.2 reduced the claim consent screen to `claim_time_dpdpa` ALONE and removed the
// three publication booleans from the request contract. ⇒ a case that changed because the REQUEST
// lost three booleans is EXPECTED. A case that changed because a TYPE, TUPLE or ENUM lost a value
// would be an AC4 VIOLATION — ⛔ revert the source, ⛔ never the test.
//
// ⛔⛔ THE REVOKE CASES ARE ⛔ NOT DELETED, AND THAT IS THE POINT (story D7(a)). Retiring a box stops
// NEW rows; it ⛔ does not extinguish the rights attached to rows that ALREADY EXIST. Revocation is
// the last remaining data-subject action on those preserved rows, so the fixtures now seed the grant
// DIRECTLY — which is exactly the pre-11b.9 row the ruling preserves — and then revoke it through
// the live route. ⛔ Removing these would be a rights regression wearing a cleanup's clothes.
//
// The claim is driven to `intake_converged` via the real intake flow (a pre-adjudication state).

import { randomUUID } from 'node:crypto';

import { claim, consent, ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

const EN_PROCESSING_COPY =
  'I consent to the Trust processing the deceased member’s, my, and the nominees’ personal information as needed to verify and settle this claim.';

/**
 * ⭐ Seed a PRE-11b.9 publication grant directly — the row `2026-08-28-160` cl.5 preserves.
 *
 * ⛔ It can no longer be created through the record route (the box is retired), and that is precisely
 * why it is inserted here: the property under test is that such a row stays VISIBLE and REVOCABLE.
 */
async function seedLegacyPublicationGrant(
  t: TestApp,
  pariwarId: string,
  deceasedMemberId: string,
  claimCaseId: string,
  consentType: 'sahyog_vivran_publication' | 'in_memoriam_listing' | 'sahyog_drive_publication',
): Promise<void> {
  await t.pool.query(
    `INSERT INTO consent_records (pariwar_id, subject_id, consent_type, consent_artifact_ref,
                                  granted_via_actor, consent_payload, granted_at)
     VALUES ($1, $2, $3, $4, 'member_self', '{}'::jsonb, now() - interval '1 hour')`,
    [pariwarId, deceasedMemberId, consentType, claimCaseId],
  );
}

async function seedMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
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
    method, url, payload: opts.payload,
    headers: { origin: 'http://localhost:3001', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

async function declareNominee(t: TestApp, memberId: string, pariwarId: string): Promise<void> {
  const res = await inject(t, 'POST', '/api/v1/member/nominees', {
    payload: { nominees: [{ name: 'Asha Devi', relationship: 'spouse', mobile: '+91 98765 43210' }] },
    token: token(t, memberId, pariwarId),
  });
  expect(res.status).toBe(200);
}

async function establishHandoverTrust(t: TestApp, memberId: string, pariwarId: string): Promise<void> {
  const tok = token(t, memberId, pariwarId);
  const send = await inject(t, 'POST', '/api/v1/member/claims/handover-otp', { payload: {}, token: tok });
  expect(send.status).toBe(200);
  const code = t.stepUpDelivery.last?.code as string;
  const verify = await inject(t, 'POST', '/api/v1/member/claims/handover-otp/verify', { payload: { code }, token: tok });
  expect(verify.body).toMatchObject({ verified: true });
}

async function setupClaim(t: TestApp): Promise<{ memberId: string; pariwarId: string; claimCaseId: string }> {
  const { memberId, pariwarId } = await seedMember(t);
  await declareNominee(t, memberId, pariwarId);
  await establishHandoverTrust(t, memberId, pariwarId);
  const intake = await inject(t, 'POST', '/api/v1/member/claims/intake', {
    payload: { relationship: 'spouse' }, token: token(t, memberId, pariwarId),
  });
  expect(intake.status).toBe(200);
  expect(intake.body.state).toBe('intake_converged');
  return { memberId, pariwarId, claimCaseId: intake.body.claimCaseId as string };
}

const url = (claimCaseId: string) => `/api/v1/member/claims/${claimCaseId}/dpdpa-consent`;

describe.skipIf(!hasDatabase)('Claim-time DPDPA consent — member-app E2E (:5433)', () => {
  it('AC1/AC2: the ONE box → 201, one consent row (subject=deceased, artifact=claim), one event, audit NON-PII', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);

      const res = await inject(t, 'POST', url(claimCaseId), {
        payload: { claimTimeDpdpa: true, locale: 'en' },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(201);
      expect(res.body.granted).toEqual(['claim_time_dpdpa']);

      // ONE consent_records row keyed on the DECEASED member (D1), artifact_ref = claim_case_id.
      const rows = await t.pool.query<{
        subject_id: string; consent_type: string; consent_artifact_ref: string;
        granted_via_actor: string; consent_payload: { checkboxTextShown: string; locale: string };
      }>(
        `SELECT subject_id, consent_type, consent_artifact_ref, granted_via_actor, consent_payload
           FROM consent_records WHERE consent_artifact_ref = $1 ORDER BY consent_type`,
        [claimCaseId],
      );
      expect(rows.rows).toHaveLength(1);
      for (const r of rows.rows) {
        expect(r.subject_id).toBe(memberId); // D1 — the deceased member is the subject
        expect(r.consent_artifact_ref).toBe(claimCaseId); // D1 — provenance back-link
        expect(r.granted_via_actor).toBe('member_self'); // D4
      }
      // AC2 consent-copy integrity: the SERVER-resolved canonical copy is persisted (client sent no text).
      const processing = rows.rows.find((r) => r.consent_type === 'claim_time_dpdpa');
      expect(processing?.consent_payload.checkboxTextShown).toBe(EN_PROCESSING_COPY);
      expect(processing?.consent_payload.locale).toBe('en');

      // Exactly ONE identity annotation event; payload carries only consent_types_granted (NO PII).
      const events = await t.pool.query<{ payload: Json }>(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'claim.dpdpa_consent_recorded'`,
        [claimCaseId],
      );
      expect(events.rows).toHaveLength(1);
      expect(events.rows[0]?.payload).toMatchObject({
        consent_types_granted: ['claim_time_dpdpa'],
        from_state: 'intake_converged', to_state: 'intake_converged',
      });
      // NO PII / checkbox text in the event payload.
      expect(JSON.stringify(events.rows[0]?.payload)).not.toContain('consent to the Trust');

      // The audit line is NON-PII (no checkbox text / locale bytes).
      expect(t.auditSink.ofType('member_claim.dpdpa_consent_recorded').length).toBe(1);
      expect(JSON.stringify(t.auditSink.events)).not.toContain('consent to the Trust');
    } finally {
      await teardown(t);
    }
  });

  // ⭐⭐ THE OPTIONAL-CONSENT INDEPENDENCE MATRIX IS GONE, AND ⛔ NOT BECAUSE IT WAS REDUNDANT.
  //
  // It exercised (a)+(b), (a)+(c), (a)+(d) and all-four to prove each optional box wrote its OWN row
  // and that declining any of them NEVER blocked the claim — with (d) singled out as *"the one most
  // worth proving non-blocking"*, since a regression folding it into the `.refine()` would tell a
  // grieving family they cannot file unless they agree to publication.
  //
  // ⛔ EVERY ONE OF THOSE COMBINATIONS IS NOW UNCONSTRUCTIBLE: `2026-08-28-162` cl.2 retired all
  // three optional boxes, so `RecordDpdpaConsentRequest` carries exactly ONE boolean. There is no
  // "decline" to make non-blocking, because there is nothing left to decline.
  // ⭐ WHAT REPLACES IT is stronger for what it can still assert: the request is `.strict()`, so a
  // client (or a regressed screen) still SENDING a retired box is REJECTED outright rather than
  // silently ignored — which is what actually guarantees no new row of those types is ever written.
  const RETIRED_BOXES = [
    'sahyogVivranPublication',
    'inMemoriamListing',
    'sahyogDrivePublication',
  ] as const;

  for (const retiredBox of RETIRED_BOXES) {
    it(`⛔ the retirement, on the wire: a request still carrying ${retiredBox} → 400, no rows written`, async () => {
      const t = await createTestApp();
      try {
        const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
        const res = await inject(t, 'POST', url(claimCaseId), {
          payload: { claimTimeDpdpa: true, [retiredBox]: true, locale: 'en' },
          token: token(t, memberId, pariwarId),
        });
        expect(res.status).toBe(400);
        // ⛔ And critically: NOTHING was written — not the retired type, and not (a) either.
        const rows = await t.pool.query(
          `SELECT 1 FROM consent_records WHERE consent_artifact_ref = $1`, [claimCaseId],
        );
        expect(rows.rows).toHaveLength(0);
      } finally {
        await teardown(t);
      }
    });
  }

  it('D3 (no-block): the reduced one-box request → 201, exactly one row, claim state UNCHANGED', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
      const res = await inject(t, 'POST', url(claimCaseId), {
        payload: { claimTimeDpdpa: true, locale: 'en' },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(201);
      expect(res.body.granted).toEqual(['claim_time_dpdpa']);

      const rows = await t.pool.query<{ consent_type: string }>(
        `SELECT consent_type FROM consent_records WHERE consent_artifact_ref = $1`, [claimCaseId],
      );
      expect(rows.rows.map((r) => r.consent_type)).toEqual(['claim_time_dpdpa']);

      // Consent NEVER alters claim progression — unchanged by the reduction.
      const claimRow = await t.pool.query<{ current_state: string }>(
        `SELECT current_state FROM claims WHERE claim_case_id = $1`, [claimCaseId],
      );
      expect(claimRow.rows[0]?.current_state).toBe('intake_converged');
    } finally {
      await teardown(t);
    }
  });

  it('⭐ the GET presence view still SHOWS a pre-11b.9 publication grant (D7(a))', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
      const tok = token(t, memberId, pariwarId);
      const record = await inject(t, 'POST', url(claimCaseId), {
        payload: { claimTimeDpdpa: true, locale: 'en' }, token: tok,
      });
      expect(record.status).toBe(201);
      // ⭐ The row a family granted BEFORE the box was retired — preserved by `-160` cl.5.
      await seedLegacyPublicationGrant(t, pariwarId, memberId, claimCaseId, 'sahyog_drive_publication');

      const res = await inject(t, 'GET', url(claimCaseId), { token: tok });

      expect(res.status).toBe(200);
      // ⛔ The presence view is driven by the FULL enum on purpose. Narrowing it to the one captured
      // type would blind the family to their own record — half the right, silently removed.
      expect((res.body.granted as string[]).sort()).toEqual(
        ['claim_time_dpdpa', 'sahyog_drive_publication'].sort(),
      );
    } finally {
      await teardown(t);
    }
  });

  it('D3a: claimTimeDpdpa:false → 400 (processing consent is required to proceed)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
      const res = await inject(t, 'POST', url(claimCaseId), {
        payload: { claimTimeDpdpa: false, locale: 'en' },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(400);
      const rows = await t.pool.query(`SELECT 1 FROM consent_records WHERE consent_artifact_ref = $1`, [claimCaseId]);
      expect(rows.rows).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC5: recording onto a verifier_approved (adjudicated) claim → 409 not_recordable', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
      const scopeTx = await openScopeTx(t.deps, pariwarId);
      const cid = ids.claimId(claimCaseId);
      const base = { claimCaseId: cid, pariwarId: ids.pariwarId(pariwarId), deceasedMemberId: ids.memberId(memberId), intakeChannels: ['member_app'] as const, claimantActorId: null, actorId: null };
      await claim.projectClaimState(scopeTx.client, { ...base, eventType: 'claim.documents_received', payload: { from_state: 'intake_converged', to_state: 'documents_pending', trigger: 't', actor: 'system' } });
      await claim.projectClaimState(scopeTx.client, { ...base, eventType: 'claim.peer_mesh_pinged', payload: { from_state: 'documents_pending', to_state: 'verification_in_progress', trigger: 't', actor: 'system', selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1 } });
      await claim.projectClaimState(scopeTx.client, { ...base, eventType: 'claim.verifier_reviewing', payload: { from_state: 'verification_in_progress', to_state: 'verifier_review', trigger: 't', actor: 'system' } });
      await claim.projectClaimState(scopeTx.client, { ...base, eventType: 'claim.verifier_approved', payload: { from_state: 'verifier_review', to_state: 'verifier_approved', trigger: 't', actor: 'system' } });
      await closeScopeTx(scopeTx, true);

      const res = await inject(t, 'POST', url(claimCaseId), {
        payload: { claimTimeDpdpa: true, locale: 'en' },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(409);
      expect((res.body as { error: { code: string } }).error.code).toBe('dpdpa_consent.not_recordable');
    } finally {
      await teardown(t);
    }
  });

  it('AC5: a member cannot record consent onto ANOTHER member’s claim → 404, no rows written', async () => {
    const t = await createTestApp();
    try {
      const a = await setupClaim(t);
      const b = await seedMember(t);
      const res = await inject(t, 'POST', url(a.claimCaseId), {
        payload: { claimTimeDpdpa: true, locale: 'en' },
        token: token(t, b.memberId, b.pariwarId),
      });
      expect(res.status).toBe(404);
      const rows = await t.pool.query(`SELECT 1 FROM consent_records WHERE consent_artifact_ref = $1`, [a.claimCaseId]);
      expect(rows.rows).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  // ⭐⛔ THE D7(a) PROPERTY, AND THE REASON THIS CASE SURVIVES A STORY THAT RETIRED THE BOX.
  // The grant can no longer be MADE through the route — so it is seeded directly, which is exactly
  // the pre-11b.9 row `2026-08-28-160` cl.5 preserves. What must still work is WITHDRAWAL: a family
  // who granted before the retirement can still withdraw after it. ⛔ Preserving a row means
  // preserving what can be DONE with it, ⛔ not merely that it sits in a table.
  it('AC3 (revoke honored, time-travel): a PRE-11b.9 grant → consentExists false NOW but true at a pre-revocation instant', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
      const tok = token(t, memberId, pariwarId);
      const record = await inject(t, 'POST', url(claimCaseId), {
        payload: { claimTimeDpdpa: true, locale: 'en' },
        token: tok,
      });
      expect(record.status).toBe(201);
      await seedLegacyPublicationGrant(t, pariwarId, memberId, claimCaseId, 'sahyog_vivran_publication');

      // Capture a pre-revocation instant (after grant, before revoke). 150ms margin — wider than a
      // bare minimum gap — to stay robust under ci:local's documented concurrency-oversubscription
      // flakes ([[project_ci_local_concurrency_oversubscription]]).
      const beforeRevoke = new Date();
      await new Promise((r) => setTimeout(r, 150));

      const revoke = await inject(t, 'POST', `${url(claimCaseId)}/revoke`, {
        payload: { consentType: 'sahyog_vivran_publication', reason: 'family withdrew the memorial' },
        token: tok,
      });
      expect(revoke.status).toBe(200);
      // The presence view no longer includes the revoked publication consent.
      expect(revoke.body.granted).toEqual(['claim_time_dpdpa']);

      // The row is MUTATED, not deleted — revoked_at + reason set.
      const rows = await t.pool.query<{ revoked_at: string | null; revocation_reason: string | null }>(
        `SELECT revoked_at, revocation_reason FROM consent_records WHERE consent_artifact_ref = $1 AND consent_type = 'sahyog_vivran_publication'`,
        [claimCaseId],
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]?.revoked_at).not.toBeNull();
      expect(rows.rows[0]?.revocation_reason).toBe('family withdrew the memorial');

      // Time-travel (AC3): consentExists is false NOW, true at the pre-revocation instant.
      const scopeTx = await openScopeTx(t.deps, pariwarId);
      try {
        const pid = ids.pariwarId(pariwarId);
        const now = await consent.consentExists(scopeTx.tx, pid, memberId, 'sahyog_vivran_publication');
        const past = await consent.consentExists(scopeTx.tx, pid, memberId, 'sahyog_vivran_publication', beforeRevoke);
        expect(now).toBe(false);
        expect(past).toBe(true);
      } finally {
        await closeScopeTx(scopeTx, true);
      }
    } finally {
      await teardown(t);
    }
  });

  it('AC5 (code review gap-closure): a member cannot revoke consent on ANOTHER member’s claim → 404, consent stays active', async () => {
    const t = await createTestApp();
    try {
      const a = await setupClaim(t);
      const record = await inject(t, 'POST', url(a.claimCaseId), {
        payload: { claimTimeDpdpa: true, locale: 'en' },
        token: token(t, a.memberId, a.pariwarId),
      });
      expect(record.status).toBe(201);
      // ⭐ The preserved pre-11b.9 grant the unauthorized caller tries to reach (see D7(a) above).
      await seedLegacyPublicationGrant(t, a.pariwarId, a.memberId, a.claimCaseId, 'sahyog_vivran_publication');

      // A different member (not the claim's own deceased-member session) attempts to revoke.
      const b = await seedMember(t);
      const res = await inject(t, 'POST', `${url(a.claimCaseId)}/revoke`, {
        payload: { consentType: 'sahyog_vivran_publication', reason: 'unauthorized attempt' },
        token: token(t, b.memberId, b.pariwarId),
      });
      expect(res.status).toBe(404);

      // The consent is still active — untouched by the unauthorized caller (the same ownership
      // guard used by record() is applied identically in revoke() via requireDeceasedMemberId).
      const rows = await t.pool.query<{ revoked_at: string | null }>(
        `SELECT revoked_at FROM consent_records WHERE consent_artifact_ref = $1 AND consent_type = 'sahyog_vivran_publication'`,
        [a.claimCaseId],
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]?.revoked_at).toBeNull();
    } finally {
      await teardown(t);
    }
  });

  it('the member-session guard rejects an unauthenticated record (401)', async () => {
    const t = await createTestApp();
    try {
      const res = await inject(t, 'POST', url(randomUUID()), {
        payload: { claimTimeDpdpa: true, locale: 'en' },
      });
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});
