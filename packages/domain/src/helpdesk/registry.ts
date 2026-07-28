// Versioned routing-policy registry — Story 10.1 (Task 5; AC2).
//
// The Story 2.3 `clause_versions` immutability posture applied to routing rules (the niyamavali
// `write.ts` narrow-write exemplar the Dev Notes cite): a policy update INSERTs a new version row;
// prior rows are never mutated except the `superseded_by_version` forward-pointer. NO HTTP, NO auth
// (those live at the Story 10.4 admin route); runs on the CALLER's transaction; the typed
// `RoutingPolicyVersionConflictError` is the 409 seam.
//
// ── The default v1 policy is CODE DATA (the roles.ts `defaultRoleBundles` precedent) ───────────────
// AR-46: the default applies when a Pariwar has no override. It is a code CONSTANT — NOT a table row
// — so the table holds per-Pariwar OVERRIDES only (plain tenant RLS; no cross-tenant sentinel row).
// The default owns version 1; per-Pariwar override versions start at 2, so `(pariwar_id, version)` →
// document is UNAMBIGUOUS for replay without an extra version_id column (a ticket stores its
// `routing_policy_version` and is never re-routed — the FR-8 non-retroactivity snapshot, AC3).
//
// ── Non-retroactivity (AC3) ────────────────────────────────────────────────────────────────────────
// `routingPolicyVersionInForce(db, pariwarId, at)` resolves the version to SNAPSHOT at ticket
// creation. Existing tickets store `routing_policy_version` and are NEVER re-routed when a new
// version publishes. `routingPolicyDocumentForVersion` reconstructs any past version for replay/audit.

