// The PUBLIC per-claim Sahyog Vivran route — live-DB integration (Story 11b.3, Task 3; AC1, AC3, AC5, AC6).
//
// Drives `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:driveToken` through
// `app.inject` against real Postgres.
//
// ⭐⭐ THE LOAD-BEARING FAMILY IS THE **NEGATIVE** ONE: this route returns ⛔ NO person, ⛔ NO
// ciphertext, ⛔ NO internal identifier and ⛔ NO rupee figure — which is the property the D6(b) split
// bought, and the reason the surface needs ⛔ no Panel ruling of its own.
//
// Families:
//   · the response shape — ⛔ NOTHING on the wire but the ten classified fields.
//   · ⭐ 404 COLLAPSES every "nothing to show" case — ⭐ FOUR of them since 11b.10: an unknown
//     ADDRESS · a `spawned` pool · a switched-off Pariwar · and a REAL drive addressed with a WRONG
//     or ABSENT token. ⛔ Byte-identical. ⚠ AMENDED, ⛔ not deleted: the ground used to be *"because
//     `P-YYYY-MM-###` is SEQUENTIAL"* — the sequential identifier is ⛔ no longer the address, so the
//     ground is now the fourth case, which is what stops the TOKEN itself becoming testable.
//   · ⭐ D4(b): `live` + `closed` + `settled` render, and the vocabulary is the PUBLIC one.
//   · ⭐ AC3: the confirmed count is canonical-events-only, and yellow can NEVER reach it.
//   · ⭐ AC5: the appeal lineage is derived AT REQUEST TIME (D12(a) — ⛔ no queue, ⛔ no consumer),
//     and carries ⛔ no rationale and ⛔ no reviewer.

import { randomUUID } from 'node:crypto';

import { PublicSahyogVivranResponse } from '@twt/contracts';
import {
  claim as claimDomain,
  encryption,
  ids,
  kyc,
  member as memberDomain,
  pool as poolDomain,
  schema,
} from '@twt/domain';
import { describe, expect, it, vi } from 'vitest';

import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';

// ⭐ A SWITCHABLE fault on the KYC-profile read — the route's ONE per-row DB statement (sixth review
// pass, 2026-09-18). ⚠ PASS-THROUGH unless a test arms it, so every other leg sees the real read.
// ⚠ Why a module mock: the fault must hit the read the HANDLER makes, on its own scope tx, and a
// real DB fault cannot be aimed at one row of one request from outside.
const profileReadFault = vi.hoisted(() => ({
  failOnCall: null as number | null,
  calls: 0,
  error: new Error('Connection terminated unexpectedly'),
}));
vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    kyc: {
      ...actual.kyc,
      getMemberKycProfile: async (
        ...args: Parameters<typeof actual.kyc.getMemberKycProfile>
      ): ReturnType<typeof actual.kyc.getMemberKycProfile> => {
        profileReadFault.calls += 1;
        if (profileReadFault.failOnCall === profileReadFault.calls) throw profileReadFault.error;
        return actual.kyc.getMemberKycProfile(...args);
      },
    },
  };
});
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

// ⭐⭐ STORY 11b.10 — THE ROUTE IS ADDRESSED BY THE DRIVE'S **OPAQUE PUBLIC TOKEN**, ⛔ never by
// `P-YYYY-MM-###`. The parameter is named `driveToken` and there is EXACTLY ONE address form.
const ROUTE = (pariwarId: string, driveToken: string): string =>
  `/api/v1/p/${pariwarId}/public-pages/sahyog-vivran/${encodeURIComponent(driveToken)}`;

/**
 * The FIXTURE'S token for a seeded drive.
 *
 * ⛔⛔ A TEST CONVENTION AND ⛔ NOTHING ELSE — it is derived from the canonical identifier ONLY so a
 * test can address the drive it just seeded without threading a return value through thirty call
 * sites. ⭐ The PRODUCTION mint is 128 bits of CSPRNG entropy and is derivable from ⛔ NOTHING
 * (D2, `pool/public-token.ts`). ⛔ Do not read this helper as evidence that tokens are derived.
 */
const tokenFor = (canonicalIdentifier: string): string => `tok-${canonicalIdentifier}`;

interface SeedSpec {
  canonicalIdentifier: string;
  /**
   * ⭐ The drive's PUBLIC ADDRESS token (Story 11b.10). Defaults to {@link tokenFor} — override only
   * when a test needs two drives whose identifiers collide, or an address it will deliberately miss.
   */
  publicToken?: string;
  poolState?: 'spawned' | 'live' | 'closed' | 'settled';
  district?: string;
  /** How many `contribution.confirmed` events to seed for the pool. */
  confirmed?: number;
  /** How many of those confirmations to walk back with a compensating reversal. */
  reversed?: number;
  /** Seed a YELLOW `contribution.utr-attested` event — ⛔ it must NEVER reach the count. */
  attested?: number;
  /** Seed a `claim.reversed` event on the claim's own stream. */
  appeal?: { stage: 1 | 2 | 3; category: string };
  /** Seed N `member_pool_assignments` rows — the EXPECTED side of the outcome. */
  assigned?: number;
  /**
   * ⭐ Seed a real Tier-1 encrypted KYC name for the claim subject. Present on purpose in the
   * DEFAULT fixture: this route must return ⛔ NOTHING derived from it, and a fixture with no
   * ciphertext at all could not prove that.
   */
  legalName?: string;
  /**
   * ⭐ Story 11b.3a — seed the claim's nominee bank accounts (Tier-1 ciphertext, encrypted the way
   * the real write path does). ⛔ Omitted = the 6.8 AC3 "never collected" absence signal.
   */
  nomineeBank?: readonly {
    rank: 1 | 2;
    holder: string;
    account: string;
    ifsc: string;
    vpa?: string;
    bankName: string;
    branch?: string;
  }[];
  /**
   * ⭐ Story 11b.3a — the Pariwar's masking window. ⛔ Omitted = ⛔ NO SCHEDULE ROW, which is
   * `D8-default` FAIL-OPEN (`2026-09-02-179` cl.1) and is the DEFAULT for every Pariwar until the
   * Trust acts — so the default fixture exercises the fail-open path, ⛔ not a configured one.
   */
  masking?: { mode: 'after_days'; maskAfterDays: number } | { mode: 'permanent' };
  /** How long ago the drive emitted `pool.closed`. Default 2 days. */
  closedDaysAgo?: number;
  /**
   * ⭐ Emit a `pool.settled` event this many days ago, IN ADDITION to `pool.closed`.
   *
   * ⚠ Exists for ONE regression (second-pass review, 2026-09-03): a drive that closed long ago and
   * settled recently. `DRIVE_CLOSED_AT` takes the LATEST such event, so reading masking from it made
   * a late settlement RESET the window and re-publish details that were already masked.
   */
  settledDaysAgo?: number;
  /**
   * ⭐⭐ Story 11b.3b (Task 2 unit 2) — GRANT THE NAME-PUBLICATION BASIS for this drive's subject.
   *
   * ⚠⛔⛔ **OMITTED IS THE PRODUCTION STATE, AND ⛔ NOT A LAZY DEFAULT.** `NAME_PUBLICATION_AUTHORISED`
   * needs a `clause_versions` row for `SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID` pinned into an accepted
   * T&C version; counsel's clause is still owed and there is ⛔ no migration, ⛔ no seed and ⛔ no
   * writer for it ⇒ every real drive today has ⛔ no basis. ⭐ So the DEFAULT fixture exercises the
   * INERT path, which is what actually ships.
   * ⭐ Setting it seeds the POST-CLAUSE world, so the ruled render is proven rather than assumed —
   * ⛔ without it the gate's positive arm would be untested and *"the name never renders"* would
   * pass for a surface that could ⛔ never render one ([[feedback_gate_scope_semantic_coverage]]).
   */
  authorised?: boolean;
  /**
   * ⭐⭐ Story 11b.3b (Task 3) — REAL confirmed contributors, each a real member with a real Tier-1
   * KYC ciphertext, confirmed IN THIS ARRAY'S ORDER.
   *
   * ⚠⛔ **`confirmed: N` IS ⛔ NOT A SUBSTITUTE.** That option emits `contribution.confirmed` events
   * against `randomUUID()` member ids with ⛔ no `member_kyc_profiles` row — ⭐ perfect for the COUNT
   * (which is what it was written for) and useless for the LIST, where every such row renders the
   * PLACEHOLDER for an unresolvable name (`-219` cl.1; ⚠ it was OMITTED until 2026-09-16). ⇒ a contributor-list leg built on it would assert an empty page and pass
   * for the wrong reason ([[feedback_gate_scope_semantic_coverage]]).
   *
   * ⭐ **ORDER IS THE POINT:** each entry is confirmed at the NEXT `event_version`, so the array
   * order IS the ruled render order (earliest LIVE confirmation ascending). ⛔ A fixture that
   * confirmed them in one batch could ⛔ not tell that ordering apart from `member_id` ordering.
   *
   * ⚠ `anonymized: true` stores the ENCRYPTED `[anonymized]` sentinel as the member's name, exactly
   * as `anonymizeMember` leaves it — ⛔ not a deleted row and ⛔ not a null ciphertext. ⭐ That is what
   * makes the erasure-backstop leg real: the decrypt SUCCEEDS and the sentinel would otherwise render.
   * ⚠ `corrupt: true` encrypts the name under a DIFFERENT Pariwar's context ⇒ a real envelope whose
   * decrypt FAILS on its AAD — the per-envelope fault (the fifth `-219` cl.3 cause), ⛔ not a KMS outage.
   */
  contributors?: readonly { name: string; anonymized?: boolean; corrupt?: boolean }[];
}

