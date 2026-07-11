// Claim-time DPDPA consent — consumer-level live-DB (Story 6.9, Task 6).
//
// Exercises the Story 2.7 registry primitive through Story 6.9's KEY CONVENTION (D1/D1a):
//   · subject_id = the DECEASED member id; consent_artifact_ref = the claim_case_id (provenance);
//   · the two NEW additive enum values (migration 0058) — sahyog_vivran_publication + in_memoriam_listing
//     — record + resolve end-to-end (proves the ALTER TYPE took effect in the DB);
//   · consentExists resolves on the MEMBER-scoped key (pariwar_id, deceased_member_id, consent_type)
//     the way Epic 11b will query it at render time;
//   · the AC3 revoke time-travel crux (false NOW, true at a pre-revocation instant) through the two
//     publication types;
//   · cross-tenant isolation (PARIWAR_B cannot resolve PARIWAR_A's consent).
// Assert MEMBERSHIP, not counts; per-test BEGIN/ROLLBACK (nothing persists); never DROP SCHEMA.

import { describe, expect, it } from 'vitest';

import { consentExists, listConsents, recordConsent, revokeConsent } from '../../../src/consent/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

// The DPDPA data subject is the DECEASED member (D1) — any uuid (subject_id is polymorphic, no FK).
const DECEASED = '77777777-7777-7777-7777-777777777777';
const CLAIM_CASE_ID = '88888888-8888-8888-8888-888888888888';

const G = new Date('2025-02-01T00:00:00Z');
const PRE_REVOKE = new Date('2025-03-01T00:00:00Z');
const R = new Date('2025-04-01T00:00:00Z');

const CLAIM_TIME_TYPES = ['claim_time_dpdpa', 'sahyog_vivran_publication', 'in_memoriam_listing'] as const;

