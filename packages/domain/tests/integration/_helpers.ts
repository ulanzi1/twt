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

import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, setPariwarScope, type Db } from '../../src/db.js';
import { getEffectiveNomineeDeclaration } from '../../src/claim/nominee-effective.js';
import { deathCertificateStatus, readDeathCertificateSnapshot } from '../../src/claim/death-certificate-approval.js';
import { recordDeathCertificateReview } from '../../src/claim/death-certificate-review-persist.js';
import { recordNomineeDetermination } from '../../src/claim/nominee-determination-persist.js';
import { addCalendarDays, istDateOf } from '../../src/cycle-calendar/holiday-resolver.js';
import { recordNomineeNameCheck } from '../../src/claim/nominee-name-check-persist.js';
import {
  appendMemberDeclarationVersions,
  getNomineeVersionHeads,
  listNomineeDeclarationVersions,
  planDeclarationVersions,
} from '../../src/nominee/declaration-history.js';
import { replaceMemberNominees } from '../../src/nominee/declaration-write.js';
import { deriveNomineeSplit } from '../../src/nominee/split.js';
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

// ── Story 6.18 — the nominee NAME CHECK approval gate (AC4) ────────────────────────────────────
// Every approving path (P1 `adjudicateClaim`, P3 `voteOnFrozenClaim`, P4 `finalizeR9Outcome`) now
// requires the claim's two live bank accounts AND a current, passing District Admin name check
// (`2026-09-19-226` cl.3-cl.5, cl.7). Specs that drive a claim to `verifier_approved` and then
// approve it therefore need this one call first.
//
// ⭐ IT IS DELIBERATELY NOT A BACKDOOR for the CHECK: the check is recorded through the REAL
// `recordNomineeNameCheck`, so a spec using it exercises the writer's own state-window, coherence
// and token guards. A helper that stubbed the gate would make every approval test silently stop
// proving the gate holds.
// ⚠ THE ACCOUNTS ARE A DIFFERENT MATTER, AND THE HEADER USED TO OVERCLAIM THEM (code review
// 2026-09-20). They are INSERTed directly with placeholder ciphertext — `recordClaimNomineeBank
// Accounts` is never called here — so nothing a spec using this helper does exercises the real bank
// writer or its `updated_at` movement. Any test whose subject is the D5 staleness chain must drive
// the real writer itself, across two COMMITTED transactions.

/**
 * Story 6.20 — drive a claim through the PROJECTOR (claim state is projector-only) to `target`, the way
 * the name-check specs do. Runs in the caller's scope-tx. Returns nothing; the claim row exists after.
 */
export async function driveClaimTo(
  client: pg.PoolClient,
  pariwarId: string,
  claimCaseId: string,
  deceasedMemberId: string,
  target: 'intake_pending' | 'verification_in_progress' | 'verifier_review' | 'verifier_approved',
): Promise<void> {
  const { projectClaimState } = await import('../../src/claim/project.js');
  const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    projectClaimState(client, {
      claimCaseId: toClaimId(claimCaseId),
      pariwarId: toPariwarId(pariwarId),
      deceasedMemberId: toMemberId(deceasedMemberId),
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
      actorId: null,
    });
  await emit(null, 'intake_pending', 'claim.intake_initiated', {
    deceased_member_id: deceasedMemberId,
    intake_channel: 'member_app',
    claimant_actor_id: null,
  });
  if (target === 'intake_pending') return;
  await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
  await emit('intake_converged', 'documents_pending', 'claim.documents_received');
  await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
    selected_member_ids: [randomUUID()],
    metric_id: 'district_cohort_v1',
    metric_version: 1,
  });
  if (target === 'verification_in_progress') return;
  await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  if (target === 'verifier_approved') {
    await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
  }
}