import { and, desc, eq, lte, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { HelpdeskRoutingPolicyVersionId, PariwarId, UserId } from '../ids/index.js';
import { SCOPE_DIMENSIONS } from '../rbac/scope.js';
import { HELPDESK_CATEGORIES } from '../schema/helpdesk_tickets.js';
import {
  helpdeskRoutingPolicyVersions,
  type HelpdeskRoutingPolicyVersionRow,
  type RoutingPolicyDocumentJson,
  type RoutingRuleJson,
} from '../schema/helpdesk_routing_policy_versions.js';
import {
  RoutingPolicyDocumentInvalidError,
  RoutingPolicyEffectiveAtOutOfOrderError,
  RoutingPolicySelfScopeUnsupportedError,
  RoutingPolicyVersionConflictError,
} from './errors.js';

/** The default policy's version number. Per-Pariwar overrides start at this + 1 (see the header). */
export const DEFAULT_ROUTING_POLICY_VERSION = 1;

/**
 * The seeded default routing policy v1 (AC2) — code DATA (the `defaultRoleBundles` precedent). Covers
 * exactly the FR-52 v1 categories. All rules route at the `pariwar` dimension to a pariwar-ceiling
 * seeded role, so the resolver never needs a geo value (a Pariwar that wants district-level routing
 * publishes an override). SLA: first-response 24h everywhere; resolution 5 business days, except
 * `niyamavali-question` = 10 (the FR-52 policy-question longer budget). The `other` catch-all is LAST
 * (`sub_category: null`) so every category resolves. Order IS the first-match precedence (AC3).
 */
export const DEFAULT_ROUTING_POLICY: RoutingPolicyDocumentJson = {
  version: DEFAULT_ROUTING_POLICY_VERSION,
  rules: [
    { category: 'kyc-trouble', sub_category: null, target_role: 'helpline_operator', target_scope_dimension: 'pariwar', sla_first_response_hours: 24, sla_resolution_business_days: 5 },
    { category: 'payment-failed', sub_category: null, target_role: 'helpline_operator', target_scope_dimension: 'pariwar', sla_first_response_hours: 24, sla_resolution_business_days: 5 },
    { category: 'utr-mismatch', sub_category: null, target_role: 'finance_officer', target_scope_dimension: 'pariwar', sla_first_response_hours: 24, sla_resolution_business_days: 5 },
    { category: 'claim-status', sub_category: null, target_role: 'helpline_operator', target_scope_dimension: 'pariwar', sla_first_response_hours: 24, sla_resolution_business_days: 5 },
    { category: 'profile-update', sub_category: null, target_role: 'helpline_operator', target_scope_dimension: 'pariwar', sla_first_response_hours: 24, sla_resolution_business_days: 5 },
    { category: 'niyamavali-question', sub_category: null, target_role: 'pariwar_admin', target_scope_dimension: 'pariwar', sla_first_response_hours: 24, sla_resolution_business_days: 10 },
    { category: 'partner-module-issue', sub_category: null, target_role: 'it_cell', target_scope_dimension: 'pariwar', sla_first_response_hours: 24, sla_resolution_business_days: 5 },
    { category: 'complaint', sub_category: null, target_role: 'pariwar_admin', target_scope_dimension: 'pariwar', sla_first_response_hours: 24, sla_resolution_business_days: 5 },
    { category: 'other', sub_category: null, target_role: 'helpline_operator', target_scope_dimension: 'pariwar', sla_first_response_hours: 24, sla_resolution_business_days: 5 },
  ],
};

/** Returns a fresh COPY of the default policy (never the shared module constant), so a caller that
 *  mutates it before persisting (a Pariwar cloning-then-editing the default) cannot corrupt the seed
 *  — the `seedRoles()` return-a-copy discipline. Each rule is copied one level deep (`{ ...r }`) —
 *  sufficient today because every `RoutingRuleJson` field is a primitive; if a rule field ever gains
 *  a nested object/array, this copy must become a real deep clone (e.g. `structuredClone`). */
export function defaultRoutingPolicy(): RoutingPolicyDocumentJson {
  return {
    version: DEFAULT_ROUTING_POLICY.version,
    rules: DEFAULT_ROUTING_POLICY.rules.map((r) => ({ ...r })),
  };
}

/** The resolved in-force policy — the version + its document. */
export interface RoutingPolicyInForce {
  version: number;
  document: RoutingPolicyDocumentJson;
  /** `true` when this is the code default (no per-Pariwar override was in force). */
  isDefault: boolean;
}

/**
 * Resolve the routing policy IN FORCE for a Pariwar at instant `at` (AC2/AC3). Returns the Pariwar's
 * latest override with `effective_at <= at`, else the code default. Runs on the caller's (scoped)
 * transaction; RLS isolates to the Pariwar's own override rows.
 */
export async function routingPolicyVersionInForce(
  db: Db,
  pariwarId: PariwarId,
  at: Date,
): Promise<RoutingPolicyInForce> {
  const rows = await db
    .select({ version: helpdeskRoutingPolicyVersions.version, policyDocument: helpdeskRoutingPolicyVersions.policyDocument })
    .from(helpdeskRoutingPolicyVersions)
    .where(and(eq(helpdeskRoutingPolicyVersions.pariwarId, pariwarId), lte(helpdeskRoutingPolicyVersions.effectiveAt, at)))
    .orderBy(desc(helpdeskRoutingPolicyVersions.effectiveAt), desc(helpdeskRoutingPolicyVersions.version))
    .limit(1);

  const row = rows[0];
  if (!row) return { version: DEFAULT_ROUTING_POLICY_VERSION, document: defaultRoutingPolicy(), isDefault: true };
  return { version: row.version, document: row.policyDocument, isDefault: false };
}

/**
 * Reconstruct the exact policy document for a `(pariwarId, version)` — the replay/audit path (AC3
 * audit-replayable). Version {@link DEFAULT_ROUTING_POLICY_VERSION} is ALWAYS the code default;
 * any higher version is the Pariwar's override row. Returns `null` if the override version is absent.
 */
export async function routingPolicyDocumentForVersion(
  db: Db,
  pariwarId: PariwarId,
  version: number,
): Promise<RoutingPolicyDocumentJson | null> {
  if (version === DEFAULT_ROUTING_POLICY_VERSION) return defaultRoutingPolicy();
  const rows = await db
    .select({ policyDocument: helpdeskRoutingPolicyVersions.policyDocument })
    .from(helpdeskRoutingPolicyVersions)
    .where(and(eq(helpdeskRoutingPolicyVersions.pariwarId, pariwarId), eq(helpdeskRoutingPolicyVersions.version, version)))
    .limit(1);
  return rows[0]?.policyDocument ?? null;
}

export interface CreateRoutingPolicyVersionInput {
  pariwarId: PariwarId;
  /** The ordered rule list (the caller-authored document body). Its `version` is OVERWRITTEN with the
   *  authoritative next version so the stored `version` field always matches the row's version. */
  rules: RoutingPolicyDocumentJson['rules'];
  /** The version's effective instant (DB-authoritative point-in-time). Defaults to now(). */
  effectiveAt?: Date;
  /** WHO authored it, or null for system. */
  authoredByActor?: UserId | null;
  /** The audit anchor for the write (the Story 2.4 pre-generate pattern). The audit LINE itself is
   *  the CALLER's obligation (the Story 10.4 admin route) — the narrow-write posture. */
  auditId?: string | null;
  /** Optional caller-supplied row id (defaults to DB gen_random_uuid()). */
  id?: HelpdeskRoutingPolicyVersionId;
}

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505). */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

