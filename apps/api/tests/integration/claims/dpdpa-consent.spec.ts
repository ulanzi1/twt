// Claim-time DPDPA consent — member-app E2E (live DB :5433) — Story 6.9 (Task 6).
//
// Drives the member-app consent step through the REAL guard chain [requireMemberSession] (NO step-up
// — consent is not a financial action) via `app.inject`:
//   · AC1/AC2 happy path: 3 boxes → 201, THREE consent_records rows (subject_id = deceased_member_id,
//     artifact_ref = claim_case_id, granted_via = member_self, payload = { server-canonical copy, locale }),
//     ONE claim.dpdpa_consent_recorded event (consent_types_granted only, NO PII), audit NON-PII;
//   · AC2 consent-copy integrity: the stored checkboxTextShown is the SERVER-resolved canonical copy;
//   · D3 no-block: only (a) → 201, ONE row, the claim state is UNCHANGED (declining b/c never blocks);
//   · D3a: claimTimeDpdpa:false → 400 (the processing consent is required to proceed);
//   · AC5 pre-adjudication guard: a verifier_approved claim → 409 dpdpa_consent.not_recordable;
//   · AC5 ownership: a member cannot record onto ANOTHER member's claim → 404;
//   · AC3 revoke (time-travel): revoke (b) → consentExists false NOW but true at a pre-revocation instant;
//   · the member-session guard: no token → 401.
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
  it('AC1/AC2: three boxes → 201, three consent rows (subject=deceased, artifact=claim), one event, audit NON-PII', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);

      const res = await inject(t, 'POST', url(claimCaseId), {
        payload: { claimTimeDpdpa: true, sahyogVivranPublication: true, inMemoriamListing: true, sahyogDrivePublication: false, locale: 'en' },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(201);
      expect(res.body.granted).toEqual(['claim_time_dpdpa', 'sahyog_vivran_publication', 'in_memoriam_listing']);

      // THREE consent_records rows keyed on the DECEASED member (D1), artifact_ref = claim_case_id.
      const rows = await t.pool.query<{
        subject_id: string; consent_type: string; consent_artifact_ref: string;
        granted_via_actor: string; consent_payload: { checkboxTextShown: string; locale: string };
      }>(
        `SELECT subject_id, consent_type, consent_artifact_ref, granted_via_actor, consent_payload
           FROM consent_records WHERE consent_artifact_ref = $1 ORDER BY consent_type`,
        [claimCaseId],
      );
      expect(rows.rows).toHaveLength(3);
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
        consent_types_granted: ['claim_time_dpdpa', 'sahyog_vivran_publication', 'in_memoriam_listing'],
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

  // D3 (no-block), the full optional-consent independence matrix (code review gap-closure): the
  // original test only covered (a)-only and all-three — (a)+(b)-without-(c) and (a)+(c)-without-(b)
  // were never exercised. Each combo must independently: write exactly the rows for the checked
  // boxes (never a row for an unchecked one), return exactly that `granted` set, and NEVER block or
  // alter claim progression regardless of which of (b)/(c) is declined.
  // ⭐ EXTENDED AT STORY 11b.1 — a FOURTH optional box, `(d) sahyog_drive_publication`, and it is
  // exercised in BOTH directions rather than merely appended as `false` to satisfy the schema.
  // ⚠ (d) IS THE ONE MOST WORTH PROVING NON-BLOCKING. It authorises publishing the deceased
  // member's NAME on a public page, so it is the box a family is most likely to decline — and
  // Niyamavali §4.4, Part 10 and Trust Deed cl.15(c) each forbid making it mandatory. A regression
  // that folded (d) into the `.refine()` would make declining it BLOCK THE CLAIM, which is the
  // worst failure this file can catch: a grieving family told they cannot file unless they agree
  // to publication.
  const OPTIONAL_CONSENT_COMBOS: Array<{
    label: string;
    payload: {
      sahyogVivranPublication: boolean;
      inMemoriamListing: boolean;
      sahyogDrivePublication: boolean;
    };
    expectedGranted: string[];
  }> = [
    {
      label: '(a) only — ⭐ ALL THREE publication consents DECLINED, and the claim proceeds',
      payload: {
        sahyogVivranPublication: false,
        inMemoriamListing: false,
        sahyogDrivePublication: false,
      },
      expectedGranted: ['claim_time_dpdpa'],
    },
    {
      label: '(a) + (b), (c) + (d) declined',
      payload: {
        sahyogVivranPublication: true,
        inMemoriamListing: false,
        sahyogDrivePublication: false,
      },
      expectedGranted: ['claim_time_dpdpa', 'sahyog_vivran_publication'],
    },
    {
      label: '(a) + (c), (b) + (d) declined',
      payload: {
        sahyogVivranPublication: false,
        inMemoriamListing: true,
        sahyogDrivePublication: false,
      },
      expectedGranted: ['claim_time_dpdpa', 'in_memoriam_listing'],
    },
    {
      label: '(a) + (d) ONLY — ⭐ the Sahyog Drive name consent alone, its siblings declined',
      payload: {
        sahyogVivranPublication: false,
        inMemoriamListing: false,
        sahyogDrivePublication: true,
      },
      // ⛔ Proves (d) writes its OWN row and does not ride on a sibling's. Reusing
      // `sahyog_vivran_publication` for this surface was rejected at D4(c) precisely because it
      // would silently widen what a family agreed to.
      expectedGranted: ['claim_time_dpdpa', 'sahyog_drive_publication'],
    },
    {
      label: 'all four',
      payload: {
        sahyogVivranPublication: true,
        inMemoriamListing: true,
        sahyogDrivePublication: true,
      },
      expectedGranted: [
        'claim_time_dpdpa',
        'sahyog_vivran_publication',
        'in_memoriam_listing',
        'sahyog_drive_publication',
      ],
    },
  ];

  for (const combo of OPTIONAL_CONSENT_COMBOS) {
    it(`D3 (no-block): ${combo.label} → 201, exactly the checked rows, claim state UNCHANGED`, async () => {
      const t = await createTestApp();
      try {
        const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
        const res = await inject(t, 'POST', url(claimCaseId), {
          payload: { claimTimeDpdpa: true, ...combo.payload, locale: 'en' },
          token: token(t, memberId, pariwarId),
        });
        expect(res.status).toBe(201);
        expect((res.body.granted as string[]).sort()).toEqual([...combo.expectedGranted].sort());

        const rows = await t.pool.query<{ consent_type: string }>(
          `SELECT consent_type FROM consent_records WHERE consent_artifact_ref = $1`, [claimCaseId],
        );
        expect(rows.rows.map((r) => r.consent_type).sort()).toEqual([...combo.expectedGranted].sort());

        // Declining (b) and/or (c) NEVER blocks — the claim proceeds normally in every combo.
        const claimRow = await t.pool.query<{ current_state: string }>(
          `SELECT current_state FROM claims WHERE claim_case_id = $1`, [claimCaseId],
        );
        expect(claimRow.rows[0]?.current_state).toBe('intake_converged');
      } finally {
        await teardown(t);
      }
    });
  }

  it('D3a: claimTimeDpdpa:false → 400 (processing consent is required to proceed)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
      const res = await inject(t, 'POST', url(claimCaseId), {
        payload: { claimTimeDpdpa: false, sahyogVivranPublication: true, inMemoriamListing: false, sahyogDrivePublication: false, locale: 'en' },
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
        payload: { claimTimeDpdpa: true, sahyogVivranPublication: false, inMemoriamListing: false, sahyogDrivePublication: false, locale: 'en' },
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
        payload: { claimTimeDpdpa: true, sahyogVivranPublication: false, inMemoriamListing: false, sahyogDrivePublication: false, locale: 'en' },
        token: token(t, b.memberId, b.pariwarId),
      });
      expect(res.status).toBe(404);
      const rows = await t.pool.query(`SELECT 1 FROM consent_records WHERE consent_artifact_ref = $1`, [a.claimCaseId]);
      expect(rows.rows).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC3 (revoke honored, time-travel): revoke (b) → consentExists false NOW but true at a pre-revocation instant', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
      const tok = token(t, memberId, pariwarId);
      const record = await inject(t, 'POST', url(claimCaseId), {
        payload: { claimTimeDpdpa: true, sahyogVivranPublication: true, inMemoriamListing: false, sahyogDrivePublication: false, locale: 'en' },
        token: tok,
      });
      expect(record.status).toBe(201);

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
        payload: { claimTimeDpdpa: true, sahyogVivranPublication: true, inMemoriamListing: false, sahyogDrivePublication: false, locale: 'en' },
        token: token(t, a.memberId, a.pariwarId),
      });
      expect(record.status).toBe(201);

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
        payload: { claimTimeDpdpa: true, sahyogVivranPublication: false, inMemoriamListing: false, sahyogDrivePublication: false, locale: 'en' },
      });
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});