// ── Story 6.20 — the nominee declaration HISTORY fixtures (T16) ─────────────────────────────────
// AC5 makes every approval refuse until a live District Admin DETERMINATION exists, and D1's accessor
// FAILS CLOSED on a `member_nominees` row with ⛔ no version. ⇒ seeding a nominee writes its VERSION too,
// and `seedNomineeNameCheck` seeds a "no discards" determination by default (opt-out below) — the same
// shape 6.18 used when it added its own gate. ⛔ The determination goes through the REAL
// `recordNomineeDetermination`, so every approve-path spec keeps exercising its guards.

/** The instant a fixture declaration is dated at by default — a fixed past day, so it stands against
 *  any certificate date a fixture computes from "today" (⛔ never the DB clock — the date-bomb class). */
export const SEEDED_NOMINEES_DECLARED_AT = new Date('2026-01-05T06:00:00.000Z');

export interface SeedNomineeDeclarationOptions {
  /** 1 or 2 nominees (default one). Placeholder ciphertext unless given. */
  readonly nominees?: readonly {
    readonly relationship?: string;
    readonly nameCiphertext?: string;
    readonly mobileCiphertext?: string;
    readonly addressCiphertext?: string | null;
  }[];
  /** `recorded_at` = `effective_at` of the versions (default `SEEDED_NOMINEES_DECLARED_AT`). */
  readonly declaredAt?: Date;
  /** Create the `members` row when absent (default true — `seedClaim` mints a bare deceased id). */
  readonly ensureMember?: boolean;
}

/**
 * Seed a member's nominee declaration THE WAY A DECLARE WRITES IT: the `member_nominees` projection AND
 * its `member_nominee_versions` (a tombstone included, on a 2→1). Works in or out of app scope.
 * ⛔ Never insert `member_nominees` rows directly in a spec that reaches an approval — they are
 * UNVERSIONED and the effective accessor fails them closed (D1).
 */
export async function seedNomineeDeclaration(
  tx: Db,
  pariwarId: string,
  memberId: string,
  opts: SeedNomineeDeclarationOptions = {},
) {
  const pid = toPariwarId(pariwarId);
  const mid = toMemberId(memberId);
  if (opts.ensureMember !== false) {
    await tx
      .insert(schema.members)
      .values({ memberId: mid, pariwarId: pid, state: 'active', stateEventVersion: 1 })
      .onConflictDoNothing();
  }
  const entries = opts.nominees ?? [{}];
  const { ranks } = deriveNomineeSplit(entries.length);
  const rows = entries.map((n, i) => ({
    rank: ranks[i]!.rank,
    splitPct: ranks[i]!.splitPct,
    relationship: n.relationship ?? (i === 0 ? 'spouse' : 'son'),
    nameCiphertext: n.nameCiphertext ?? `enc:v1:nominee-name-${i + 1}`,
    mobileCiphertext: n.mobileCiphertext ?? `enc:v1:nominee-mobile-${i + 1}`,
    addressCiphertext: n.addressCiphertext ?? null,
  }));
  await replaceMemberNominees(tx, { memberId: mid, pariwarId: pid, nominees: rows });
  const plan = planDeclarationVersions(
    await getNomineeVersionHeads(tx, pid, mid),
    rows.map((r) => r.rank),
  );
  return appendMemberDeclarationVersions(tx, {
    memberId: mid,
    pariwarId: pid,
    plan,
    nominees: rows,
    recordedAt: opts.declaredAt ?? SEEDED_NOMINEES_DECLARED_AT,
    eventVersion: null,
  });
}

// ── Story 6.21a — the death certificate (D12) ─────────────────────────────────────────────────────
// ⭐ TEST-ONLY RAW INSERTS. The OCR job (`runClaimOcrParity`) is the sole production writer of
// `claim_documents` and `claim_death_certificate_uploads`; there is ⛔ no domain writer for either, so a
// domain spec that needs a certificate seeds it here. ⛔ No production path may import this file.

