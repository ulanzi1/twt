// Shared helpers for the Story 1.6 live-DB integration tests.
//
// Not a `.spec.ts`, so the vitest integration glob does not collect it as a
// suite — it is imported by the policy-regression + cross-pariwar-leak specs.
//
// ⚠ RLS-in-tests model (see Story 1.6 dev notes): the test login role
// (twt_dev_app) is a Docker/CI superuser and BYPASSES RLS. To exercise the
// policies we `SET LOCAL ROLE twt_app` on the per-test transaction client to
// shed superuser, then `setPariwarScope`. Seeding happens BEFORE entering app
// scope (as superuser, RLS bypassed) so both tenants' rows land regardless of
// the withCheck policy. afterEach ROLLBACK (setupLiveDb) reverts the SET LOCAL
// role + scope + seed rows.

import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import type pg from 'pg';

import { setPariwarScope, type Db } from '../../src/db.js';
import {
  alertId as toAlertId,
  claimId as toClaimId,
  clauseId as toClauseId,
  cycleFreezeCommitId as toCycleFreezeCommitId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  poolId as toPoolId,
  poolNameId as toPoolNameId,
  postingId as toPostingId,
  userId as toUserId,
} from '../../src/ids/index.js';
import { mintPoolPublicToken } from '../../src/pool/public-token.js';
import type { ScopeDimension } from '../../src/rbac/scope.js';
import * as schema from '../../src/schema/index.js';
import type { BrandingBundle } from '../../src/schema/pariwar_passport.js';

// Branded PariwarId constants (Story 1.7). A PariwarId IS a string, so these stay
// drop-in for the events_log helpers (string columns / setPariwarScope) AND
// satisfy the branded pariwar_passport.pariwar_id column in `eq(...)` comparisons.
export const PARIWAR_A = toPariwarId('11111111-1111-1111-1111-111111111111');
export const PARIWAR_B = toPariwarId('22222222-2222-2222-2222-222222222222');

// Dedicated tenants for the runAsCrossTenant helper tests, which COMMIT rows
// (the append-only trigger blocks cleanup, so they persist). Kept distinct from
// A/B so the exact-count RLS-enforcement assertions — which scope to A/B and
// rely on per-test ROLLBACK isolation — never observe these committed rows.
export const PARIWAR_X = toPariwarId('33333333-3333-3333-3333-333333333333');
export const PARIWAR_Y = toPariwarId('44444444-4444-4444-4444-444444444444');

export interface SeedOptions {
  streamId?: string;
  eventVersion?: number;
  eventType?: string;
  payload?: unknown;
  /** Explicit `occurred_at` — REQUIRED when a test asserts inter-event ordering: `now()`/`defaultNow()`
   *  is transaction-stable, so events seeded in the same per-test tx otherwise share one instant. */
  occurredAt?: Date;
  /** Explicit `actor_id` (defaults null). */
  actorId?: string | null;
}

/** Insert one events_log row. Returns the streamId used (random by default). */
export async function seedEvent(
  tx: Db,
  pariwarId: string,
  opts: SeedOptions = {},
): Promise<string> {
  const streamId = opts.streamId ?? randomUUID();
  await tx.insert(schema.eventsLog).values({
    streamId,
    eventType: opts.eventType ?? 'test.created',
    payload: opts.payload ?? {},
    eventVersion: opts.eventVersion ?? 1,
    actorId: opts.actorId ?? null,
    pariwarId,
    ...(opts.occurredAt !== undefined ? { occurredAt: opts.occurredAt } : {}),
  });
  return streamId;
}

const DEFAULT_BRANDING: BrandingBundle = {
  logo_url: 'https://cdn.twt.local/test/logo.png',
  primary_color: '#0A3D62',
  secondary_color: '#FFFFFF',
};

export interface SeedPassportOptions {
  displayNameEn?: string;
  displayNameHi?: string;
  legalName?: string;
  trustRegistrationId?: string | null;
  brandingBundle?: BrandingBundle;
  localeDefault?: 'hi' | 'en';
  createdBy?: string | null;
}

