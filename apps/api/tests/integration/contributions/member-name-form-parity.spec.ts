// ⭐⭐ THE MEMBER/PUBLIC NAME-FORM PARITY — live-DB integration. Story 8.16 (Task 4; AC2, AC4, AC4b).
//
// ── What this file exists to prove, and why nothing cheaper can prove it ────────────────────────────
// One pool, two surfaces, ONE stored name. `2026-09-02-181` ruled that the member side reads the SAME
// stored per-Pariwar presentation mode the public side reads, so *"the two forms can never diverge
// again BY CONSTRUCTION"*. A DB-free test can assert that each resolver honours a mode handed to it;
// it cannot assert that BOTH READ THE SAME STORED ROW — which is the entire content of the ruling.
// So this drives both real routes, over real Postgres, against real Tier-1 ciphertext.
//
// ── ⚠⛔ TRAP 7 — THE VACUOUS PASS THIS FILE IS BUILT TO AVOID ───────────────────────────────────────
// The public name is gated by a publication basis whose clause id (`niy.public-disclosure.member-
// information`) has exactly ONE site in the whole repo: its own definition. ⛔ No migration, no seed
// and no production writer pins it, so on every real drive today `/sahyog` renders `deceasedMemberName:
// null`. ⇒ a parity test that asserted `public === member` WITHOUT SEEDING THE BASIS would compare
// against `null`, and would pass while proving NOTHING. The basis-satisfied half below is therefore
// the load-bearing one, and it is built through the real chain:
//   `consent_records`(`tc_acceptance`) → `terms_and_conditions_pinned_clauses` → `clause_versions`.
// ⛔ A fixture touching `sahyog_drive_publication` proves nothing — `2026-08-28-160` cl.5 de-authorised
// it and it is read-never.
//
// ── ⭐ `2026-09-04-189` cl.3, PROVEN IN BOTH DIRECTIONS (AC4b) ───────────────────────────────────────
// *"A MEMBER MUST SEE MORE THAN THE PUBLIC, AND NEVER LESS."* Both halves are asserted here: the
// no-basis case (the member sees the configured name while the public sees none) and the
// basis-satisfied case (string equality). ⚠ COMPLIANCE IS STATED, per `2026-09-04-195` cl.1 — and so
// is its scope: cl.3 is Trustee-scoped by `-195` cl.1 to the drive data class and the six 11b split
// stories, and reaches Story 8.16 only through author-committed `2026-09-08-208` cl.5(b), as the
// withdrawn `11b-16`'s residue. ⛔ It is not a universal invariant and must not be generalised.
//
// ── ⛔ AC4's PUBLIC FENCE IS NOT RE-BUILT HERE ──────────────────────────────────────────────────────
// That `/sahyog` renders through `resolvePublicMemberName` and NEVER `resolvePoolIdentity` is already
// pinned by a live test: `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:558`
// (*"an AUTHORISED drive carries the deceased member's FULL NAME (D10)"* — the assertion that fails
// the moment anyone reaches for the pool resolver on that surface). ⭐ Cited, not duplicated.
//
// ⚠ `integration-tests` concurrency is 1 and is LOAD-BEARING — never raise it. Assert MEMBERSHIP and
// explicit values, never global counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import {
  alert as alertDomain,
  encryption,
  ids,
  kyc,
  member as memberDomain,
  pool as poolDomain,
  schema,
} from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const MEMBER_CARD = '/api/v1/member/active-contribution';
const PUBLIC_DRIVE = (pariwarId: string): string =>
  `/api/v1/p/${pariwarId}/public-pages/sahyog-drive`;

/** The one stored legal name both surfaces resolve from. Three tokens, so `full_name` and
 *  `shielded_name` are unmistakably different strings and neither can be mistaken for the other. */
const STORED_LEGAL_NAME = 'Rajesh Kumar Sharma';
/** A single-token stored name — the Trap 5 class. `shielded_name` cannot shield it. */
const STORED_MONONYM = 'Sunita';

