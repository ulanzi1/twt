// The PUBLIC SAHYOG DRIVE pool index read — Story 11b.1 (Task 1; AC1, AC2, AC4).
//
// One bounded page of the unauthenticated Sahyog Drive, resolved in ONE query: the pool's
// public identity, its district, its close/settle instant, its CONFIRMED contribution count,
// its Pool-Reality-#2 outcome, and — for the deceased member the drive is FOR — the KYC name
// CIPHERTEXT AS STORED plus the per-subject consent VERDICT.
//
// ── ⛔ THIS MODULE DECIDES A RENDER, NEVER A BENEFIT ─────────────────────────────────
// Copied verbatim in posture from `member/directory-read.ts`, because the hazard is identical.
// It reads `pools.current_state` and a per-Pariwar publication flag — both of which ALSO feed
// operational paths — but ONLY to decide whether a row appears on a web page. ⛔ No `is_valid`,
// no `is_assignable`, no eligibility, pool-assignment, validity or peer-mesh predicate is
// written, conjoined or consulted here, and a diff in which a drive-listing predicate reaches an
// eligibility path must be rejected in review (the Story 10.10 shape,
// [[project_moderation_model_correct_course]]).
//
// ── TRANSPORT-FREE, AUDIT-FREE, AND ⛔ DECRYPT-FREE BY RULE ──────────────────────────
// ⛔ NO HTTP, ⛔ no audit, ⛔ no decryption, ⛔ no permission check, ⛔ no presentation policy.
// This module returns `name_ciphertext` exactly as `member_kyc_profiles` stores it. The decrypt
// is `apps/api/src/modules/public-pages/`'s work and NOWHERE else: `apps/public` provably holds
// no KMS material (`no-kms-in-public.test.ts` scans the whole app), so if that handler does not
// decrypt, NOTHING does (`2026-08-20-143` cl.1).
//
// ── ⛔ THE CLAIM'S SUBJECT COMES FROM THE CLAIM, ⛔ NEVER FROM A LIFECYCLE STATE ─────
// ⭐ THE POOL→CLAIM LINK *IS* THE SUBJECT FACT: `pools.claim_case_id` → `claims.deceased_member_id`.
// ⛔ NO predicate in this module may try to re-derive that subject from `members.state`, and it does
// ⛔ not need to. `MEMBER_LIFECYCLE_STATES` carries no label for it at all — the condition is an
// OVERLAY, ⛔ never a lifecycle label — so a predicate reading `members.state` is blind to it BY
// CONSTRUCTION and cannot be fixed by widening a tuple. ⚠ The memory note recording that is cited
// by its slug in `member/overlay.ts` and `member/directory-read.ts`, ⛔ deliberately not repeated
// here: the slug itself contains a category-specific token, and the gate below scans this file for
// exactly that. ⭐ The gate being blunt about slugs is a fair price for it being blunt about code.
// ⭐ AND NOTE THE FAILURE MODE HERE IS THE **INVERSE** OF STORY 11a.3'S, which is why the C-5
// correction must ⛔ NOT be pasted in: 11a.3 wrongly PUBLISHED a member it should have omitted, so
// it needed the `account-frozen` overlay conjunct ADDED. This index would wrongly **OMIT** the very
// people it exists to commemorate. ⛔ Do not add that conjunct here.
//
// ⚠ ⛔ AND THIS MODULE IS CATEGORY-AGNOSTIC, deliberately: it joins pool → claim and reads the
// claim's subject, which holds for EVERY `support_category`. ⛔ There is no branch on
// `support_category` here and there must never be one — v2 `_daan` activation is a config change,
// ⛔ not an engine refactor (Story 7.1 AC4). ⭐ The `pool-support-category-invariant` gate enforces
// exactly that, and it scans COMMENTS too on the stated ground that a pool-engine comment thinking
// in category-specific terms is itself the smell. ⛔ Do not reintroduce that framing here.
//
// ── ⭐ ONE SET-BASED QUERY, ⛔ NEVER A PER-ROW FAN-OUT (D7(a)) ───────────────────────
// Two separate doors lead to the same AR-65 N+1 here, and BOTH are shut in this module:
//   1. `listConfirmedContributorsForPool` scans `events_log` and reconciles the event-id chain
//      in JS, PER POOL. Calling it for 25 rows is 25 scans — the N+1 Story 10.11 paid
//      44s → 220s for. ⇒ the count is a LATERAL AGGREGATE below.
//   2. ⭐ `consentExists` is ONE `LIMIT 1` QUERY PER SUBJECT. Calling it per rendered pool is 50
//      round-trips for one page — the IDENTICAL N+1, arriving through a different door. ⇒ the
//      verdict is a correlated EXISTS below, resolved for the whole page in the same query.
//      ⚠⛔ AND SINCE STORY 11b.9 THAT VERDICT IS A **TWO-JOIN** SUBQUERY
//      (`consent_records` → `terms_and_conditions_pinned_clauses` → `clause_versions`), so the
//      temptation to hoist it into JS is STRONGER, not weaker. ⛔ Resist it: the door is the same
//      door. See {@link NAME_PUBLICATION_AUTHORISED}.
// ⚠ ONE injected `now` feeds every time-bounded fragment AND the count accessor, so the page and
// its total can never disagree about the instant they describe.
//
// ⚠ Literal outer-table qualifiers in every correlated subquery
// ([[project_epic6_drizzle_correlated_subquery_bug]]): interpolating an outer `Column` into a
// subquery whose own FROM has a column of that name collapses the correlation into a tautology,
// and every DB-free test stays green while it does.