/**
 * Insert one pariwar_passport row. Like seedEvent, this is meant to run BEFORE
 * entering app scope (as the Docker superuser, RLS bypassed) so both tenants'
 * rows land regardless of the write-isolation policy; afterEach ROLLBACK
 * (setupLiveDb) reverts it (the Passport table is NOT append-only, so a rollback
 * — or even DELETE — would also work, but the per-test tx keeps it clean).
 * `id` is branded via the `pariwarId()` smart constructor (validates UUID shape).
 */
export async function seedPassport(
  tx: Db,
  id: string,
  opts: SeedPassportOptions = {},
): Promise<void> {
  // createdBy → users.id is an FK now (D4-1.7); seed the creator when one is given.
  const createdBy = opts.createdBy ?? null;
  if (createdBy !== null) await seedUser(tx, createdBy);
  await tx.insert(schema.pariwarPassport).values({
    pariwarId: toPariwarId(id),
    displayNameEn: opts.displayNameEn ?? 'Test Pariwar EN',
    displayNameHi: opts.displayNameHi ?? 'परीक्षण परिवार',
    legalName: opts.legalName ?? 'Test Welfare Trust',
    trustRegistrationId: opts.trustRegistrationId ?? null,
    brandingBundle: opts.brandingBundle ?? DEFAULT_BRANDING,
    localeDefault: opts.localeDefault ?? 'en',
    createdBy: createdBy === null ? null : toUserId(createdBy),
  });
}

export interface SeedUserOptions {
  identityType?: 'admin';
  status?: 'active' | 'suspended' | 'disabled';
}

/**
 * Insert one global `users` row (Story 1.9). Idempotent (ON CONFLICT DO NOTHING) so
 * a repeated id is a no-op. `users` is GLOBAL (carve-out family) — seed it BEFORE
 * entering app scope (as the Docker superuser); afterEach ROLLBACK reverts it.
 * Returns the (branded) user id used. The retro FK `role_grants.user_id → users.id`
 * means a grant's subject must exist here first — seedRoleGrant calls this.
 */
export async function seedUser(
  tx: Db,
  id: string = randomUUID(),
  opts: SeedUserOptions = {},
): Promise<string> {
  await tx
    .insert(schema.users)
    .values({
      id: toUserId(id),
      identityType: opts.identityType ?? 'admin',
      status: opts.status ?? 'active',
    })
    .onConflictDoNothing();
  return id;
}

export interface SeedRoleGrantOptions {
  userId?: string;
  role?: string;
  scopeDimension?: ScopeDimension;
  scopeValue?: string | null;
  createdBy?: string | null;
}

/**
 * Insert one role_grants row (Story 1.8). Like seedEvent/seedPassport, run this
 * BEFORE entering app scope (as the Docker superuser, RLS bypassed) so rows for
 * BOTH tenants land regardless of the write-isolation policy; afterEach ROLLBACK
 * (setupLiveDb) reverts it. role_grants is a SCOPED table — cross-Pariwar reads
 * must return 0 rows (asserted by cross-pariwar-leak.spec.ts). Seeds the subject
 * `users` row first (retro FK D4-1.8). Returns the userId.
 */
export async function seedRoleGrant(
  tx: Db,
  pariwarId: string,
  opts: SeedRoleGrantOptions = {},
): Promise<string> {
  const uid = opts.userId ?? randomUUID();
  await seedUser(tx, uid);
  const createdBy = opts.createdBy ?? null;
  if (createdBy !== null) await seedUser(tx, createdBy);
  await tx.insert(schema.roleGrants).values({
    userId: toUserId(uid),
    pariwarId: toPariwarId(pariwarId),
    role: opts.role ?? 'district_admin',
    scopeDimension: opts.scopeDimension ?? 'district',
    scopeValue: opts.scopeValue ?? 'Patna',
    createdBy: createdBy === null ? null : toUserId(createdBy),
  });
  return uid;
}

