// Per-Pariwar PUBLIC-NAME PRESENTATION — Story 11a.1 (Task 8; AC5, ruling D1(a)).
//
// ── What this is, and why it is not a formatting helper ──────────────────────
// Decision `2026-08-19-135` cl.7(c), affirmed by `-136`, authorised publishing
// members' FULL LEGAL NAMES on the unauthenticated Member Directory. `-136` then
// bounded that authorisation with three clauses this module implements:
//
//   cl.1 — the implementation "must not hard-code full-name publication as
//          permanent", and ⭐ *"a build in which the public name form cannot be
//          changed without a code change FAILS this clause."* So `full_name` is
//          the DEFAULT, ⛔ never a constant — the mode is STORED, per Pariwar,
//          and the render reads it.
//   cl.2 — `splitFirstNameLastInitial()` IS the implementation of
//          `shielded_name`. ⛔ Not a helper the directory declines to use, and
//          ⛔ not something to reimplement here. The stored KYC name is never
//          written by this path; no second identity system is created.
//   cl.3 — it moves in BOTH directions. ⛔ Not a one-way ratchet toward privacy:
//          a Pariwar that shields may unshield, under the same authority.
//
// ⛔ CHANGING THE MODE IS A GOVERNED ACT, not a tenant preference. It carries a
// permission key held by Super Admin / the Trustee Panel — deliberately NOT
// `pariwar_admin` — plus a §1.5 hash-chain audit line. ⛔ No self-serve admin
// toggle UI ships (Story 11a.1 scope boundary; `-136` cl.3).
//
// ⚠ THE PII TIER DOES NOT MOVE. Member name stays Tier-1 ciphertext plus a Tier-2
// blind index everywhere. The ruling authorises a DECRYPT AT A NAMED SURFACE, not
// a reclassification (`-136` cl.6), and the FR-74 matrix records it as an
// attributed exception rather than as an ordinary `public` field.
//
// PURE: string work over an ALREADY-DECRYPTED name. No clock, no I/O, no db — the
// caller owns the Tier-1 decrypt, exactly as `name.ts` does.

import { splitFirstNameLastInitial } from './name.js';

/**
 * The two ruled presentation modes. This tuple is the ONE spelling authority: the
 * `public_name_presentation_mode` pgEnum is generated from it (the `news_posts`
 * discipline), so the DB value domain and the TS union cannot drift.
 *
 *   · `full_name`     — the member's full legal name as stored on the KYC record.
 *   · `shielded_name` — first name + last initial ("Rajesh S."), via
 *                       `splitFirstNameLastInitial`.
 */
export const PUBLIC_NAME_PRESENTATION_MODES = ['full_name', 'shielded_name'] as const;
export type PublicNamePresentationMode = (typeof PUBLIC_NAME_PRESENTATION_MODES)[number];

/**
 * ⭐ THE LAUNCH POSTURE — and ⛔ a DEFAULT, not a constant.
 *
 * The Panel ruled that full names are published, so a Pariwar with no stored row
 * publishes full names. What makes this a default rather than a hard-coding is
 * that a stored row overrides it, in both directions, with no code change — which
 * is cl.1's requirement, and which `tests/kyc/public-name.test.ts` PROVES rather
 * than asserts.
 *
 * ⚠ It is NOT fail-closed, and that is deliberate and worth being explicit about:
 * fail-closed would mean shielding, which would silently contradict a ratified
 * ruling whenever a config row was missing. The safe default here is the RULED
 * one. (Contrast `per_pariwar_attribute_rule`, where an UNRULED attribute defaults
 * to `operator_restricted` precisely because no ruling covers it.)
 */
export const DEFAULT_PUBLIC_NAME_PRESENTATION_MODE: PublicNamePresentationMode = 'full_name';

/**
 * Render a member's public-directory name in the Pariwar's configured form.
 *
 * @param mode       the Pariwar's stored presentation mode (default when no row).
 * @param storedName the ALREADY-DECRYPTED KYC name. ⛔ Never written by this path.
 * @returns the display string, or `''` when the name is unresolvable — the caller
 *          treats `''` as "omit this row", never as a blank where a person's name
 *          belongs (the `pool-identity.ts` fail-soft precedent).
 */
export function resolvePublicMemberName(
  mode: PublicNamePresentationMode,
  storedName: string,
): string {
  if (mode === 'shielded_name') {
    const { firstName, lastInitial } = splitFirstNameLastInitial(storedName);
    if (firstName === '') return '';
    return lastInitial === '' ? firstName : `${firstName} ${lastInitial}.`;
  }
  // `full_name`: the legal name as stored, with display whitespace collapsed. A
  // stored name is a record value, not a display string — collapsing here keeps a
  // stray double space out of the public render without touching the record.
  return storedName.trim().split(/\s+/).filter((t) => t.length > 0).join(' ');
}
