// The nominee NAME-CHECK LIST READER — Story 6.18 (AC8). Transport-free.
//
// ⭐⭐ WHY THIS IS ITS OWN MODULE, AND ⛔ NOT PART OF `nominee-name-check.ts`: AN IMPORT CYCLE.
// `claim/events.ts` imports the two VOCABULARY TUPLES from `nominee-name-check.ts` and uses them at
// MODULE-EVALUATION time (`z.enum(NOMINEE_NAME_CHECK_VERDICTS)` inside a top-level `export const`).
// This reader needs `ClaimNomineeNameCheckedPayloadSchema` from `events.ts` to PARSE a stored check.
// Putting both in one file closed the loop, and under ESM the tuples were still in their temporal
// dead zone when `events.ts` evaluated:
//     ReferenceError: Cannot access 'NOMINEE_NAME_CHECK_VERDICTS' before initialization
// ⚠⚠ `tsc --noEmit` PASSED CLEAN on that cycle — it was found only by importing the module for
// real ([[project_type_only_import_cycle_trap]]). The split keeps the dependency one-way:
//     events.ts → nominee-name-check.ts      (tuples, module-eval)
//     THIS FILE → both                       (schema + predicates, function-body only)
// ⛔ Never move these functions back, and ⛔ never let `nominee-name-check.ts` import `events.ts`.
//
// ⛔⛔ TRAP 1 AND TRAP 4 APPLY HERE UNCHANGED: this file compares no names, decrypts nothing, and
// returns ranks, timestamps, verdicts and reason codes only.