export interface SeedClauseOptions {
  clauseId?: string;
  version?: number;
  effectiveDate?: Date;
  payload?: Record<string, unknown>;
  benefitMechanism?: 'pool' | 'reserve';
  /** Set to mark this version retired (Story 2.5 effective-set tests exclude it). */
  deprecatedAt?: Date;
}

/**
 * Insert one clause_versions row (Story 2.3). Like seedEvent/seedPassport, run
 * BEFORE entering app scope (as the Docker superuser, RLS bypassed) so rows for
 * BOTH tenants land regardless of the write-isolation policy; afterEach ROLLBACK
 * reverts it. clause_versions is a SCOPED table — cross-Pariwar reads must return
 * 0 rows (asserted by cross-pariwar-leak.spec.ts). Returns the clause_version_id.
 */
export async function seedClauseVersion(
  tx: Db,
  pariwarId: string,
  opts: SeedClauseOptions = {},
): Promise<string> {
  const [row] = await tx
    .insert(schema.clauseVersions)
    .values({
      clauseId: toClauseId(opts.clauseId ?? 'niy.test.r1'),
      pariwarId: toPariwarId(pariwarId),
      version: opts.version ?? 1,
      effectiveDate: opts.effectiveDate ?? new Date('2025-01-01T00:00:00Z'),
      payload: opts.payload ?? { rule_code: 'TEST' },
      benefitMechanism: opts.benefitMechanism ?? 'pool',
      deprecatedAt: opts.deprecatedAt ?? null,
    })
    .returning();
  if (!row) throw new Error('seedClauseVersion: insert returned no row');
  return row.clauseVersionId;
}

export interface SeedTcVersionOptions {
  /** Monotonic per Pariwar, starting at 1. Distinct per call when seeding several. */
  version?: number;
  /** When this version comes into force. Defaults to an hour ago (so it is EFFECTIVE now). */
  effectiveFrom?: Date;
  /** NULL = currently in force. Set it to make a version historical / not-yet-effective. */
  effectiveUntil?: Date | null;
  /** ⚠ `getEffectiveTc` requires `approved`; a `pending` version is never the effective one. */
  legalReviewStatus?: schema.TcLegalReviewStatus;
}

/**
 * Insert one `terms_and_conditions_versions` row (Story 2.6). Like the other seeds, run this BEFORE
 * `enterAppScope` (Docker superuser, RLS bypassed); afterEach ROLLBACK reverts it.
 * Returns the `tc_version_id` — which is ALSO what a `tc_acceptance` consent row stores in
 * `consent_artifact_ref` (`member-terms.handlers.ts`), and therefore what Story 11b.9's publication
 * predicate joins on.
 */
export async function seedTcVersion(
  tx: Db,
  pariwarId: string,
  opts: SeedTcVersionOptions = {},
): Promise<string> {
  const [row] = await tx
    .insert(schema.termsAndConditionsVersions)
    .values({
      pariwarId: toPariwarId(pariwarId),
      version: opts.version ?? 1,
      bodyMarkdown: '# Terms\n\nSeeded for tests.',
      bodyHtmlRendered: '<h1>Terms</h1><p>Seeded for tests.</p>',
      effectiveFrom: opts.effectiveFrom ?? new Date(Date.now() - 3_600_000),
      effectiveUntil: opts.effectiveUntil ?? null,
      legalReviewStatus: opts.legalReviewStatus ?? 'approved',
    })
    .returning();
  if (!row) throw new Error('seedTcVersion: insert returned no row');
  return row.tcVersionId;
}

/**
 * Pin a clause version into a T&C version (`terms_and_conditions_pinned_clauses`, Story 2.6).
 *
 * ⚠ The FK targets the GLOBAL `clause_versions` PK and would happily link a DIFFERENT Pariwar's
 * clause version — the same-Pariwar guard is a DOMAIN pre-check, ⛔ not the FK. This helper takes
 * `pariwarId` explicitly so a test can deliberately construct the cross-tenant case.
 */
