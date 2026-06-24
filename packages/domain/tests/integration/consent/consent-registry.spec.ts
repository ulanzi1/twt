// Consent-registry behaviour — live-DB integration (Story 2.7, Task 2).
//
// Drives the domain accessors against real Postgres under PARIWAR_A scope, inside
// the per-test BEGIN/ROLLBACK (the accessors run on the caller's transaction — see
// write.ts §"Transaction contract" — so nothing persists). Covers the AC2/AC3 crux:
// the time-travel consentExists query (true at a pre-revocation instant, false at a
// post-revocation instant), revoke-as-mutate (row NOT deleted), grant→revoke→re-grant
// (a new row), listConsents membership + filter + cap, cross-tenant isolation, and
// the two typed error guards. `subject_id` is any uuid (NO FK → no seeding needed).
// auditId/revokedAuditId are passed `null` (the audit-or-throw linkage is a consumer
// concern — see write.ts header). Assert MEMBERSHIP, not counts; never DROP SCHEMA.

import { describe, expect, it } from 'vitest';

import {
  ConsentNotFoundError,
  ConsentStateError,
  consentExists,
  listConsents,
  recordConsent,
  resolveConsentById,
  revokeConsent,
} from '../../../src/consent/index.js';
import { consentId as toConsentId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedConsentRecord } from '../_helpers.js';

// A subject uuid local to this suite (any uuid — subject_id is polymorphic, no FK).
const SUBJECT = '66666666-6666-6666-6666-666666666666';

// Fixed instants for the time-travel window assertions.
const G = new Date('2025-01-01T00:00:00Z'); // grant
const R = new Date('2025-06-01T00:00:00Z'); // revoke
const BEFORE_GRANT = new Date('2024-12-31T00:00:00Z');
const PRE_REVOKE = new Date('2025-03-01T00:00:00Z'); // granted, not yet revoked
const POST_REVOKE = new Date('2025-09-01T00:00:00Z');

