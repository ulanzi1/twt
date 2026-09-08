// The shared per-pool IDENTITY resolver — Story 8.6 (D6) / extracted by 8.7; RELOCATED here by 8.8.
//
// "The ONE place this join lives" — the deceased family's name, in the form the Pariwar has chosen for
// it (the family the pool supports, NOT the nominee) + the member-facing letter code + the curated
// Mahabharata name, so a pool renders IDENTICALLY everywhere it appears. Story 8.6 introduced it for
// the My Pool card + the Yogdaan Bahi passbook; 8.7 added the Contribution Note PDF; Story 8.8 adds
// the FOURTH consumer — the cycle-open and deadline-reminder push/WA/SMS copy — and that consumer runs
// in `apps/jobs`, which cannot import `apps/api`.
//
// A divergence between the push a member receives and the card they open would read to Sushil as two
// different pools, so the resolver moves to `@twt/domain` rather than being duplicated by value.
// `apps/api/src/modules/member-pool/pool-identity.ts` delegates here.
//
// ⚠ CORRECTED BY STORY 8.16 — this header used to say that wrapper "keeps its exact exported
// signature ... so no apps/api call site changed". BOTH HALVES STOPPED BEING TRUE when the
// presentation mode landed: the wrapper GAINS the mode and forwards it, and its three call sites pass
// it. The old sentence is corrected rather than left standing beside the new text, because a reader
// who believed it would look for a pass-through that no longer exists — and would reach for the one
// move `2026-09-02-181` cl.2 forbids, a DB read inside the wrapper, to get the mode there.
//
// The logger is an injected `warn`/`error` sink (apps/api passes `request.log`; apps/jobs passes a
// console alarm) — the domain layer owns no Fastify types.
//
// ── STORY 8.16 — WHAT THIS MEANS TO THE MEMBER, IN THEIR TERMS ───────────────────────────────────────
//
// The two sentences below are BigDev's own, confirmed at `#decision-2026-09-08-209` cl.1, and they are
// carried here VERBATIM because this is the one module all four consumers delegate to — it is where a
// code reader meets the decision. They are quoted in exactly three places (here, Story 8.16's
// Policy-meaning section, and the decision entry) and must stay byte-identical; a test in
// `tests/notifications/pool-identity.test.ts` reads this file and asserts both, whitespace-normalised
// and EXACT, so a paraphrase fails loudly rather than drifting.
//
// ⛔ They are a doc-block for developers, NOT rendered copy. No locale key is minted for them.
//
//   "When you open your pool, you will see the name of the colleague whose family you are supporting,
//   in whatever form your Pariwar has chosen for that name — instead of a first name and an initial."
//
//   "Your Pariwar can see this name because you are contributing to this drive. Public display is a
//   separate decision governed by the applicable publication basis."
//
// THE LOGIC IS THREE-PART, and the third part is load-bearing: what you see → why your Pariwar sees it
// → why that does NOT imply public disclosure. Without the third part a member, or a later reader,
// infers a public exposure that does not exist. The governing clause behind it is `2026-09-04-198`
// cl.1: the publication basis governs publication to the WORLD, not what a mutual-aid group is told
// about the family it is being asked to help. This path therefore takes the configured FORM and NOT
// the publication BASIS gate — a member sees a name ALWAYS.
//
// ⚠ STATED, NOT SOFTENED (`-209` cl.2): on a Pariwar in the default `full_name` mode a contributing
// member sees a full legal name that NOBODY can see publicly, because the publication basis is inert
// today. That is the decision, not a side effect. The old justification — "the same name anyone can
// already see on the public page" — was FALSE and must not return (`-209` cl.3).