export async function seedPinnedClause(
  tx: Db,
  pariwarId: string,
  tcVersionId: string,
  clauseVersionId: string,
): Promise<void> {
  await tx.insert(schema.termsAndConditionsPinnedClauses).values({
    tcVersionId: tcVersionId as never,
    clauseVersionId: clauseVersionId as never,
    pariwarId: toPariwarId(pariwarId),
  });
}

export interface SeedConsentOptions {
  subjectId?: string;
  consentType?: schema.ConsentType;
  consentArtifactRef?: string | null;
  grantedViaActor?: schema.ConsentGrantedVia;
  consentPayload?: schema.ConsentPayload;
  grantedAt?: Date;
  revokedAt?: Date | null;
}

// A FIXED subject uuid so both PARIWAR_A and PARIWAR_B consent rows resolve under
// the same subject in cross-tenant isolation tests (the tenant key is pariwar_id,
// not subject_id). Callers needing a distinct subject pass `subjectId`.
const FIXED_CONSENT_SUBJECT = '55555555-5555-5555-5555-555555555555';

/**
 * Insert one consent_records row (Story 2.7). Like seedClauseVersion, run this
 * BEFORE entering app scope (as the Docker superuser, RLS bypassed) so rows for
 * BOTH tenants land regardless of the write-isolation policy — without this the
 * positive `not.toHaveLength(0)` guard cannot be satisfied for both tenants in the
 * cross-tenant isolation test (a `recordConsent` after enterAppScope would lock you
 * to one tenant's scope). afterEach ROLLBACK (setupLiveDb) reverts it. consent_records
 * is a SCOPED table — cross-Pariwar reads must return 0 rows. `audit_id` /
 * `revoked_audit_id` stay null (the audit-or-throw linkage is a consumer concern).
 * Returns the consent_id.
 */
export async function seedConsentRecord(
  tx: Db,
  pariwarId: string,
  opts: SeedConsentOptions = {},
): Promise<string> {
  if (opts.revokedAt && !opts.grantedAt) {
    throw new Error(
      'seedConsentRecord: revokedAt without grantedAt produces an invalid row (grantedAt defaults to DB now(), making revokedAt < grantedAt)',
    );
  }
  const [row] = await tx
    .insert(schema.consentRecords)
    .values({
      subjectId: opts.subjectId ?? FIXED_CONSENT_SUBJECT,
      pariwarId: toPariwarId(pariwarId),
      consentType: opts.consentType ?? 'marketing',
      consentArtifactRef: opts.consentArtifactRef ?? null,
      grantedViaActor: opts.grantedViaActor ?? 'member_self',
      consentPayload: opts.consentPayload ?? {},
      grantedAt: opts.grantedAt ?? undefined,
      revokedAt: opts.revokedAt ?? null,
    })
    .returning();
  if (!row) throw new Error('seedConsentRecord: insert returned no row');
  return row.consentId;
}

export interface SeedMemberOptions {
  memberId?: string;
  state?: schema.MemberLifecycleState;
  stateEventVersion?: number;
}

/**
 * Insert one members row (Story 3.1) DIRECTLY (bypassing the projector). Like
 * seedConsentRecord, run this BEFORE entering app scope (as the Docker superuser, RLS
 * bypassed) so rows for BOTH tenants land regardless of the write-isolation policy;
 * afterEach ROLLBACK reverts it. members is a SCOPED table — cross-Pariwar reads must
 * return 0 rows. The INSERT is unaffected by the members.state write-rejection trigger
 * (that trigger is BEFORE UPDATE only). Returns the member_id used.
 */