describe.skipIf(!hasDatabase)('consent registry (PARIWAR_A scope)', () => {
  setupLiveDb();

  /** Enter PARIWAR_A app scope on the per-test tx and return it. */
  async function scopeA() {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    return tx;
  }

  it('recordConsent grants a row; consentExists true after grant, false before it', async () => {
    const tx = await scopeA();
    const row = await recordConsent(tx, {
      pariwarId: PARIWAR_A,
      subjectId: SUBJECT,
      consentType: 'tc_acceptance',
      grantedViaActor: 'member_self',
      consentPayload: { checkboxTextShown: 'I agree', locale: 'en' },
      grantedAt: G,
      auditId: null,
    });

    expect(row.consentId).toBeTruthy();
    expect(row.revokedAt).toBeNull();
    expect(row.consentPayload).toMatchObject({ locale: 'en' });

    expect(await consentExists(tx, PARIWAR_A, SUBJECT, 'tc_acceptance', PRE_REVOKE)).toBe(true);
    expect(await consentExists(tx, PARIWAR_A, SUBJECT, 'tc_acceptance', BEFORE_GRANT)).toBe(false);
  });

  it('revoke is a MUTATE (row not deleted): sets revoked_at + reason + revoked_audit_id', async () => {
    const tx = await scopeA();
    const granted = await recordConsent(tx, {
      pariwarId: PARIWAR_A,
      subjectId: SUBJECT,
      consentType: 'dpdpa_data_processing',
      grantedViaActor: 'staff_assisted',
      consentPayload: {},
      grantedAt: G,
      auditId: null,
    });

    const revoked = await revokeConsent(tx, {
      pariwarId: PARIWAR_A,
      consentId: granted.consentId,
      reason: 'subject withdrew consent',
      revokedAuditId: null,
      revokedAt: R,
    });
    expect(revoked.revokedAt).not.toBeNull();
    expect(revoked.revocationReason).toBe('subject withdrew consent');

    // AC3: the row is STILL queryable by id (historical proof preserved, not deleted).
    const reloaded = await resolveConsentById(tx, PARIWAR_A, granted.consentId);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.consentId).toBe(granted.consentId);
    expect(reloaded?.revokedAt).not.toBeNull();
  });

  it('time-travel crux: consentExists false post-revoke, TRUE at a pre-revocation instant (AC3)', async () => {
    const tx = await scopeA();
    const granted = await recordConsent(tx, {
      pariwarId: PARIWAR_A,
      subjectId: SUBJECT,
      consentType: 'dpdpa_data_sharing',
      grantedViaActor: 'member_self',
      consentPayload: {},
      grantedAt: G,
      auditId: null,
    });
    await revokeConsent(tx, {
      pariwarId: PARIWAR_A,
      consentId: granted.consentId,
      reason: 'withdrawn',
      revokedAuditId: null,
      revokedAt: R,
    });

    // Post-revocation instant → false.
    expect(await consentExists(tx, PARIWAR_A, SUBJECT, 'dpdpa_data_sharing', POST_REVOKE)).toBe(
      false,
    );
    // THE CRUX — a pre-revocation instant → TRUE (the row was valid then; revoke
    // did not delete it).
    expect(await consentExists(tx, PARIWAR_A, SUBJECT, 'dpdpa_data_sharing', PRE_REVOKE)).toBe(true);
    // Default now() is after the revoke → false.
    expect(await consentExists(tx, PARIWAR_A, SUBJECT, 'dpdpa_data_sharing')).toBe(false);
  });

  it('grant→revoke→re-grant is a NEW row; consentExists true again at now()', async () => {
    const tx = await scopeA();
    const first = await recordConsent(tx, {
      pariwarId: PARIWAR_A,
      subjectId: SUBJECT,
      consentType: 'marketing',
      grantedViaActor: 'member_self',
      consentPayload: {},
      grantedAt: G,
      auditId: null,
    });
    await revokeConsent(tx, {
      pariwarId: PARIWAR_A,
      consentId: first.consentId,
      reason: 'unsubscribed',
      revokedAuditId: null,
      revokedAt: R,
    });
    expect(await consentExists(tx, PARIWAR_A, SUBJECT, 'marketing')).toBe(false);

    // Re-grant: a brand-new row (granted_at defaults to DB now()).
    const regrant = await recordConsent(tx, {
      pariwarId: PARIWAR_A,
      subjectId: SUBJECT,
      consentType: 'marketing',
      grantedViaActor: 'member_self',
      consentPayload: {},
      auditId: null,
    });
    expect(regrant.consentId).not.toBe(first.consentId); // a new consent_id
    expect(await consentExists(tx, PARIWAR_A, SUBJECT, 'marketing')).toBe(true);
  });

  it('listConsents: membership + consentType filter + includeRevoked + cap', async () => {
    const tx = await scopeA();
    const mkt = await recordConsent(tx, {
      pariwarId: PARIWAR_A,
      subjectId: SUBJECT,
      consentType: 'marketing',
      grantedViaActor: 'member_self',
      consentPayload: {},
      auditId: null,
    });
    const tc = await recordConsent(tx, {
      pariwarId: PARIWAR_A,
      subjectId: SUBJECT,
      consentType: 'tc_acceptance',
      grantedViaActor: 'member_self',
      consentPayload: {},
      auditId: null,
    });

    const all = await listConsents(tx, PARIWAR_A, SUBJECT);
    const allIds = new Set(all.map((r) => r.consentId));
    expect(allIds).toContain(mkt.consentId);
    expect(allIds).toContain(tc.consentId);

    // consentType filter.
    const onlyMkt = await listConsents(tx, PARIWAR_A, SUBJECT, { consentType: 'marketing' });
    expect(onlyMkt.every((r) => r.consentType === 'marketing')).toBe(true);
    expect(new Set(onlyMkt.map((r) => r.consentId))).toContain(mkt.consentId);

    // Default excludes revoked; includeRevoked surfaces it.
    await revokeConsent(tx, {
      pariwarId: PARIWAR_A,
      consentId: mkt.consentId,
      reason: 'gone',
      revokedAuditId: null,
    });
    const visible = await listConsents(tx, PARIWAR_A, SUBJECT, { consentType: 'marketing' });
    expect(new Set(visible.map((r) => r.consentId))).not.toContain(mkt.consentId);
    const withRevoked = await listConsents(tx, PARIWAR_A, SUBJECT, {
      consentType: 'marketing',
      includeRevoked: true,
    });
    expect(new Set(withRevoked.map((r) => r.consentId))).toContain(mkt.consentId);

    // Forced-pagination cap: limit:1 returns exactly one of the ≥2 rows.
    const capped = await listConsents(tx, PARIWAR_A, SUBJECT, { limit: 1, includeRevoked: true });
    expect(capped).toHaveLength(1);
  });

  it('cross-tenant isolation: a PARIWAR_B consent is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();
    // Seed B's consent as the (RLS-bypassing) superuser BEFORE scope.
    await seedConsentRecord(tx, PARIWAR_B, { subjectId: SUBJECT, consentType: 'marketing' });
    await enterAppScope(client, PARIWAR_A);

    // Record an A consent for the same subject so A's own row IS visible.
    const aRow = await recordConsent(tx, {
      pariwarId: PARIWAR_A,
      subjectId: SUBJECT,
      consentType: 'marketing',
      grantedViaActor: 'member_self',
      consentPayload: {},
      auditId: null,
    });

    const visible = await listConsents(tx, PARIWAR_A, SUBJECT, { consentType: 'marketing' });
    expect(new Set(visible.map((r) => r.consentId))).toContain(aRow.consentId);
    expect(visible.every((r) => r.pariwarId === PARIWAR_A)).toBe(true); // B's row never surfaces

    // Even if a caller passes B's pariwarId under A scope, RLS hides B's row → false.
    expect(await consentExists(tx, PARIWAR_B, SUBJECT, 'marketing')).toBe(false);
  });

  it('double-revoke throws ConsentStateError', async () => {
    const tx = await scopeA();
    const granted = await recordConsent(tx, {
      pariwarId: PARIWAR_A,
      subjectId: SUBJECT,
      consentType: 'nominee_share_split',
      grantedViaActor: 'member_self',
      consentPayload: {},
      auditId: null,
    });
    await revokeConsent(tx, {
      pariwarId: PARIWAR_A,
      consentId: granted.consentId,
      reason: 'first',
      revokedAuditId: null,
    });
    await expect(
      revokeConsent(tx, {
        pariwarId: PARIWAR_A,
        consentId: granted.consentId,
        reason: 'second',
        revokedAuditId: null,
      }),
    ).rejects.toBeInstanceOf(ConsentStateError);
  });

  it('revoking a non-existent consent_id throws ConsentNotFoundError', async () => {
    const tx = await scopeA();
    const ghost = toConsentId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    await expect(
      revokeConsent(tx, {
        pariwarId: PARIWAR_A,
        consentId: ghost,
        reason: 'x',
        revokedAuditId: null,
      }),
    ).rejects.toBeInstanceOf(ConsentNotFoundError);
  });
});