export interface SeededDeathCertificate {
  readonly claimDocumentId: string;
  readonly uploadId: string;
  readonly storageObjectKey: string;
}

/**
 * Seed a death certificate the way the OCR job would leave it: the `claim_documents` row (created, or its
 * key moved to this upload) and ONE upload row whose key IS the row's key — i.e. the CURRENT certificate.
 * Call it again on the same claim for a REPLACEMENT (a new upload, the old one kept). Runs in the caller's
 * scope-tx.
 */
export async function seedDeathCertificate(
  client: pg.PoolClient,
  opts: { readonly pariwarId: string; readonly claimCaseId: string; readonly uploadedAt?: Date },
): Promise<SeededDeathCertificate> {
  const tx = bindScopedDb(client);
  const pid = toPariwarId(opts.pariwarId);
  const cid = toClaimId(opts.claimCaseId);
  const [claimRow] = await tx
    .select({ deceasedMemberId: schema.claims.deceasedMemberId })
    .from(schema.claims)
    .where(and(eq(schema.claims.pariwarId, pid), eq(schema.claims.claimCaseId, cid)));
  if (!claimRow) throw new Error(`[seedDeathCertificate] no claim ${opts.claimCaseId} in ${opts.pariwarId}`);
  const [existing] = await tx
    .select({ claimDocumentId: schema.claimDocuments.claimDocumentId })
    .from(schema.claimDocuments)
    .where(
      and(
        eq(schema.claimDocuments.pariwarId, pid),
        eq(schema.claimDocuments.claimCaseId, cid),
        eq(schema.claimDocuments.documentType, 'death_certificate'),
      ),
    );
  const claimDocumentId = (existing?.claimDocumentId as string | undefined) ?? randomUUID();
  const uploadId = randomUUID();
  const storageObjectKey = `pariwar/${pid}/claim/${cid}/death_certificate/${claimDocumentId}/${uploadId}`;
  if (existing) {
    await tx
      .update(schema.claimDocuments)
      .set({ storageObjectKey, updatedAt: new Date() })
      .where(eq(schema.claimDocuments.claimDocumentId, existing.claimDocumentId));
  } else {
    await tx.insert(schema.claimDocuments).values({
      claimDocumentId: claimDocumentId as never,
      claimCaseId: cid,
      pariwarId: pid,
      documentType: 'death_certificate',
      storageObjectKey,
      contentType: 'application/pdf',
      byteSize: 1024,
      parityOutcome: 'match',
      parityFlags: {},
      ocrConfidence: 0.9,
      verifierReviewRequired: false,
    });
  }
  await tx.insert(schema.claimDeathCertificateUploads).values({
    uploadId: uploadId as never,
    claimCaseId: cid,
    pariwarId: pid,
    deceasedMemberId: claimRow.deceasedMemberId,
    claimDocumentId: claimDocumentId as never,
    storageObjectKey,
    contentType: 'application/pdf',
    byteSize: 1024,
    channel: 'member_app',
    uploadedByActorId: null,
    uploadedAt: opts.uploadedAt ?? new Date(),
  });
  return { claimDocumentId, uploadId, storageObjectKey };
}

/** The fixture ciphertext for an accepted date — it carries the date so a later call can tell it apart. */
export function fixtureAcceptedDateCiphertext(date: string): string {
  return `enc:v1:accepted-date:${date}`;
}

/**
 * D4's injected clock for a fixture accept: a date may be TOMORROW (`certificateDateAfterEverything`), which
 * the real writer refuses against the wall clock — so the fixture passes a `now` on that IST day.
 */
function fixtureReviewNow(date: string): Date {
  return new Date(Math.max(Date.now(), Date.parse(`${date}T12:00:00+05:30`)));
}