describe.skipIf(!hasDatabase)('claim-time DPDPA consent (consumer key convention, PARIWAR_A)', () => {
  setupLiveDb();

  async function scopeA() {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    return tx;
  }

  /** Record all three claim-time consents under the deceased-member subject + claim artifact ref. */
  async function recordAllThree(tx: Awaited<ReturnType<typeof scopeA>>) {
    for (const consentType of CLAIM_TIME_TYPES) {
      await recordConsent(tx, {
        pariwarId: PARIWAR_A,
        subjectId: DECEASED,
        consentType,
        consentArtifactRef: CLAIM_CASE_ID,
        grantedViaActor: 'member_self',
        consentPayload: { checkboxTextShown: `canonical copy for ${consentType}`, locale: 'en' },
        grantedAt: G,
        auditId: null,
      });
    }
  }

  it('records the three claim-time types under (deceased_member, claim_case_id); consentExists resolves member-scoped', async () => {
    const tx = await scopeA();
    await recordAllThree(tx);

    for (const consentType of CLAIM_TIME_TYPES) {
      // The member-scoped key (D1a) — the grain Epic 11b queries at render time.
      expect(await consentExists(tx, PARIWAR_A, DECEASED, consentType)).toBe(true);
    }

    // The artifact ref is provenance ONLY — the rows carry the claim_case_id as a back-link.
    const rows = await listConsents(tx, PARIWAR_A, DECEASED);
    expect(rows.map((r) => r.consentType).sort()).toEqual([...CLAIM_TIME_TYPES].sort());
    for (const r of rows) expect(r.consentArtifactRef).toBe(CLAIM_CASE_ID);
  });

  it('AC3 time-travel: revoke sahyog_vivran_publication → false NOW, true at a pre-revocation instant', async () => {
    const tx = await scopeA();
    await recordAllThree(tx);

    const [active] = await listConsents(tx, PARIWAR_A, DECEASED, { consentType: 'sahyog_vivran_publication' });
    await revokeConsent(tx, {
      pariwarId: PARIWAR_A,
      consentId: active!.consentId,
      reason: 'family withdrew the memorial',
      revokedAt: R,
      revokedAuditId: null,
    });

    // At R+ the publication consent is gone; at PRE_REVOKE it is still valid (the row is mutated, not deleted).
    expect(await consentExists(tx, PARIWAR_A, DECEASED, 'sahyog_vivran_publication', R)).toBe(false);
    expect(await consentExists(tx, PARIWAR_A, DECEASED, 'sahyog_vivran_publication', PRE_REVOKE)).toBe(true);
    // The other two consents are untouched by revoking one.
    expect(await consentExists(tx, PARIWAR_A, DECEASED, 'claim_time_dpdpa')).toBe(true);
    expect(await consentExists(tx, PARIWAR_A, DECEASED, 'in_memoriam_listing')).toBe(true);
  });

  it('grant → revoke → re-grant: consentExists resolves correctly at each timestamp, and both rows persist (grant-history, not idempotent)', async () => {
    // Code review gap-closure: the earlier time-travel test only covered grant→revoke. The
    // consumer-facing contract (Dev Notes "accept the grant-history model as-is — a repeated
    // submission is a NEW recordConsent row") is only fully proven if a RE-grant after a revoke
    // also resolves correctly, and the revoked row is never mistaken for still-active.
    const tx = await scopeA();
    await recordConsent(tx, {
      pariwarId: PARIWAR_A,
      subjectId: DECEASED,
      consentType: 'in_memoriam_listing',
      consentArtifactRef: CLAIM_CASE_ID,
      grantedViaActor: 'member_self',
      consentPayload: { checkboxTextShown: 'canonical copy v1', locale: 'en' },
      grantedAt: G,
      auditId: null,
    });
    const [firstGrant] = await listConsents(tx, PARIWAR_A, DECEASED, { consentType: 'in_memoriam_listing' });
    await revokeConsent(tx, {
      pariwarId: PARIWAR_A,
      consentId: firstGrant!.consentId,
      reason: 'family withdrew, then reconsidered',
      revokedAt: R,
      revokedAuditId: null,
    });

    const BETWEEN_GRANT_AND_REVOKE = new Date('2025-02-15T00:00:00Z'); // G < x < R
    const BETWEEN_REVOKE_AND_REGRANT = new Date('2025-05-01T00:00:00Z'); // R < x < re-grant
    const REGRANT_AT = new Date('2025-06-01T00:00:00Z');
    const AFTER_REGRANT = new Date('2025-07-01T00:00:00Z');

    expect(await consentExists(tx, PARIWAR_A, DECEASED, 'in_memoriam_listing', BETWEEN_GRANT_AND_REVOKE)).toBe(true);
    expect(await consentExists(tx, PARIWAR_A, DECEASED, 'in_memoriam_listing', BETWEEN_REVOKE_AND_REGRANT)).toBe(
      false,
    );

    // The family re-consents (D7 — no consentExists-then-skip pre-check; this is a FRESH row).
    await recordConsent(tx, {
      pariwarId: PARIWAR_A,
      subjectId: DECEASED,
      consentType: 'in_memoriam_listing',
      consentArtifactRef: CLAIM_CASE_ID,
      grantedViaActor: 'member_self',
      consentPayload: { checkboxTextShown: 'canonical copy v1', locale: 'en' },
      grantedAt: REGRANT_AT,
      auditId: null,
    });

    // consentExists flips back to true at/after the re-grant instant.
    expect(await consentExists(tx, PARIWAR_A, DECEASED, 'in_memoriam_listing', REGRANT_AT)).toBe(true);
    expect(await consentExists(tx, PARIWAR_A, DECEASED, 'in_memoriam_listing', AFTER_REGRANT)).toBe(true);
    // The window between the revoke and the re-grant is STILL correctly resolved false (the
    // re-grant does not retroactively "heal" the gap — grant-history is instant-accurate).
    expect(await consentExists(tx, PARIWAR_A, DECEASED, 'in_memoriam_listing', BETWEEN_REVOKE_AND_REGRANT)).toBe(
      false,
    );

    // Both rows persist — NOT idempotent, NOT collapsed into one row (the grant-history model).
    const active = await listConsents(tx, PARIWAR_A, DECEASED, {
      consentType: 'in_memoriam_listing',
      includeRevoked: false,
    });
    expect(active).toHaveLength(1);
    expect(active[0]!.consentId).not.toBe(firstGrant!.consentId);
    const all = await listConsents(tx, PARIWAR_A, DECEASED, {
      consentType: 'in_memoriam_listing',
      includeRevoked: true,
    });
    expect(all.map((r) => r.consentId).sort()).toEqual([firstGrant!.consentId, active[0]!.consentId].sort());
  });

  it('cross-tenant isolation: PARIWAR_B cannot resolve PARIWAR_A’s claim-time consent', async () => {
    const tx = await scopeA();
    await recordAllThree(tx);
    // consentExists takes an explicit pariwarId predicate (defense-in-depth on top of RLS): a
    // PARIWAR_B query for the same subject + type resolves false.
    expect(await consentExists(tx, PARIWAR_B, DECEASED, 'in_memoriam_listing')).toBe(false);
  });
});