/**
 * Validate a caller-authored rules document BEFORE it is persisted (review-hardening — a malformed
 * document was previously accepted silently at write time and only surfaced as a generic error
 * during a real member's ticket creation). Checks: non-empty; every rule has a valid category, a
 * non-empty `target_role`, a valid `target_scope_dimension`, positive-integer SLA budgets; and at
 * least one `other`/`sub_category:null` catch-all rule exists (the resolver's own fallthrough
 * requirement). Also rejects any `self`-dimension rule (see {@link RoutingPolicySelfScopeUnsupportedError}).
 *
 * @throws RoutingPolicyDocumentInvalidError | RoutingPolicySelfScopeUnsupportedError
 */
// Keep IN SYNC with `packages/contracts/src/helpdesk/routing.ts`'s `RoutingRule` bounds — a rule
// persisted here that violates the wire schema's `.max()`/`.strict()` would hard-fail the first
// time a ticket routed under it is serialized to a client (the chunk-3 code-review finding this
// closes). `target_role`/`sub_category` max length: 64 (RoutingRule). SLA guard-rails: 720h (30
// days) / 90 business days (NOT product policy — a sanity ceiling against a typo'd absurd value).
const MAX_TARGET_ROLE_LENGTH = 64;
const MAX_SUB_CATEGORY_LENGTH = 64;
const MAX_SLA_FIRST_RESPONSE_HOURS = 720;
const MAX_SLA_RESOLUTION_BUSINESS_DAYS = 90;

function validateRoutingPolicyRules(rules: readonly RoutingRuleJson[]): void {
  const reasons: string[] = [];
  if (rules.length === 0) reasons.push('rules must be non-empty');

  for (const [i, rule] of rules.entries()) {
    if (!(HELPDESK_CATEGORIES as readonly string[]).includes(rule.category)) {
      reasons.push(`rule[${String(i)}].category '${rule.category}' is not a valid helpdesk category`);
    }
    if (rule.sub_category !== null && rule.sub_category.trim().length === 0) {
      reasons.push(`rule[${String(i)}].sub_category must be null or a non-empty string`);
    }
    if (rule.sub_category !== null && rule.sub_category.length > MAX_SUB_CATEGORY_LENGTH) {
      reasons.push(`rule[${String(i)}].sub_category must be at most ${String(MAX_SUB_CATEGORY_LENGTH)} characters`);
    }
    if (rule.target_role.trim().length === 0) {
      reasons.push(`rule[${String(i)}].target_role must be non-empty`);
    }
    if (rule.target_role.length > MAX_TARGET_ROLE_LENGTH) {
      reasons.push(`rule[${String(i)}].target_role must be at most ${String(MAX_TARGET_ROLE_LENGTH)} characters`);
    }
    if (!(SCOPE_DIMENSIONS as readonly string[]).includes(rule.target_scope_dimension)) {
      reasons.push(`rule[${String(i)}].target_scope_dimension '${rule.target_scope_dimension}' is not a valid scope dimension`);
    }
    if (
      !Number.isInteger(rule.sla_first_response_hours) ||
      rule.sla_first_response_hours < 1 ||
      rule.sla_first_response_hours > MAX_SLA_FIRST_RESPONSE_HOURS
    ) {
      reasons.push(`rule[${String(i)}].sla_first_response_hours must be an integer in [1, ${String(MAX_SLA_FIRST_RESPONSE_HOURS)}]`);
    }
    if (
      !Number.isInteger(rule.sla_resolution_business_days) ||
      rule.sla_resolution_business_days < 1 ||
      rule.sla_resolution_business_days > MAX_SLA_RESOLUTION_BUSINESS_DAYS
    ) {
      reasons.push(`rule[${String(i)}].sla_resolution_business_days must be an integer in [1, ${String(MAX_SLA_RESOLUTION_BUSINESS_DAYS)}]`);
    }
  }

  const hasCatchAll = rules.some((r) => r.category === 'other' && r.sub_category === null);
  if (!hasCatchAll) reasons.push("rules must include an 'other' / sub_category:null catch-all rule");

  if (reasons.length > 0) throw new RoutingPolicyDocumentInvalidError(reasons);

  // `self` requires member_scope_context.subject_member_id, which is always null for a
  // helpline_call-created ticket, and every v1 category is reachable via helpline_call — so `self`
  // is never a supported target dimension (decision: reject at write time, not ticket-creation time).
  const selfRule = rules.find((r) => r.target_scope_dimension === 'self');
  if (selfRule) throw new RoutingPolicySelfScopeUnsupportedError(selfRule.category);
}

