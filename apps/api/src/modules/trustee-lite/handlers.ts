// Trustee-Lite aggregate handler — Story 10.11 (Task 4; AC1/AC6/AC8).
//
// ONE read-only GET that composes six already-shipped source reads inside ONE scope tx, filters the
// sections against the caller's ACTUAL grants, and maps the result through the pure
// `@twt/domain` `trusteeLite` normalizer. This module writes nothing, elevates nothing, and decrypts
// nothing.
//
// ── FR-42's "one indexed query; no N+1" does NOT bind this surface (D10) ──────────────────────
// `epics.md:92` attaches that constraint to the FR-42 per-member SIGNALS PANEL — the compound read
// model shipped at Story 4.7. FR-57's Trustee-Lite LIST is a different surface. Six bounded,
// already-`clampLimit`ed reads over six unrelated subsystems is O(1) queries, not an N+1; a reviewer
// applying FR-42's phrasing literally would be demanding a single impossible join. Recorded once
// here and once in `packages/domain/src/trustee-lite/types.ts` so it is not re-litigated.
//
// ── Per-section authorization, at the handler and not in a preHandler (AC6, D4) ───────────────
// Six sources, six DIFFERENT permission keys. A static `requirePermissionHook` cannot express that —
// the key is per SECTION, so the check is here, over grants resolved ONCE. This is the Story 10.7
// `resolveActorReportScope` dynamic-key precedent (`reports/handlers.ts:100-108`), applied with the
// pure `rbac.hasPermission` predicate. NO new permission key is minted and
// `PERMISSION_CATALOG_VERSION` stays 28: an aggregator that grants nothing new must not bump the
// catalog, and minting `trustee.dashboard` would replay the district-ceiling deferral for a seventh
// time.
//
// A section the caller lacks is ABSENT from the response, not present-and-empty (an empty array is an
// existence oracle), and a caller holding NONE of the keys gets a structured 403 rather than a 200
// with an empty body.
//
// ── ⚠ Two of the six keys are DISTRICT-dimension, and are therefore effectively narrowed here ──
// `claim.verify` (the concealment section) and `claim.appeal_review` (Stage-1 appeals) are checked
// everywhere else at `dimension: 'district'` against a SERVER-DERIVED per-claim posting district
// (`claims.verifier-console.routes.ts:78-81`, `claims.appeal.routes.ts:99`). A Pariwar-WIDE
// aggregator has no single district to check against, and deriving one per row would be the exact
// N+1 this surface exists to avoid.
//
// So every section is checked at `dimension: 'pariwar'`, which is FAIL-CLOSED and honest but narrows
// two sections: `district_admin` and `verifier` hold those two keys at a `district` scopeCeiling, and
// a district-ceiling grant can never satisfy a pariwar-dimension check ([[project_rbac_geo_scope_containment]]
// — containment is asymmetric; a narrower grant never satisfies a broader one). Consequences, stated
// plainly rather than discovered later:
//   · `concealment` resolves for `super_admin` only, until the Epic-3 geo-tree resolver lands.
//   · `appeal` is UNAFFECTED in practice — AC6 checks `claim.appeal_review` OR `claim.appeal_vote`,
//     and `claim.appeal_vote` is genuinely pariwar-dimension and held by `pariwar_admin`.
// This is the SEVENTH replay of the district-ceiling deferral (10.3 and 10.4 each recorded their own)
// and it is a deferral, not a defect: the section is omitted, never silently emptied, so no caller is
// told "there is nothing here" when the truth is "you cannot see this".

import type { TrusteeLiteResponse, TrusteeSignalRow, ViolatorFlagsSection } from '@twt/contracts';
import {
  AuthorizationDeniedError,
  claim as claimDomain,
  cycleCalendar,
  ids,
  member as memberDomain,
  rbac,
  reconciliation,
  trusteeLite,
} from '@twt/domain';
import { scanR7ViolatorCandidates } from '@twt/validity-service';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';

