// Test-only stand-in for `@twt/domain`'s `notifications.resolvePoolIdentity` — Story 8.8 (Task 1).
//
// ── Why this exists ────────────────────────────────────────────────────────────────────────────────
// Story 8.8 relocated the shared per-pool identity join (the deceased family's name in the Pariwar's
// chosen form + letter code + curated name) from `apps/api/src/modules/member-pool/pool-identity.ts` into
// `@twt/domain` (`notifications/pool-identity.ts`), because the cycle-open notification payload AC1
// needs it from `apps/jobs`, which cannot import `apps/api`.
//
// The apps/api HANDLER suites mock the `@twt/domain` BARREL per-namespace (`claim.getClaimCase`,
// `kyc.getMemberKycProfile`, `pool.reserveNames`, …) plus apps/api's own `kyc-crypto.decryptKycField`.
// The relocated resolver imports its collaborators through domain-INTERNAL relative paths, so those
// barrel mocks no longer intercept it. Rather than weaken every handler assertion to a single opaque
// "identity resolved" fake, this helper re-composes the join over exactly the same mocked collaborators
// the suites already configure — so every existing handler expectation (including the fail-soft
// omit-on-unresolvable paths) keeps its original meaning.
//
// The REAL resolver's own behaviour is covered where it now lives:
// `packages/domain/tests/notifications/pool-identity.test.ts`. This file is a test double, never
// production code — it must stay a faithful mirror of the domain implementation.
//
// ⚠⛔ IT IS A POSITIONAL MIRROR OF THE DOMAIN SIGNATURE, read by THREE suites. When that signature
// moves, this file moves in the SAME COMMIT — otherwise all three go green against the wrong shape,
// which is the one failure mode a test double can have that is worse than no double at all.
// Story 8.16 inserted the presentation `mode` between `pariwarId` and `input`, and swapped the
// first-name/last-initial PAIR for one resolved `deceasedDisplayName`.

interface ResolvePoolIdentityFakeDeps {
  readonly getClaimCase: (...args: never[]) => Promise<{ deceasedMemberId: string } | undefined>;
  readonly getMemberKycProfile: (
    ...args: never[]
  ) => Promise<{ nameCiphertext: string | null } | null>;
  readonly decryptKycField: (...args: never[]) => Promise<string>;
  readonly reserveNames: (...args: never[]) => Promise<{ displayNameHi: string }[]>;
  readonly poolLetterCode: (poolIndex: number) => string;
  readonly splitFirstNameLastInitial: (fullName: string) => {
    firstName: string;
    lastInitial: string;
  };
}

/** Build a `resolvePoolIdentity` double with the domain implementation's exact control flow. */
export function createResolvePoolIdentityFake(deps: ResolvePoolIdentityFakeDeps) {
  return async function resolvePoolIdentity(
    db: unknown,
    encryption: unknown,
    pariwarId: string,
    /** Story 8.16 — the Pariwar's stored presentation mode, resolved by the CALLER and passed in. */
    mode: 'full_name' | 'shielded_name',
    input: {
      claimCaseId: string;
      poolIndex: number;
      poolCanonicalIdentifier: string;
      fixedAmount: number;
      poolCount: number;
    },
  ) {
    const call = (fn: (...args: never[]) => unknown, ...args: unknown[]): unknown =>
      (fn as (...a: unknown[]) => unknown)(...args);

    const claimCase = (await call(deps.getClaimCase, db, pariwarId, input.claimCaseId)) as
      | { deceasedMemberId: string }
      | undefined;
    if (!claimCase) return null;
    const kycProfile = (await call(
      deps.getMemberKycProfile,
      db,
      pariwarId,
      claimCase.deceasedMemberId,
    )) as { nameCiphertext: string | null } | null;
    if (!kycProfile || kycProfile.nameCiphertext === null) return null;

    let fullName: string;
    try {
      fullName = (await call(
        deps.decryptKycField,
        kycProfile.nameCiphertext,
        pariwarId,
        encryption,
      )) as string;
    } catch {
      return null; // decrypt failure degrades exactly like an unresolvable profile
    }
    // Story 8.16 — the same form decision the domain resolver makes, mirrored exactly. NOTE the
    // MONONYM arm: `shielded_name` with no surname renders the whole stored name here, where the
    // PUBLIC resolver would return `''` and its callers would omit the row (Trap 5).
    const { firstName, lastInitial } = deps.splitFirstNameLastInitial(fullName);
    const deceasedDisplayName =
      mode === 'shielded_name'
        ? firstName === ''
          ? ''
          : lastInitial === ''
            ? firstName
            : `${firstName} ${lastInitial}.`
        : fullName.trim().split(/\s+/).filter((t) => t.length > 0).join(' ');
    if (deceasedDisplayName === '') return null;

    let poolLetterCode: string;
    try {
      poolLetterCode = deps.poolLetterCode(input.poolIndex);
    } catch {
      return null; // mirrors the real resolver's fail-soft omit-this-pool degradation
    }

    let poolName: string | null;
    try {
      const names = (await call(deps.reserveNames, db, {
        pariwarId,
        count: input.poolCount,
      })) as { displayNameHi: string }[];
      poolName = names.length === 0 ? null : (names[input.poolIndex]?.displayNameHi ?? null);
    } catch {
      poolName = null; // opt-out / exhaustion / read error → letter-code fallback
    }

    return {
      deceasedDisplayName,
      poolLetterCode,
      poolName,
      poolCanonicalIdentifier: input.poolCanonicalIdentifier,
      fixedAmount: input.fixedAmount,
    };
  };
}