/**
 * Ensure the claim's CURRENT death certificate is ACCEPTED — through the REAL review writer, ⛔ never a raw
 * insert of a review (the writer's window, token and supersession guards run). Returns the accepted review id.
 *   · already accepted, and (when `date` is given) with that fixture date ⇒ reused as is;
 *   · accepted with ANOTHER date ⇒ re-reviewed (`re_reviewed`) with this one;
 *   · awaiting review with an upload ⇒ accepted;
 *   · missing, rejected, or a legacy row with no upload ⇒ a NEW certificate is seeded, then accepted.
 * The claim must be in the review window (the writer refuses otherwise).
 */
export async function seedAcceptedDeathCertificate(
  client: pg.PoolClient,
  opts: {
    readonly pariwarId: string;
    readonly claimCaseId: string;
    /** The date of death to accept. Omitted ⇒ keep any accepted certificate, else accept tomorrow (IST). */
    readonly date?: string;
    readonly now?: Date;
    readonly actorId?: string;
    readonly actorDisplay?: string;
  },
): Promise<string> {
  const tx = bindScopedDb(client);
  const pid = toPariwarId(opts.pariwarId);
  const cid = toClaimId(opts.claimCaseId);
  const snapshot = await readDeathCertificateSnapshot(tx, pid, cid);
  const status = deathCertificateStatus(snapshot);
  if (status === 'accepted') {
    if (opts.date === undefined) return snapshot.currentReview!.reviewId as string;
    const [row] = await tx
      .select({ c: schema.claimDeathCertificateReviews.acceptedDateCiphertext })
      .from(schema.claimDeathCertificateReviews)
      .where(eq(schema.claimDeathCertificateReviews.reviewId, snapshot.currentReview!.reviewId));
    if (row?.c === fixtureAcceptedDateCiphertext(opts.date)) return snapshot.currentReview!.reviewId as string;
  }
  let token = snapshot.currentUploadId as string | null;
  if (status === 'missing' || status === 'rejected' || token === null) {
    token = (await seedDeathCertificate(client, { pariwarId: opts.pariwarId, claimCaseId: opts.claimCaseId })).uploadId;
  }
  const date = opts.date ?? certificateDateAfterEverything();
  const result = await recordDeathCertificateReview(client, {
    claimCaseId: cid,
    pariwarId: pid,
    verdict: 'accepted',
    certificateToken: token,
    acceptedDate: date,
    acceptedDateCiphertext: fixtureAcceptedDateCiphertext(date),
    rejectionReason: null,
    noteCiphertext: 'enc:v1:review-note',
    expectedLiveReviewId: (snapshot.liveReview?.reviewId as string | undefined) ?? null,
    actorId: opts.actorId ?? randomUUID(),
    actorDisplay: opts.actorDisplay ?? 'Test District Admin',
    actor: 'operator',
    now: opts.now ?? fixtureReviewNow(date),
  });
  return result.reviewId as string;
}

/** Reject the claim's current death certificate through the REAL writer. Returns the review id. */
export async function seedRejectedDeathCertificate(
  client: pg.PoolClient,
  opts: {
    readonly pariwarId: string;
    readonly claimCaseId: string;
    readonly reason?: 'no_date_of_death' | 'date_of_death_unclear' | 'date_of_death_in_future';
    readonly actorId?: string;
  },
): Promise<string> {
  const tx = bindScopedDb(client);
  const pid = toPariwarId(opts.pariwarId);
  const cid = toClaimId(opts.claimCaseId);
  let snapshot = await readDeathCertificateSnapshot(tx, pid, cid);
  if (snapshot.currentUploadId === null) {
    await seedDeathCertificate(client, { pariwarId: opts.pariwarId, claimCaseId: opts.claimCaseId });
    snapshot = await readDeathCertificateSnapshot(tx, pid, cid);
  }
  const result = await recordDeathCertificateReview(client, {
    claimCaseId: cid,
    pariwarId: pid,
    verdict: 'rejected',
    certificateToken: snapshot.currentUploadId as string,
    acceptedDate: null,
    acceptedDateCiphertext: null,
    rejectionReason: opts.reason ?? 'no_date_of_death',
    noteCiphertext: 'enc:v1:review-note',
    expectedLiveReviewId: (snapshot.liveReview?.reviewId as string | undefined) ?? null,
    actorId: opts.actorId ?? randomUUID(),
    actorDisplay: 'Test District Admin',
    actor: 'operator',
  });
  return result.reviewId as string;
}