/** The six section keys (AC6). No new key is minted — every one is an already-catalogued key. */
export const TRUSTEE_LITE_SECTION_KEYS = {
  CYCLE_FREEZE: 'cycle.freeze',
  R9_VOTING: 'claim.r9_vote',
  /** Concealment is adjudicated on the verifier surface, so it rides the verifier READ key. */
  CONCEALMENT: 'claim.verify',
  APPEAL_REVIEW: 'claim.appeal_review',
  APPEAL_VOTE: 'claim.appeal_vote',
  /** Stage-3 Trustee decider — the third of the three appeal keys (`claims.appeal.routes.ts:57`). */
  APPEAL_FINAL: 'claim.appeal_final',
  RECONCILIATION: 'reconciliation.review',
  /** Moderation AND the R7 violator arm — the flags exist to inform a moderation decision. */
  MODERATION: 'member.moderate',
} as const;

/** All six section keys, for the zero-grant denial below — ANY one admits at least one section. */
const ALL_TRUSTEE_LITE_SECTION_KEYS = Object.values(TRUSTEE_LITE_SECTION_KEYS);

/** Map a domain row to the wire shape (camelCase → snake_case at the boundary, never in the domain). */
function toWireRow(row: trusteeLite.TrusteeSignalRow): TrusteeSignalRow {
  return {
    category: row.category,
    source_key: row.sourceKey,
    resource_id: row.resourceId,
    claim_case_id: row.claimCaseId,
    label: row.label,
    age_ms: row.ageMs,
    raised_at: row.raisedAt ? row.raisedAt.toISOString() : null,
    deadline_at: row.deadlineAt ? row.deadlineAt.toISOString() : null,
    severity: row.severity,
    cross_link_kind: row.crossLinkKind,
  };
}

/**
 * Map the domain violator section to the wire shape. The snake_case mapping lives HERE, at the
 * contract boundary — never in the domain ([[project_story_validate_footguns]]) — and it enumerates
 * the FROZEN key set explicitly rather than spreading, so adding a field to the domain flag can never
 * silently widen the wire contract past what the AC4 frozen-key test permits.
 */
function toWireViolatorSection(section: trusteeLite.ViolatorFlagsSection): ViolatorFlagsSection {
  if (section.status === 'detection_unavailable') {
    return { status: 'detection_unavailable', producer: section.producer };
  }
  return {
    status: 'ok',
    members: section.members.map((member) => ({
      member_id: member.memberId,
      flags: member.flags.map((flag) => ({
        clause_id: flag.clauseId,
        clause_label: flag.clauseLabel,
        facts_establishing: flag.factsEstablishing.map((fact) => ({ key: fact.key, value: fact.value })),
        holding_since: flag.holdingSince,
      })),
    })),
  };
}