export async function seedMember(
  tx: Db,
  pariwarId: string,
  opts: SeedMemberOptions = {},
): Promise<string> {
  const id = opts.memberId ?? randomUUID();
  await tx.insert(schema.members).values({
    memberId: toMemberId(id),
    pariwarId: toPariwarId(pariwarId),
    state: opts.state ?? 'pending-kyc',
    stateEventVersion: opts.stateEventVersion ?? 1,
  });
  return id;
}

export interface SeedClaimOptions {
  claimCaseId?: string;
  deceasedMemberId?: string;
  claimantActorId?: string | null;
  intakeChannels?: schema.ClaimIntakeChannel[];
  currentState?: schema.ClaimLifecycleState;
  stateEventVersion?: number;
}

/**
 * Insert one claims row (Story 6.1) DIRECTLY (bypassing the projector). Like
 * seedMember, run this BEFORE entering app scope (as the Docker superuser, RLS
 * bypassed) so rows for BOTH tenants land regardless of the write-isolation policy;
 * afterEach ROLLBACK reverts it. claims is a SCOPED table — cross-Pariwar reads must
 * return 0 rows.
 *
 * The claims.current_state write-rejection trigger (Story 6.1 AC3) fires on BOTH
 * INSERT and UPDATE (review fix — a BEFORE UPDATE-only trigger never guarded the
 * create-time write; see migration 0051 + claim/project.ts). This helper seeds a row
 * directly for test setup, so it sets the same session guard the projector uses for
 * the one INSERT, then resets it immediately — tests that go on to exercise the
 * trigger's rejection behavior (e.g. a raw UPDATE with no guard) depend on the guard
 * being back 'off' before they run. Returns the claim_case_id used.
 */
export async function seedClaim(
  tx: Db,
  pariwarId: string,
  opts: SeedClaimOptions = {},
): Promise<string> {
  const id = opts.claimCaseId ?? randomUUID();
  await tx.execute(sql.raw("SET LOCAL app.claim_state_writer = 'on'"));
  try {
    await tx.insert(schema.claims).values({
      claimCaseId: toClaimId(id),
      pariwarId: toPariwarId(pariwarId),
      deceasedMemberId: toMemberId(opts.deceasedMemberId ?? randomUUID()),
      claimantActorId: opts.claimantActorId ?? null,
      intakeChannels: opts.intakeChannels ?? ['member_app'],
      currentState: opts.currentState ?? 'intake_pending',
      stateEventVersion: opts.stateEventVersion ?? 1,
    });
  } finally {
    try {
      await tx.execute(sql.raw("SET LOCAL app.claim_state_writer = 'off'"));
    } catch {
      // tx already aborted (the seed insert itself failed) — nothing to reset.
    }
  }
  return id;
}

export interface SeedPoolOptions {
  poolId?: string;
  cycleId?: string;
  claimCaseId?: string;
  poolIndex?: number;
  poolCanonicalIdentifier?: string;
  supportCategory?: schema.PoolSupportCategory;
  benefitMechanism?: 'pool' | 'reserve';
  fixedAmount?: number;
  currentState?: schema.PoolLifecycleState;
  stateEventVersion?: number;
  /** Story 11b.10 — pin the public address token (default: a freshly minted one). */
  publicToken?: string;
}

/**
 * Insert one pools row (Story 7.1) DIRECTLY (bypassing the projector). Like seedClaim,
 * run this BEFORE entering app scope (as the Docker superuser, RLS bypassed) so rows
 * for BOTH tenants land regardless of the write-isolation policy; afterEach ROLLBACK
 * reverts it. pools is a SCOPED table — cross-Pariwar reads must return 0 rows.
 *
 * The pools.current_state write-rejection trigger (Story 7.1 AC5) fires on BOTH INSERT
 * and UPDATE (migration 0071 + pool/project.ts), so this helper sets the same session
 * guard the projector uses for the one INSERT, then resets it immediately — tests that
 * go on to exercise the trigger's rejection (e.g. a raw UPDATE with no guard) depend on
 * the guard being back 'off' before they run. Returns the pool_id used.
 */