async function seedDrive(t: TestApp, spec: SeedSpec): Promise<{ pariwarId: string }> {
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const pid = ids.pariwarId(pariwarId);
    const memberId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = randomUUID();

    await scopeTx.client.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version)
       VALUES ($1, $2, 'active', 1)`,
      [memberId, pariwarId],
    );
    if (spec.legalName !== undefined) {
      await scopeTx.tx.insert(schema.memberKycProfiles).values({
        memberId: ids.memberId(memberId),
        pariwarId: pid,
        nameCiphertext: await encryption.encryptKycField(
          spec.legalName,
          pariwarId,
          t.deps.encryption,
        ),
        dobCiphertext: await encryption.encryptKycField('1970-01-15', pariwarId, t.deps.encryption),
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
    }
    if (spec.district !== undefined) {
      await scopeTx.client.query(
        `INSERT INTO member_postings (posting_id, member_id, pariwar_id, district, is_retirement, created_at)
         VALUES ($1, $2, $3, $4, false, now() - interval '10 days')`,
        [randomUUID(), memberId, pariwarId, spec.district],
      );
    }

    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'on'");
    await scopeTx.client.query(
      `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels,
                           current_state, state_event_version)
       VALUES ($1, $2, $3, ARRAY['member_app']::claim_intake_channel[], 'approved', 1)`,
      [claimCaseId, pariwarId, memberId],
    );
    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'off'");

    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'on'");
    await scopeTx.client.query(
      // ⚠ `public_token` (Story 11b.10) is NOT NULL with a GLOBAL unique index. ⭐ It is ALSO the
      // route parameter now — `spec.publicToken` is what the tests address the drive by, and the
      // canonical identifier below is seeded only so the page can still RENDER it (Trap 3: retained
      // and displayed, ⛔ never addressable).
      `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index,
                          pool_canonical_identifier, support_category, benefit_mechanism,
                          fixed_amount, current_state, state_event_version, public_token)
       VALUES ($1, $2, $3, $4, 0, $5, 'death_support', 'pool', 100, $6, 1, $7)`,
      [
        poolId,
        pariwarId,
        randomUUID(),
        claimCaseId,
        spec.canonicalIdentifier,
        spec.poolState ?? 'closed',
        spec.publicToken ?? tokenFor(spec.canonicalIdentifier),
      ],
    );
    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'off'");

    if (spec.authorised === true) {
      // ⭐ The basis, seeded EXACTLY as `member-terms.handlers.ts` writes it — the SERVER-resolved
      // `tc_version_id` goes in `consent_artifact_ref`. ⚠⛔ If that writer ever stores anything else
      // there, the predicate returns FALSE for every member, silently and with ⛔ no failing test;
      // that coupling is why both files say so. ⭐ Mirrors the sibling index's fixture rather than
      // inventing a second shape — ⛔ one basis, one way to satisfy it.
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
           (clause_version_id, clause_id, pariwar_id, version, effective_date, payload,
            benefit_mechanism)
         VALUES ($1, $2, $3, 1, now() - interval '1 day', '{}'::jsonb, 'pool')`,
        [clauseVersionId, poolDomain.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID, pariwarId],
      );
      await scopeTx.client.query(
        `INSERT INTO terms_and_conditions_pinned_clauses
           (tc_version_id, clause_version_id, pariwar_id)
         VALUES ($1, $2, $3)`,
        [tcVersionId, clauseVersionId, pariwarId],
      );
      await scopeTx.client.query(
        `INSERT INTO consent_records (pariwar_id, subject_id, consent_type, consent_artifact_ref,
                                      granted_via_actor, consent_payload, granted_at, revoked_at)
         VALUES ($1, $2, 'tc_acceptance', $3, 'member_self', '{}'::jsonb,
                 now() - interval '1 day', NULL)`,
        [pariwarId, memberId, tcVersionId],
      );
    }

    // The close/settle instant the surface reads (AC3's settlement-state source).
    if ((spec.poolState ?? 'closed') !== 'live' && (spec.poolState ?? 'closed') !== 'spawned') {
      await scopeTx.client.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, 'pool.closed', '{}'::jsonb, 1, $2, now() - ($3 || ' days')::interval)`,
        [poolId, pariwarId, String(spec.closedDaysAgo ?? 2)],
      );
      // ⭐ The LATER settle event, when the fixture asks for one. Its whole purpose is to be NEWER
      // than the close event, so `DRIVE_CLOSED_AT` (latest) and `DRIVE_MASKING_FROM` (earliest)
      // disagree — which is exactly the condition the un-masking defect needed.
      if (spec.settledDaysAgo !== undefined) {
        await scopeTx.client.query(
          `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
           VALUES ($1, 'pool.settled', '{}'::jsonb, 2, $2, now() - ($3 || ' days')::interval)`,
          [poolId, pariwarId, String(spec.settledDaysAgo)],
        );
      }
    }

    for (let i = 0; i < (spec.assigned ?? 0); i += 1) {
      const other = randomUUID();
      await scopeTx.client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version)
         VALUES ($1, $2, 'active', 1)`,
        [other, pariwarId],
      );
      // ⚠ The PK is `(pool_id, member_id)` — there is no `assignment_id` column.
      await scopeTx.client.query(
        `INSERT INTO member_pool_assignments (pariwar_id, pool_id, member_id, cycle_id, assigned_at)
         VALUES ($1, $2, $3, $4, now())`,
        [pariwarId, poolId, other, randomUUID()],
      );
    }

    const alertStream = randomUUID();
    let version = 1;
    const confirmedEventIds: string[] = [];

    // ⭐⭐ Story 11b.3b (Task 3) — REAL contributors, confirmed IN ARRAY ORDER. ⚠ Emitted BEFORE the
    // anonymous `confirmed: N` events below so the declared order occupies the lowest event versions
    // and is therefore the head of the ruled ordering.
    for (const contributor of spec.contributors ?? []) {
      const contributorMemberId = randomUUID();
      await scopeTx.client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version)
         VALUES ($1, $2, 'active', 1)`,
        [contributorMemberId, pariwarId],
      );
      await scopeTx.tx.insert(schema.memberKycProfiles).values({
        memberId: ids.memberId(contributorMemberId),
        pariwarId: pid,
        // ⭐ The SENTINEL IS ENCRYPTED, ⛔ not stored in plaintext and ⛔ not a null ciphertext —
        // `anonymizeMember` overwrites the ciphertext IN PLACE and RETAINS the row, so the decrypt
        // SUCCEEDS. ⛔ A fixture that nulled the column would exercise the WRONG omission arm.
        nameCiphertext: await encryption.encryptKycField(
          contributor.anonymized === true ? memberDomain.ANONYMIZED_SENTINEL : contributor.name,
          contributor.corrupt === true ? randomUUID() : pariwarId,
          t.deps.encryption,
        ),
        dobCiphertext: await encryption.encryptKycField('1970-01-15', pariwarId, t.deps.encryption),
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
      await scopeTx.client.query(
        `INSERT INTO events_log (event_id, stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, $2, 'contribution.confirmed', $3::jsonb, $4, $5, now() - interval '3 days')`,
        [
          randomUUID(),
          alertStream,
          JSON.stringify({ poolId, memberId: contributorMemberId }),
          version,
          pariwarId,
        ],
      );
      version += 1;
    }

    for (let i = 0; i < (spec.confirmed ?? 0); i += 1) {
      const eventId = randomUUID();
      confirmedEventIds.push(eventId);
      await scopeTx.client.query(
        `INSERT INTO events_log (event_id, stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, $2, 'contribution.confirmed', $3::jsonb, $4, $5, now() - interval '3 days')`,
        [eventId, alertStream, JSON.stringify({ poolId, memberId: randomUUID() }), version, pariwarId],
      );
      version += 1;
    }
    for (let i = 0; i < (spec.reversed ?? 0); i += 1) {
      await scopeTx.client.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, 'reconciliation.confirmation-reversed', $2::jsonb, $3, $4, now() - interval '2 days')`,
        [
          alertStream,
          JSON.stringify({ poolId, reversedConfirmedEventId: confirmedEventIds[i] }),
          version,
          pariwarId,
        ],
      );
      version += 1;
    }
    // ⛔ YELLOW. Seeded on purpose: it must be structurally unable to reach the confirmed count.
    for (let i = 0; i < (spec.attested ?? 0); i += 1) {
      await scopeTx.client.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, 'contribution.utr-attested', $2::jsonb, $3, $4, now() - interval '3 days')`,
        // ⚠ A UNIQUE `tr` per event: `contribution_utr_attested_tr_uq` enforces the Story 8.7
        // idempotency reference, so a repeated literal 23505s the seed rather than the assertion.
        [
          alertStream,
          JSON.stringify({ poolId, memberId: randomUUID(), tr: `TR-${randomUUID().slice(0, 12)}` }),
          version,
          pariwarId,
        ],
      );
      version += 1;
    }

    // ⭐ Story 11b.3a — the nominee bank accounts, encrypted under the SAME field class the real
    // write path uses (`claim_nominee_bank`). ⛔ Not a plaintext shortcut: the route DECRYPTS, so a
    // fixture that stored plaintext would prove the decrypt path works when it does not.
    for (const acct of spec.nomineeBank ?? []) {
      const enc = (v: string) =>
        encryption
          .encryptTier1(
            Buffer.from(v, 'utf-8'),
            { pariwarId, fieldClass: 'claim_nominee_bank' },
            t.deps.encryption.kms,
            t.deps.encryption.kekRef,
          )
          .then((ct) => encryption.serializeEnvelope(ct));
      await scopeTx.tx.insert(schema.claimNomineeBankAccounts).values({
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: pid,
        accountRank: acct.rank,
        accountHolderNameCiphertext: await enc(acct.holder),
        accountNumberCiphertext: await enc(acct.account),
        ifscCiphertext: await enc(acct.ifsc),
        vpaCiphertext: acct.vpa === undefined ? null : await enc(acct.vpa),
        bankName: acct.bankName,
        branch: acct.branch ?? null,
        ifscValidated: true,
      });
    }

    // ⭐ Story 11b.3a — the masking window. ⚠ Written through the GOVERNED accessor, ⛔ not a raw
    // insert: a raw insert would bypass the rationale/anchor/grant checks the ruling requires, so
    // the fixture would not exercise the path an operator actually takes.
    if (spec.masking !== undefined) {
      await claimDomain.setNomineeBankMaskingSchedule(scopeTx.tx, {
        pariwarId: pid,
        setting: spec.masking,
        // ⚠ Well in the past so the window is IN FORCE at request time.
        effectiveFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        changedByActor: null,
        changedByDisplay: null,
        rationale: 'test fixture — the per-Pariwar nominee-bank masking window',
        auditId: randomUUID(),
      });
    }

    if (spec.appeal !== undefined) {
      await scopeTx.client.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, 'claim.reversed', $2::jsonb, 7, $3, now() - interval '5 days')`,
        [
          claimCaseId,
          JSON.stringify({
            reversed_at_stage: spec.appeal.stage,
            disposition_category: spec.appeal.category,
          }),
          pariwarId,
        ],
      );
    }

    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { pariwarId };
}