export function createTrusteeLiteHandlers(deps: AppDeps) {
  return {
    /**
     * GET the Trustee-Lite aggregate (AC1/AC6/AC8). Read-only, audited, decryption-free.
     */
    async getTrusteeLite(request: FastifyRequest): Promise<TrusteeLiteResponse> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      if (!scopeTx || !actorId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const now = deps.clock();

      // Grants resolved ONCE (the 10.7 precedent), then each section's key evaluated with the pure
      // fail-closed predicate. `resource` is the tenant itself — see the district-dimension note above.
      const grants = request.scopeGrants ?? [];
      const resource = { dimension: 'pariwar' as const, value: scopeTx.pariwarId, pariwarId: scopeTx.pariwarId };
      const may = (key: string): boolean => rbac.hasPermission(grants, key, resource);

      const mayCycleFreeze = may(TRUSTEE_LITE_SECTION_KEYS.CYCLE_FREEZE);
      const mayR9 = may(TRUSTEE_LITE_SECTION_KEYS.R9_VOTING);
      const mayConcealment = may(TRUSTEE_LITE_SECTION_KEYS.CONCEALMENT);
      // AC6 — ANY of the three appeal keys admits the section (Stage-1 reviewer, Stage-2 panel voter,
      // or Stage-3 Trustee decider). Mirrors the `claims.appeal.routes.ts` `requireAnyAppealAccess`
      // precedent (review finding, 2026-08-05): appeal case visibility is cross-stage by design, so a
      // reviewer on any one stage can see a case's full journey — this list is the Pariwar-wide analog
      // of that same single-case read.
      const mayAppeal =
        may(TRUSTEE_LITE_SECTION_KEYS.APPEAL_REVIEW) ||
        may(TRUSTEE_LITE_SECTION_KEYS.APPEAL_VOTE) ||
        may(TRUSTEE_LITE_SECTION_KEYS.APPEAL_FINAL);
      const mayReconciliation = may(TRUSTEE_LITE_SECTION_KEYS.RECONCILIATION);
      const mayModeration = may(TRUSTEE_LITE_SECTION_KEYS.MODERATION);

      const permitted = [mayCycleFreeze, mayR9, mayConcealment, mayAppeal, mayReconciliation, mayModeration];
      if (!permitted.some(Boolean)) {
        // Zero sections → a structured 403 (AC6). NOT a 200 with an empty body: "you may see nothing"
        // and "there is nothing to see" are different answers and must not render the same.
        //
        // `permissionKey` names ALL SEVEN candidate keys (review finding, 2026-08-05) rather than
        // hardcoding one arbitrarily — this is a composite OR-of-seven denial, and pinning it to
        // `cycle.freeze` would mislead any log/audit consumer reading the key off this error into
        // believing that was the actor's actual missing permission.
        throw new AuthorizationDeniedError({
          actorId,
          permissionKey: ALL_TRUSTEE_LITE_SECTION_KEYS.join(' | '),
          requiredScope: 'pariwar',
          targetLocator: { dimension: 'pariwar', value: scopeTx.pariwarId },
        });
      }

      // ── The six reads, at most ONE per source, all inside the request's single scope tx ──
      // `cycle_freeze` and `concealment` share ONE `getCycleFreezePending` call — concealment is a
      // FILTER over its `concealmentFlags`, not a query (D6). The read runs if EITHER section is
      // permitted, and its result is fed to whichever of the two the caller may see.
      const needCycleFreezeRead = mayCycleFreeze || mayConcealment;
      const cycleFreeze = needCycleFreezeRead
        ? await claimDomain.getCycleFreezePending(scopeTx.tx, pariwarId)
        : undefined;

      const r9Voting = mayR9 ? await claimDomain.getR9VotingQueue(scopeTx.tx, pariwarId) : undefined;

      const appeal = mayAppeal
        ? await claimDomain.listOpenAppealCasesForPariwar(scopeTx.tx, pariwarId)
        : undefined;

      // The reconciliation deadline is calendar-aware, so its holiday windows are read alongside it
      // (the 9.8 handler's own contract — `listOpenReconciliationCases` treats an absent list as a
      // plain tail, which would silently shift every deadline).
      let reconciliationRows: reconciliation.ReconciliationCaseRow[] | undefined;
      if (mayReconciliation) {
        const holidayWindows = await cycleCalendar.listHolidayWindows(scopeTx.tx, pariwarId, {});
        const result = await reconciliation.listOpenReconciliationCases(scopeTx.tx, {
          pariwarId,
          now,
          holidayWindows,
        });
        reconciliationRows = result.rows;
      }

      const moderation = mayModeration
        ? await memberDomain.moderation.listModeratedMembersForPariwar(scopeTx.tx, pariwarId)
        : undefined;

      // ── Normalize + order (pure, clock injected) ──────────────────────────────────────────
      const sections = trusteeLite.normalizeTrusteeSignals(
        {
          ...(mayCycleFreeze && cycleFreeze ? { cycleFreeze } : {}),
          ...(mayConcealment && cycleFreeze ? { concealment: cycleFreeze } : {}),
          ...(r9Voting !== undefined ? { r9Voting } : {}),
          ...(appeal !== undefined ? { appeal } : {}),
          ...(reconciliationRows !== undefined ? { reconciliation: reconciliationRows } : {}),
          ...(moderation !== undefined ? { moderation } : {}),
        },
        now,
      );

      // ── The R7 violator arm (AC4, D1-B) — THE 10.24 SEAM, FLIPPED ─────────────────────────
      // Gated on `member.moderate` — the flags exist to inform a moderation decision, and a caller
      // who cannot moderate has no business reading a list of suspension candidates.
      //
      // Story 10.11 shipped this call site as `{ status: 'unavailable', producer }` and NAMED it as
      // the one line that would change when the contribution-fact producer landed. Story 10.24 built
      // that producer, and this is that change — the whole change. It held:
      // `packages/domain/src/trustee-lite/violator-flags.ts` is BYTE-UNCHANGED below its header
      // comment. 10.11's claim that the seam was producer-shaped rather than story-shaped was correct.
      //
      // `scanR7ViolatorCandidates` is BOUNDED over the Pariwar — a fixed 7 queries regardless of
      // member count, then a pure per-member ladder evaluation (AC7's binding structural criterion:
      // no query inside a loop over members, pools or clauses). It contributes APPLIED clauses ONLY
      // (D2): `deriveViolatorFlags` flags every R7 id it finds with no `applied` check, so a
      // non-applied clause reaching the payload would flag every member in the Pariwar.
      //
      // Passing an empty candidate list would still be WRONG (it renders as "detection ran, nobody is
      // flagged" — the false all-clear D1-B forbids); the honest degradations remain the sentinel
      // arms, which `summarizeViolatorFlags` derives from the candidates' own payloads.
      // The scan reports its OWN discriminant: `available` with candidates, or `unavailable` when the
      // Pariwar's Niyamavali registry has no R7 clause effective at `now`. Passing a blanket
      // `{ status: 'available' }` here is what previously turned an unprovisioned registry into the
      // false all-clear this block warns about — the handler asserted the invariant while the call
      // site broke it (⚖ 2026-08-05: unknown rules and unknown facts are the same constitutional state).
      const violatorFlags = mayModeration
        ? trusteeLite.summarizeViolatorFlags(await scanR7ViolatorCandidates(scopeTx.tx, pariwarId, now))
        : undefined;

      const response: TrusteeLiteResponse = {
        evaluated_at: now.toISOString(),
        ...(sections.cycle_freeze !== undefined ? { cycle_freeze: sections.cycle_freeze.map(toWireRow) } : {}),
        ...(sections.r9_voting !== undefined ? { r9_voting: sections.r9_voting.map(toWireRow) } : {}),
        ...(sections.concealment !== undefined ? { concealment: sections.concealment.map(toWireRow) } : {}),
        ...(sections.appeal !== undefined ? { appeal: sections.appeal.map(toWireRow) } : {}),
        ...(sections.reconciliation !== undefined
          ? { reconciliation: sections.reconciliation.map(toWireRow) }
          : {}),
        ...(sections.moderation !== undefined ? { moderation: sections.moderation.map(toWireRow) } : {}),
        ...(violatorFlags !== undefined ? { violator_flags: toWireViolatorSection(violatorFlags) } : {}),
      };

      // Audited read (the 6.10 audited-read precedent). NON-PII: which sections resolved and how many
      // rows each carried — never a row's label, never a member id.
      emitAuthAudit(deps, request, 'admin_trustee_lite.read', {
        actorId,
        pariwarId,
        context: {
          sections: Object.keys(sections).sort().join(','),
          row_count: Object.values(sections).reduce((sum, rows) => sum + rows.length, 0),
          violator_detection: violatorFlags?.status ?? 'not_permitted',
        },
      });

      return response;
    },
  };
}