export async function seedPool(
  tx: Db,
  pariwarId: string,
  opts: SeedPoolOptions = {},
): Promise<string> {
  const id = opts.poolId ?? randomUUID();
  await tx.execute(sql.raw("SET LOCAL app.pool_state_writer = 'on'"));
  try {
    await tx.insert(schema.pools).values({
      poolId: toPoolId(id),
      pariwarId: toPariwarId(pariwarId),
      cycleId: toCycleFreezeCommitId(opts.cycleId ?? randomUUID()),
      claimCaseId: toClaimId(opts.claimCaseId ?? randomUUID()),
      poolIndex: opts.poolIndex ?? 0,
      poolCanonicalIdentifier: opts.poolCanonicalIdentifier ?? `P-2026-07-${id.slice(0, 3)}`,
      supportCategory: opts.supportCategory ?? 'death_support',
      benefitMechanism: opts.benefitMechanism ?? 'pool',
      fixedAmount: opts.fixedAmount ?? 500,
      currentState: opts.currentState ?? 'spawned',
      stateEventVersion: opts.stateEventVersion ?? 1,
      // Story 11b.10 — the public address. Minted per seeded pool, never a constant: the column
      // carries a GLOBAL unique index, so a shared literal would make the SECOND seeded pool in any
      // suite fail with 23505 for a reason that has nothing to do with the test.
      publicToken: opts.publicToken ?? mintPoolPublicToken(),
    });
  } finally {
    try {
      await tx.execute(sql.raw("SET LOCAL app.pool_state_writer = 'off'"));
    } catch {
      // tx already aborted (the seed insert itself failed) — nothing to reset.
    }
  }
  return id;
}

export interface SeedAlertOptions {
  alertId?: string;
  cycleId?: string;
  poolCount?: number;
  currentState?: schema.AlertLifecycleState;
  stateEventVersion?: number;
  createdByActor?: string;
}

/**
 * Insert one alerts row (Story 8.1) DIRECTLY (bypassing the projector). Like seedPool, run
 * this BEFORE entering app scope (as the Docker superuser, RLS bypassed) so rows for BOTH
 * tenants land regardless of the write-isolation policy; afterEach ROLLBACK reverts it. alerts
 * is a SCOPED table — cross-Pariwar reads must return 0 rows.
 *
 * The alerts.current_state write-rejection trigger (Story 8.1 AC5) fires on BOTH INSERT and
 * UPDATE (migration 0078 + alert/project.ts), so this helper sets the same session guard the
 * projector uses for the one INSERT, then resets it immediately — tests that go on to exercise
 * the trigger's rejection (a raw UPDATE with no guard) depend on the guard being back 'off'
 * before they run. Returns the alert_id used.
 */
export async function seedAlert(
  tx: Db,
  pariwarId: string,
  opts: SeedAlertOptions = {},
): Promise<string> {
  const id = opts.alertId ?? randomUUID();
  await tx.execute(sql.raw("SET LOCAL app.alert_state_writer = 'on'"));
  try {
    await tx.insert(schema.alerts).values({
      alertId: toAlertId(id),
      cycleId: toCycleFreezeCommitId(opts.cycleId ?? randomUUID()),
      pariwarId: toPariwarId(pariwarId),
      poolCount: opts.poolCount ?? 1,
      currentState: opts.currentState ?? 'live',
      stateEventVersion: opts.stateEventVersion ?? 3,
      createdByActor: opts.createdByActor ?? 'trustee-actor-1',
    });
  } finally {
    try {
      await tx.execute(sql.raw("SET LOCAL app.alert_state_writer = 'off'"));
    } catch {
      // tx already aborted (the seed insert itself failed) — nothing to reset.
    }
  }
  return id;
}

export interface SeedPoolNameOptions {
  poolNameId?: string;
  displayNameEn?: string;
  displayNameHi?: string;
  culturalLineageNote?: string | null;
  approvalStatus?: schema.PoolNameApprovalStatus;
}