/** Tomorrow in IST — a certificate date against which every version dated up to now STANDS. */
export function certificateDateAfterEverything(): string {
  return addCalendarDays(istDateOf(new Date()), 1);
}

/**
 * Record a District Admin determination through the REAL writer. Default: "no discards" — every
 * version `stands` against a certificate date after all of them. Pass `certificateDate` + `marks` to
 * build a determination that discards (the marks must agree with D6 or the writer refuses them).
 */
export async function seedNomineeDetermination(
  client: pg.PoolClient,
  pariwarId: string,
  claimCaseId: string,
  opts: {
    readonly certificateDate?: string;
    readonly marks?: readonly { readonly versionId: string; readonly mark: 'stands' | 'discarded' }[];
    readonly actorId?: string;
    readonly actorDisplay?: string;
    /**
     * ⭐ Story 6.21a (D12) — the ACCEPTED death certificate the determination's date must come from (D8).
     * Default `'accepted'`: the claim's current certificate is accepted with the determination's OWN date
     * (through the real review writer), and its review id is passed. `'skip'` seeds nothing and passes a
     * review id that is NOT the current accepted one — the writer's `certificate_not_accepted` refusal.
     */
    readonly certificate?: 'accepted' | 'skip';
  } = {},
) {
  const tx = bindScopedDb(client);
  const pid = toPariwarId(pariwarId);
  const cid = toClaimId(claimCaseId);
  const certificateDate = opts.certificateDate ?? certificateDateAfterEverything();
  const deathCertificateReviewId =
    opts.certificate === 'skip'
      ? randomUUID()
      : await seedAcceptedDeathCertificate(client, { pariwarId, claimCaseId, date: certificateDate });
  const claimRows = await tx
    .select({ deceasedMemberId: schema.claims.deceasedMemberId })
    .from(schema.claims)
    .where(and(eq(schema.claims.pariwarId, pid), eq(schema.claims.claimCaseId, cid)));
  const deceasedMemberId = claimRows[0]!.deceasedMemberId;
  const versions = await listNomineeDeclarationVersions(tx, pid, deceasedMemberId);
  const head = (rank: number) =>
    versions.filter((v) => v.rank === rank).reduce<number | null>((m, v) => Math.max(m ?? 0, v.versionNo), null);
  const live = await tx
    .select({ id: schema.nomineeDeterminations.determinationId })
    .from(schema.nomineeDeterminations)
    .where(
      and(
        eq(schema.nomineeDeterminations.pariwarId, pid),
        eq(schema.nomineeDeterminations.claimCaseId, cid),
        isNull(schema.nomineeDeterminations.supersededAt),
      ),
    );
  return recordNomineeDetermination(client, {
    claimCaseId: cid,
    pariwarId: pid,
    certificateDate,
    certificateDateCiphertext: 'enc:v1:certificate-date',
    noteCiphertext: 'enc:v1:determination-note',
    marks: opts.marks ?? versions.map((v) => ({ versionId: v.versionId, mark: 'stands' as const })),
    watermark: { rank1: head(1), rank2: head(2) },
    expectedLiveDeterminationId: (live[0]?.id as string | undefined) ?? null,
    deathCertificateReviewId,
    actorId: opts.actorId ?? randomUUID(),
    actorDisplay: opts.actorDisplay ?? 'Test District Admin',
    actor: 'operator',
  });
}