import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { classifyCycleOutcome, type CycleFundingOutcome } from '../close-of-cycle/framing.js';
import type { Db } from '../db.js';
import { type ClauseId, type MemberId, type PariwarId, type PoolId, clauseId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { poolIndexFromLetterCodeOrNull } from './naming.js';
import { claims } from '../schema/claims.js';
import { memberKycProfiles } from '../schema/member_kyc_profiles.js';
import { memberPostings } from '../schema/member_postings.js';
import { memberPoolAssignments } from '../schema/member_pool_assignments.js';
import { pools } from '../schema/pools.js';

/**
 * ⭐ THE LISTING PREDICATE, HALF ONE — which pool states appear publicly.
 *
 * ⚠⛔ **CORRECTED 2026-09-04 (`#decision-2026-09-04-192`) — THIS GLOSS WAS WRONG, AND IT MISLED A
 * REVIEW.** It read: *"`closed` → **Active** (the collection window has shut; **the family is not yet
 * paid**). `settled` → **Archive** (**disbursed**; terminal)."* ⛔ Both halves describe a
 * DISBURSEMENT the trust ⛔ never performs.
 * ⭐⭐ **THE MONEY NEVER TOUCHES THE TRUST.** `upi-intent.ts` builds the payment SERVER-SIDE with the
 * **nominee's own VPA as the payee** — member → nominee, DIRECTLY. The two accounts exist only
 * because one cannot receive contributions from the whole roster under per-account limits
 * ([[project_nominee_bank_disbursement_channel]]). ⇒ there is ⛔ no trust-held pot, ⛔ no payout
 * engine (9.9), and the family is being paid **THROUGHOUT the drive**, ⛔ not at the end of it. By the
 * time the window shuts they already hold essentially all of it.
 * ⇒ the states mean:
 * `closed`  → **Closed**   (the contribution window has shut; contributions are still being verified).
 * `settled` → **Verified** (every contribution reconciled against bank records — ⛔ NOT "paid").
 * ⚠⛔ **AND `settled` HAS ⛔ NO PRODUCER IN PRODUCTION** — see `DRIVE_MASKING_FROM`'s rider below.
 * ⇒ it is ⛔ excluded from the public index until settlement ships (`-192` cl.2).
 *
 * ⛔ `spawned` and `live` are ABSENT deliberately: a drive still collecting is not a
 * transparency record, it is an open solicitation, and publishing it would invite exactly the
 * "who has given so far" reading this surface exists to refuse. ⛔ Widening this tuple is a
 * ruling change, not a tuning knob.
 */
export const SAHYOG_DRIVE_VISIBLE_POOL_STATES = ['closed', 'settled'] as const;
export type SahyogDriveVisiblePoolState = (typeof SAHYOG_DRIVE_VISIBLE_POOL_STATES)[number];

/**
 * The two-label PUBLIC vocabulary. ⛔ THE WIRE TOKEN IS NEVER THE INTERNAL ONE — `2026-08-21-144`
 * cl.8 records `/members` having leaked the internal `lock-in` value onto a public JSON route,
 * and this surface is built not to repeat it.
 */
export const SAHYOG_DRIVE_STATUSES = ['active', 'archive'] as const;
export type SahyogDriveStatus = (typeof SAHYOG_DRIVE_STATUSES)[number];

const PUBLIC_STATUS_BY_POOL_STATE: Record<SahyogDriveVisiblePoolState, SahyogDriveStatus> = {
  closed: 'active',
  settled: 'archive',
};

/** The event types whose `occurred_at` IS the drive's close/settle instant. */
const POOL_CLOSED_EVENT_TYPE = 'pool.closed' as const;
const POOL_SETTLED_EVENT_TYPE = 'pool.settled' as const;

/**
 * Canonical financial truth ([[project_contribution_event_name_contract]]).
 * ⚠ The reversal is `reconciliation.*`, deliberately OFF the 8.10 `contribution.*` fence —
 * ⛔ do not try to select both by prefix, and ⛔ do not filter reversals out by one.
 */
const CONFIRMED_EVENT_TYPE = 'contribution.confirmed' as const;
const CONFIRMATION_REVERSED_EVENT_TYPE = 'reconciliation.confirmation-reversed' as const;
const CONFIRMED_PAYLOAD_POOL_KEY = 'poolId' as const;
const REVERSED_CONFIRMED_EVENT_ID_KEY = 'reversedConfirmedEventId' as const;

/**
 * ⛔⛔ RETIRED AS AN AUTHORITY, ⛔ PRESERVED AS A RECORD — Story 11b.9 (AC9), `2026-08-28-160` cl.5.
 *
 * This is the consent type Story 11b.1 shipped as the per-subject publication gate (AC12 / D4(b)).
 * `2026-08-28-160` **de-authorised** it: the basis for publishing a deceased member's name is the
 * member's OWN accepted versioned T&C, ⛔ never a tick-box the family ticked at claim time. The live
 * predicate is {@link NAME_PUBLICATION_AUTHORISED}; this constant is ⛔ NOT consulted by it.
 *
 * ⛔⛔ AND IT IS ⛔ NOT DEAD CODE — ⛔ DO NOT DELETE IT. `-160` cl.5 preserves the `consent_type`
 * value, migration `0112`, and every existing `consent_records` row **explicitly**. Since 11b.9 the
 * type is **write-never** (Story 11b.9 Task 4 removed the claim-screen box that wrote it) and
 * **read-never** (this module stopped reading it), which is exactly what makes it LOOK deletable.
 * ⛔ Deleting it requires a SEPARATE trustee decision finding it has no remaining purpose — the rows
 * stay actionable (both revoke routes and the GET presence view survive, story D7(a)).
 *
 * ⚠ Kept exported because tests assert the value still exists — the guard against a future
 * "cleanup" ([[feedback_supersede_never_reinterpret]]).
 */
export const SAHYOG_DRIVE_CONSENT_TYPE = 'sahyog_drive_publication' as const;

/**
 * ⭐ THE LIVE BASIS — the member's own T&C acceptance (Story 3.6a's write path, `tc_acceptance`).
 *
 * `apps/api/src/modules/terms/member-terms.handlers.ts:153` writes this row with the SERVER-resolved
 * `tcVersionId` in `consent_artifact_ref`, and `member/lock-in-gate.ts` already makes it a signup
 * lock-in requirement — so this is existing, load-bearing substrate, ⛔ not a new one.
 */
export const TC_ACCEPTANCE_CONSENT_TYPE = 'tc_acceptance' as const;

/**
 * ⭐⭐ THE POSTHUMOUS PUBLICATION CLAUSE — the single place this literal may appear.
 *
 * ⚠ Worded WITHOUT the category noun on purpose: the `pool-support-category-invariant` gate scans
 * this module's COMMENTS too, on the stated ground that a pool-engine comment thinking in
 * category-specific terms is itself the smell. ⛔ This module is category-agnostic (Story 7.1 AC4).
 *
 * The stable `clause_id` of the Niyamavali clause carrying T&C clause 14 *"Public Disclosure of
 * Member Information"*, which the accepted T&C version must PIN for a deceased member's name to
 * render (Story 11b.9 AC1/AC2(d); D6(a), `.decision-log.md#decision-2026-08-28-161`).
 *
 * ⛔⛔ A `clause_id`, ⛔ NEVER A `clause_version_id` — and the distinction is load-bearing (T3).
 * `clause_versions.clause_id` is the STABLE slug that survives amendment; `clause_version_id` is the
 * per-amendment uuid. The disclosure clause is rulebook content and WILL be amended, so pinning the
 * predicate to a single `clause_version_id` would make the FIRST amendment silently un-publish every
 * name in the system, with ⛔ no error and ⛔ no failing test. Resolving through `clause_id` means
 * ANY version of the clause satisfies the basis.
 *
 * ⚠⛔ PROVISIONAL VALUE (story D3). Counsel's FINAL clause text — the v0.2 draft is still in the
 * Annex round — decides this literal. ⭐ That is why it is a single exported constant and why ⛔ no
 * inline string may appear in the predicate, the API layer, or ⛔ any test: counsel's answer is a
 * ONE-LINE change here and ⛔ zero changes anywhere else.
 *
 * ⭐⛔ UNTIL A MATCHING `clause_versions` ROW EXISTS AND IS PINNED, THIS PREDICATE IS FALSE FOR EVERY
 * MEMBER AND ⛔ NO NAME RENDERS. That is **AC8's designed inert state** — fail-closed, correct, and
 * ⛔ NOT A BUG. ⛔ Do ⛔ not seed a placeholder `clause_versions` row to make the surface look alive:
 * a stand-in makes names render on an authority that does ⛔ not exist, which is the exact defect
 * this story corrects (D3).
 *
 * ⚠ Built with the `clauseId()` smart constructor, ⛔ never a bare string — a typo then fails at
 * MODULE LOAD (`InvalidClauseIdError`) rather than silently at render time as an everyone-unnamed
 * page. Precedent: `member/lock-in.ts`, `member/moderation/dwell.ts`, `medical/ima-list.ts`.
 */
export const SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID: ClauseId = clauseId(
  'niy.public-disclosure.member-information',
);

/** Page size served when the caller asks for nothing, and the hard ceiling. */
export const SAHYOG_DRIVE_PAGE_SIZE_DEFAULT = 25;
export const SAHYOG_DRIVE_PAGE_SIZE_CAP = 50;

/**
 * ⭐⭐ EXPORTED AT STORY 11b.3 — SHARED WITH `sahyog-vivran-read.ts`, ⛔ NEVER RE-SPELLED THERE.
 *
 * The four correlated fragments below (this one, {@link DRIVE_CLOSED_AT}, {@link DECEASED_DISTRICT}
 * and {@link ASSIGNED_MEMBER_COUNT}) were module-private while this file was their only consumer.
 * The per-claim Sahyog Vivran read needs the SAME four, and copying them would fork the definition
 * of *"how many contributions were confirmed"* into two places that drift silently — the exact
 * failure the *"change one, check the other"* pairings in this file exist to prevent.
 *
 * ⚠⛔ THEY CARRY LITERAL OUTER-TABLE QUALIFIERS (`"pools"."pariwar_id"`, `"claims"."deceased_member_id"`),
 * so ANY consumer MUST select from `pools` INNER JOINed to `claims` under those exact aliases. That is
 * deliberate ([[project_epic6_drizzle_correlated_subquery_bug]]): interpolating an outer `Column` into
 * a subquery whose own FROM has a column of that name collapses the correlation into a TAUTOLOGY, and
 * every DB-free test stays green while it does.
 *
 * ⛔ Exporting them is ⛔ NOT an invitation to widen them. A consumer needing different semantics needs
 * its OWN fragment with its own name, ⛔ never a parameter bolted onto one of these.
 */
/**
 * ⭐ THE CONFIRMED COUNT, WITH ITS REVERSALS COMPENSATED — set-based, per row, in ONE pass.
 *
 * Counts live `contribution.confirmed` events for the pool that have NOT been walked back by a
 * `reconciliation.confirmation-reversed` naming them. ⛔ Yellow / attested / pending / projected
 * can never satisfy this, structurally: the type is hard-filtered, with no parameter that could
 * admit one (Story 9.5). ⛔ And it is a COUNT of confirmations, ⛔ never a SUM of amounts.
 *
 * ⚠ This is the set-based form of `contribution/read.ts`'s JS event-id reconciliation, and it
 * must stay observationally equivalent to it ([[project_contribution_fact_projection_substrate]]).
 * ⭐ "Change one, check the other" — `listConfirmedContributorsForPool` is the other.
 */
export const CONFIRMED_CONTRIBUTION_COUNT = (now: Date) => sql<string>`(
    SELECT count(*)
      FROM events_log c
     WHERE c.pariwar_id = "pools"."pariwar_id"
       AND c.event_type = ${CONFIRMED_EVENT_TYPE}
       AND c.payload ->> ${CONFIRMED_PAYLOAD_POOL_KEY} = "pools"."pool_id"::text
       AND c.occurred_at <= ${now}
       AND NOT EXISTS (
         SELECT 1
           FROM events_log r
          WHERE r.pariwar_id = c.pariwar_id
            AND r.event_type = ${CONFIRMATION_REVERSED_EVENT_TYPE}
            AND r.payload ->> ${REVERSED_CONFIRMED_EVENT_ID_KEY} = c.event_id::text
            AND r.occurred_at <= ${now}
       )
  )`;

/**
 * ⭐⭐ THE PUBLICATION BASIS, BATCHED — the member's OWN accepted T&C, ⛔ not the family's tick-box.
 *
 * Story 11b.9 / `2026-08-28-160` cl.3-5. True iff the DECEASED member holds a VALID `tc_acceptance`
 * consent whose accepted T&C version PINS the posthumous publication clause
 * ({@link SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID}). ⛔ `sahyog_drive_publication` is ⛔ NOT consulted —
 * it was de-authorised, ⛔ not ANDed and ⛔ not ORed (story D2, ruled in substance by `-160` cl.5).
 *
 * ⛔⛔ AND THE FAMILY'S DECLINE PATH IS GONE ON PURPOSE (`-160` cl.6). 11b.1 shipped this gate as
 * "declinable and revocable"; that is REVERSED by ruling, because the family is not asked to speak
 * for the member — the member already answered. ⛔ A later reader must ⛔ not restore it as a
 * "missing feature".
 *
 * ── ⛔ TWO CONJUNCTS THAT LOOK MISSING AND ARE DELIBERATELY ABSENT ───────────────────
 * 1. ⛔ NO "the accepted version is still EFFECTIVE" conjunct. The gate is the version the member
 *    ACCEPTED, ⛔ not whether that version is still the Pariwar's current one: a later
 *    effective-window change is ⛔ not a withdrawal of the member's own authority. ⚠ Adding
 *    `AND the version is effective` is the Story 10.10 `is_valid: false` shape exactly — a one-line
 *    conjunct carrying constitutional meaning that every CI gate stays green through.
 *    ⭐ CONSEQUENCE, STATED SO NOBODY DISCOVERS IT LATER: publishing a NEW T&C version that DROPS
 *    the clause does ⛔ NOT un-publish anyone who accepted an earlier version carrying it.
 *    ⛔ "Amend the T&C" is ⛔ NOT an un-publish lever; withdrawal runs through revocation of the
 *    member's own `tc_acceptance` row, and ⛔ nothing else.
 * 2. ⛔ NO physical-document conjunct. The 90-day physical copy is track-and-chase with ⛔ no
 *    punitive effect (`-160` cl.8): the DIGITAL acceptance is operative, and a missing physical
 *    copy must ⛔ not stop publication.
 *
 * ── ⭐ THE ONE CAST, IN THE ONE SAFE DIRECTION — it closes TWO traps at once ─────────
 * `consent_records.consent_artifact_ref` is `text`, NULLABLE, with ⛔ NO FK and ⛔ no check ("the
 * ref is polymorphic across artifact tables; resolution is the consumer's concern" —
 * `schema/consent_records.ts`), while `terms_and_conditions_pinned_clauses.tc_version_id` is
 * `uuid`. ⇒ the comparison NEEDS a cast (uncast raises `operator does not exist: uuid = text`,
 * 42883) — ⛔ this is the MIRROR IMAGE of the subject comparison below, where both sides are
 * already `uuid` and a cast is what BREAKS it.
 * ⭐⭐ CAST THE `uuid` COLUMN TO `text`, ⛔ NEVER THE `text` COLUMN TO `uuid`. `uuid → text` is
 * TOTAL; `text → uuid` is PARTIAL and would raise `22P02 invalid input syntax for type uuid` on any
 * row whose ref is `''` or any non-UUID string — taking down the whole public page. In this
 * direction a malformed, empty or NULL ref simply FAILS TO MATCH and excludes that member, ⛔ it
 * does not raise.
 *
 * ── ⚠ TENANCY: THREE TABLES, THREE `pariwar_id`s, ALL SCOPED EXPLICITLY ─────────────
 * `terms_and_conditions_pinned_clauses`' own header warns that its FK "targets the global PK and
 * would happily link a DIFFERENT Pariwar's clause version" — the same-Pariwar guard is a DOMAIN
 * pre-check, ⛔ not the FK. ⇒ every leg is scoped to `"pools"."pariwar_id"` directly. ⛔ Do not rely
 * on RLS alone inside a correlated subquery on a public, UNAUTHENTICATED route.
 *
 * ⚠ A MISSING acceptance, a REVOKED one, and one against a version that does ⛔ not pin the clause
 * are the SAME verdict — fail-closed in every direction (AC7). ⛔ None of them omits the ROW — see
 * {@link SahyogDriveEntry.namePublicationAuthorised}.
 *
 * ⚠ ⛔ NO `::text` CAST ON THE SUBJECT COMPARISON. `consent_records.subject_id` is a `uuid`
 * COLUMN — Story 2.7 kept the subject polymorphic in MEANING, ⛔ not in TYPE — so casting either
 * side raises `operator does not exist: uuid = text` (42883). Both sides are already uuid.
 *
 * ⭐⭐ "CHANGE ONE, CHECK THE OTHER" — THIS PREDICATE NOW HAS **TWO** PAIRINGS, ⛔ NOT ONE:
 *   1. `consent/read.ts` (`consentExists`) — the VALIDITY WINDOW. This expression is the set-based
 *      form of that same window (`granted_at <= at AND (revoked_at IS NULL OR at < revoked_at)`)
 *      and must stay observationally equivalent to it. ⛔ The D7(a) N+1 must not return through
 *      this door: `consentExists` is one `LIMIT 1` query PER SUBJECT.
 *   2. ⭐⛔ `apps/api/src/modules/terms/member-terms.handlers.ts` — the T&C acceptance WRITER, which
 *      stores `consentArtifactRef: tcVersionId`. ⛔ IF THAT WRITER EVER STORES ANYTHING ELSE IN
 *      `consent_artifact_ref`, THIS PREDICATE RETURNS FALSE FOR EVERY MEMBER — silently, with ⛔ no
 *      error anywhere and ⛔ no failing test. That coupling is invisible from either file alone,
 *      which is exactly why it is written down in both.
 */
const NAME_PUBLICATION_AUTHORISED = (now: Date) => sql<boolean>`EXISTS (
    SELECT 1
      FROM consent_records cr
      JOIN terms_and_conditions_pinned_clauses tcpc
        ON tcpc.pariwar_id = "pools"."pariwar_id"
       AND tcpc.tc_version_id::text = cr.consent_artifact_ref
      JOIN clause_versions cv
        ON cv.clause_version_id = tcpc.clause_version_id
       AND cv.pariwar_id = "pools"."pariwar_id"
     WHERE cr.pariwar_id = "pools"."pariwar_id"
       AND cr.subject_id = "claims"."deceased_member_id"
       AND cr.consent_type = ${TC_ACCEPTANCE_CONSENT_TYPE}
       AND cr.granted_at <= ${now}
       AND (cr.revoked_at IS NULL OR ${now} < cr.revoked_at)
       AND cv.clause_id = ${SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID}
  )`;

/**
 * ⭐⭐ THE `timestamptz`-FROM-A-RAW-`sql` COERCION — ⛔ AND IT IS ⛔ NOT DEFENSIVE TYPING.
 *
 * ⚠⛔ **A LIVE 500 ON A SHIPPED PUBLIC ROUTE, FOUND AT STORY 11b.3 AND FIXED HERE.**
 * {@link DRIVE_CLOSED_AT} is a RAW `sql` fragment, ⛔ not a mapped Drizzle column, so its declared
 * `sql<Date | null>` is a CLAIM the runtime does not honour: the value arrives as an ISO **STRING**.
 * ⇒ every consumer calling `.toISOString()` on it threw `TypeError: … is not a function`, and
 * `apps/api`'s `sahyogDrive` handler does exactly that — so **`GET /sahyog` returned HTTP 500 for any
 * Pariwar with a real `pool.closed` / `pool.settled` event**, which is every closed drive in
 * production.
 *
 * ⭐⛔ WHY NO TEST CAUGHT IT, RECORDED SO THE SHAPE IS NOT REPEATED: the route's own live-DB spec
 * seeds pools but ⛔ **never seeds a close/settle EVENT**, so `driveClosedAt` was `null` on every
 * fixture row and the `.toISOString()` branch was ⛔ never executed. ⚠ The suite was green over a
 * branch it could not reach — the vacuous-leg defect, in a spec rather than a gate.
 *
 * ⭐ FIXED AT THE **SOURCE**, ⛔ not at each call site: the fragment is shared by
 * `listPublicSahyogDrivePools` and `sahyog-vivran-read.ts`, so a per-consumer patch would leave the
 * declared type lying and the next consumer would inherit the same break.
 *
 * ⛔ `new Date(<already a Date>)` is safe and total, so this is correct under EITHER driver
 * behaviour — ⛔ do not "simplify" it to a cast. An unparseable value yields `null` rather than an
 * `Invalid Date` that would serialize as `null` anyway but read as a Date to every type check.
 */
export function coerceDriveInstant(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * ⭐ THE `count(*)`-AS-STRING COERCION — same family as {@link coerceDriveInstant}: a raw `sql<string>`
 * fragment's declared type is a claim the runtime does not enforce.
 *
 * ⚠ `Number("5")` is safe, but `Number(<garbage>)` is silently `NaN`, and `NaN` surviving into
 * {@link classifyCycleOutcome}'s arithmetic or onto the public wire is worse than a loud failure —
 * ⛔ never let it pass through un-checked. A non-finite or negative result coerces to `0`, the same
 * "nobody confirmed / nobody assigned" answer an empty count already means.
 */
export function coerceCount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * The drive's close (Active) or settle (Archive) instant, from the pool's own event stream.
 *
 * ⚠⛔ **THE *LATEST* SUCH EVENT — and that is a DISPLAY semantic, ⛔ not a masking one.** This is what
 * the Archive surfaces render as *"closed on"* and what {@link DECEASED_DISTRICT} freezes against.
 * ⛔ **Do ⛔ not read this fragment to decide whether nominee bank details are masked** — use
 * {@link DRIVE_MASKING_FROM}, and see its doc-block for why the two must differ.
 */
export const DRIVE_CLOSED_AT = (now: Date) => sql<Date | null>`(
    SELECT e.occurred_at
      FROM events_log e
     WHERE e.stream_id = "pools"."pool_id"
       AND e.event_type IN (${POOL_CLOSED_EVENT_TYPE}, ${POOL_SETTLED_EVENT_TYPE})
       AND e.occurred_at <= ${now}
     ORDER BY e.occurred_at DESC, e.event_version DESC
     LIMIT 1
  )`;

/**
 * The instant the nominee-bank MASKING WINDOW is measured from — the **EARLIEST** close/settle event.
 *
 * ⭐⭐ **WHY THIS IS A SECOND FRAGMENT AND ⛔ NOT A PARAMETER ON {@link DRIVE_CLOSED_AT}** (Story 11b.3a,
 * second-pass review 2026-09-03; BigDev ruled option (a) the same day).
 *
 * `DRIVE_CLOSED_AT` takes the **LATEST** close/settle event. A pool emits `pool.closed` at T0 and, later,
 * `pool.settled` at T0+45 — so that fragment's answer **MOVES FORWARD** when settlement lands. Read by
 * the masking predicate on an `after_days: N` schedule, `now >= closedAt + N` then flips back to
 * **`false`**, and a drive that had been masked since T0+N **re-publishes the complete account number,
 * account holder name, IFSC and VPA for another N days**. cl.10(c)'s window silently becomes
 * `(settle − close) + N`, and the ladder's documented monotonicity (*"`true` from then on"*) does not hold.
 *
 * ⛔ **The fix is ⛔ NOT to re-point `DRIVE_CLOSED_AT` at the earliest event.** That fragment is SHARED by
 * `listPublicSahyogDrivePools` and the per-claim Sahyog Vivran read, and {@link DECEASED_DISTRICT} freezes
 * the posting district against it — changing it would move `/sahyog`'s rendered `closedAt` and the district
 * freeze instant for every already-published Archive row. ⇒ this file's own standing rule applies, and is
 * FOLLOWED rather than bent: *"a consumer needing different semantics needs its OWN fragment with its own
 * name, ⛔ never a parameter bolted onto one of these."*
 *
 * ⚠ **Latent when written, ⛔ not theoretical:** there is no producer of `pool.settled` anywhere in
 * `packages/domain/src`, `apps/api/src` or `apps/jobs/src` today — only the state machine and the event
 * catalog. It arms itself the day settlement ships, on the state where masking matters most.
 *
 * ⚠ Carries the same literal outer-table qualifier as its siblings, so any consumer MUST select from
 * `pools` under that exact alias ([[project_epic6_drizzle_correlated_subquery_bug]]).
 */
export const DRIVE_MASKING_FROM = (now: Date) => sql<Date | null>`(
    SELECT e.occurred_at
      FROM events_log e
     WHERE e.stream_id = "pools"."pool_id"
       AND e.event_type IN (${POOL_CLOSED_EVENT_TYPE}, ${POOL_SETTLED_EVENT_TYPE})
       AND e.occurred_at <= ${now}
     ORDER BY e.occurred_at ASC, e.event_version ASC
     LIMIT 1
  )`;

/**
 * The deceased member's posting district, RAW — ⛔ never lifted through the geo tree.
 *
 * ⭐ FROZEN AS OF THE DRIVE'S CLOSE/SETTLE INSTANT, ⛔ never `now` — this surface calls the
 * Archive section "a permanent record" (Review finding, 2026-08-26), so a posting correction
 * made AFTER a pool closed must never retroactively change what an already-published row shows.
 * `COALESCE(..., now)` only covers the already-flagged data anomaly of a closed/settled pool
 * whose stream carries no close/settle event yet ({@link DRIVE_CLOSED_AT}) — it is not a second
 * intended code path.
 */
export const DECEASED_DISTRICT = (now: Date) => sql<string | null>`(
    SELECT p.district
      FROM ${memberPostings} p
     WHERE p.member_id = "claims"."deceased_member_id"
       AND p.pariwar_id = "claims"."pariwar_id"
       AND p.created_at <= COALESCE(${DRIVE_CLOSED_AT(now)}, ${now})
     ORDER BY p.created_at DESC, p.posting_id DESC
     LIMIT 1
  )`;

/** How many members were assigned to contribute to this pool — the EXPECTED side of the outcome. */
export const ASSIGNED_MEMBER_COUNT = sql<string>`(
    SELECT count(*)
      FROM ${memberPoolAssignments} a
     WHERE a.pool_id = "pools"."pool_id"
       AND a.pariwar_id = "pools"."pariwar_id"
  )`;

/** One Sahyog Drive row, as the substrate holds it. ⛔ The name is CIPHERTEXT, not a name. */
export interface SahyogDriveEntry {
  /** The pool's canonical id. ⚠ INTERNAL — ⛔ never serialized onto the public wire (AC8). */
  poolId: PoolId;
  /** The 0-based index within the cycle; `poolLetterCode()` is a pure function of it. */
  poolIndex: number;
  /** `P-YYYY-MM-###` (Story 7.2). Public, and one of the three searchable dimensions. */
  poolCanonicalIdentifier: string;
  /**
   * ⭐ THE DRIVE'S OPAQUE PUBLIC ADDRESS TOKEN — Story 11b.10 (AC3). PUBLIC and serialized, unlike
   * `poolId` above: it is what `/sahyog-vivran/[driveToken]` is addressed by, so the index's
   * per-row link cannot be built without it.
   * ⛔ It is ⛔ NOT a search dimension — ⛔ do not add a filter on it. Filtering by an address you
   * already hold answers nothing, and a token filter would turn this index into an ORACLE for
   * testing guessed addresses at collection rates, which is the inverse of AC1.
   */
  publicToken: string;
  /** `active` (window closed) | `archive` (disbursed). The PUBLIC token, never the internal one. */
  status: SahyogDriveStatus;
  /** The close/settle instant. `null` when the pool's stream carries no such event yet. */
  driveClosedAt: Date | null;
  /** The deceased member's latest posting district, RAW. `null` = no posting row. */
  district: string | null;
  /** Confirmed contributions, reversals compensated. ⛔ A count, ⛔ never a sum, ⛔ never a score. */
  confirmedContributionCount: number;
  /**
   * Pool-Reality #2, as an OPAQUE ENUM. ⭐ The target is QUARANTINED by construction: the totals
   * are compared inside this module and ⛔ only this enum leaves it, so no expected-total,
   * percentage, shortfall or comparison figure can reach any render model (AC4).
   *
   * ⭐⛔ `null` MEANS NO EXPECTATION WAS EVER SET — the pool closed with ZERO assigned
   * contributors, so there is ⛔ nothing to compare a delivery against (Review finding,
   * 2026-08-27). ⚠ `classifyCycleOutcome` compares `deliveredTotal >= expectedTotal`, which at
   * `0 >= 0` is VACUOUSLY TRUE ⇒ it returned `fully_funded` for a drive that collected nothing.
   * The surface then published *"The cycle closed with the support it needed."* beside *"0
   * confirmed"*, edge-cached, on the one page whose premise is that its statements can be checked.
   * ⇒ the zero-expectation case is resolved BEFORE the call and the row SAYS NOTHING.
   */
  fundingOutcome: CycleFundingOutcome | null;
  /**
   * The consent subject — `claims.deceased_member_id`.
   * ⚠ INTERNAL, for the consent join and the decrypt ONLY. ⛔ NEVER serialized onto the public
   * wire: a per-member permalink is an enumeration primitive in its own right (11a.3, control 5).
   */
  deceasedMemberId: MemberId;
  /**
   * Tier-1 `member_kyc_profiles.name_ciphertext` AS STORED, or `null` when the deceased member
   * has no KYC profile row. ⛔ The boundary decrypts, ⛔ not this module.
   */
  deceasedNameCiphertext: string | null;
  /**
   * ⭐ WHETHER THE ROW MAY BE *NAMED* — ⛔ NEVER WHETHER IT MAY *EXIST*.
   *
   * `false` ⇒ the boundary skips the decrypt entirely (⛔ zero KMS calls, and ⛔ no decrypt
   * without an authorising basis) and renders the row WITHOUT a name. Everything else — letter
   * code, canonical identifier, district, close date, confirmed count, framing — renders
   * regardless. ⇒ the index degrades PER-POOL, ⛔ never per-page, and an absent basis removes a
   * NAME, ⛔ never a DRIVE from the public record.
   *
   * ⚠⛔ NAMED FOR THE BASIS, ⛔ NOT FOR A CONSENT (Story 11b.9 AC6). It carried a consent-shaped
   * name while 11b.1's family tick-box was the authority; the value no longer reflects a
   * per-subject consent act at all, so that name would now be a documentation defect. The
   * authority is the MEMBER'S OWN accepted T&C — see {@link NAME_PUBLICATION_AUTHORISED}.
   *
   * ⚠⭐ `false` FOR EVERY ROW IS THE EXPECTED DAY-ONE STATE, ⛔ not a fault: until a
   * `clause_versions` row for {@link SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID} exists AND is pinned into
   * a T&C version, nothing can satisfy the basis. The surface is INERT, ⛔ not broken — and the
   * API boundary emits a diagnostic that says which of the two inert states it is (AC8).
   */
  namePublicationAuthorised: boolean;
}

/** The three ruled search dimensions (D2(a)) — ⭐ all answerable WITHOUT a single decrypt. */
export interface SahyogDriveFilters {
  /** Exact district match against the deceased member's latest posting. */
  district?: string;
  /** Inclusive lower bound on the drive's close/settle instant. */
  closedFrom?: Date;
  /** Inclusive upper bound on the drive's close/settle instant. */
  closedTo?: Date;
  /**
   * The pool's canonical identifier or its letter code.
   * ⛔ There is NO name filter, and ⛔ none may be added by scanning, caching or re-reading
   * rendered pages: `member_kyc_profiles` carries no blind index and envelope encryption gives
   * every name its own DEK, so there is no ciphertext equality to match on (D2(a), deferred on
   * the `name_blind_index` trigger). ⭐ A RENDERED name is still not a SEARCHABLE one — rendering
   * reads one row you already selected; searching needs a predicate over every row you have not.
   */
  poolCode?: string;
}

export interface ListSahyogDriveOptions extends SahyogDriveFilters {
  /** Page size. ⛔ Routed through `clampLimit` — the `domain-accessor-invariants` invariant. */
  limit?: number;
  /** Row offset. Bounded at 0 below; the CALLER owns the deep-pagination horizon. */
  offset?: number;
  /** The as-of instant. Injected rather than read from the clock so a test can pin it. */
  now?: Date;
}

/**
 * The FULL listing predicate, shared by the page read and the count so the two cannot drift into
 * two different indexes. ⛔ Never re-spell any half at a call site.
 *
 * ⚠ `now` is REQUIRED, ⛔ not defaulted here: both callers must resolve the index as of ONE
 * instant, and a default would let the page read and its total silently take two.
 *
 * `pariwar_id` rides ALONGSIDE RLS as an explicit predicate — defense-in-depth, and what keeps
 * the read correct if a caller ever passes a BYPASSRLS pool.
 */
function sahyogDrivePredicate(pariwarId: PariwarId, now: Date, filters: SahyogDriveFilters) {
  const conjuncts = [
    eq(pools.pariwarId, pariwarId),
    inArray(pools.currentState, [...SAHYOG_DRIVE_VISIBLE_POOL_STATES]),
  ];

  if (filters.district !== undefined) {
    // Case/whitespace-folded on both sides: the RENDERED district is trimmed (handlers.ts), so
    // the filter must match under the same normalization or a district that displays correctly
    // becomes unfindable by filtering on it (Review finding, 2026-08-26).
    conjuncts.push(
      sql`trim(lower(${DECEASED_DISTRICT(now)})) = lower(trim(${filters.district}))`,
    );
  }
  if (filters.closedFrom !== undefined) {
    conjuncts.push(sql`${DRIVE_CLOSED_AT(now)} >= ${filters.closedFrom}`);
  }
  if (filters.closedTo !== undefined) {
    conjuncts.push(sql`${DRIVE_CLOSED_AT(now)} <= ${filters.closedTo}`);
  }
  if (filters.poolCode !== undefined) {
    // Matched against the canonical identifier OR the letter code the pool index yields.
    // ⛔ An EXACT match, ⛔ never a LIKE/prefix scan: a prefix filter over a public index is an
    // enumeration primitive wearing a search box.
    //
    // The letter code is decoded (bijective base-26, case-insensitive) rather than matched in
    // SQL — `poolIndexFromLetterCode` is the one inverse of `poolLetterCode` and must stay the
    // only decoder (Review finding, 2026-08-26: this OR half was previously never wired in).
    // ⚠ THE TOTAL FORM, ⛔ NEVER THE THROWING ONE (Review finding, 2026-08-27). This value comes
    // from a public search box on an UNAUTHENTICATED route: a visitor typing `LUCKNOW` is asking a
    // question, ⛔ not violating a contract. `poolIndexFromLetterCodeOrNull` returns null for a
    // non-letter string, an over-long one, OR one decoding past int4 — and null falls through to
    // the canonical-identifier-only branch below, which correctly matches nothing.
    // ⛔ The unbounded decode this replaces was a 500: `pool_index` is int4 and drizzle BINDS the
    // decoded value, so Postgres resolved `$n` to int4 and raised `22003` on any 7-letter code.
    const upperPoolCode = filters.poolCode.toUpperCase();
    const letterIndex = poolIndexFromLetterCodeOrNull(upperPoolCode);
    conjuncts.push(
      letterIndex === null
        ? sql`${pools.poolCanonicalIdentifier} = ${filters.poolCode}`
        : sql`(${pools.poolCanonicalIdentifier} = ${filters.poolCode} OR ${pools.poolIndex} = ${letterIndex})`,
    );
  }

  return and(...conjuncts);
}

/**
 * Resolve ONE page of the public Sahyog Drive in ONE query.
 *
 * ⭐ THE ORDER IS the close/settle instant DESCENDING with a PRIMARY-KEY TIE-BREAK, and both
 * halves are load-bearing. Offset paging over a NON-deterministic order silently duplicates rows
 * onto one page and drops them from another; "page N is the same page N on every request" is a
 * property of this ORDER BY. ⛔ AND THE ORDER IS NOT A RANKING: ⛔ never by contribution count,
 * ⛔ never by amount, and ⛔ no "most-supported" ordering is offered at any tier (AC5).
 *
 * ⚠ THE JOIN TO `claims` IS PART OF THE PREDICATE — and it is the SUBJECT FACT, ⛔ not a
 * convenience: `pools.claim_case_id → claims.deceased_member_id` is how this module knows who the
 * drive is FOR without ever reading a lifecycle state. ⛔ An INNER join on purpose: a pool with no
 * claim has no subject and no drive to publish.
 *
 * ⚠ THE JOIN TO `member_kyc_profiles` IS A *LEFT* JOIN, DELIBERATELY, AND THIS IS THE ONE PLACE
 * THIS MODULE MUST NOT COPY `/members`. There, a missing KYC profile omits the ROW, because a
 * directory row where a person's name belongs must never be blank. HERE THE ROW STILL CARRIES THE
 * DRIVE — its code, district, date and confirmed count are all true and all public — so a missing
 * profile omits the NAME and keeps the ROW (AC2). ⛔ A shorter index is not acceptable here; a
 * nameless row is.
 */
export async function listPublicSahyogDrivePools(
  db: Db,
  pariwarId: PariwarId,
  opts: ListSahyogDriveOptions = {},
): Promise<SahyogDriveEntry[]> {
  const now = opts.now ?? new Date();
  const offset = Math.max(0, opts.offset ?? 0);

  const rows = await db
    .select({
      poolId: pools.poolId,
      poolIndex: pools.poolIndex,
      poolCanonicalIdentifier: pools.poolCanonicalIdentifier,
      // Story 11b.10 — the public address the row's link is built from.
      publicToken: pools.publicToken,
      currentState: pools.currentState,
      fixedAmount: pools.fixedAmount,
      deceasedMemberId: claims.deceasedMemberId,
      deceasedNameCiphertext: memberKycProfiles.nameCiphertext,
      district: DECEASED_DISTRICT(now),
      driveClosedAt: DRIVE_CLOSED_AT(now),
      // ⚠ `count(*)` is `bigint` ⇒ the driver hands back a STRING, not a number. Coerced at the
      // accessor boundary below — ⛔ never left to an implicit `+` somewhere downstream.
      confirmedCount: CONFIRMED_CONTRIBUTION_COUNT(now),
      assignedCount: ASSIGNED_MEMBER_COUNT,
      namePublicationAuthorised: NAME_PUBLICATION_AUTHORISED(now),
    })
    .from(pools)
    .innerJoin(claims, eq(claims.claimCaseId, pools.claimCaseId))
    .leftJoin(memberKycProfiles, eq(memberKycProfiles.memberId, claims.deceasedMemberId))
    .where(sahyogDrivePredicate(pariwarId, now, opts))
    // ⚠ EXPLICIT `NULLS LAST` — the predicate already restricts to closed/settled pools, so a
    // null `driveClosedAt` here is a data anomaly, not a legitimate "not yet closed" row. `DESC`
    // defaults to `NULLS FIRST` in Postgres, which would sort that anomaly to the very top ahead
    // of genuinely-recent closures (Review finding, 2026-08-26).
    .orderBy(sql`${DRIVE_CLOSED_AT(now)} DESC NULLS LAST`, desc(pools.poolId))
    .limit(
      clampLimit(opts.limit, {
        default: SAHYOG_DRIVE_PAGE_SIZE_DEFAULT,
        cap: SAHYOG_DRIVE_PAGE_SIZE_CAP,
      }),
    )
    .offset(offset);

  return rows.map((r) => {
    const confirmedContributionCount = Number(r.confirmedCount ?? 0);
    const assignedCount = Number(r.assignedCount ?? 0);
    return {
      poolId: r.poolId,
      poolIndex: r.poolIndex,
      poolCanonicalIdentifier: r.poolCanonicalIdentifier,
      publicToken: r.publicToken,
      // The predicate admits only these two; the cast records that rather than re-checking it.
      status: PUBLIC_STATUS_BY_POOL_STATE[r.currentState as SahyogDriveVisiblePoolState],
      // ⭐ COERCED — the raw `sql` fragment hands back an ISO STRING despite its declared type.
      // See {@link coerceDriveInstant}: without this, `apps/api`'s `.toISOString()` threw and the
      // route 500'd for every real closed drive.
      driveClosedAt: coerceDriveInstant(r.driveClosedAt),
      district: r.district,
      confirmedContributionCount,
      // ⭐ THE TARGET IS QUARANTINED HERE AND NOWHERE ELSE. Both totals are whole INR — the unit
      // `classifyCycleOutcome` documents — and BOTH DIE ON THIS LINE: only the opaque outcome
      // enum is returned. ⛔ Do not widen `SahyogDriveEntry` to carry either of them, under any
      // name: `classifyCycleOutcome` quarantines the target by construction and this surface must
      // not smuggle one past it (AC4).
      //
      // ⭐⛔ ZERO ASSIGNEES ⇒ NO CLASSIFICATION AT ALL, ⛔ never a vacuous one (Review finding,
      // 2026-08-27). `assignedCount === 0` makes `expectedTotal` 0, and `0 >= 0` is TRUE, so the
      // classifier returned `fully_funded` for a drive that collected nothing. ⚠ AND IT IS
      // REACHABLE ON THE ORDINARY PATH — `pool/assign.ts` returns an empty assignment on an empty
      // roster (its own comment: *"the common (B)-scope case"*), and `capacity[i] = floor(m/n) +
      // (i < m % n)` gives 0 to the trailing `n − m` pools whenever approved claims outnumber the
      // assignable roster. Pools spawn one per approved claim, independently of roster size.
      // ⛔ `classifyCycleOutcome` is NOT patched: it is shared with the Panchayat Noticeboard and
      // Sahyog Vivran and its union's ordering is provenance-stable. ⛔ `partial` is NOT reused
      // either — its copy says "Reconciliation is still in progress", which is not true of a drive
      // that had nobody assigned. The honest render for "no expectation was ever set" is SILENCE.
      fundingOutcome:
        assignedCount === 0
          ? null
          : classifyCycleOutcome({
              expectedTotal: assignedCount * r.fixedAmount,
              deliveredTotal: confirmedContributionCount * r.fixedAmount,
            }),
      deceasedMemberId: r.deceasedMemberId,
      deceasedNameCiphertext: r.deceasedNameCiphertext,
      namePublicationAuthorised: r.namePublicationAuthorised,
    };
  });
}

/**
 * Count the pools the public Sahyog Drive would list, under the SAME predicate.
 *
 * ⭐ WHY THIS EXISTS: the honest "next" link and the deep-pagination horizon both need a real
 * total. ⛔ Deriving *"there is a next page"* from a full-page result is a lie — an index with
 * exactly `limit` drives would advertise a page-2 that is empty.
 *
 * ⚠ AND `total` IS INDEX SIZE, ⛔ NOT RENDERED-ROW COUNT — but note the reason DIFFERS from
 * `/members`, which is the seam where "copy members.astro in every respect" stops. There, an
 * unresolvable name suppresses the ROW, so the page really can come up short of `total`. Here
 * AC2 rules the opposite: an unconsented or unresolvable name omits the NAME and the ROW
 * SURVIVES. ⇒ rendered rows and `total` agree except for pagination and the publication switch —
 * a NAMELESS row still counts. ⛔ Never add an omission count either: a per-row "name withheld"
 * tally is exactly the enumeration signal AC2 forbids announcing.
 */
export async function countPublicSahyogDrivePools(
  db: Db,
  pariwarId: PariwarId,
  opts: Omit<ListSahyogDriveOptions, 'limit' | 'offset'> = {},
): Promise<number> {
  const now = opts.now ?? new Date();

  const rows = await db
    .select({ total: sql<string>`count(*)` })
    .from(pools)
    .innerJoin(claims, eq(claims.claimCaseId, pools.claimCaseId))
    .where(sahyogDrivePredicate(pariwarId, now, opts));

  // ⚠ `count(*)` is bigint ⇒ a STRING from the driver.
  return Number(rows[0]?.total ?? 0);
}

/**
 * ⭐⭐ AC8's DISCRIMINATOR — is this Pariwar PROVISIONING-INERT, or is the gap PER-MEMBER?
 *
 * `true` ⇔ the Pariwar's currently-EFFECTIVE T&C version pins
 * {@link SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID}. `false` ⇒ ⛔ NO member of this Pariwar can EVER be
 * named right now, whatever their own record says — a WHOLE-PARIWAR condition with a
 * PROVISIONING answer.
 *
 * ⛔⛔ THIS IS A DIAGNOSTIC, ⛔ NOT A GATE. It is ⛔ NOT conjoined into
 * {@link NAME_PUBLICATION_AUTHORISED} and ⛔ must never be: the render basis is the version the
 * member ACCEPTED, ⛔ not whichever version happens to be effective now (see that predicate's
 * "two conjuncts deliberately absent"). Wiring this into the gate would silently un-publish every
 * member the moment a Pariwar rolled a new T&C version — the exact failure the ruling forbids.
 *
 * ⚠ WHY IT EXISTS AT ALL: without it a first responder cannot tell
 *   (i)  PROVISIONING-INERT — nothing pins the clause, so the whole Pariwar renders unnamed; from
 *   (ii) PER-MEMBER — the clause IS pinned, but this member has no valid `tc_acceptance`, has
 *        revoked it, or accepted a version that does not pin it.
 * ⛔ A diagnostic that cannot separate those sends the responder to the WRONG HALF of the system:
 * (i) is answered by provisioning, (ii) by a member record.
 *
 * ⭐ Per-Pariwar divergence is a VALID state, ⛔ not an error (story D4(a)): multi-Pariwar means
 * Pariwars adopt T&C versions at DIFFERENT times, and a build that treated ordinary rollout skew
 * as a failure would be wrong on day one. ⇒ this returns a fact; it ⛔ does not throw and ⛔ does
 * not block the surface.
 *
 * ⚠ ONE query for the whole page, called at most ONCE per request and ⛔ only when at least one row
 * came back unnamed — the D7(a) N+1 must not return through this door either.
 *
 * ⚠ The effective-window predicate is `getEffectiveTc`'s, re-spelled set-based here for the same
 * reason the verdict above is: ⭐ "change one, check the other" — `terms-and-conditions/read.ts`
 * is the other. `legal_review_status = 'approved'` is part of it, ⛔ not an extra.
 */
export async function isSahyogDrivePublicationClausePinned(
  db: Db,
  pariwarId: PariwarId,
  now: Date = new Date(),
): Promise<boolean> {
  const rows = await db.execute<{ pinned: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
        FROM terms_and_conditions_versions tcv
        JOIN terms_and_conditions_pinned_clauses tcpc
          ON tcpc.tc_version_id = tcv.tc_version_id
         AND tcpc.pariwar_id = ${pariwarId}
        JOIN clause_versions cv
          ON cv.clause_version_id = tcpc.clause_version_id
         AND cv.pariwar_id = ${pariwarId}
       WHERE tcv.pariwar_id = ${pariwarId}
         AND tcv.legal_review_status = 'approved'
         AND tcv.effective_from <= ${now}
         AND (tcv.effective_until IS NULL OR ${now} < tcv.effective_until)
         AND cv.clause_id = ${SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID}
    ) AS pinned
  `);

  // ⚠ `db.execute` hands back `{ rows }` (the `dbNow` precedent in `pool/fixed-amount.ts`), ⛔ not a
  // bare array. `EXISTS` cannot produce zero rows, but the optional read keeps this total anyway.
  const row = rows.rows[0] as { pinned: boolean } | undefined;
  return row?.pinned === true;
}
