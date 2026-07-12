// AR-61 shepherd staff-fallback resolver port — Story 6.12 (Task 4, AC4; RATIFIED correction ii).
//
// SUBSTRATE REALITY: Story 0.7's fallback-handler ledger is DOCUMENTATION-ONLY
// (docs/fallback-handler-ledger/*.md — prose Markdown, no machine-readable rota, no runtime resolver in
// code). So 6.12 must NOT invent runtime resolution from a document. Instead the worker pages the fallback
// through this INJECTED port; the v1 implementation is a config/test-backed stub (the NiyamavaliAmendedHook
// / injected-seam precedent). REAL rota integration (a persisted registry the ops rota writes to) is an
// explicit FOLLOW-UP, not 6.12 scope.
//
// Contactability holds here too (AC2/FR-41): a fallback shepherd MUST have a display name AND ≥1 usable
// contact channel, else it is not a valid reachable shepherd — the config-backed resolver returns `null`
// (→ the worker records it un-resolved: alarm + retry/DLQ), never a nominal-but-unreachable handler.
//
// ── DELIBERATE: no tenant/role check on the returned identity (Review Finding) ────────────────────
// Unlike `resolveShepherdCandidates` (the auto path — scoped to an in-tenant, in-district
// `district_admin`), this port's returned `shepherdActorId` is trusted AS-IS: the worker does not verify
// it holds a `district_admin` grant, or any grant, at the claim's `(pariwarId, district)`, or even that
// the id resolves to a real `users` row. This is BY DESIGN, not an oversight: the fallback fires only
// when the in-scope pool is EMPTY or wholly uncontactable — the entire point of AR-61 is a global,
// off-rota escape valve (an ops/on-call handler) that is reachable precisely because it is NOT
// constrained to hold a grant in the affected Pariwar/district. Enforcing the same scope check as the
// auto path would defeat that purpose. Contactability (display name + ≥1 E.164 channel) is still
// enforced — an unreachable fallback would violate FR-41 outright — but tenant/role authorization is
// deliberately NOT. A future REAL rota resolver (the documented follow-up) should re-examine this
// posture once the handler is a persisted, ops-governed registry rather than a single global env value.

import { SHEPHERD_CONTACT_E164_REGEX } from '@twt/contracts';

/** A resolved fallback shepherd (an already-contactable target — display + ≥1 channel). */
export interface FallbackShepherd {
  /** The fallback handler's users.id (non-PII join key). */
  readonly shepherdActorId: string;
  /** The handler's display name (non-empty). */
  readonly display: string;
  /** The handler's E.164 contact channels (≥1 non-null). */
  readonly contactPhone: string | null;
  readonly contactWhatsapp: string | null;
}

/**
 * The injected AR-61 fallback port: page the fallback shepherd for a claim whose in-scope pool is
 * empty/uncontactable (AC4). Returns the resolved handler, or `null` when NO fallback can be paged (→ the
 * worker records the attempt un-resolved).
 */
export type ShepherdFallbackResolver = (
  pariwarId: string,
  district: string,
  claimCaseId: string,
) => Promise<FallbackShepherd | null>;

/** A malformed (non-E.164) configured channel reads as absent — never snapshotted unvalidated (Review
 *  Finding: the member `GET .../shepherd` route's response schema is E.164-constrained, so a malformed
 *  value would otherwise surface only as a 500 on the member read, long after this resolver ran). */
function validE164OrNull(value: string | null): string | null {
  return value !== null && SHEPHERD_CONTACT_E164_REGEX.test(value) ? value : null;
}

/**
 * The v1 CONFIG-BACKED resolver (the stub). Reads a single global fallback handler from env
 * (SHEPHERD_FALLBACK_ACTOR_ID / _DISPLAY / _PHONE / _WHATSAPP). Returns it ONLY when it is a valid
 * reachable shepherd (actor id + display + ≥1 channel, each channel canonical E.164); otherwise `null`.
 * This is deliberately NOT a rota resolver — it never reads a `.md`. Real rota integration is a follow-up.
 */
export function createConfigShepherdFallbackResolver(
  env: Record<string, string | undefined> = process.env,
): ShepherdFallbackResolver {
  return async () => {
    const shepherdActorId = env['SHEPHERD_FALLBACK_ACTOR_ID']?.trim();
    const display = env['SHEPHERD_FALLBACK_DISPLAY']?.trim();
    const contactPhone = validE164OrNull(env['SHEPHERD_FALLBACK_PHONE']?.trim() || null);
    const contactWhatsapp = validE164OrNull(env['SHEPHERD_FALLBACK_WHATSAPP']?.trim() || null);
    if (!shepherdActorId || !display || (!contactPhone && !contactWhatsapp)) {
      return null;
    }
    return { shepherdActorId, display, contactPhone, contactWhatsapp };
  };
}

/** A fixed-value resolver for tests (the injected fake). */
export function createFixedShepherdFallbackResolver(
  value: FallbackShepherd | null,
): ShepherdFallbackResolver {
  return async () => value;
}
