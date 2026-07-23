// The Yogdaan Pratigya (Contribution Note) FACTS RESOLVER — Story 8.7 (Task 3; AC1/AC3/AC4/AC5/AC7).
//
// Given `(pariwarId, memberId, contributionId)`, assemble the render-ready `ContributionNoteFacts` for
// exactly ONE contribution — the caller's OWN. Everything it needs already exists; this module CALLS
// those paths rather than re-deriving anything (D6). Three things in particular are reused, not
// re-implemented, because a second source of truth is how a Yogdaan Bahi row and its own artifact end up
// disagreeing — which reads to Sushil as a forgery:
//
//   1. STATUS — `listMemberContributionHistory` carries the status `deriveContributionStatus` already
//      derived. There is no second derivation in the Note path (D3(b)).
//   2. POOL IDENTITY — the shared `resolvePoolIdentity` (`pool-identity.ts`), the same resolver the My
//      Pool card and the Yogdaan Bahi use, so the family/letter/name/amount are byte-identical.
//   3. PAYMENT REFERENCE — `deriveContributionReference` (Story 7.7), the same deterministic `tr=` the
//      UPI intent used.
//
// ── Security: this endpoint hands a member a file about themselves and nothing else (D9) ───────────
// `contributionId` is a CLIENT-SUPPLIED id. It is resolved THROUGH the member-scoped read — we list the
// caller's own history and MATCH — never by fetching the event by id and checking ownership afterwards,
// and never by trusting a member id from the request. A wrong-Note leak here would disclose another
// member's contribution, their pool, and the deceased family they support.
//
// ── NOT fail-soft (deliberately unlike `contributionHistory`) ──────────────────────────────────────
// The Yogdaan Bahi omits an unresolvable row; a Note CANNOT. An unresolvable Note returns `null` here and
// 404s at the route — a partially-rendered artifact (a blank family name, a missing amount) is worse
// than no artifact. This is the one place the module's fail-soft posture is intentionally not inherited.
//
// ── Regenerate, never persist (D2 / AC7) ───────────────────────────────────────────────────────────
// Every input is event-derived, so the Note is generated on demand and stored NOWHERE. No object
// storage, no stale copy that could contradict a later reconciliation verdict, no RTBF sweep over a
// blob bucket, no signed-URL TTL. The only field that differs between two renders of the same
// contribution is `generatedAt`.

import { createHash } from 'node:crypto';

import {
  contribution as contributionDomain,
  ids,
  kyc as kycDomain,
  niyamavali as niyamavaliDomain,
  passport as passportDomain,
  pool as poolDomain,
  type Db,
} from '@twt/domain';
import { ContributionNoteFacts } from '@twt/contracts';
import { color } from '@twt/tokens';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { splitFirstNameLastInitial } from './name.js';
import { cycleRefFromCommittedAt, resolvePoolIdentity } from './pool-identity.js';

/**
 * The Niyamavali clause whose version the Note cites (AC4 / D4).
 *
 * It addresses the contribution-discipline RULE, not one of its ladder rungs: the `r7-a…r7-g` clause
 * ids that appear in `packages/niyamavali-engine/tests/` are precedence-ordered EXPLANATIONS of which
 * arm applied to a given member ([[project_niyamavali_precedence_is_provenance]]), and citing one of
 * them on a durable artifact would misstate what governed the contribution.
 *
 * IT RESOLVES TO `null` TODAY, and that is correct, not a defect: no contribution-discipline clause
 * rows are seeded for the launch tenant — clause AUTHORING is Epic 2's, and 8.7 owns only the wiring.
 * The Note therefore renders an HONEST ABSENCE ("not yet published") and NEVER fabricates, back-dates,
 * or defaults a version string ([[feedback_record_unattested_no_backfill]]). The moment Epic 2 seeds
 * the tenant, real versions start appearing on Notes with ZERO code change here.
 */
const CONTRIBUTION_DISCIPLINE_CLAUSE_ID = 'niy.contribution-discipline.r7';