/**
 * Insert one pool_names row (Story 7.2 registry). Like seedPool, run BEFORE entering app
 * scope (as the Docker superuser, RLS bypassed); afterEach ROLLBACK reverts it.
 *
 * ⚠ This is a TEST fixture, and the ONLY place pool-name rows may be created outside a
 * trustee mutation. TWT-Bihar ships with an EMPTY registry by product decision (the UX
 * amendment vetoed the culture-name overlay; adversarial review M-10 gates any curated
 * seed on a governance review) — so nothing in src/ or migrations/ may seed names. The
 * illustrative names here exist ONLY to prove ordering + the exhaustion branch.
 *
 * `position` is explicit and required: reservation order IS the property under test, so a
 * defaulted/implicit position would make the tests assert nothing. Returns the id used.
 */
export async function seedPoolName(
  tx: Db,
  pariwarId: string,
  position: number,
  opts: SeedPoolNameOptions = {},
): Promise<string> {
  const id = opts.poolNameId ?? randomUUID();
  await tx.insert(schema.poolNames).values({
    poolNameId: toPoolNameId(id),
    pariwarId: toPariwarId(pariwarId),
    positionInOrderedList: position,
    displayNameEn: opts.displayNameEn ?? `Name-${String(position)}`,
    displayNameHi: opts.displayNameHi ?? `नाम-${String(position)}`,
    culturalLineageNote: opts.culturalLineageNote ?? null,
    approvalStatus: opts.approvalStatus ?? 'approved',
  });
  return id;
}

export interface SeedMemberPostingOptions {
  postingId?: string;
  createdAt?: Date;
  isRetirement?: boolean;
}

// Default-`createdAt` clock for seedMemberPosting: the column's `defaultNow()` is
// TRANSACTION-pinned (`now()` = tx start), so two default-seeded postings in one
// test tx would TIE on created_at and make "latest posting" nondeterministic.
// A module-level monotonic counter gives every default call a unique, strictly
// increasing timestamp instead (later call = newer posting — the intuitive seed
// semantics). Explicit `createdAt` callers are unaffected.
let postingSeedClockMs = Date.now();

/**
 * Insert one member_postings row (AI-6-3 shape tests). Like seedMember, run BEFORE
 * entering app scope (as the Docker superuser, RLS bypassed); afterEach ROLLBACK
 * reverts it. The member row must already exist (FK member_postings.member_id →
 * members.member_id). Accepts a fixed `postingId` + `createdAt` so a shape test can
 * pin the production "latest posting" pick (`created_at DESC, posting_id DESC` —
 * peer-mesh-read.ts) deterministically, including the posting_id tiebreak on a
 * created_at tie. When `createdAt` is omitted, a unique monotonically-increasing
 * timestamp is used (never the tx-pinned DB default — see postingSeedClockMs).
 * Returns the posting_id used.
 */
export async function seedMemberPosting(
  tx: Db,
  pariwarId: string,
  memberId: string,
  district: string,
  opts: SeedMemberPostingOptions = {},
): Promise<string> {
  const id = opts.postingId ?? randomUUID();
  await tx.insert(schema.memberPostings).values({
    postingId: toPostingId(id),
    memberId: toMemberId(memberId),
    pariwarId: toPariwarId(pariwarId),
    district,
    isRetirement: opts.isRetirement ?? false,
    createdAt: opts.createdAt ?? new Date((postingSeedClockMs += 1)),
  });
  return id;
}

/** Shed Docker superuser (SET ROLE twt_app) + set the pariwar scope, in-tx. */
export async function enterAppScope(
  client: pg.PoolClient,
  pariwarId: string,
): Promise<void> {
  await client.query('SET LOCAL ROLE twt_app');
  await setPariwarScope(client, pariwarId);
}

/** Shed superuser without setting a scope — for the fail-closed probe. */
export async function enterAppRoleNoScope(client: pg.PoolClient): Promise<void> {
  await client.query('SET LOCAL ROLE twt_app');
}