import * as claimDomain from '../claim/index.js';
import type { Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import { decryptKycField } from '../encryption/member-fields.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import * as kycDomain from '../kyc/index.js';
import { splitFirstNameLastInitial } from '../kyc/name.js';
// ⛔ THE MODE'S TYPE ONLY — never the substrate accessor that reads it. `2026-09-02-181` cl.2 rules the
// mode an INPUT: the CALLER reads it once (per request, or once per pool in the fan-out) and passes it
// down, so this module stays a pure join over a db handle it was given. The fence is not theoretical —
// the whole `kyc` namespace is already imported above, so the accessor is one property access away, and
// a source-scan test asserts its name appears nowhere in this file.
import type { PublicNamePresentationMode } from '../kyc/public-name.js';
import * as poolDomain from '../pool/index.js';

/** The per-pool identity INPUT the resolver needs — everything EXCEPT the deceased-family name, which
 *  the resolver decrypts here. Excludes any per-MEMBER self-state (that is not per-pool). */
export interface PoolIdentityInput {
  readonly claimCaseId: ClaimId;
  readonly poolIndex: number;
  readonly poolCanonicalIdentifier: string;
  /** The SNAPSHOTTED `pools.fixed_amount` (whole INR; echoed through unchanged — never recomputed). */
  readonly fixedAmount: number;
  /** N — the number of pools in the cycle (the curated-name `reserveNames` count). */
  readonly poolCount: number;
}

/** The resolved per-pool identity — card-identical family/letter/name for a pool (D6). */
export interface ResolvedPoolIdentity {
  /**
   * The deceased family's name, ALREADY RESOLVED into the Pariwar's chosen form (Story 8.16 AC3).
   *
   * ⭐ ONE field, and deliberately not the `deceasedFirstName` / `deceasedLastInitial` PAIR it
   * replaces. The pair made each of the four consumers join the parts itself, which is four places a
   * form decision could be taken — and taken differently. The join now happens once, here, under the
   * ruled mode, so "one identity everywhere" (`2026-09-02-180` cl.1) is a property of the TYPE rather
   * than a convention four call sites are trusted to keep.
   *
   * ⛔ The parts are NOT kept alongside it (two sources of truth), and the mode is NOT handed to
   * consumers to re-join with (that grows a second resolution site — AC2b).
   *
   * ⛔ NEVER a full surname stuffed into a field called "last initial": that field's name would lie,
   * every consumer's join would produce the right output for the wrong reason, and the next reader
   * would find a `lastInitial` holding "Kumar".
   */
  readonly deceasedDisplayName: string;
  readonly poolLetterCode: string;
  readonly poolName: string | null;
  readonly poolCanonicalIdentifier: string;
  readonly fixedAmount: number;
}

/** The injected diagnostic sink — apps/api passes `request.log`-backed closures, apps/jobs a console
 *  alarm. Never receives a decrypted name (only the error + the claim id). */
export interface PoolIdentityLogSink {
  readonly warn: (message: string, err: unknown, claimCaseId: string) => void;
  readonly error: (message: string, err: unknown, claimCaseId: string) => void;
}

/**
 * Render a DECEASED member's name for a MEMBER-FACING pool surface, in the Pariwar's configured form.
 *
 * ── ⛔ WHY THIS IS NOT `resolvePublicMemberName` (Trap 5; `2026-09-02-181`) ──────────────────────────
 * The obvious move after the mode ruling is to call the public resolver directly — same two modes, the
 * same shielding helper, one function. It would SILENTLY BREAK A MEMBER SURFACE.
 *
 * For a MONONYM in `shielded_name` mode the public resolver returns `''`, and its callers read `''` as
 * "omit this row" — ruled deliberately at `2026-08-21-145` cl.3, because a shorter directory page
 * beats an unshielded name on a page that promises shielding. Reusing it here would turn "show the
 * family's single name" into "OMIT THE POOL" on the My Pool card, the Yogdaan Bahi, the Contribution
 * Note PDF and the push. Mononyms are common in India; this is not a corner case.
 *
 * ⭐ THE RULE: the two surfaces need the SAME FORM RULE and DIFFERENT ABSENCE BEHAVIOUR. Omitting a row
 * from a public directory is a privacy protection; omitting a member's own pool — the screen that asks
 * them to pay — is a functional regression. ⇒ share the MODE, never the whole function.
 *
 * ⚠ It ALSO cannot fall back through the public resolver's `''`, because `''` there means BOTH
 * "unresolvable name" AND "mononym that cannot be shielded". Those two must not be conflated: the
 * first fail-softs the pool away, the second renders the name.
 *
 * The `shielded_name` arm is `splitFirstNameLastInitial` — that helper IS the implementation of the
 * mode (`2026-08-19-136` cl.2), not a helper this module may decline to use and not one to reimplement.
 *
 * PURE: string work over an ALREADY-DECRYPTED name. Never writes `member_kyc_profiles.name_ciphertext`
 * — one stored name, N presentation modes.
 *
 * @returns the display string, or `''` when the name is unresolvable (the caller fail-softs the pool).
 */
export function resolveMemberFacingDeceasedName(
  mode: PublicNamePresentationMode,
  storedName: string,
): string {
  if (mode === 'shielded_name') {
    const { firstName, lastInitial } = splitFirstNameLastInitial(storedName);
    if (firstName === '') return '';
    // ⭐ A MONONYM CANNOT BE SHIELDED — and on THIS side it is SHOWN, not omitted. That single
    // divergence from the public directory is the whole of Trap 5, and it is the behaviour this
    // surface ALREADY had before Story 8.16 (the old join rendered `firstName` when `lastInitial` was
    // empty). ⛔ This class is UNCHANGED by that story and must not be reported as a closed inversion.
    if (lastInitial === '') return firstName;
    // The trailing period is the PUBLIC form's, and it is matched deliberately: `2026-09-02-181` rules
    // that the two sides share the FORM RULE, so a shielded Pariwar's member and public surfaces must
    // produce the same string for the same name. Only ABSENCE differs.
    return `${firstName} ${lastInitial}.`;
  }
  // `full_name`: the legal name as stored, with display whitespace collapsed. A stored name is a
  // record value, not a display string — collapsing here keeps a stray double space out of the render
  // without touching the record.
  return storedName.trim().split(/\s+/).filter((t) => t.length > 0).join(' ');
}

/** The default sink — stderr. Callers with a real logger pass their own. */
const consoleSink: PoolIdentityLogSink = {
  warn: (message, err, claimCaseId) =>
    console.warn(`[pool-identity] ${message} (claim=${claimCaseId}):`, err),
  error: (message, err, claimCaseId) =>
    console.error(`[pool-identity] ${message} (claim=${claimCaseId}):`, err),
};

/**
 * Resolve a pool's member-facing IDENTITY (D6) — the deceased family's name in the Pariwar's chosen
 * form (the family the pool supports, NOT the nominee) + the letter code + the curated Mahabharata
 * name (else `null` → letter-code fallback). Decrypts the claim's deceased-member KYC name under the
 * caller's Tier-1 material. Returns `null` when the claim / KYC profile / name is unresolvable.
 *
 * NOTE the differing consequence per consumer: the card and the passbook treat `null` as "omit"
 * (fail-soft); the Contribution Note treats it as a 404; the Story 8.8 cycle-open fan-out SKIPS the
 * pool's notification (a push naming no family is a defective artifact, and inventing a placeholder
 * name would be worse). The resolver reports absence the same way to all of them; the caller decides
 * what absence means.
 *
 * @param mode the Pariwar's stored public-name presentation mode, resolved by the CALLER and passed IN
 *   (`2026-09-02-181` cl.2). ⛔ NEVER read inside this function.
 *
 *   ⚠ WHERE THE CALLER READS IT — and why it is positional here, immediately after the `pariwarId` it
 *   is scoped to rather than folded into `input`: `input` is strictly PER-POOL context, and the mode is
 *   PER-PARIWAR. Folding it in would invite the next reader to resolve it per pool. On the API side it
 *   is read ONCE PER REQUEST (the `public-pages` precedent — "RESOLVED ONCE PER REQUEST, NEVER PER
 *   ROW"); in the `apps/jobs` fan-out, once per pool alongside this call, where the join already lives.
 *
 *   ⚠ THE COST OF GETTING IT WRONG, stated accurately: an inside read would be +1 query PER POOL, not
 *   per member — the fan-out resolves the identity once per pool and both alert builders close over
 *   that one value. The reason the mode is an INPUT is the shipped pure-resolver/accessor split, not a
 *   fan-out multiplier.
 *
 *   An absent config row resolves to the RULED default `full_name` at the accessor — deliberately NOT
 *   fail-closed, and no new default is introduced here.
 */
export async function resolvePoolIdentity(
  db: Db,
  encryption: FieldCryptoDeps,
  pariwarId: PariwarId,
  mode: PublicNamePresentationMode,
  input: PoolIdentityInput,
  log: PoolIdentityLogSink = consoleSink,
): Promise<ResolvedPoolIdentity | null> {
  const claimCase = await claimDomain.getClaimCase(db, pariwarId, input.claimCaseId);
  if (!claimCase) return null;
  const kycProfile = await kycDomain.getMemberKycProfile(db, pariwarId, claimCase.deceasedMemberId);
  if (!kycProfile || kycProfile.nameCiphertext === null) return null;
  // A branded PariwarId IS a string (brand is compile-time only) — the KYC decrypt context keys on it.
  // A decrypt failure (bad ciphertext, transient KMS error) must degrade the SAME way as an
  // unresolvable profile — skip THIS pool's identity, never propagate out (letting it throw would
  // blank an entire passbook / abort an entire cycle's fan-out instead of omitting one pool).
  let fullName: string;
  try {
    fullName = await decryptKycField(kycProfile.nameCiphertext, pariwarId, encryption);
  } catch (err) {
    log.warn('deceased name decrypt failed — omitting', err, input.claimCaseId);
    return null;
  }
  // The FORM decision happens HERE and nowhere else (Story 8.16 AC3) — under the ruled mode, once,
  // for all four consumers. `''` is the unresolvable-name signal; a mononym in `shielded_name` mode
  // renders in full rather than returning `''` (Trap 5 — see `resolveMemberFacingDeceasedName`).
  const deceasedDisplayName = resolveMemberFacingDeceasedName(mode, fullName);
  if (deceasedDisplayName === '') return null; // an unresolvable name — fail-soft (no undignified blank)

  // `poolLetterCode` throws `PoolLetterCodeRangeError` for a negative/non-integer poolIndex — a data
  // defect, not something this resolver should propagate: every other unresolvable-input path here
  // (the KYC decrypt above, `resolveCuratedPoolName` below) degrades to skipping THIS pool rather than
  // failing the caller's whole batch.
  let poolLetterCode: string;
  try {
    poolLetterCode = poolDomain.poolLetterCode(input.poolIndex);
  } catch (err) {
    log.error('pool letter code unresolvable — omitting', err, input.claimCaseId);
    return null;
  }
  const poolName = await resolveCuratedPoolName(
    db,
    pariwarId,
    input.poolCount,
    input.poolIndex,
    log,
    input.claimCaseId,
  );

  return {
    deceasedDisplayName,
    poolLetterCode,
    poolName,
    poolCanonicalIdentifier: input.poolCanonicalIdentifier,
    fixedAmount: input.fixedAmount,
  };
}

/**
 * The curated Mahabharata-rooted pool name for THIS pool, or `null` (→ the letter-code fallback). The
 * name is NOT stored per pool (Story 7.2 `names.ts`: `pools` has no name column); it is re-derived by
 * reserving the cycle's N names in position order and indexing by the pool's ordering. Returns:
 *   · `null`   — the Pariwar opted OUT (empty registry — TWT-Bihar launch → letter code everywhere), or
 *                the registry is under-configured (exhaustion) / any read error → letter-code fallback.
 *   · a name   — the position-ordered curated name for `poolIndex`.
 *
 * Locale note (documented seam, unchanged from 8.6): the reservation carries both locales, but this
 * read layer has no viewer locale, so it returns the Hindi-primary name (Hindi-first product). Full
 * bilingual name-by-locale resolution is deferred until a tenant actually configures the registry.
 * Its own try/catch so a config gap degrades to the letter code WITHOUT suppressing the whole surface.
 */
export async function resolveCuratedPoolName(
  db: Db,
  pariwarId: PariwarId,
  poolCount: number,
  poolIndex: number,
  log: PoolIdentityLogSink = consoleSink,
  claimCaseIdForLog = '-',
): Promise<string | null> {
  try {
    const names = await poolDomain.reserveNames(db, { pariwarId, count: poolCount });
    if (names.length === 0) return null; // opted out — letter code (the committed launch behavior)
    const reserved = names[poolIndex];
    return reserved ? reserved.displayNameHi : null;
  } catch (err) {
    if (err instanceof poolDomain.PoolNameListExhaustedError) {
      // A trustee CONFIGURATION GAP (names.ts), not a benign opt-out — surface it loudly so it can be
      // acted on, while still degrading THIS surface to the letter code rather than suppressing it.
      log.error(
        'pool-name registry exhausted — trustee must extend the curated list',
        err,
        claimCaseIdForLog,
      );
      return null;
    }
    log.warn('pool-name registry unresolved — letter-code fallback', err, claimCaseIdForLog);
    return null;
  }
}
