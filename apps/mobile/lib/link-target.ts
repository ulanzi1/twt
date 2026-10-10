// The link target a login keeps (Story 6.30, `2026-10-10-312` AL6 (ii)–(iv), corrected by `-315` C3).
//
// Architecture §4.7 item 1: *"re-auth flow preserves the deep-link target as the post-auth redirect"*.
// When the root guard sends a member without a session to login, it RECORDS the screen they asked for;
// after the OTP, `app/(auth)/otp.tsx`'s full-session branch TAKES it (once) and replaces to it instead
// of `/(tabs)`.
//
// ⛔ Four rules, each load-bearing:
//  1. MEMORY only — a module-level holder, ⛔ never MMKV / SecureStore: a link target never outlives the
//     app process (a stored target could replay a stale request after a different member logs in on the
//     same phone — Trap 4).
//  2. An ALLOWLIST — only an `APP_LINK_PATHS` path, and only its `c` after `parseAppLinkCode` (⛔ no
//     other parameter is carried; a missing / malformed / repeated `c` ⇒ ⛔ no target ⇒ `/(tabs)`).
//  3. ONE consumer — `otp.tsx`'s full-session branch, BEFORE `await signIn(…)`. The guard's own
//     post-login branch stays `/(tabs)` and ⛔ never reads the holder (two consume-once sites turn every
//     login into a race — Trap 12).
//  4. CLEARED on the signup branch (before `signIn`), on `signOut()`, and on both termination paths
//     (the refresh handler in `session-context.tsx`, `otp.tsx`'s terminated branch). The termination
//     redirect WINS over any target.
// ⛔ Never log the code (6.27 PM21 (e)).

import { APP_LINK_PATH_LIST, parseAppLinkCode, type AppLinkPath, type AppLinkSearchParams } from '@twt/contracts'

/** A screen a link asked for: an app-link path and its code. */
export interface LinkTarget {
  readonly pathname: AppLinkPath
  readonly params: { readonly c: string }
}

let pending: LinkTarget | null = null

/** The target for `pathname` + `params`, or `null` when the path is ⛔ not an app-link path or `c` is unusable. */
export function linkTargetFrom(pathname: string, params: AppLinkSearchParams): LinkTarget | null {
  const path = APP_LINK_PATH_LIST.find((candidate) => candidate === pathname)
  if (path === undefined) return null
  const code = parseAppLinkCode(params)
  return code === null ? null : { pathname: path, params: { c: code } }
}

/**
 * Called by the root guard as it sends a member without a session to login. The latest request wins —
 * a redirect from a screen that is ⛔ not an app-link target CLEARS any earlier one.
 */
export function recordLinkTarget(pathname: string, params: AppLinkSearchParams): void {
  pending = linkTargetFrom(pathname, params)
}

/** The ONE consumer (`otp.tsx`'s full-session branch): returns the target and clears it. */
export function takeLinkTarget(): LinkTarget | null {
  const target = pending
  pending = null
  return target
}

/** Signup, sign-out and both termination paths. */
export function clearLinkTarget(): void {
  pending = null
}