async function setPublicationEnabled(t: TestApp, pariwarId: string, enabled: boolean): Promise<void> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await memberDomain.setDirectoryPublicationEnabled(scopeTx.tx, {
      pariwarId: ids.pariwarId(pariwarId),
      enabled,
      changedByActor: null,
      changedByDisplay: null,
      rationale: 'test fixture — the per-Pariwar public-surface kill switch',
      auditId: randomUUID(),
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

/**
 * ⭐ Set the Pariwar's public-name presentation mode THROUGH THE GOVERNED WRITE PATH — Story 11b.3b.
 *
 * ⛔ ⛔ Not a direct `UPDATE`: `2026-08-19-136` cl.3 makes changing how every member's name appears on
 * an unauthenticated public page a GOVERNED ACT, and `setPublicNamePresentationMode` throws
 * `UngovernedPresentationChangeError` without the record. ⭐ A fixture that bypassed it would test a
 * state the product cannot reach. ⚠ Mirrors the sibling index's helper rather than inventing a
 * second shape.
 */
async function setMode(
  t: TestApp,
  pariwarId: string,
  mode: 'full_name' | 'shielded_name',
): Promise<void> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await kyc.setPublicNamePresentationMode(scopeTx.tx, {
      pariwarId: ids.pariwarId(pariwarId),
      mode,
      changedByActor: null,
      changedByDisplay: null,
      rationale: 'test fixture — the public name form must be changeable with NO code change',
      auditId: randomUUID(),
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

describe.skipIf(!hasDatabase)('public Sahyog Vivran route (:5433)', { timeout: 30000 }, () => {
  it('⭐⭐ returns ONLY the twelve classified fields — ⛔ no ciphertext, no internal id', async () => {
    const t = await createTestApp();
    try {
      const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
      const { pariwarId } = await seedDrive(t, {
        canonicalIdentifier: id,
        district: 'Lucknow',
        confirmed: 3,
        assigned: 4,
        // ⭐ A REAL Tier-1 ciphertext exists for this claim's subject, and the route must return
        // NOTHING derived from it. A fixture with no KYC row could not prove that.
        legalName: 'Rajesh Kumar Sharma',
      });

      const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { drive: Record<string, unknown> };

      // ⭐ THE EXACT KEY SET, ⛔ not a sample.
      expect(Object.keys(body.drive).sort()).toEqual([
        // ⭐ Story 11b.3b (AC3b) — the ruled public rupee figure, `2026-09-04-190` cl.6.
        'amountRaisedInr',
        'appealReversal',
        'closedAt',
        'confirmedContributionCount',
        // ⭐ Story 11b.3b (Task 2 unit 2) — `2026-09-02-173`. ⚠ Present on EVERY response and `null`
        // on every drive today (⛔ no publication basis) — ⛔ NEVER conditionally omitted, which
        // would make the key set vary by fixture and let a missing field pass unnoticed.
        'deceasedMemberName',
        'district',
        'driveStatus',
        'fundingOutcome',
        // ⭐ Story 11b.3a. ⚠ Present on EVERY response, `[]` when the claim's bank details were
        // never collected — ⛔ never conditionally omitted, which would make the key set vary by
        // fixture and let a missing field pass unnoticed.
        'nomineeBankAccounts',
        'poolCanonicalIdentifier',
        'poolLetterCode',
      ]);

      // ⭐ THE PROPERTY, not a restatement: parse the WHOLE wire response through the real
      // `.strict()` contract, which fails on ANY extra or renamed field anywhere in the shape.
      expect(() => PublicSahyogVivranResponse.parse(res.json())).not.toThrow();

      // ⛔⛔ AND THE RAW BODY CARRIES NO UNNAMED PERSON AND NO INTERNAL IDENTIFIER, under ANY key.
      //
      // ⭐⭐ **THE `Rajesh` / `Sharma` LEGS ARE ⛔ NOT STALE AFTER 11b.3b — THEY BECAME THE STORY'S
      // SHARPEST ASSERTION, AND THE FIXTURE IS WHY.** `seedDrive` plants a REAL Tier-1 ciphertext
      // for this claim's subject (`legalName` above), the route now SELECTS that column, and
      // `2026-09-02-173` AUTHORISES rendering it — ⭐ and the name STILL does not appear, because
      // `NAME_PUBLICATION_AUTHORISED` has no pinned `clause_versions` row to satisfy it.
      // ⇒ ⭐ this is the DESIGNED INERT STATE proven END TO END, ⛔ not an absence of capability.
      // ⛔⛔ IF EITHER LEG EVER GOES RED, ⛔ DO ⛔ NOT DELETE IT: it means a publication basis became
      // satisfiable, which is a GOVERNANCE event (counsel's clause landing) — ⛔ never a test fix.
      const raw = res.body;
      for (const forbidden of [
        'Rajesh',
        'Sharma',
        'enc:v1:',
        'memberId',
        'member_id',
        'deceasedMemberId',
        'claimCaseId',
        'claim_case_id',
        'poolId',
        'pool_id',
      ]) {
        expect(raw).not.toContain(forbidden);
      }
      // ⚠⛔⛔ **NARROWED 2026-09-15 (Story 11b.3b, AC3b / AC9) — ⛔ THE LEG IS ⛔ NOT DELETED AND ITS
      // PRIOR FORM IS KEPT HERE** ([[feedback_supersede_never_reinterpret]]). It read
      // *"⛔ AND NO RUPEE FIGURE — D1(b) moved the amount to 11b.3b; D1(c) is REFUSED"* and forbade
      // `amountRaised` · `fixedAmount` · `rosterSize` · `₹`.
      // ⭐ **11b.3b IS THAT STORY** ⇒ `amountRaisedInr` is RULED onto this wire (`-190` cl.6) and its
      // key is asserted in the set above. ⛔ THE FACTORS STAY BANNED, and they are what the leg was
      // really protecting: their PRODUCT is लक्ष्य, reserved by `2026-09-07-204` cl.3 and closed
      // *"BY CONSTRUCTION"* by cl.8. ⚠ `₹` stays banned too — the wire carries a NUMBER; formatting
      // is the render layer's, and a symbol here would mean a second money format was minted.
      for (const forbidden of ['fixedAmount', 'rosterSize', 'expectedTotal', 'deliveredTotal', '₹']) {
        expect(raw).not.toContain(forbidden);
      }
      // ⛔⛔ AND ⛔ NO COMPARISON COMPANION (`2026-09-15-218` cl.4) — the amount may ⛔ never be paired
      // with a target, an expected total or a roster size: their ratio IS the percentage cl.1
      // refuses, reconstructed by hand.
      for (const forbidden of ['targetAmount', 'driveTarget', 'confirmedPercentage', 'shortfall']) {
        expect(raw).not.toContain(forbidden);
      }
      // ⛔ AND NO CONTRIBUTION STATUS KEY — the AC4 shape, on the wire.
      expect(raw).not.toContain('"status"');
    } finally {
      await teardown(t);
    }
  });

  describe('⭐⭐ Story 11b.3b (Task 2 unit 2) — THE DECEASED MEMBER\'S NAME, `2026-09-02-173`', () => {
    it('⛔⛔ RENDERS NOTHING WITHOUT A PUBLICATION BASIS — ⭐ the DAY-ONE state of every drive', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        // ⭐ A REAL Tier-1 ciphertext EXISTS for this subject and the read now SELECTS it. ⛔ The
        // fixture grants ⛔ NO basis, which is what every production drive looks like today.
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          district: 'Lucknow',
          confirmed: 3,
          assigned: 4,
          legalName: 'Rajesh Kumar Sharma',
        });

        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: Record<string, unknown> };

        // ⭐ FAIL-CLOSED AND THEREFORE CORRECT (`2026-09-08-209` cl.2) — ⛔ not an unfinished render.
        expect(body.drive.deceasedMemberName).toBeNull();
        expect(res.body).not.toContain('Rajesh');
        expect(res.body).not.toContain('Sharma');

        // ⭐⭐ AND THE PAGE STILL RENDERS EVERYTHING ELSE — **omit the NAME, ⛔ never the page.**
        // ⭐ The CONTRIBUTOR arm (Task 3) now keeps its ROW too and renders the placeholder
        // (`2026-09-16-219` cl.1); ⚠ it used to omit the row — SUPERSEDED.
        expect(body.drive.poolCanonicalIdentifier).toBe(id);
        expect(body.drive.district).toBe('Lucknow');
        expect(body.drive.confirmedContributionCount).toBe(3);

        // ⛔⛔ AND ⛔ NO PLACEHOLDER AND ⛔ NO WITHHELD MARKER, under any key. A per-drive marker would
        // announce WHICH members have a publication basis — the enumeration signal the absent basis
        // must ⛔ not emit.
        for (const marker of ['withheld', 'Not recorded', 'unavailable', 'redacted', 'anonymous']) {
          expect(res.body).not.toContain(marker);
        }
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ RENDERS THE FULL NAME once the basis exists — ⛔ the gate is ⛔ not vacuous', async () => {
      // ⛔⛔ WITHOUT THIS LEG THE ONE ABOVE PROVES ⛔ NOTHING: *"the name never renders"* passes
      // identically for a surface that could ⛔ NEVER render one — a gate with no positive arm is a
      // green scan over an unreachable branch ([[feedback_gate_scope_semantic_coverage]]).
      // ⚠⛔ THIS SEEDS THE POST-CLAUSE WORLD IN A TEST TRANSACTION. ⛔ It is ⛔ NOT a licence to seed
      // a `clause_versions` row anywhere else: `public-read.ts` forbids a placeholder in terms —
      // *"a stand-in makes names render on an authority that does ⛔ not exist."*
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          district: 'Lucknow',
          confirmed: 3,
          assigned: 4,
          legalName: 'Rajesh Kumar Sharma',
          authorised: true,
        });

        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: Record<string, unknown> };

        // ⭐⭐ **THE FULL NAME, WHOLE** — `2026-09-02-173`, unconditional per `-175`. ⛔ NOT
        // `Rajesh K.`: the SHIELDED form is what `resolvePoolIdentity` /
        // `splitFirstNameLastInitial` would produce, and shipping it here would satisfy every other
        // test while quietly rendering the one form the Panel did ⛔ not rule.
        expect(body.drive.deceasedMemberName).toBe('Rajesh Kumar Sharma');
        // ⛔ AND ⛔ NO CIPHERTEXT CAME WITH IT — the boundary decrypts, and only the resolved string
        // crosses.
        expect(res.body).not.toContain('enc:v1:');
        // ⛔ AND STILL ⛔ NO IDENTIFIER FOR THE PERSON NOW NAMED — a name plus a per-member id is a
        // permalink, which is an enumeration primitive in its own right (11a.3, control 5).
        for (const forbidden of ['deceasedMemberId', 'memberId', 'member_id']) {
          expect(res.body).not.toContain(forbidden);
        }
        // ⭐ AND THE SHAPE STILL PARSES — `.min(1).nullable()`, through the REAL contract.
        expect(() => PublicSahyogVivranResponse.parse(res.json())).not.toThrow();
      } finally {
        await teardown(t);
      }
    });

    it('⭐⛔ THE FORM FOLLOWS THE PARIWAR\'S STORED MODE — ⛔ never a hard-coded `full_name`', async () => {
      // ⛔⛔ `2026-08-19-136` **cl.1**: *"a build in which the public name form cannot be changed
      // without a code change FAILS this clause."* ⇒ ⭐ the SAME fixture must render differently
      // under a different stored mode, and that is asserted rather than assumed.
      // ⚠⛔ A hard-coded literal would pass EVERY other test in this file — this is the only leg
      // that catches it, and Trap 5 names it *"the last remaining way to re-open the divergence."*
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          district: 'Lucknow',
          confirmed: 3,
          assigned: 4,
          legalName: 'Rajesh Kumar Sharma',
          authorised: true,
        });

        const full = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect((full.json() as { drive: Record<string, unknown> }).drive.deceasedMemberName).toBe(
          'Rajesh Kumar Sharma',
        );

        await setMode(t, pariwarId, 'shielded_name');

        const shielded = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        // ⚠ `Rajesh S.` — the **LAST** token's initial (`Sharma`), ⛔ not the middle name's. ⭐ Written
        // from what `splitFirstNameLastInitial` actually does, ⛔ not from what a three-token name
        // looks like it should do: the first draft of this leg asserted `Rajesh K.` and the
        // implementation was right.
        expect(
          (shielded.json() as { drive: Record<string, unknown> }).drive.deceasedMemberName,
        ).toBe('Rajesh S.');
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ A MONONYM UNDER `shielded_name` OMITS THE NAME — ⛔ and ⛔ NEVER the page', async () => {
      // ⚠⛔⛔ **MONONYMS ARE COMMON IN INDIA; ⛔ THIS IS ⛔ NOT A CORNER CASE** (Trap 5).
      // `resolvePublicMemberName` returns `''` for a single-token name under `shielded_name`
      // (`2026-08-21-145` cl.3) ⇒ the boundary's **`.trim() || null`** turns it into an omission.
      // ⛔⛔ AND ⛔ DO ⛔ NOT "FIX" IT BY FALLING THROUGH TO `firstName`: `public-name.ts` records that
      // exact bug — for a mononym that returns the ENTIRE stored legal name, byte-identical to
      // `full_name`, i.e. it publishes MORE than the shielded mode was chosen to publish.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          district: 'Lucknow',
          confirmed: 3,
          assigned: 4,
          legalName: 'Meenakshi',
          authorised: true,
        });
        await setMode(t, pariwarId, 'shielded_name');

        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: Record<string, unknown> };

        // ⭐ OMITTED — and `null`, ⛔ never `''`: the contract is `.min(1)`, so an empty string would
        // 500 the whole page rather than omit a name.
        expect(body.drive.deceasedMemberName).toBeNull();
        expect(res.body).not.toContain('Meenakshi');
        // ⭐⭐ AND THE PAGE STANDS — the deceased member's arm of the per-subject omission rule.
        expect(body.drive.poolCanonicalIdentifier).toBe(id);
        expect(() => PublicSahyogVivranResponse.parse(res.json())).not.toThrow();
      } finally {
        await teardown(t);
      }
    });

    it('⛔ A WHITESPACE-ONLY STORED NAME OMITS THE NAME — `.trim() || null`, ⛔ not `=== \'\'`', async () => {
      // ⚠⛔ THE EXACT NARROWING THAT WAS ALREADY FOUND AND FIXED ON THE SIBLING SURFACE
      // (Review finding, 2026-09-08). ⛔ Writing `=== \'\'` here re-introduces a CLOSED defect: a
      // whitespace-only stored name slips the guard, passes the contract\'s `.min(1)`, arrives
      // TRUTHY at the render layer so no fallback fires, and renders a visually BLANK cell where a
      // person\'s name belongs. ⭐ Asserted so the narrowing cannot come back.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          district: 'Lucknow',
          confirmed: 3,
          assigned: 4,
          legalName: '   ',
          authorised: true,
        });

        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive.deceasedMemberName).toBeNull();
        expect(() => PublicSahyogVivranResponse.parse(res.json())).not.toThrow();
      } finally {
        await teardown(t);
      }
    });

    it('⛔ a subject with NO KYC PROFILE ROW still publishes its DRIVE — ⛔ the join is LEFT', async () => {
      // ⚠⛔ An INNER join would make an absent profile delete the whole page, turning a missing NAME
      // into a missing RECORD. ⭐ Asserted, ⛔ not left to the join keyword to imply.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        // ⛔ `legalName` omitted ⇒ ⛔ NO `member_kyc_profiles` row at all. ⭐ And the basis IS granted,
        // so the `null` here is the CIPHERTEXT arm, ⛔ not the gate arm — the two causes are proven
        // separately rather than both hiding behind the same default.
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          district: 'Lucknow',
          confirmed: 3,
          assigned: 4,
          authorised: true,
        });

        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive.deceasedMemberName).toBeNull();
        expect(body.drive.poolCanonicalIdentifier).toBe(id);
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ THE ERASURE SENTINEL OMITS THE NAME, ⛔ NEVER RENDERS `[anonymized]` (Trap 4, AC5)', async () => {
      // ⚠⛔⛔ `anonymizeMember` overwrites `name_ciphertext` IN PLACE with an *encrypted*
      // `[anonymized]` sentinel and RETAINS the row ⇒ the decrypt SUCCEEDS. ⛔ An empty-name guard
      // does ⛔ NOT catch it. ⭐ Mirrors the contributor list's own erasure-backstop leg (Task 3) —
      // ⛔ without this the deceased-member arm renders the sentinel literally where a person's
      // name belongs, on an unauthenticated public page.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          district: 'Lucknow',
          confirmed: 3,
          assigned: 4,
          legalName: memberDomain.ANONYMIZED_SENTINEL,
          authorised: true,
        });

        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: Record<string, unknown> };

        // ⭐ OMITTED, ⛔ never the sentinel — the deceased member's arm of AC3's per-subject
        // omission ruling, ⛔ not a `[anonymized]` string surfacing on the page.
        expect(body.drive.deceasedMemberName).toBeNull();
        expect(res.body).not.toContain('[anonymized]');
        expect(res.body).not.toContain('anonymized');
        // ⭐⭐ AND THE PAGE STANDS — omit the NAME, ⛔ never the page.
        expect(body.drive.poolCanonicalIdentifier).toBe(id);
        expect(() => PublicSahyogVivranResponse.parse(res.json())).not.toThrow();
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐⭐ Story 11b.3b (Task 3, AC3/AC4) — THE CONFIRMED CONTRIBUTOR LIST, `2026-09-02-174`', () => {
    it('⭐⭐ RENDERS FULL NAMES, in the RULED ORDER — ⛔ never the shielded form', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          contributors: [
            { name: 'Anita Verma' },
            { name: 'Bhavesh Patel' },
            { name: 'Chandra Iyer' },
          ],
        });

        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { items: { name: string }[]; total: number };

        // ⭐⭐ **THE FULL NAME, WHOLE** — `2026-09-02-174`, unconditional per `-175`. ⛔ NOT
        // `Anita V.`: the SHIELDED form is what `resolvePoolIdentity` / `splitFirstNameLastInitial`
        // would produce, and shipping it here would satisfy every other test while quietly rendering
        // the one form the Panel did ⛔ not rule on this surface.
        // ⭐⭐ **AND THE ORDER IS THE EARLIEST LIVE CONFIRMATION'S `event_version`, ⛔ NEVER
        // `member_id`** — the fixture confirms them in this order at ascending versions, and the
        // member ids are random UUIDs, so a `member_id` ordering would shuffle this array. ⚠ It is
        // ⛔ NOT a ranking: it is the order in which support arrived.
        expect(body.items).toEqual([
          { name: 'Anita Verma' },
          { name: 'Bhavesh Patel' },
          { name: 'Chandra Iyer' },
        ]);
        expect(body.total).toBe(3);

        // ⛔⛔ AND ⛔ NO AMOUNT, ⛔ NO RANK AND ⛔ NO ROW KEY CAME WITH THEM — 11b.1 AC5 and
        // `D10-rowkey`(a). ⭐ Asserted over the ROWS' OWN KEYS rather than the raw body: the DRIVE
        // legitimately carries `amountRaisedInr` (`2026-09-04-190` cl.6), so a body-wide `"amount`
        // probe fails on the ruled figure — ⛔ a false positive that would be "fixed" by weakening
        // the check. ⭐ The row is where the prohibition lives, so the row is where it is asserted.
        for (const row of body.items) {
          expect(Object.keys(row)).toEqual(['name']);
        }
        expect(() => PublicSahyogVivranResponse.parse(res.json())).not.toThrow();
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ AN RTBF-ERASED CONTRIBUTOR KEEPS AN UNNAMED ROW — ⭐ and STILL COUNTS', async () => {
      // ⛔⛔ **THE ERASURE BACKSTOP, AND IT IS THE ⛔ ONLY SNAPSHOT-INDEPENDENT CHECK IN THE PATH**
      // (Trap 4 / AC5; `2026-08-30-169`, `2026-08-31-170`). `anonymizeMember` overwrites
      // `name_ciphertext` IN PLACE with an *encrypted* `[anonymized]` sentinel and RETAINS the row
      // ⇒ ⭐ the decrypt SUCCEEDS, and without the plaintext check this page renders the literal
      // **`[anonymized]`** where a person's name belongs, on an unauthenticated edge-cached surface.
      // ⚠ An empty-name guard does ⛔ NOT catch it — the sentinel is a non-empty string.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          contributors: [
            { name: 'Anita Verma' },
            { name: 'ERASED', anonymized: true },
            { name: 'Chandra Iyer' },
          ],
        });

        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as {
          items: { name: string | null }[];
          total: number;
          drive: { confirmedContributionCount: number; amountRaisedInr: number };
        };

        // ⭐⭐ **INVERTED BY `#decision-2026-09-16-219` cl.1 (option E) — ⛔ THE ROW IS ⛔ NO LONGER
        // DROPPED, AND THE SUPERSEDED ASSERTION IS QUOTED, ⛔ NOT DELETED**
        // ([[feedback_closure_language_precision]]). ⛔ THIS READ:
        //   `expect(body.items).toEqual([{ name: 'Anita Verma' }, { name: 'Chandra Iyer' }]);`
        //   under *"ABSENT ENTIRELY — ⛔ no anonymized row, ⛔ no marker, ⛔ no placeholder key"*.
        // ⇒ ⭐ a placeholder row is now exactly what is ruled, and cl.2 supersedes `2026-08-30-169`
        // cl.1 for THIS public surface only.
        // ⚠⛔ **THE POSITION IS PRESERVED** — the unnamed row sits where the person sat, so the page
        // shows three rows for three confirmed contributors.
        expect(body.items).toEqual([
          { name: 'Anita Verma' },
          { name: null },
          { name: 'Chandra Iyer' },
        ]);
        // ⛔⛔ **AND THE SENTINEL STILL ⛔ NEVER CROSSES THE WIRE.** ⭐ That half did ⛔ NOT move: the
        // backstop this test exists for is unchanged, and `null` is ⛔ not a softer version of it.
        expect(res.body).not.toContain('[anonymized]');
        expect(res.body).not.toContain('anonymized');
        // ⛔ cl.3 — the row discloses ⛔ NO cause. ⚠ `null` is the ONLY signal, and it is the same
        // `null` an unresolvable name or a failed decrypt produces.
        expect(Object.keys(body.items[1] as object)).toEqual(['name']);

        // ⭐⭐ **AND THE OMITTED CONTRIBUTOR STILL COUNTS** (`2026-08-30-169` **cl.6**, D3-aggregate —
        // ⚠ this cited **cl.4** until 2026-09-16, which is the BATCHED-STATE-READ clause; the
        // two-axis *"continues to contribute to `confirmedCount`"* ruling is cl.6): `total` is THREE
        // beside TWO **NAMED** rows. ⛔ An aggregate that shrank with the erasure would leak the
        // erasure by arithmetic — the omission must be invisible in the NUMBERS, ⛔ not merely in the
        // list.
        expect(body.total).toBe(3);
        // ⛔⛔ **AND IT IS *EVERY* AGGREGATE, ⛔ NOT JUST THE ONE BESIDE THE LIST.** `-169` **cl.6**
        // (D3-aggregate) says the omitted contributor *"still counts toward every aggregate"* ⇒ the
        // drive's own canonical EVENT count and the ruled RUPEE FIGURE must both be blind to the
        // erasure too.
        // ⚠⛔ **THIS CITED `cl.4` UNTIL 2026-09-17** — that is the BATCHED-STATE-READ clause, ⛔ not this
        // rule. ⛔ The identical correction was made one screen below on 2026-09-16 without sweeping
        // HERE, which is how a mis-citation survives inside the very test that was being corrected.
        // ⚠ The two aggregates are computed from `contribution.confirmed` events, which RTBF does ⛔ not delete — ⭐ asserted
        // rather than assumed, because a future "tidy" that filtered erased members out of the count
        // would leak the erasure through arithmetic while every list assertion above stayed green.
        expect(body.drive.confirmedContributionCount).toBe(3);
        expect(body.drive.amountRaisedInr).toBe(300);

        // ⛔⛔ AND ⛔ NO OMISSION COUNT ANYWHERE — ⛔ no "1 withheld", ⛔ no tally, ⛔ no marker. A count
        // of omissions is an enumeration signal over which members were erased.
        for (const marker of ['withheld', 'omitted', 'redacted', 'hidden', 'removed']) {
          expect(res.body).not.toContain(marker);
        }
      } finally {
        await teardown(t);
      }
    });

    it('⭐ PAGES, and the DECRYPT FAN-OUT IS BOUNDED BY `limit` — ⛔ not by the roster', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          contributors: [
            { name: 'Anita Verma' },
            { name: 'Bhavesh Patel' },
            { name: 'Chandra Iyer' },
          ],
        });

        // ⭐ COUNT THE DECRYPTS — ⛔ the title's claim was asserted by NOTHING until 2026-09-18 (fourth
        // review pass): a decrypt-the-roster-then-slice regression returned the same `items` and passed.
        // ⭐ The default fixture authorises ⛔ no deceased name and seeds ⛔ no nominee account, so every
        // `decryptDek` on this request is a CONTRIBUTOR row.
        const decryptDek = vi.spyOn(t.deps.encryption.kms, 'decryptDek');
        let first: Awaited<ReturnType<typeof t.app.inject>>;
        try {
          first = await t.app.inject({
            method: 'GET',
            url: `${ROUTE(pariwarId, tokenFor(id))}?limit=2`,
          });
          expect(decryptDek).toHaveBeenCalledTimes(2);
        } finally {
          decryptDek.mockRestore();
        }
        const firstBody = first.json() as {
          items: { name: string }[];
          page: number;
          limit: number;
          total: number;
        };
        expect(firstBody.items).toEqual([{ name: 'Anita Verma' }, { name: 'Bhavesh Patel' }]);
        expect(firstBody).toMatchObject({ page: 1, limit: 2, total: 3 });

        const second = await t.app.inject({
          method: 'GET',
          url: `${ROUTE(pariwarId, tokenFor(id))}?limit=2&page=2`,
        });
        const secondBody = second.json() as { items: { name: string }[]; page: number };
        // ⭐ THE ORDER IS STABLE ACROSS PAGES — ⛔ page 2 is the TAIL, ⛔ not a re-shuffle. "Page N is
        // the same page N on every request" is the property offset paging needs to be honest.
        expect(secondBody.items).toEqual([{ name: 'Chandra Iyer' }]);
        expect(secondBody.page).toBe(2);

        // ⭐ AND PAST THE END IS AN EMPTY PAGE, ⛔ not a 404 and ⛔ not a wrap-around: a 404 here would
        // distinguish "real drive, page too far" from "no such drive", which is the oracle the
        // opaque token exists to close.
        const past = await t.app.inject({
          method: 'GET',
          url: `${ROUTE(pariwarId, tokenFor(id))}?limit=2&page=9`,
        });
        expect(past.statusCode).toBe(200);
        expect((past.json() as { items: unknown[] }).items).toEqual([]);
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ `-219` cl.3 — a CORRUPT envelope on a ONE-ROW page is the PLACEHOLDER, byte-identical to an ERASURE — ⛔ never a 503', async () => {
      // ⚠⛔⛔ **REGRESSION, 2026-09-18 (fourth review pass).** The 2026-09-17 outage rule 503'd a page
      // when EVERY row on it failed systemically ⇒ on `?limit=1` a failed decrypt answered `503` while
      // an erasure answered `200` + the placeholder, and a visitor could probe each position for WHICH
      // class of cause applied. ⭐ The fifth cause (a failed decrypt) was also the ONLY one untested.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          contributors: [
            { name: 'Anita Verma' },
            { name: 'Bhavesh Patel', corrupt: true },
            { name: 'Chandra Iyer', anonymized: true },
          ],
        });
        const onePage = (page: number) =>
          t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId, tokenFor(id))}?limit=1&page=${page}` });

        const corrupt = await onePage(2);
        const erased = await onePage(3);
        expect(corrupt.statusCode).toBe(200);
        expect(erased.statusCode).toBe(200);
        expect((corrupt.json() as { items: unknown[] }).items).toEqual([{ name: null }]);
        // ⭐⭐ INDISTINGUISHABLE — same status, same row, same headers that matter; only `page` differs.
        const strip = (b: string) => ({ ...(JSON.parse(b) as Record<string, unknown>), page: 0 });
        expect(strip(corrupt.body)).toEqual(strip(erased.body));
        expect(corrupt.headers['cache-control']).toBe(erased.headers['cache-control']);
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ a DB fault on ONE row\'s profile read refuses the page — ⛔ never a placeholder (sixth review pass)', async () => {
      // ⚠⛔ The Decision's DB half had ⛔ no test after the fourth pass's SQLSTATE leg was deleted:
      // moving the read back inside the per-row `try` passed everything. ⭐ A status-less connection
      // error — the shape the fourth pass's SQLSTATE rule missed — on the SECOND of two rows.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          contributors: [{ name: 'Anita Verma' }, { name: 'Bhavesh Patel' }],
        });
        profileReadFault.calls = 0;
        profileReadFault.failOnCall = 2;
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(500);
        expect(res.body).not.toContain('Anita');
      } finally {
        profileReadFault.failOnCall = null;
        await teardown(t);
      }
    });

    it('⭐ a KMS OUTAGE on the DECEASED-name decrypt refuses the page too (sixth review pass)', async () => {
      // ⚠ Before, the deceased arm caught everything: an outage published as a quiet omission at 200.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          legalName: 'Rajesh Kumar Sharma',
          authorised: true,
        });
        vi.spyOn(t.deps.encryption.kms, 'decryptDek').mockRejectedValueOnce(
          Object.assign(new Error('14 UNAVAILABLE: kms'), { code: 14 }),
        );
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(500);
      } finally {
        vi.restoreAllMocks();
        await teardown(t);
      }
    });

    it('⭐⭐ a KMS OUTAGE on ONE row of MANY refuses the page — decided by the ERROR, ⛔ never by the page', async () => {
      // ⚠⛔⛔ **REGRESSION, 2026-09-18 (fifth review pass).** Both earlier rules decided "outage" from
      // the page: the 2026-09-17 one needed EVERY row to fail, and the fourth pass's canary probe passed
      // whenever a FRESH round-trip worked. ⭐ Here ONE of two rows meets an UNAVAILABLE (gRPC 14) and the
      // other decrypts — neither earlier rule refuses this page; classifying by the error does.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          contributors: [{ name: 'Anita Verma' }, { name: 'Bhavesh Patel' }],
        });
        vi.spyOn(t.deps.encryption.kms, 'decryptDek').mockRejectedValueOnce(
          Object.assign(new Error('14 UNAVAILABLE: kms'), { code: 14 }),
        );
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(500);
        expect(res.body).not.toContain('Anita');
        expect(res.body).not.toContain('Bhavesh');
      } finally {
        vi.restoreAllMocks();
        await teardown(t);
      }
    });

    it('⭐ a STATUS-LESS KMS failure (HSM assertion, empty response) is an OUTAGE too — ⛔ never a placeholder', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          contributors: [{ name: 'Anita Verma' }],
        });
        vi.spyOn(t.deps.encryption.kms, 'decryptDek').mockRejectedValueOnce(
          new Error('cloudKmsProvider: kek protectionLevel must be HSM'),
        );
        const res = await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId, tokenFor(id))}?limit=1` });
        expect(res.statusCode).toBe(500);
      } finally {
        vi.restoreAllMocks();
        await teardown(t);
      }
    });

    it('⭐⭐ a CORRUPT envelope costs the SAME ONE KMS call an erased row does — ⛔ no timing channel', async () => {
      // ⚠ The fourth pass's probe added an encrypt + a decrypt to a corrupt row ONLY, measurable per
      // position at `?limit=1`. ⭐ Classifying by the error adds ⛔ nothing.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          contributors: [
            { name: 'Bhavesh Patel', corrupt: true },
            { name: 'Chandra Iyer', anonymized: true },
          ],
        });
        const decryptDek = vi.spyOn(t.deps.encryption.kms, 'decryptDek');
        const encryptDek = vi.spyOn(t.deps.encryption.kms, 'encryptDek');
        for (const page of [1, 2]) {
          decryptDek.mockClear();
          const res = await t.app.inject({
            method: 'GET',
            url: `${ROUTE(pariwarId, tokenFor(id))}?limit=1&page=${page}`,
          });
          expect(res.statusCode).toBe(200);
          expect(decryptDek).toHaveBeenCalledTimes(1);
        }
        expect(encryptDek).not.toHaveBeenCalled();
      } finally {
        vi.restoreAllMocks();
        await teardown(t);
      }
    });

    it('⭐⭐ A DEVANAGARI NAME WITH AN INTERIOR ZWJ PUBLISHES UNCHANGED — ⛔ never re-spelled', async () => {
      // ⚠⛔⛔ **THE NORMALISER USED TO CORRUPT THIS, AND IT SHIPPED.** Found 2026-09-17 by adversarial
      // review: `normalisePublicName` ran a GLOBAL strip of `\u200b-\u200f` and returned the rewritten
      // string. That range contains ZWNJ (U+200C) and ZWJ (U+200D), which in Devanagari select
      // half-form vs conjunct — so a member's legal name was published in a DIFFERENT spelling, on a
      // public memorial page, silently. ⭐ The strip is now a TEST on a copy; only the EDGES are trimmed.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const withZwj = 'प्रज्\u200dञा शर्मा';
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          contributors: [{ name: withZwj }],
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { items: { name: string | null }[] };
        // ⭐ BYTE-IDENTICAL to what was stored — ⛔ not merely "looks similar".
        expect(body.items[0]?.name).toBe(withZwj);
        expect(body.items[0]?.name).toContain('\u200d');
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ AN ALL-INVISIBLE NAME WITHHOLDS THE NAME — ⛔ never an empty rendered row', async () => {
      // ⚠ U+2060 WORD JOINER is outside the old stripped range AND is not `trim()` whitespace, so it
      // survived both legs, passed `.min(1)`, and rendered an EMPTY `<li>` — the one row on the page
      // that ANNOUNCES itself, which is precisely what the omission rule forbids.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          contributors: [{ name: '\u2060' }, { name: 'Anita Verma' }],
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { items: { name: string | null }[] };
        // ⭐ Withheld like any other cause — ⛔ and indistinguishable from them (cl.3).
        expect(body.items.map((r) => r.name)).toEqual([null, 'Anita Verma']);
        expect(res.body).not.toContain('\u2060');
      } finally {
        await teardown(t);
      }
    });

    it('⛔ A CONTRIBUTOR WITH NO KYC PROFILE KEEPS AN UNNAMED ROW — ⛔ never a NAMED blank', async () => {
      // ⭐⭐ **INVERTED BY `-219` cl.1. ⛔ THE SUPERSEDED RULE IS QUOTED, ⛔ NOT DELETED:** *"THE
      // OMISSION UNIT IS THE ROW HERE … a nameless row carries nothing and a marker row would
      // announce an omission."* ⇒ ⭐ the marker row IS the ruling now, and the omission unit for BOTH
      // subjects is the NAME.
      // ⚠⛔ **WHAT THIS STILL PROVES, AND IT IS THE POINT OF THE TEST:** an unresolvable name produces
      // the SAME `{ name: null }` an RTBF erasure does. ⛔ If these two ever diverged, the row would
      // disclose WHICH cause applied — the exact thing cl.3 forbids.
      // ⭐ `confirmed: 2` seeds confirmations against member ids with ⛔ no profile row — which is
      // exactly the unresolvable case, and is why that option cannot stand in for `contributors`.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 2,
          contributors: [{ name: 'Anita Verma' }],
        });

        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { items: { name: string | null }[]; total: number };
        // ⭐ THREE ROWS beside a total of THREE, ⛔ but only ONE NAMED — the *"N confirmed beside FEWER
        // than N NAMED rows"* property, proven rather than described.
        // ⛔ THIS READ: `expect(body.items).toEqual([{ name: 'Anita Verma' }]);`
        expect(body.items).toEqual([{ name: 'Anita Verma' }, { name: null }, { name: null }]);
        expect(body.items.filter((r) => r.name !== null)).toHaveLength(1);
        expect(body.total).toBe(3);
        // ⭐⭐ **`items.length` NOW EQUALS THE PAGE SIZE** — cl.1 makes a page ⛔ never short, which is
        // the whole mechanical difference option (E) buys. ⚠ What is fewer than `total` is the NAMED
        // count, ⛔ not the row count.
        expect(body.items).toHaveLength(body.total);
        expect(() => PublicSahyogVivranResponse.parse(res.json())).not.toThrow();
      } finally {
        await teardown(t);
      }
    });

    it('⭐⛔ THE CONTRIBUTOR FORM FOLLOWS THE STORED MODE TOO — ⛔ never a hard-coded full name', async () => {
      // ⛔⛔ `2026-08-19-136` **cl.1**: *"a build in which the public name form cannot be changed
      // without a code change FAILS this clause."* ⚠ A hard-coded full name would pass every OTHER
      // leg in this describe — this is the only one that catches it.
      // ⚠⛔ AND BOTH SUBJECTS RESOLVE UNDER **ONE** MODE READ: the deceased member and the
      // contributors must ⛔ never render in different forms on one page.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          contributors: [{ name: 'Anita Verma' }, { name: 'Meenakshi' }],
        });
        await setMode(t, pariwarId, 'shielded_name');

        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { items: { name: string }[]; total: number };
        // ⭐ The SHIELDED form under a shielded Pariwar — ⛔ and the MONONYM is OMITTED, ⛔ not
        // rendered: `resolvePublicMemberName` returns `''` for a single-token name under this mode
        // (`2026-08-21-145` cl.3), and the boundary's normaliser withholds the NAME (the row stays).
        // ⛔⛔ ⛔ NO fall-through to `firstName` — for a mononym that returns the ENTIRE stored legal
        // name, i.e. it would publish MORE than the shielded mode was chosen to publish.
        // ⛔ THIS READ: `expect(body.items).toEqual([{ name: 'Anita V.' }]);` — the second contributor's
        // row was DROPPED. ⭐ `-219` cl.1 keeps it, unnamed. ⚠ The FORM of the name that DOES resolve
        // is what this test is about, and that half is unchanged.
        expect(body.items).toEqual([{ name: 'Anita V.' }, { name: null }]);
        expect(res.body).not.toContain('Meenakshi');
        // ⭐ AND THE OMITTED MONONYM STILL COUNTS — same rule as the erasure.
        expect(body.total).toBe(2);
      } finally {
        await teardown(t);
      }
    });
    it('⭐⭐ an invisible or bidi TOKEN does ⛔ NOT defeat the mononym rule, and ⛔ never ships', async () => {
      // ⚠⛔⛔ **REGRESSION, 2026-09-18 (fifth review pass) — a PRIVACY leak.** `"Sunita \u202e"` tokenised
      // as TWO words, skipped the shielded mononym arm (`2026-08-21-145` cl.3) and published the whole
      // legal name as `"Sunita ."`. ⭐ The stored name is now cleaned BEFORE the resolver.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          contributors: [
            { name: 'Sunita \u202e' },
            { name: 'Kavita \u200b' },
            { name: 'Anita \u202e Verma' },
          ],
        });
        await setMode(t, pariwarId, 'shielded_name');
        const shielded = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect((shielded.json() as { items: unknown[] }).items).toEqual([
          { name: null },
          { name: null },
          { name: 'Anita V.' },
        ]);
        expect(shielded.body).not.toContain('Sunita');
        expect(shielded.body).not.toContain('Kavita');

        await setMode(t, pariwarId, 'full_name');
        const full = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        // ⭐ The bidi control is gone and the spelling is otherwise intact — ⛔ no doubled space.
        expect((full.json() as { items: { name: string | null }[] }).items[2]).toEqual({
          name: 'Anita Verma',
        });
        expect(full.body).not.toContain('\u202e');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐⭐ 404 COLLAPSES every "nothing to show" case — ⛔ byte-identical', () => {
    it('an UNKNOWN address → 404 with an EMPTY body', async () => {
      const t = await createTestApp();
      try {
        // ⚠ BOTH identifiers are RANDOM per run (Story 11b.10): `public_token` carries a GLOBAL
        // unique index, so a literal seed identifier would make the fixture's token collide with
        // itself on the second run of this suite against a persistent database.
        const seeded = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const missing = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: seeded });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(missing)) });
        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('');
      } finally {
        await teardown(t);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // ⭐⭐ STORY 11b.10 (AC1) — THE **FOURTH** COLLAPSED CASE, AND THE ONE ADDRESS FORM
    // ═══════════════════════════════════════════════════════════════════════════════════════════

    it('⭐ a REAL drive with a WRONG token → a 404 BYTE-IDENTICAL to the unknown-address one', async () => {
      // ⛔⛔ THE ENUMERATION ORACLE THIS FORBIDS: if "real drive, wrong token" answered differently
      // from "no such drive" — a 403, a distinct code, ANY difference in body or status — an
      // attacker could test guessed addresses and learn which ones NAME SOMETHING, which is exactly
      // the capability the token was introduced to remove. ⭐ Asserted as an EQUALITY between two
      // live responses, ⛔ not as two independent "is it 404?" checks: the second form would pass
      // even if the bodies or headers diverged.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        // The drive is genuinely there and genuinely visible at its real address.
        expect(
          (await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) })).statusCode,
        ).toBe(200);

        // ⭐⛔ THE "WRONG TOKEN" ARM USES THE DRIVE'S **REAL CANONICAL IDENTIFIER** (review
        // 2026-09-04), ⛔ not a second random string. Both arms previously carried tokens that
        // existed NOWHERE, which made them the SAME case and the equality close to tautological.
        // ⭐ `P-YYYY-MM-###` is the one wrong address an attacker actually has: it is the drive's
        // real name in the operational vocabulary, it is SEQUENTIAL, and it was this route's address
        // until 11b.10. ⇒ *"a string that names a real drive"* vs *"a string that names nothing"* is
        // the contrast that would expose an oracle, and it is now the contrast under test.
        const wrongToken = await t.app.inject({
          method: 'GET',
          url: ROUTE(pariwarId, id),
        });
        const noSuchDrive = await t.app.inject({
          method: 'GET',
          url: ROUTE(pariwarId, `tok-P-2026-09-${randomUUID().slice(0, 6)}`),
        });

        expect(wrongToken.statusCode).toBe(404);
        expect(wrongToken.statusCode).toBe(noSuchDrive.statusCode);
        expect(wrongToken.body).toBe('');
        expect(wrongToken.body).toBe(noSuchDrive.body);
        // ⭐ HEADERS TOO — the comment above promises "body or headers". Compare the full header set
        // minus the per-response volatile ones, so a future divergence (a distinct `content-type`,
        // an `x-robots-tag` on one path but not the other, a `cache-control` split) is caught here
        // and ⛔ not only a status/body one.
        //
        // ⚠⛔ `x-ratelimit-*` IS STRIPPED, AND ⛔ NOT BECAUSE IT IS UNIMPORTANT — it is stripped
        // because it is a PER-REQUEST COUNTER. `@fastify/rate-limit` decrements
        // `x-ratelimit-remaining` on every request against the same key (all injects here share
        // `127.0.0.1`), so two SEQUENTIAL responses can ⛔ never carry equal values and a deep-equal
        // over it fails for a reason that has ⛔ nothing to do with the oracle this test guards.
        // ⭐⭐ THE SECURITY PROPERTY IT CARRIES IS ⛔ NOT DROPPED — it is asserted SEPARATELY below:
        // if the two refusal paths consumed DIFFERENT rate-limit budget, THAT difference would
        // itself be the enumeration oracle. Equal consumption is the real invariant; equal counter
        // VALUES was never it. (Review 2026-09-04 — the deep-equal as first written could not pass.)
        const stableHeaders = (h: Record<string, unknown>): Record<string, unknown> => {
          const rest = { ...h };
          delete rest.date;
          delete rest['keep-alive'];
          delete rest['request-id'];
          delete rest['x-request-id'];
          delete rest['x-ratelimit-limit'];
          delete rest['x-ratelimit-remaining'];
          delete rest['x-ratelimit-reset'];
          return rest;
        };
        expect(stableHeaders(wrongToken.headers)).toEqual(stableHeaders(noSuchDrive.headers));
        // ⭐⛔ EQUAL BUDGET CONSUMPTION — the half of the header comparison that actually bounds the
        // oracle. Both refusals are ordinary requests on the same key, issued back to back, so the
        // second must sit EXACTLY one unit below the first. ⛔ A path that charged a different
        // amount for "real drive, wrong token" than for "no such drive" would leak which addresses
        // name something, through the rate-limit headers rather than through the body.
        const remainingOf = (h: Record<string, unknown>): number =>
          Number(h['x-ratelimit-remaining']);
        expect(remainingOf(wrongToken.headers) - remainingOf(noSuchDrive.headers)).toBe(1);
        expect(wrongToken.headers['x-ratelimit-limit']).toBe(
          noSuchDrive.headers['x-ratelimit-limit'],
        );
      } finally {
        await teardown(t);
      }
    });

    it('⛔ the BARE `P-YYYY-MM-###` is NOT independently addressable — it 404s like anything else', async () => {
      // ⛔⛔ TRAP 3: a route accepting EITHER the token OR the bare identifier has ⛔ not closed the
      // walk — it has added a lock beside an open door. ⭐ This is the assertion that would fail the
      // moment somebody adds an `OR pool_canonical_identifier = …` arm "for old links".
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });

        const byIdentifier = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        expect(byIdentifier.statusCode).toBe(404);
        expect(byIdentifier.body).toBe('');
      } finally {
        await teardown(t);
      }
    });

    it('⭐ the identifier is RETAINED and RENDERED in the body — ⛔ retired as an ADDRESS, ⛔ not as a FIELD', async () => {
      // `2026-09-03-184` cl.2: `P-YYYY-MM-###` stays the operational/audit key and the page shows it.
      // ⛔ Trap 3 forbids it being ADDRESSABLE, ⛔ not DISPLAYED — deleting it would be a different
      // defect, and this asserts the story did not commit it.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        expect(PublicSahyogVivranResponse.parse(res.json()).drive.poolCanonicalIdentifier).toBe(id);
      } finally {
        await teardown(t);
      }
    });

    it('a `spawned` pool → the SAME 404 — it exists, but not at this surface’s predicate', async () => {
      // ⛔ `spawned` is ABSENT from `SAHYOG_VIVRAN_VISIBLE_POOL_STATES` deliberately: a pool that has
      // not opened for contributions has no drive to tell.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          poolState: 'spawned',
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('');
      } finally {
        await teardown(t);
      }
    });

    it('a SWITCHED-OFF Pariwar → the SAME 404, INDISTINGUISHABLE from an absent drive', async () => {
      // ⭐ THE ANTI-ENUMERATION PROPERTY: a pulled Pariwar must not be a NEW ORACLE. The kill switch
      // is an EMERGENCY control that defaults to ENABLED — ⛔ never a launch gate.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        expect((await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) })).statusCode).toBe(200);

        await setPublicationEnabled(t, pariwarId, false);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('');
      } finally {
        await teardown(t);
      }
    });

    it('a drive in ANOTHER Pariwar → the SAME 404 (tenant isolation, not an error)', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        await seedDrive(t, { canonicalIdentifier: id });
        const other = await seedDrive(t, { canonicalIdentifier: `P-2026-09-${randomUUID().slice(0, 6)}` });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(other.pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐ D4(b) — `live` + `closed` + `settled` render, in the RULED PUBLIC vocabulary', () => {
    // ⭐⭐ THIS BLOCK IS AN **ANTI-LEAK SITE**, ⛔ NOT A FIXTURE — repairing the pairs and skipping
    // the note below would leave Story 11b.12's AC5 UNMET.
    //
    // ⚠⛔ WHY THE SHAPE CHANGED, so nobody "fixes" it back. `2026-08-21-144` cl.8 records `/members`
    // having leaked the internal `lock-in` value onto a public JSON route, and this block asserted
    // `expect(res.body).not.toContain('"<state>"')` for EVERY state. Since Story 11b.12 **D1(b)**
    // the ruled public words are **Live · Closed · Verified** and the WIRE is aligned to them ⇒ for
    // `live` and `closed` the internal name and the public token are **the same string, by ruling**,
    // so that deny is no longer expressible per-state. ⭐ Replaced by something STRICTLY STRONGER:
    // an ALLOW-list on the value, plus a body-wide deny over every ⛔ UN-RULED internal token.
    // ⛔ `spawned` stays a PURE DENY. ⛔ Do ⛔ NOT weaken this back to a per-state substring check.
    const RULED_PUBLIC: readonly string[] = ['live', 'closed', 'verified'];
    for (const [state, expected] of [
      ['live', 'live'],
      ['closed', 'closed'],
      ['settled', 'verified'],
    ] as const) {
      it(`a \`${state}\` pool renders the ruled public token \`${expected}\``, async () => {
        const t = await createTestApp();
        try {
          const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
          const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id, poolState: state });
          const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
          expect(res.statusCode).toBe(200);
          const body = res.json() as { drive: Record<string, unknown> };
          expect(body.drive['driveStatus']).toBe(expected);
          // (a) the ALLOW-LIST — the value is EXACTLY one of the ruled public set for this surface.
          expect(RULED_PUBLIC).toContain(body.drive['driveStatus']);
          // (b) and ⛔ NO UN-RULED internal token appears as a QUOTED VALUE anywhere in the body.
          //     ⚠ `settled` is un-ruled here and IS still denied — that half stays green, which is
          //     what keeps this a real anti-leak assertion rather than a tautology.
          for (const internal of ['spawned', 'settled'].filter((w) => !RULED_PUBLIC.includes(w))) {
            expect(res.body).not.toContain(`"${internal}"`);
          }
          // (c) and the three RETIRED public tokens are gone from the body entirely — a
          //     half-reverted rename fails here.
          for (const retired of ['"collecting"', '"active"', '"archive"']) {
            expect(res.body).not.toContain(retired);
          }
        } finally {
          await teardown(t);
        }
      });
    }

    it('⭐ a `live` drive renders NO close date and NO outcome — ⛔ never an estimate (AC3)', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          poolState: 'live',
          confirmed: 2,
          assigned: 5,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['closedAt']).toBeNull();
        // ⛔ NOT `under_funded` — a drive still collecting has no close to frame, and classifying it
        // would be the projected-final-outcome AC3 forbids.
        expect(body.drive['fundingOutcome']).toBeNull();
        // ⭐ The count IS rendered — it is the one figure that is true mid-drive.
        expect(body.drive['confirmedContributionCount']).toBe(2);
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐⭐ AC3 — the confirmed count is CANONICAL EVENTS ONLY', () => {
    it('⛔ a YELLOW `contribution.utr-attested` event NEVER reaches the count', async () => {
      // Yellow is a member's CLAIM that they paid — intent, ⛔ not confirmed money. The guard is
      // STRUCTURAL: the count's event type is hard-filtered with no parameter that could admit one.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 2,
          attested: 5,
          assigned: 10,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['confirmedContributionCount']).toBe(2);
      } finally {
        await teardown(t);
      }
    });

    it('⭐ a REVERSED confirmation is COMPENSATED out of the count', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 3,
          reversed: 1,
          assigned: 10,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['confirmedContributionCount']).toBe(2);
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ ZERO assignees ⇒ NO outcome at all — ⛔ never a vacuous `fully_funded`', async () => {
      // ⚠ `classifyCycleOutcome` compares `deliveredTotal >= expectedTotal`, and at `0 >= 0` that is
      // VACUOUSLY TRUE ⇒ it returned `fully_funded` for a drive that collected nothing, published
      // beside "0 confirmed" (the 11b.1 review finding). The case is resolved BEFORE the call.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 0,
          assigned: 0,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['confirmedContributionCount']).toBe(0);
        expect(body.drive['fundingOutcome']).toBeNull();
      } finally {
        await teardown(t);
      }
    });

    it('a fully-delivered closed drive classifies `fully_funded`', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 4,
          assigned: 4,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['fundingOutcome']).toBe('fully_funded');
        // ⛔ AND NO TARGET, EXPECTED TOTAL OR PERCENTAGE LEAVES WITH IT — the enum is opaque.
        expect(res.body).not.toContain('expectedTotal');
        expect(res.body).not.toContain('deliveredTotal');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐⭐ AC5 — the appeal lineage, DERIVED AT REQUEST TIME (D12(a))', () => {
    it('renders the stage, the BOUNDED disposition tag and the reversal instant', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          appeal: { stage: 2, category: 'procedural_correction' },
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as {
          drive: { appealReversal: Record<string, unknown> | null };
        };
        expect(body.drive.appealReversal).not.toBeNull();
        expect(body.drive.appealReversal!['reversedAtStage']).toBe(2);
        expect(body.drive.appealReversal!['dispositionCategory']).toBe('procedural_correction');
        expect(typeof body.drive.appealReversal!['reversedAt']).toBe('string');
        // ⛔⛔ AND NOTHING ELSE. The rationale TEXT and the REVIEWER IDENTITY live on the
        // `claim.appeal_stageN_reviewed` DECISION event's Tier-1 metadata row and are NEVER public.
        expect(Object.keys(body.drive.appealReversal!).sort()).toEqual([
          'dispositionCategory',
          'reversedAt',
          'reversedAtStage',
        ]);
      } finally {
        await teardown(t);
      }
    });

    it('⛔ renders NOTHING when the claim was never reversed — ⛔ no "not reversed" marker', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['appealReversal']).toBeNull();
      } finally {
        await teardown(t);
      }
    });

    it('⛔⛔ an UNRECOGNISED disposition tag drops the WHOLE lineage — ⛔ never renders raw', async () => {
      // ⭐ THE ONE THAT MATTERS MOST: the tag is the only thing about an appeal's substance that may
      // ever be public, and an unbounded value here is how FREE TEXT would reach a public page. The
      // bound is enforced in the domain read, so a malformed payload yields NO lineage — ⛔ not half
      // of one, and ⛔ not an echoed string.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          appeal: { stage: 2, category: 'the verifier admitted he had misread the ration card' },
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['appealReversal']).toBeNull();
        expect(res.body).not.toContain('ration card');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐ AC6 — the route is UNAUTHENTICATED and its query surface is EMPTY', () => {
    it('answers 200 with NO session, no cookie and no Authorization header', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
      } finally {
        await teardown(t);
      }
    });

    // ⚠⛔⛔ **AMENDED 2026-09-15 (Story 11b.3b, Task 3, AC4) — ⛔ THE PRIOR LEG IS KEPT HERE**
    // ([[feedback_supersede_never_reinterpret]]). It read *"⛔ ANY query parameter is a 400"* and
    // refused **`page=2`** and **`limit=50`** alongside `format=csv`, on the stated ground that *"the
    // EMPTY `.strict()` query schema is precisely why controls 2 and 3 are structurally N/A
    // (D11(a)): there is no `page` for the horizon to bound and no `limit` for the cap to bound"*.
    // ⭐ **11b.3b GIVES THEM SOMETHING TO BOUND** — the contributor list (`2026-09-02-174`) — so both
    // controls are RESTORED and both parameters are ACCEPTED, bounded. ⛔ The EXPORT half is
    // unchanged and it is the half that mattered.
    it('⛔ every query parameter EXCEPT the two bounded paging ones is a 400', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        // ⛔⛔ `format=csv` / `all=1` — FR-91 forbids bulk export from the public side.
        // ⛔⛔ `sort=amount` / `order=desc` — the contributor ordering is RULED (earliest live
        // confirmation); a caller-chosen ordering over a list of names is a leaderboard control in
        // the query string, and 11b.1 AC5 forbids ranking outright.
        for (const q of ['format=csv', 'all=1', 'name=Sharma', 'sort=amount', 'order=desc']) {
          const res = await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId, tokenFor(id))}?${q}` });
          expect(res.statusCode).toBe(400);
        }
        // ⭐ AND THE TWO BOUNDED ONES PASS — ⛔ so the leg above is ⛔ not passing merely because
        // `.strict()` refuses everything, which would make it vacuous now that two are permitted.
        for (const q of ['page=1', 'limit=10']) {
          const res = await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId, tokenFor(id))}?${q}` });
          expect(res.statusCode).toBe(200);
        }
        // ⛔⛔ AND OUT OF RANGE IS A **400**, ⛔ NEVER A SILENT CLAMP — controls 2 and 3 are these two
        // bounds, and a request trimmed to a value the caller did not ask for is a control that
        // reports success while handing back something else.
        for (const q of ['limit=51', 'page=201', 'page=0', 'limit=0', 'page=all', 'limit=all']) {
          const res = await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId, tokenFor(id))}?${q}` });
          expect(res.statusCode).toBe(400);
        }
      } finally {
        await teardown(t);
      }
    });

    it('⛔ a malformed Pariwar id is a 400 at the schema boundary', async () => {
      const t = await createTestApp();
      try {
        const res = await t.app.inject({
          method: 'GET',
          url: '/api/v1/p/not-a-uuid/public-pages/sahyog-vivran/P-2026-09-001',
        });
        expect(res.statusCode).toBe(400);
      } finally {
        await teardown(t);
      }
    });

    it('⭐ the global X-Robots-Tag hook covers this route (control 3 of the three)', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(String(res.headers['x-robots-tag'])).toMatch(/noindex/);
      } finally {
        await teardown(t);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // ⭐⭐ STORY 11b.11 — THE NOMINEE BLOCK AFTER THE WITHDRAWAL, END TO END THROUGH THE REAL DECRYPT
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // ⛔ These run through `app.inject` against real Postgres and the real KMS-backed envelope crypto,
  // ⛔ never against a stub: the whole subject is what the WIRE carries after a decrypt, and a
  // stubbed decrypt would prove nothing.
  //
  // ⭐⭐ **WHAT THIS BLOCK ASSERTED UNTIL 11b.11, AND WHY IT CHANGED — recorded, ⛔ not deleted.**
  // Story 11b.3a's suite pinned the ruled MASKING LADDER on the public wire: a `live` drive rendering
  // the complete details for both equal accounts; `D8-default` FAIL-OPEN leaving a `closed` drive in
  // full with no schedule row; `after_days: 0` reducing a `closed` and a `settled` drive to
  // `accountNumberLast4` + bank/branch/IFSC with the FULL NUMBER absent from the RAW BODY;
  // `after_days: 30` not yet masking a drive closed two days ago; `permanent` masking even a `live`
  // one (cl.10(d)'s terminal rung); a LATE `pool.settled` ⛔ NOT un-masking an already-masked drive;
  // and one Pariwar's window ⛔ not governing another's.
  //
  // ⭐ `2026-09-04-190` **cl.1** (Trustee-ratified — Dhiraj Rahul, Kalpana Bharti) and
  // `2026-09-04-191` **cl.1** withdraw ALL FIVE coordinates from `public`, and `-190` **cl.2** keeps
  // the nominee's name. ⇒ ⛔ there is no longer a projection for the ladder to select, so assertions
  // ABOUT that selection cannot be restated here — the thing they described is gone from this
  // surface. ⭐ What replaces them is **STRICTLY STRONGER**: the same schedule fixtures are still
  // seeded and driven, and every configuration must now produce the SAME response.
  // ⛔⛔ **MASKING WAS ⛔ NOT DELETED, AND ITS OWN TESTS ARE UNTOUCHED BY THIS STORY** (`-190` cl.4):
  // `packages/domain/tests/claim/nominee-bank-masking.test.ts`,
  // `packages/domain/tests/integration/claim/nominee-bank-masking-schedule.spec.ts` and
  // `apps/api/tests/integration/nominee-bank-masking/admin.spec.ts` all still exercise the predicate,
  // the schedule and the admin knob. ⚠ What the machinery has is ⛔ NO PUBLIC CONSUMER.
  describe('the nominee block (`2026-09-04-190` cl.1-2, `2026-09-04-191` cl.1)', () => {
    const ACCOUNTS = [
      {
        rank: 1 as const,
        holder: 'Sunita Devi',
        account: '50100123456789',
        ifsc: 'SBIN0001234',
        bankName: 'State Bank of India',
        branch: 'Vaishali',
        // ⭐ A REAL VPA on account #1, on purpose. `2026-09-04-191` cl.5 verified UPI-ID collection is
        // BUILT and POPULATED (Story 8.13 / migration 0080; 11 of 558 accounts carry one) ⇒ seeding
        // `undefined` everywhere would make "the VPA is not on the wire" pass VACUOUSLY.
        vpa: 'sunita@upi',
      },
      {
        rank: 2 as const,
        holder: 'Sunita Devi',
        account: '00987654321012',
        ifsc: 'BARB0VJVAIS',
        bankName: 'Bank of Baroda',
      },
    ];

    /** Every coordinate seeded above, as it would appear in a leaked body. */
    const WITHDRAWN_VALUES = [
      '50100123456789',
      '00987654321012',
      'SBIN0001234',
      'BARB0VJVAIS',
      'State Bank of India',
      'Bank of Baroda',
      'Vaishali',
      'sunita@upi',
      // ⛔ [Review] Quoted, ⛔ not a bare digit run: checked against the RAW body (below), so a
      // bare '6789' risks a false failure on an unrelated 4-digit fragment elsewhere in the JSON
      // (an id, a timestamp). Quoting pins it to "the last-4 projection surfaces as its own JSON
      // string value", which is what the masked arm actually used to emit.
      '"6789"', // the last-4 projection the masked arm used to carry
    ];

    /** The keys the wire must ⛔ never carry again — ABSENT, ⛔ not `null`. */
    const WITHDRAWN_KEYS = [
      'accountNumber',
      'accountNumberLast4',
      'ifsc',
      'vpa',
      'bankName',
      'branch',
      'masked',
    ];

    const assertWithdrawn = (res: { body: string; json: () => unknown }): void => {
      const body = res.json() as { drive: { nomineeBankAccounts: Record<string, unknown>[] } };
      for (const account of body.drive.nomineeBankAccounts) {
        // ⛔⛔ ABSENT, ⛔ NOT NULL. `.strict()` on the contract is what makes populating one of these
        // a PARSE ERROR rather than an ignored extra field — the discipline `2026-08-28-165`
        // established for the old masked arm, applied to the whole shape.
        for (const key of WITHDRAWN_KEYS) expect(key in account).toBe(false);
        expect(Object.keys(account).sort()).toEqual(['accountHolderName', 'accountRank']);
      }
      // ⛔⛔ AND AGAINST THE RAW SERIALIZED BODY, ⛔ not merely the parsed fields: a field-level check
      // passes while the value sits under some other key.
      for (const forbidden of WITHDRAWN_VALUES) expect(res.body).not.toContain(forbidden);
      // ⭐ The response still parses through the REAL `.strict()` contract.
      expect(() => PublicSahyogVivranResponse.parse(res.json())).not.toThrow();
    };

    it('⭐⭐ AC1/AC2 — a LIVE drive renders the NAME for both equal accounts, and ⛔ NOTHING ELSE', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          poolState: 'live',
          nomineeBank: ACCOUNTS,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: { nomineeBankAccounts: Record<string, unknown>[] } };
        const accounts = body.drive.nomineeBankAccounts;

        // ⭐ EXACTLY TWO, in substrate order — an ORDER, ⛔ not a ranking.
        expect(accounts.map((a) => a['accountRank'])).toEqual([1, 2]);
        // ⭐ THE DECRYPT ACTUALLY HAPPENED — the name is real plaintext off a real envelope, which is
        // what `-190` cl.2 keeps public. ⛔ A test that only checked absence would pass on a handler
        // that returned nothing at all.
        expect(accounts[0]).toEqual({ accountRank: 1, accountHolderName: 'Sunita Devi' });
        expect(accounts[1]).toEqual({ accountRank: 2, accountHolderName: 'Sunita Devi' });
        assertWithdrawn(res);
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ AC1 — NO SCHEDULE ROW (`D8-default` FAIL-OPEN) still carries ⛔ NO coordinates', async () => {
      // ⚠⛔ THIS IS THE CASE THE WITHDRAWAL EXISTS FOR. FAIL-OPEN is the default for EVERY Pariwar
      // until the Trust acts (`2026-09-02-179` cl.1), so before 11b.11 a `closed` drive published the
      // complete account number by default. ⭐ `D8-default` is UNCHANGED (AC7) — what changed is that
      // this surface no longer has a masking decision for it to govern.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          poolState: 'closed',
          nomineeBank: ACCOUNTS,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        assertWithdrawn(res);
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ AC3 — a MASKED drive still carries the NOMINEE NAME (`2026-09-04-191` cl.2)', async () => {
      // ⛔⛔ **THE REGRESSION THIS TEST EXISTS TO PREVENT: an EMPTY bank block.** The masked arm used
      // to DROP `accountHolderName`, because `2026-08-28-160` cl.10(e) is a RETENTION list and a
      // retention list is exhaustive. ⇒ with the coordinates withdrawn, that arm would have rendered
      // ⛔ NOTHING AT ALL. `2026-09-04-191` **cl.2** rules the masked projection RETAINS the name,
      // which AMENDS THE READING of cl.10(e) — that list was written when the masked view still
      // carried account coordinates and therefore had something else to retain. ⛔ cl.10(e) is ⛔ not
      // restated as if it had always said this.
      // ⚠ `after_days: 0` on a `closed` drive is the configuration that USED to mask; it is seeded
      // here deliberately, so this asserts the ruled outcome holds under the very setting that would
      // once have emptied the block.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          poolState: 'closed',
          nomineeBank: ACCOUNTS,
          masking: { mode: 'after_days', maskAfterDays: 0 },
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: { nomineeBankAccounts: Record<string, unknown>[] } };
        // ⭐ THE NAME IS PRESENT — ⛔ not null, ⛔ not an empty block.
        expect(body.drive.nomineeBankAccounts.map((a) => a['accountHolderName'])).toEqual([
          'Sunita Devi',
          'Sunita Devi',
        ]);
        assertWithdrawn(res);
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ AC1 — the response is IDENTICAL under EVERY masking configuration', async () => {
      // ⭐⭐ THE ASSERTION THAT REPLACES THE WHOLE LADDER, and it is strictly stronger than the cases
      // it replaces: rather than pinning what each rung projects, it pins that the rung ⛔ NO LONGER
      // SELECTS ANYTHING on this surface. ⇒ a future change that re-points the masking predicate at
      // the public read fails HERE, loudly, instead of quietly re-introducing a projection.
      // ⚠ Includes `permanent` on a `live` drive — cl.10(d)'s terminal rung, the one configuration
      // that reached a still-collecting campaign — and a `settled` drive, the state where masking
      // mattered most.
      const t = await createTestApp();
      try {
        const configs = [
          { poolState: 'live' as const, masking: undefined },
          { poolState: 'live' as const, masking: { mode: 'permanent' as const } },
          { poolState: 'closed' as const, masking: undefined },
          {
            poolState: 'closed' as const,
            masking: { mode: 'after_days' as const, maskAfterDays: 0 },
          },
          {
            poolState: 'closed' as const,
            masking: { mode: 'after_days' as const, maskAfterDays: 30 },
          },
          {
            poolState: 'settled' as const,
            masking: { mode: 'after_days' as const, maskAfterDays: 0 },
          },
        ];
        const shapes: string[] = [];
        for (const config of configs) {
          const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
          const { pariwarId } = await seedDrive(t, {
            canonicalIdentifier: id,
            poolState: config.poolState,
            nomineeBank: ACCOUNTS,
            ...(config.masking === undefined ? {} : { masking: config.masking }),
          });
          const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
          expect(res.statusCode).toBe(200);
          assertWithdrawn(res);
          const body = res.json() as { drive: { nomineeBankAccounts: unknown[] } };
          shapes.push(JSON.stringify(body.drive.nomineeBankAccounts));
        }
        // ⛔ MEMBERSHIP AND EXPLICIT VALUES, ⛔ never a count over a shared fixture.
        expect(new Set(shapes).size).toBe(1);
        expect(shapes[0]).toBe(
          JSON.stringify([
            { accountRank: 1, accountHolderName: 'Sunita Devi' },
            { accountRank: 2, accountHolderName: 'Sunita Devi' },
          ]),
        );
      } finally {
        await teardown(t);
      }
    });

    it('⭐ a claim whose bank details were NEVER COLLECTED returns `[]`, ⛔ not an error', async () => {
      // ⚠ 6.8's AC3 absence signal. ⛔ Never a throw, ⛔ never a 404, and the page renders NOTHING —
      // ⛔ no "not recorded" marker, which would announce the omission.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id, poolState: 'closed' });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: { nomineeBankAccounts: unknown[] } };
        expect(body.drive.nomineeBankAccounts).toEqual([]);
      } finally {
        await teardown(t);
      }
    });
  });
});