interface Fixture {
  readonly pariwarId: string;
  /** The CONTRIBUTING member — holds the session and is on the pool roster. */
  readonly requester: string;
  readonly deceasedMemberId: string;
  readonly poolId: string;
}

const audit = (from: string | null, to: string, trigger: string, actor: 'member' | 'system'): Record<string, unknown> => ({
  from_state: from,
  to_state: to,
  trigger,
  actor,
});

/**
 * Seed ONE pool that is simultaneously the requester's LIVE assigned pool (the member card's whole
 * precondition) and a `live` drive on the public `/sahyog` index — so both surfaces are reading the
 * same `claims.deceased_member_id`, the same `member_kyc_profiles.name_ciphertext`, and the same
 * Pariwar presentation row. ⛔ Two separate pools would let the two halves agree by accident.
 *
 * @param basis when true, seeds the REAL publication chain so the public surface is authorised to
 *   render the name. When false, the drive still exists and still renders — with the name `null`.
 */
async function seedSharedPool(
  t: TestApp,
  opts: { legalName?: string; basis: boolean },
): Promise<Fixture> {
  const legalName = opts.legalName ?? STORED_LEGAL_NAME;
  const pariwarId = randomUUID();
  const pid = ids.pariwarId(pariwarId);
  const cycleId = randomUUID();
  const claimCaseId = randomUUID();
  const poolId = randomUUID();
  const requester = randomUUID();
  const deceasedMemberId = randomUUID();

  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    // The CONTRIBUTING member, driven to `active` through the real projector — the card reads the
    // state from the event replay, so a hand-set row would prove nothing about the shipped path.
    const project = (memberId: string, eventType: string, payload: Record<string, unknown>) =>
      memberDomain.projectMemberState(scopeTx.client, {
        memberId: ids.memberId(memberId),
        pariwarId: pid,
        eventType: eventType as Parameters<typeof memberDomain.projectMemberState>[1]['eventType'],
        actorId: memberId,
        payload,
      });
    await project(requester, 'member.signup_initiated', audit(null, 'pending-kyc', 'signup', 'member'));
    await project(requester, 'member.kyc_completed', audit('pending-kyc', 'pending-fee', 'kyc', 'member'));
    await project(requester, 'member.vyawastha_shulk_paid', {
      ...audit('pending-fee', 'lock-in', 'fee_paid', 'member'),
      utr: 'UTR123',
      amount_inr: 110,
    });
    await project(requester, 'member.lock_in_expired', {
      ...audit('lock-in', 'active', 'lock_in_expired', 'system'),
      kyc_verified: true,
    });

    // The DECEASED member and the ONE Tier-1 ciphertext both surfaces decrypt.
    await scopeTx.client.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`,
      [deceasedMemberId, pariwarId],
    );
    await scopeTx.tx.insert(schema.memberKycProfiles).values({
      memberId: ids.memberId(deceasedMemberId),
      pariwarId: pid,
      nameCiphertext: await encryption.encryptKycField(legalName, pariwarId, t.deps.encryption),
      dobCiphertext: await encryption.encryptKycField('1970-01-15', pariwarId, t.deps.encryption),
      photoCiphertext: null,
      aadhaarMaskedId: 'XXXX1234',
      verificationStrength: 'aadhaar_kyc',
      source: 'digilocker',
    });

    // The cycle freeze commit — the window anchor the member's live-pool read requires.
    await scopeTx.client.query(
      `INSERT INTO cycle_freeze_commits (commit_id, pariwar_id, actor_id, actor_display, committed_claim_ids, committed_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [cycleId, pariwarId, requester, 'Test Trustee', [claimCaseId]],
    );

    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'on'");
    await scopeTx.client.query(
      `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels,
                           current_state, state_event_version)
       VALUES ($1, $2, $3, ARRAY['member_app']::claim_intake_channel[], 'approved', 1)`,
      [claimCaseId, pariwarId, deceasedMemberId],
    );
    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'off'");

    // `live` is BOTH the member card's precondition and a publicly VISIBLE drive state — which is
    // what lets one pool serve both assertions.
    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'on'");
    await scopeTx.tx.insert(schema.pools).values({
      poolId: ids.poolId(poolId),
      pariwarId: pid,
      cycleId: ids.cycleFreezeCommitId(cycleId),
      claimCaseId: ids.claimId(claimCaseId),
      poolIndex: 0,
      poolCanonicalIdentifier: `P-2026-08-${poolId.slice(0, 6)}`,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: 'live',
      stateEventVersion: 1,
      publicToken: poolDomain.mintPoolPublicToken(),
    });
    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'off'");

    // The frozen roster — the snapshot IS the assignment.
    const snapshot = poolDomain.serializePoolSnapshot({
      poolId,
      pariwarId,
      cycleId,
      poolIndex: 0,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: 'live',
      memberAssignments: [{ member_id: requester }],
    });
    await scopeTx.tx.insert(schema.poolSnapshots).values({
      poolId: ids.poolId(poolId),
      pariwarId: pid,
      formatVersion: snapshot.format_version,
      schemaVersion: snapshot.schema_version,
      integrityHash: snapshot.integrity_hash,
      stateEventVersion: 1,
      snapshot,
    });

    await scopeTx.client.query("SET LOCAL app.alert_state_writer = 'on'");
    await scopeTx.tx.insert(schema.alerts).values({
      alertId: alertDomain.deriveAlertId(cycleId),
      cycleId: ids.cycleFreezeCommitId(cycleId),
      pariwarId: pid,
      poolCount: 1,
      currentState: 'live',
      stateEventVersion: 3,
      createdByActor: requester,
    });
    await scopeTx.client.query("SET LOCAL app.alert_state_writer = 'off'");

    if (opts.basis) {
      // ⭐ THE REAL PUBLICATION CHAIN (Trap 7). Anything less and the public half compares to `null`.
      const tcVersionId = randomUUID();
      const clauseVersionId = randomUUID();
      await scopeTx.client.query(
        `INSERT INTO terms_and_conditions_versions
           (tc_version_id, pariwar_id, version, body_markdown, body_html_rendered,
            effective_from, legal_review_status)
         VALUES ($1, $2, 1, '# Terms', '<h1>Terms</h1>', now() - interval '1 day', 'approved')`,
        [tcVersionId, pariwarId],
      );
      await scopeTx.client.query(
        `INSERT INTO clause_versions
           (clause_version_id, clause_id, pariwar_id, version, effective_date, payload, benefit_mechanism)
         VALUES ($1, $2, $3, 1, now() - interval '1 day', '{}'::jsonb, 'pool')`,
        [clauseVersionId, poolDomain.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID, pariwarId],
      );
      await scopeTx.client.query(
        `INSERT INTO terms_and_conditions_pinned_clauses (tc_version_id, clause_version_id, pariwar_id)
         VALUES ($1, $2, $3)`,
        [tcVersionId, clauseVersionId, pariwarId],
      );
      // The acceptance, exactly as `member-terms.handlers.ts` writes it — the server-resolved
      // `tc_version_id` in `consent_artifact_ref`. The subject is the DECEASED member: the basis is
      // that person's OWN acceptance, never the family's tick-box.
      await scopeTx.client.query(
        `INSERT INTO consent_records (pariwar_id, subject_id, consent_type, consent_artifact_ref,
                                      granted_via_actor, consent_payload, granted_at, revoked_at)
         VALUES ($1, $2, 'tc_acceptance', $3, 'member_self', '{}'::jsonb, now() - interval '1 day', NULL)`,
        [pariwarId, deceasedMemberId, tcVersionId],
      );
    }

    await closeScopeTx(scopeTx, true);
    return { pariwarId, requester, deceasedMemberId, poolId };
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

/** Set the Pariwar's presentation mode through the GOVERNED write path — ⛔ never a raw UPDATE. */
async function setMode(t: TestApp, pariwarId: string, mode: 'full_name' | 'shielded_name'): Promise<void> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await kyc.setPublicNamePresentationMode(scopeTx.tx, {
      pariwarId: ids.pariwarId(pariwarId),
      mode,
      changedByActor: null,
      changedByDisplay: null,
      rationale: 'test fixture — the name form must be changeable with NO code change (-136 cl.1)',
      auditId: randomUUID(),
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

/** The member-facing name the card renders, or `null` when the card self-suppressed. */
async function memberName(t: TestApp, f: Fixture): Promise<string | null> {
  const res = await t.app.inject({
    method: 'GET',
    url: MEMBER_CARD,
    headers: {
      authorization: `Bearer ${signAccessToken(t.app, { memberId: f.requester, pariwarId: f.pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS)}`,
    },
  });
  const body = res.json() as { assigned: boolean; deceasedDisplayName?: string };
  return body.assigned ? (body.deceasedDisplayName ?? null) : null;
}

/** The public name the `/sahyog` index renders for this pool, or `null` when the basis does not hold. */
async function publicName(t: TestApp, f: Fixture): Promise<string | null> {
  const res = await t.app.inject({ method: 'GET', url: PUBLIC_DRIVE(f.pariwarId) });
  const body = res.json() as { items: Array<{ poolId?: string; deceasedMemberName: string | null }> };
  const row = body.items.find((i) => i.poolId === f.poolId) ?? body.items[0];
  return row?.deceasedMemberName ?? null;
}

/** The stored Tier-1 ciphertext — AC2's byte-identity subject. */
async function storedCiphertext(t: TestApp, f: Fixture): Promise<string> {
  const scopeTx = await openScopeTx(t.deps, f.pariwarId);
  try {
    const { rows } = await scopeTx.client.query<{ name_ciphertext: string }>(
      `SELECT name_ciphertext FROM member_kyc_profiles WHERE member_id = $1`,
      [f.deceasedMemberId],
    );
    await closeScopeTx(scopeTx, true);
    if (!rows[0]) throw new Error('storedCiphertext: no KYC row');
    return rows[0].name_ciphertext;
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

// ⚠ Suite-level `{ timeout: 30000 }` — the seeds drive the real projector, real KMS envelope
// encryption and several round trips per case ([[project_known_livedb_test_failures]]).
const describeDb = (name: string, fn: () => void): ReturnType<typeof describe> =>
  describe.skipIf(!hasDatabase)(name, { timeout: 30000 }, fn);

describeDb('Story 8.16 AC4b — `-189` cl.3 holds in BOTH directions', () => {
  it('⭐ NO BASIS: the member sees the configured name while the public sees NONE (more, never less)', async () => {
    const t = await createTestApp();
    try {
      const f = await seedSharedPool(t, { basis: false });
      // ⭐ This is EVERY REAL DRIVE TODAY. The publication clause has one site in the repo — its own
      // definition — so the basis is unsatisfiable and `/sahyog` names nobody, anywhere.
      expect(await publicName(t, f)).toBeNull();
      // ⭐ AC4b — the member path takes the configured FORM and ⛔ NOT the publication BASIS gate
      // (`2026-09-04-198` cl.1). A member sees a name ALWAYS. The wrong reading here is recorded as a
      // REGRESSION at `-197` follow-up (i): it *"would leave the contribution card unable to say who
      // died, on the screen that asks the member to pay."*
      expect(await memberName(t, f)).toBe('Rajesh Kumar Sharma');
    } finally {
      await teardown(t);
    }
  });

  it('⭐ BASIS SATISFIED: the two surfaces render the SAME STRING (the load-bearing half — Trap 7)', async () => {
    const t = await createTestApp();
    try {
      const f = await seedSharedPool(t, { basis: true });
      const pub = await publicName(t, f);
      // ⛔ THE GUARD AGAINST A VACUOUS PASS: if the fixture's basis chain were wrong this would be
      // `null`, and a bare `toBe(member)` comparison below would still have to fail — but only
      // because of this assertion. Never delete it.
      expect(pub).toBe('Rajesh Kumar Sharma');
      expect(await memberName(t, f)).toBe(pub);
    } finally {
      await teardown(t);
    }
  });
});

describeDb('Story 8.16 AC2 — the two forms cannot diverge, BY CONSTRUCTION', () => {
  it('⭐ THE MODE FLIP MOVES BOTH SURFACES TOGETHER — and back (`-136` cl.3, both directions)', async () => {
    const t = await createTestApp();
    try {
      const f = await seedSharedPool(t, { basis: true });

      // Launch posture: no stored row ⇒ the RULED default `full_name` (deliberately NOT fail-closed).
      expect(await publicName(t, f)).toBe('Rajesh Kumar Sharma');
      expect(await memberName(t, f)).toBe('Rajesh Kumar Sharma');

      // → shielded. The ONLY thing that changed is one stored value; no code, no deploy.
      await setMode(t, f.pariwarId, 'shielded_name');
      expect(await publicName(t, f)).toBe('Rajesh S.');
      // ⭐⭐ THE POINT OF THE WHOLE STORY: the member side moved WITH it. Had the member form been
      // hard-coded to `full_name`, this would read 'Rajesh Kumar Sharma' — a NEW inversion pointing
      // the other way, with the app showing MORE than the public page (Trap 3).
      expect(await memberName(t, f)).toBe('Rajesh S.');

      // → back to full. ⛔ Not a one-way ratchet toward privacy.
      await setMode(t, f.pariwarId, 'full_name');
      expect(await publicName(t, f)).toBe('Rajesh Kumar Sharma');
      expect(await memberName(t, f)).toBe('Rajesh Kumar Sharma');
    } finally {
      await teardown(t);
    }
  });

  it('⛔ THE STORED NAME IS BYTE-IDENTICAL ACROSS A FORM CHANGE AND BACK (`-136` cl.2)', async () => {
    const t = await createTestApp();
    try {
      const f = await seedSharedPool(t, { basis: true });
      const before = Buffer.from(await storedCiphertext(t, f), 'utf8');

      await setMode(t, f.pariwarId, 'shielded_name');
      await memberName(t, f); // the member render runs for real against the shielded mode
      await setMode(t, f.pariwarId, 'full_name');
      await memberName(t, f);

      // ⭐ ONE stored name, N presentation modes. A member-facing form change that touched the record
      // would be the "second identity system" `-136` cl.2 forbids — and this path never writes it.
      expect(Buffer.from(await storedCiphertext(t, f), 'utf8').equals(before)).toBe(true);
    } finally {
      await teardown(t);
    }
  });
});

describeDb('Story 8.16 Trap 5 — a MONONYM renders on the member side in BOTH modes', () => {
  it('⭐ `shielded_name` + mononym: the PUBLIC omits the name, the MEMBER still sees the pool', async () => {
    const t = await createTestApp();
    try {
      const f = await seedSharedPool(t, { legalName: STORED_MONONYM, basis: true });
      await setMode(t, f.pariwarId, 'shielded_name');

      // The public directory's ruled behaviour (`2026-08-21-145` cl.3): a name that cannot be
      // shielded is not published — *"a shorter page beats an unshielded name on a page that
      // promises shielding."*
      expect(await publicName(t, f)).toBeNull();

      // ⭐⭐ AND THE MEMBER SIDE MUST NOT COPY IT. Reusing `resolvePublicMemberName` here would have
      // turned "show the family's single name" into "OMIT THE POOL" — a functional regression on the
      // screen that asks this member to pay. Mononyms are common in India; not a corner case.
      expect(await memberName(t, f)).toBe('Sunita');
    } finally {
      await teardown(t);
    }
  });

  it('the mononym class is UNCHANGED by this story — it already rendered in full (Trap 4)', async () => {
    const t = await createTestApp();
    try {
      const f = await seedSharedPool(t, { legalName: STORED_MONONYM, basis: false });
      // Both modes, the same answer, and the same answer as before Story 8.16. ⇒ no inversion existed
      // in this class and none is reported closed.
      expect(await memberName(t, f)).toBe('Sunita');
      await setMode(t, f.pariwarId, 'shielded_name');
      expect(await memberName(t, f)).toBe('Sunita');
    } finally {
      await teardown(t);
    }
  });
});