/**
 * TWT defaults for the Pariwar-branding bundle (AC5). Applied PER FIELD, so a Pariwar that set its
 * colours but no logo keeps its colours. Colours are the `@twt/tokens` ink/paper roles expressed as
 * brand values — the artifact must render with *something* dignified even for an unprovisioned tenant.
 */
const BRANDING_DEFAULTS = {
  displayNameHi: 'टीचर्स वेलफेयर ट्रस्ट',
  displayNameEn: 'Teachers Welfare Trust',
  primaryColor: color['rule-heavy'],
  secondaryColor: color['stamp-mudra'],
} as const;

/** Hex `#RRGGBB` — a malformed tenant value must not reach the artifact's inline style. */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * The member-identifier WATERMARK (AC5 / FR-33's `[v1-S]` donor-ID watermark) — short, stable, and
 * NON-REVERSIBLE, derived from the ids the member already has.
 *
 * Deliberately a one-way digest, not an encoding: a forwarded Note carries a mark that lets support
 * trace it back through a lookup, while the mark itself discloses nothing about the member to whoever
 * receives the file. The pariwar id is mixed in so the same member in two Pariwars marks differently.
 *
 * It is NOT, and must never become, a membership number: this story introduces no `member_number`
 * column, no generation scheme, and no search key ([[project_membership_number_deferred_feature]] —
 * membership number is a confirmed product requirement owned by a dedicated identity feature). Do not
 * make this searchable and do not present it as an identity a member could be asked to quote.
 */
export function deriveMemberNoteRef(pariwarId: string, memberId: string): string {
  const digest = createHash('sha256').update(`twt:note-ref:${pariwarId}:${memberId}`).digest('hex');
  return `TWT-${digest.slice(0, 8).toUpperCase()}`;
}

/** The resolver's context — the caller's OWN identity plus the requested contribution. */
export interface ContributionNoteCtx {
  readonly memberId: ReturnType<typeof ids.memberId>;
  readonly pariwarId: ReturnType<typeof ids.pariwarId>;
  /** The client-supplied contribution id — matched against the caller's own history, never trusted. */
  readonly contributionId: string;
  /** The generation instant (from `deps.clock()`), stamped on the artifact.  */
  readonly now: Date;
}

/**
 * Resolve the facts for ONE Contribution Note, or `null` when no Note exists for this caller and id
 * (unknown contribution, another member's contribution, or an unresolvable pool identity). The route
 * turns `null` into a 404 — never another member's Note, and never a partial artifact.
 *
 * Note the D3(a) shape of the availability question: a Note exists for ANY RESOLVABLE ATTESTED
 * CONTRIBUTION, in any of the four statuses. Status governs what the artifact SAYS, never whether it
 * exists — the two rules compose and neither may leak into the other.
 */
export async function resolveContributionNoteFacts(
  deps: AppDeps,
  tx: Db,
  request: FastifyRequest,
  ctx: ContributionNoteCtx,
): Promise<ContributionNoteFacts | null> {
  const { memberId, pariwarId, contributionId } = ctx;

  // (1) OWNERSHIP + STATUS in one step (D9): a TARGETED lookup for the CALLER'S OWN attested
  //     contribution, matched by id. The read is hard-scoped to `memberId`, so a contribution belonging
  //     to anyone else simply does not match — ownership is structural, not a check that could be
  //     forgotten. Deliberately NOT `listMemberContributionHistory` + `.find()`: that read is capped at
  //     `MAX_CONTRIBUTION_HISTORY_ROWS` (500, newest-first), which would make a genuinely-owned but
  //     older contribution indistinguishable from "not yours" — silently narrowing AC7's "regenerable
  //     for any past contribution" promise. `getMemberAttestedContribution` is an uncapped equality
  //     lookup on the same primary key, reusing the identical status-derivation steps (D3).
  const entry = await contributionDomain.getMemberAttestedContribution(tx, { pariwarId, memberId, contributionId });
  if (entry === null) return null;

  // (2) The pool context + the SHARED identity resolution (D6) — the same family/letter/name/amount the
  //     card and the Yogdaan Bahi render. Unresolvable → no Note (404), NOT a blank field.
  const poolCtx = await poolDomain.getPoolContributionContext(tx, pariwarId, entry.poolId);
  if (poolCtx === null) return null;
  const identity = await resolvePoolIdentity(deps, tx, request, pariwarId, {
    claimCaseId: poolCtx.claimCaseId,
    poolIndex: poolCtx.poolIndex,
    poolCanonicalIdentifier: poolCtx.poolCanonicalIdentifier,
    fixedAmount: poolCtx.fixedAmount,
    poolCount: poolCtx.poolCount,
  });
  if (identity === null) return null;

  // (3) The cycle reference — the freeze month, the same value the Yogdaan Bahi row shows.
  const committedAt = await poolDomain.getCycleFreezeCommittedAt(tx, poolCtx.cycleId);
  const cycleRef = committedAt === null ? poolCtx.poolCanonicalIdentifier : cycleRefFromCommittedAt(committedAt);

  // (4) The CONTRIBUTING member's own name (this is their artifact, so they are named on it) —
  //     PII-shielded to first-name + last-initial, decrypted at the member-session layer like every
  //     other name on this surface. Unresolvable → no Note: an artifact addressed to nobody is defective.
  const memberName = await resolveOwnName(deps, tx, pariwarId, memberId);
  if (memberName === null) return null;

  // (5) The Niyamavali version IN FORCE AT THE CONTRIBUTION INSTANT (AC4) — `asOf = attestedAt`, never
  //     `now()`: the whole point of citing a version on a durable artifact is that a Note regenerated in
  //     2031 still names the rule that governed the contribution in 2026. `null` → the honest absence.
  const niyamavali = await resolveNiyamavaliRef(tx, request, pariwarId, entry.attestedAt);

  // (6) Per-Pariwar branding (AC5 / Story 1.7 Pariwar-Passport), degraded per field to TWT defaults.
  const branding = await resolveBranding(tx, request, pariwarId);

  // (7) The deterministic payment reference (`tr=`) — re-derived from the SAME inputs the UPI intent
  //     used (Story 7.7), so the Note and the payment the member actually made agree.
  const paymentReference = poolDomain.deriveContributionReference({ memberId, alertId: entry.alertId });

  // `.parse(...)` — not just the TS return type — is what makes the `.superRefine` over-claim guard
  // (AC3) load-bearing rather than aspirational: a TS annotation only checks shape at compile time, so a
  // future edit to the ternary above that let a UTR leak onto a non-green facts object would compile
  // cleanly and ship. Parsing here means that edit throws in CI/tests/prod instead.
  return ContributionNoteFacts.parse({
    contributionId: entry.contributionId,
    status: entry.status,
    attestedAt: entry.attestedAt.toISOString(),
    generatedAt: ctx.now.toISOString(),
    cycleRef,
    deceasedFirstName: identity.deceasedFirstName,
    deceasedLastInitial: identity.deceasedLastInitial,
    memberFirstName: memberName.firstName,
    memberLastInitial: memberName.lastInitial,
    memberRef: deriveMemberNoteRef(pariwarId, memberId),
    poolLetterCode: identity.poolLetterCode,
    poolName: identity.poolName,
    poolCanonicalIdentifier: identity.poolCanonicalIdentifier,
    amountInr: identity.fixedAmount,
    paymentReference,
    // AC3, THE load-bearing line of this resolver: the UTR rides the artifact ONLY when reconciliation
    // has actually confirmed the contribution. On every other status the field is ABSENT — the contract
    // would refuse the object otherwise — so a forwarded non-green Note cannot imply a settled payment.
    ...(entry.status === 'green' ? { utr: entry.utr } : {}),
    niyamavali,
    branding,
  });
}

/** The caller's OWN name, PII-shielded. `null` when the profile / ciphertext / decrypt is unresolvable. */
async function resolveOwnName(
  deps: AppDeps,
  tx: Db,
  pariwarId: ReturnType<typeof ids.pariwarId>,
  memberId: ReturnType<typeof ids.memberId>,
): Promise<{ readonly firstName: string; readonly lastInitial: string } | null> {
  const profile = await kycDomain.getMemberKycProfile(tx, pariwarId, memberId);
  if (!profile || profile.nameCiphertext === null) return null;
  let fullName: string;
  try {
    fullName = await decryptKycField(profile.nameCiphertext, pariwarId, deps.encryption);
  } catch {
    // A Note is not a list row: it cannot degrade to a blank name. Let the caller 404 instead.
    return null;
  }
  const { firstName, lastInitial } = splitFirstNameLastInitial(fullName);
  if (firstName === '') return null;
  return { firstName, lastInitial };
}

/**
 * The governing clause version as-of the contribution instant, or `null` (the honest absence, AC4).
 * A read failure also yields `null` — an unavailable registry must render "not yet published", never a
 * guessed version and never a failed Note: the provenance line is context, not the artifact's subject.
 */
async function resolveNiyamavaliRef(
  tx: Db,
  request: FastifyRequest,
  pariwarId: ReturnType<typeof ids.pariwarId>,
  attestedAt: Date,
): Promise<ContributionNoteFacts['niyamavali']> {
  try {
    const version = await niyamavaliDomain.resolveByClauseId(
      tx,
      pariwarId,
      ids.clauseId(CONTRIBUTION_DISCIPLINE_CLAUSE_ID),
      attestedAt,
    );
    if (version === null) return null;
    return {
      clauseId: version.clauseId,
      clauseVersionId: version.clauseVersionId,
      version: version.version,
    };
  } catch (err) {
    request.log.warn({ err }, 'contribution-note: Niyamavali version unresolved — rendering the honest absence');
    return null;
  }
}

/** The Pariwar's branding, degraded PER FIELD to TWT defaults (AC5). Never throws — chrome is not the subject. */
async function resolveBranding(
  tx: Db,
  request: FastifyRequest,
  pariwarId: ReturnType<typeof ids.pariwarId>,
): Promise<ContributionNoteFacts['branding']> {
  try {
    const passport = await passportDomain.getPariwarPassport(tx, pariwarId);
    if (passport === null) return { ...BRANDING_DEFAULTS, logoUrl: null };
    const bundle = passport.brandingBundle;
    return {
      displayNameHi: passport.displayNameHi || BRANDING_DEFAULTS.displayNameHi,
      displayNameEn: passport.displayNameEn || BRANDING_DEFAULTS.displayNameEn,
      logoUrl: bundle?.logo_url ? bundle.logo_url : null,
      primaryColor: HEX_COLOR.test(bundle?.primary_color ?? '')
        ? bundle.primary_color
        : BRANDING_DEFAULTS.primaryColor,
      secondaryColor: HEX_COLOR.test(bundle?.secondary_color ?? '')
        ? bundle.secondary_color
        : BRANDING_DEFAULTS.secondaryColor,
    };
  } catch (err) {
    request.log.warn({ err }, 'contribution-note: Pariwar branding unresolved — TWT defaults');
    return { ...BRANDING_DEFAULTS, logoUrl: null };
  }
}

/**
 * The download filename (AC1). ASCII + the contribution id, carrying NO term the vocabulary register
 * prohibits — the prohibition binds the filename and the `Content-Disposition` header, not only the
 * visible copy. The id is safe by construction (it is an event id), but it is sanitised anyway because
 * it reaches an HTTP header.
 */
export function contributionNoteFilename(contributionId: string): string {
  const safeId = contributionId.replace(/[^A-Za-z0-9_-]/g, '');
  return `yogdaan-pratigya-${safeId}.pdf`;
}