import { and, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { claimNomineeBankAccounts } from '../schema/claim_nominee_bank_accounts.js';
import { ClaimNomineeNameCheckedPayloadSchema } from './events.js';
import { getEffectiveNomineeDeclarationBulk } from './nominee-effective.js';
import {
  type LiveAccountRef,
  type NomineeNameClericalReason,
  type RecordedNomineeNameCheck,
  isNomineeNameCheckCurrent,
  latestCheckSendsBack,
  nomineeNameCheckClericalReasons,
  nomineeNameCheckPasses,
} from './nominee-name-check.js';

/** The non-PII name-check flags ONE list card needs (AC8). ⛔ No name, ⛔ no note, ⛔ no token. */
export interface NomineeNameCheckFlags {
  /** Exactly two live accounts — `-226` cl.7. */
  readonly accountsComplete: boolean;
  /** The AC4 approval precondition: a check that is CURRENT **and** PASSING. */
  readonly currentAndPassing: boolean;
  /** AC8's highlight — non-empty ONLY when `currentAndPassing`. Codes only, ⛔ never a name. */
  readonly differenceReasons: readonly NomineeNameClericalReason[];
  /** The District Admin's half of "under correction": a CURRENT check carrying a `does_not_match`. */
  readonly checkSendsBack: boolean;
  /** The live accounts, for a caller that must also order a correction against a return's timestamp. */
  readonly liveAccounts: readonly LiveAccountRef[];
  /**
   * Story 6.20 (AC5, D15) — does the claim have an EFFECTIVE as-at-death declaration (a live District
   * Admin determination with somebody standing)? `false` means approval WAITS for a determination, so a
   * list card can say so instead of implying the name check is the only thing outstanding.
   */
  readonly declarationEffective: boolean;
}

/**
 * The AC8 flags for MANY claims in THREE queries — ⭐ the ONE implementation every list surface uses.
 *
 * ⚠⚠ IT EXISTS BECAUSE THE FIRST TWO ATTEMPTS AT THIS GOT IT WRONG IN DIFFERENT WAYS (code review
 * 2026-09-20). AC8 says *"a claim whose CURRENT PASSING check has any clerical_difference"*, and the
 * cycle-freeze pending read applied NEITHER qualifier while the verifier console applied only the
 * first. Two surfaces, two answers, one ruling. A third surface (R9) was about to need the same
 * thing. So the derivation lives here once, and a list page calls it.
 *
 * ⛔ NO N+1: one query for the accounts, one for the EFFECTIVE declarations (Story 6.20 — the bulk
 * accessor), one `DISTINCT ON` for the latest check per claim — each independent of the number of
 * claims' ROWS.
 * ⛔ IT DECRYPTS NOTHING and returns no token: ranks, timestamps, verdicts and reason codes only.
 */
export async function readNomineeNameCheckFlagsBulk(
  db: Db,
  pariwarId: PariwarId,
  claimRefs: readonly { readonly claimCaseId: ClaimId; readonly deceasedMemberId: MemberId }[],
): Promise<Map<string, NomineeNameCheckFlags>> {
  const byClaim = new Map<string, NomineeNameCheckFlags>();
  if (claimRefs.length === 0) return byClaim;

  const claimCaseIds = claimRefs.map((r) => r.claimCaseId);

  const accountRows = await db
    .select({
      claimCaseId: claimNomineeBankAccounts.claimCaseId,
      accountRank: claimNomineeBankAccounts.accountRank,
      updatedAt: claimNomineeBankAccounts.updatedAt,
    })
    .from(claimNomineeBankAccounts)
    .where(
      and(
        eq(claimNomineeBankAccounts.pariwarId, pariwarId),
        inArray(claimNomineeBankAccounts.claimCaseId, [...claimCaseIds]),
      ),
    );
  const accountsByClaim = new Map<string, LiveAccountRef[]>();
  for (const r of accountRows) {
    const list = accountsByClaim.get(r.claimCaseId) ?? [];
    list.push({ accountRank: r.accountRank, updatedAt: r.updatedAt });
    accountsByClaim.set(r.claimCaseId, list);
  }

  // ⭐ Story 6.20 (AC5, site F) — the EFFECTIVE declarations, in the BULK form: ONE query for the whole
  // list, ⛔ never the per-claim accessor in a loop. This serves the District Admin's correction queue AND
  // the State Trustee's cycle-freeze pending list — the highest-stakes screen — so its currency flag must
  // be derived from the declaration in force at the death, ⛔ not from the current rows (`-236`
  // consequence 4).
  const effectiveByClaim = await getEffectiveNomineeDeclarationBulk(db, pariwarId, claimCaseIds);

  // ⚠ `DISTINCT ON` requires the leading ORDER BY term to match the DISTINCT ON expression or PG
  // raises 42P10 ([[project_contribution_fact_projection_substrate]]).
  const checkRows = await db.execute<{
    stream_id: string;
    payload: unknown;
    occurred_at: Date;
    event_version: number;
  }>(sql`
    SELECT DISTINCT ON (stream_id) stream_id, payload, occurred_at, event_version
      FROM events_log
     WHERE pariwar_id = ${pariwarId}
       AND event_type = 'claim.nominee_name_checked'
       AND stream_id IN (${sql.join(claimCaseIds.map((id) => sql`${id}`), sql`, `)})
     ORDER BY stream_id, event_version DESC
  `);
  const latestByClaim = new Map<string, RecordedNomineeNameCheck>();
  for (const row of checkRows.rows ?? []) {
    // ⚠ PARSED, ⛔ not `as`-cast — a row that does not match must be skipped loudly-in-shape rather
    // than yielding `undefined`s that read downstream as "no difference recorded".
    const parsed = ClaimNomineeNameCheckedPayloadSchema.safeParse(row.payload);
    if (!parsed.success) continue;
    latestByClaim.set(row.stream_id, {
      checkedAt: row.occurred_at,
      checkedByActorDisplay: parsed.data.checked_by_actor_display,
      nomineeDeclarationToken: parsed.data.nominee_declaration_token,
      accounts: parsed.data.accounts.map((a) => ({
        accountRank: a.account_rank,
        accountUpdatedAt: a.account_updated_at,
        verdict: a.verdict,
        clericalReason: a.clerical_reason,
      })),
      eventVersion: row.event_version,
    });
  }

  for (const ref of claimRefs) {
    const liveAccounts = accountsByClaim.get(ref.claimCaseId) ?? [];
    const check = latestByClaim.get(ref.claimCaseId) ?? null;
    const effective = effectiveByClaim.get(ref.claimCaseId);
    // A claim the bulk read could not see (another Pariwar, or gone) can ⛔ never be current.
    const liveToken = effective?.token ?? '';
    const current = check !== null && isNomineeNameCheckCurrent(check, liveAccounts, liveToken);
    const passing = check !== null && nomineeNameCheckPasses(check);
    const currentAndPassing = current && passing;

    byClaim.set(ref.claimCaseId, {
      accountsComplete: liveAccounts.length === 2,
      currentAndPassing,
      differenceReasons: currentAndPassing && check !== null ? nomineeNameCheckClericalReasons(check) : [],
      checkSendsBack: latestCheckSendsBack(check, current),
      liveAccounts,
      declarationEffective: effective?.status === 'effective',
    });
  }
  return byClaim;
}