/**
 * Publish the next routing-policy version for a Pariwar (AC2). Validates the rules document,
 * INSERTs a new version row (`version = max(existing, DEFAULT) + 1`, so a Pariwar's first override
 * is version 2) and points the PRIOR latest override's `superseded_by_version` forward — all in the
 * caller's transaction. NEVER mutates a prior row's `policy_document`/`version` (immutability by
 * construction — the clause_versions posture). Serves BOTH the create-first-override and the amend
 * paths (append-only makes them identical).
 *
 * @throws RoutingPolicyDocumentInvalidError on a malformed rules document.
 * @throws RoutingPolicySelfScopeUnsupportedError on a `self`-dimension rule.
 * @throws RoutingPolicyEffectiveAtOutOfOrderError if `effectiveAt` precedes the Pariwar's latest version.
 * @throws RoutingPolicyVersionConflictError on a racing duplicate `(pariwar_id, version)` (the 409 seam).
 */
export async function createRoutingPolicyVersion(
  db: Db,
  input: CreateRoutingPolicyVersionInput,
): Promise<HelpdeskRoutingPolicyVersionRow> {
  validateRoutingPolicyRules(input.rules);

  // The Pariwar's current latest override version + its effectiveAt (null → none yet). The next
  // version continues past BOTH the default's version and any existing override.
  const priorRows = await db
    .select({
      version: helpdeskRoutingPolicyVersions.version,
      effectiveAt: helpdeskRoutingPolicyVersions.effectiveAt,
    })
    .from(helpdeskRoutingPolicyVersions)
    .where(eq(helpdeskRoutingPolicyVersions.pariwarId, input.pariwarId))
    .orderBy(desc(helpdeskRoutingPolicyVersions.version))
    .limit(1);
  const priorRow = priorRows[0];
  const priorVersion = priorRow?.version ?? null;
  const nextVersion = Math.max(priorVersion ?? 0, DEFAULT_ROUTING_POLICY_VERSION) + 1;

  // DB-authoritative "now" (never the application server's clock, which is subject to skew across
  // instances) — used both as the default `effectiveAt` and as the reference instant for the
  // out-of-order check below.
  const nowResult = await db.execute<{ now: Date }>(sql`select now() as now`);
  const dbNow = nowResult.rows[0]?.now ?? new Date();
  const effectiveAt = input.effectiveAt ?? dbNow;

  // Reject a publish whose effectiveAt precedes the Pariwar's latest existing version — keeps the
  // creation-order supersededByVersion chain always consistent with effectiveAt-based resolution.
  if (priorRow && effectiveAt.getTime() < priorRow.effectiveAt.getTime()) {
    throw new RoutingPolicyEffectiveAtOutOfOrderError(input.pariwarId, effectiveAt, priorRow.effectiveAt);
  }

  const document: RoutingPolicyDocumentJson = { version: nextVersion, rules: input.rules };

  let inserted: HelpdeskRoutingPolicyVersionRow | undefined;
  try {
    const rows = await db
      .insert(helpdeskRoutingPolicyVersions)
      .values({
        id: input.id ?? undefined,
        pariwarId: input.pariwarId,
        version: nextVersion,
        effectiveAt,
        policyDocument: document,
        authoredByActor: input.authoredByActor ?? null,
        auditId: input.auditId ?? null,
      })
      .returning();
    inserted = rows[0];
  } catch (err) {
    if (isUniqueViolation(err)) throw new RoutingPolicyVersionConflictError(input.pariwarId, nextVersion);
    throw err;
  }
  if (!inserted) {
    // Under RLS a missing scope silently filters the INSERT to 0 rows — surface it rather than
    // return a phantom (the addPoolName precedent).
    throw new Error('[createRoutingPolicyVersion] INSERT returned no row — check the tx has app.pariwar_id scope set');
  }

  // Point the prior latest override forward (the ONLY legitimately-mutable column). A Pariwar with no
  // prior override (its first, version 2) has nothing to point — the default is code data, not a row.
  if (priorVersion !== null) {
    await db
      .update(helpdeskRoutingPolicyVersions)
      .set({ supersededByVersion: nextVersion })
      .where(and(eq(helpdeskRoutingPolicyVersions.pariwarId, input.pariwarId), eq(helpdeskRoutingPolicyVersions.version, priorVersion)));
  }

  return inserted;
}

/** The amend path is the SAME append-a-version operation as create (append-only versioning makes them
 *  identical — the first override and every subsequent one both INSERT `next` + point the prior). Named
 *  separately for call-site intent (the Story 10.4 admin edit surface). */
export const amendRoutingPolicyVersion = createRoutingPolicyVersion;

/** Count a Pariwar's override versions (test/diagnostic helper; asserts membership, not counts, in
 *  own-committing suites — [[project_live_db_test_gotchas]]). */
export async function countRoutingPolicyVersions(db: Db, pariwarId: PariwarId): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(helpdeskRoutingPolicyVersions)
    .where(eq(helpdeskRoutingPolicyVersions.pariwarId, pariwarId));
  return rows[0]?.n ?? 0;
}