/**
 * Give a claim its two bank accounts and a recorded, PASSING nominee name check, so it can pass the
 * AC4 approval gate. Runs inside the caller's scope-tx; the claim must already exist and be in one
 * of `NOMINEE_NAME_CHECK_RECORDABLE_STATES`.
 *
 * Pass `verdicts` to build the negative fixtures instead — e.g. `['matches', 'does_not_match']` for
 * the "sent back for correction" case (AC5), which must NOT pass the gate and must NEVER be denied.
 *
 * ⚠ `verdicts` / `clericalReasons` must cover EVERY account when given. They used to fall back
 * per-index (`verdicts[i] ?? 'matches'`), so a short array silently produced a PASSING verdict on
 * the ranks it did not mention — a negative fixture that quietly became a positive one. It now
 * throws (code review 2026-09-20).
 */
export async function seedNomineeNameCheck(
  client: pg.PoolClient,
  pariwarId: string,
  claimCaseId: string,
  opts: {
    readonly verdicts?: readonly ('matches' | 'clerical_difference' | 'does_not_match')[];
    readonly clericalReasons?: readonly (('initial' | 'married_name' | 'bank_shortened_name') | null)[];
    readonly actorId?: string;
    /** The acting staff display name snapshotted into the event (D3). Non-empty by construction. */
    readonly actorDisplay?: string;
    /**
     * ⭐ OPT OUT of seeding a check at all — for the specs that must reach an UNCHECKED claim.
     * `seedClaim` calls this helper unconditionally, so without this flag no test could construct
     * the very claim the AC4 gates exist to refuse (code review 2026-09-20, chunk 5).
     */
    readonly skip?: boolean;
    /** Record a check against the EXISTING account rows instead of re-seeding them. Needed wherever
     *  the accounts' `updated_at` is load-bearing — e.g. the return loop's re-check, where rewriting
     *  the rows would undo the very correction the check is supposed to be about. */
    readonly reuseAccounts?: boolean;
    /**
     * ⭐ Story 6.20 (T16) — the as-at-death DETERMINATION the AC5 gate requires. Default
     * `'no_discards'`: when the deceased has ⛔ no declaration at all, one nominee is seeded (with its
     * version); then, when ⛔ no determination is live, an all-`stands` one is recorded through the real
     * writer. `'skip'` reaches an UNDETERMINED claim — the gate's 409 `nominee_determination_required`.
     */
    readonly determination?: 'no_discards' | 'skip';
    /**
     * ⭐ Story 6.21a (D12, D7) — the ACCEPTED death certificate the approval gate now requires FIRST.
     * Default `'accepted'`: the claim's current certificate is accepted through the real review writer
     * (kept if one already is), before any determination. `'skip'` reaches a claim with no accepted
     * certificate — the gate's 409 `death_certificate_acceptance_required` — and ⛔ seeds no determination
     * either (a determination needs an accepted certificate, D8), unless one is already live.
     */
    readonly certificate?: 'accepted' | 'skip';
  } = {},
): Promise<void> {
  if (opts.skip === true) return;

  const tx = bindScopedDb(client);
  const pid = toPariwarId(pariwarId);
  const cid = toClaimId(claimCaseId);
  const verdicts = opts.verdicts ?? (['matches', 'matches'] as const);
  const clericalReasons = opts.clericalReasons ?? [null, null];
  if (verdicts.length !== 2) {
    throw new Error(
      `[seedNomineeNameCheck] verdicts must cover both accounts, got ${verdicts.length} — a short array used to default the missing ranks to 'matches', turning a negative fixture into a passing one`,
    );
  }
  if (opts.clericalReasons !== undefined && opts.clericalReasons.length !== 2) {
    throw new Error(
      `[seedNomineeNameCheck] clericalReasons must cover both accounts, got ${opts.clericalReasons.length}`,
    );
  }

  // Two live accounts — `-226` cl.7 makes both mandatory before a claim can be decided.
  if (opts.reuseAccounts !== true) {
    await tx
      .delete(schema.claimNomineeBankAccounts)
      .where(
        and(
          eq(schema.claimNomineeBankAccounts.pariwarId, pid),
          eq(schema.claimNomineeBankAccounts.claimCaseId, cid),
        ),
      );
    await tx.insert(schema.claimNomineeBankAccounts).values(
      [1, 2].map((rank) => ({
        claimCaseId: cid,
        pariwarId: pid,
        accountRank: rank,
        accountHolderNameCiphertext: `enc:v1:holder-${rank}`,
        accountNumberCiphertext: `enc:v1:acct-${rank}`,
        ifscCiphertext: `enc:v1:ifsc-${rank}`,
        bankName: rank === 1 ? 'State Bank of India' : 'HDFC Bank',
        ifscValidated: true,
      })),
    );
  }

  const live = await tx
    .select({
      accountRank: schema.claimNomineeBankAccounts.accountRank,
      updatedAt: schema.claimNomineeBankAccounts.updatedAt,
    })
    .from(schema.claimNomineeBankAccounts)
    .where(
      and(
        eq(schema.claimNomineeBankAccounts.pariwarId, pid),
        eq(schema.claimNomineeBankAccounts.claimCaseId, cid),
      ),
    )
    .orderBy(asc(schema.claimNomineeBankAccounts.accountRank));

  // The token is derived from the DECEASED member's declaration — read the claim to find them, then
  // derive through the same function the writer uses, so the two can never disagree.
  const claimRows = await tx
    .select({ deceasedMemberId: schema.claims.deceasedMemberId })
    .from(schema.claims)
    .where(and(eq(schema.claims.pariwarId, pid), eq(schema.claims.claimCaseId, cid)));
  const deceasedMemberId = claimRows[0]!.deceasedMemberId;
  if (opts.certificate !== 'skip') {
    await seedAcceptedDeathCertificate(client, { pariwarId, claimCaseId });
  }
  if (opts.determination !== 'skip') {
    const before = await getEffectiveNomineeDeclaration(tx, pid, cid);
    if (before.status === 'unversioned') {
      throw new Error(
        '[seedNomineeNameCheck] the deceased has member_nominees rows with NO version — seed them with seedNomineeDeclaration, not a raw INSERT (Story 6.20 D1 fails them closed)',
      );
    }
    if ((await listNomineeDeclarationVersions(tx, pid, deceasedMemberId)).length === 0) {
      await seedNomineeDeclaration(tx, pariwarId, deceasedMemberId);
    }
    if (before.determinationId === null && opts.certificate !== 'skip') {
      // The determination's date = the accepted certificate's (no `certificateDate` ⇒ tomorrow IST, the
      // date `seedAcceptedDeathCertificate` accepted above — so the review is reused, ⛔ not re-reviewed).
      await seedNomineeDetermination(client, pariwarId, claimCaseId);
    }
  }
  // The token of the declaration IN FORCE AT THE DEATH (Story 6.20, AC5) — read through the same
  // accessor the writer re-validates against, so the two can never disagree.
  const token = (await getEffectiveNomineeDeclaration(tx, pid, cid)).token;

  await recordNomineeNameCheck(client, {
    claimCaseId: cid,
    pariwarId: pid,
    nomineeDeclarationToken: token,
    accounts: live.map((a, i) => ({
      accountRank: a.accountRank as 1 | 2,
      accountUpdatedAt: a.updatedAt.toISOString(),
      verdict: verdicts[i]!,
      clericalReason: clericalReasons[i] ?? null,
    })),
    actorId: opts.actorId ?? randomUUID(),
    // ⛔ NOT a placeholder: the writer refuses an empty display name (D3), so every seeded check
    // carries a name exactly as a real one does.
    actorDisplay: opts.actorDisplay ?? 'Test District Admin',
    actor: 'operator',
  });
}
