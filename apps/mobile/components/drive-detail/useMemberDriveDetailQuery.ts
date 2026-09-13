import { useQuery } from '@tanstack/react-query'

import type { MemberDriveDetailResponse } from '@twt/contracts'

import { memberAuth } from '../../lib/member-api'

// The member drive-DETAIL read hook — Story 11b.17 (Task 5). Fetches the server-authoritative detail
// via the member-auth SDK (`memberDriveDetail` → GET /api/v1/member/drive-detail/:driveToken). The
// response is Zod-validated inside the SDK.
//
// ── ⚠⛔⛔ THE PERSISTED CACHE NOW HOLDS THE LARGEST TIER-1 PAYLOAD IN THE APP ──────────────────
// This app auto-persists every query to MMKV (`lib/query-client.ts`, `PersistQueryClientProvider`),
// and `deferred-work.md`'s 11b-15 THIRD-pass persisted-query-cache item records that member keys are
// ⛔ NOT scoped by `memberId`/`pariwarId` and that ⛔ NO sign-out path clears the cache at all.
// ⭐ THAT ITEM'S STATED TRIGGER — *"any DPDPA review of at-rest cached personal data on the handset"* —
// **FIRES HERE**: this response carries a bereaved family's FULL account number, IFSC, holder name,
// bank and branch, decrypted, for a drive ANY member of the Pariwar can open.
// ⚠⛔ ⛔ IT IS ⛔ NOT FIXED HERE, AND ⛔ NOT BECAUSE IT DOES NOT MATTER: the fix is ONE REPO-WIDE
// CHANGE (scope every member key by `memberId`/`pariwarId` AND purge on `signOut`), ⛔ not a
// per-surface patch — patching this one key would leave the same gap on `active-contribution`,
// `pool-contributors`, `validity`, `renewal-status` and `yogdaan-bahi` while LOOKING closed.
// ⭐ The trigger is RECORDED AS FIRED against that item ([[feedback_closure_language_precision]]).
//
// ⭐ WHAT THIS HOOK DOES DO ABOUT IT: `gcTime: 0` — ⛔ this response is ⛔ NOT retained after the
// screen unmounts, so it never reaches the MMKV blob in the first place. ⚠ That is a NARROW,
// surface-local mitigation and ⛔ it is ⛔ NOT the repo-wide fix; ⛔ do ⛔ not read it as closing the
// deferred item.
//
// ── ⚠⛔ THE ERROR STATE IS REACHABLE HERE, AND KEEPING IT SO IS THE POINT ────────────────────────
// The route is deliberately NOT fail-soft (see `member-pool/handlers.ts`'s `driveDetail`), so a read
// failure surfaces as React Query's `isError` rather than as an empty screen. ⛔ Do ⛔ not add a
// `placeholderData` / `select` that turns a failure into a blank drive: it would tell a member the
// trust holds nothing about a drive when the truth is that we could not load it.
//
// ── ⭐ THE 404 IS A REAL, EXPECTED BRANCH — AND IT COLLAPSES FIVE CASES DELIBERATELY ────────────
// No such drive · not visible at this surface's predicate (a `spawned` pool) · a malformed token · a
// REAL drive addressed with a WRONG token · ⭐ ANOTHER PARIWAR'S DRIVE. ⛔⛔ The client must ⛔ NOT try
// to distinguish them and must ⛔ NOT report them differently: a surface that separated them would be
// an ENUMERATION ORACLE, which is exactly what Story 11b.10's opaque token exists to close.
// ⇒ ⭐ `retry: false` — a 404 here is an ANSWER, ⛔ not a transient fault, and retrying it three times
// would take the deployment-wide audit-chain lock for nothing.

/**
 * ⭐ Read ONE drive's member-facing detail by its OPAQUE PUBLIC ADDRESS TOKEN.
 *
 * ⚠⛔⛔ **THE ADDRESS IS THE TOKEN AND ⛔ NOTHING ELSE** (`2026-09-03-184` **(B)**, Trustee-ratified).
 * ⛔⛔ The client ⛔ **NEVER** derives it from `poolCanonicalIdentifier` — that identifier is a
 * MONOTONIC per-(pariwar, month) counter and reconstructing an address from it would re-create inside
 * the client the guessability 11b.10 D2 removed. ⭐ `lib/public-site.ts` states the same discipline.
 *
 * ⚠ `enabled` on a non-empty token: Expo Router hands `useLocalSearchParams` an `undefined` on the
 * first render of a deep-linked screen, and firing `/drive-detail/undefined` would spend a request to
 * be told 404.
 */
export function useMemberDriveDetailQuery(driveToken: string | undefined) {
  return useQuery<MemberDriveDetailResponse>({
    // ⚠ The token is the drive's PUBLIC ADDRESS (`pii_tier: 3` — an ADDRESS, ⛔ not a person), so it is
    // safe as a cache key. ⚠⛔ The RESPONSE behind it is ⛔ not: see the header, and `gcTime: 0` below.
    queryKey: ['member', 'drive-detail', driveToken ?? ''],
    queryFn: () => memberAuth.memberDriveDetail(driveToken as string),
    enabled: typeof driveToken === 'string' && driveToken.length > 0,
    // ⭐⭐ ⛔ NOT RETAINED — see the header. ⚠ This is a surface-local mitigation of a repo-wide,
    // pre-existing gap; ⛔ it does ⛔ not close `deferred-work.md`'s persisted-query-cache item.
    gcTime: 0,
    // ⭐ A 404 is an ANSWER, ⛔ not a transient fault — and each retry would decrypt up to eight Tier-1
    // fields and take the deployment-wide audit-chain lock that many times, for nothing.
    retry: false,
  })
}
