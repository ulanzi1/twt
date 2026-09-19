// The SHARED name-render helpers: the name normaliser and the KMS-outage classifier.
// Story 11b.21 (Task 2; `#decision-2026-09-19-224` D4).
//
// ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────────────────
// Every declaration below lived module-private in `public-pages/handlers.ts` (Story 11b-3b, its fourth
// to sixth review passes) until Story 11b.21 needed the SAME behaviour on the member contributor list
// (`member-pool/handlers.ts`, `resolveContributorList`). Moved VERBATIM, doc-blocks included; the ONE
// change is `KmsOutageError`'s message, which named the public surface and is now neutral.
// ⭐ A second consumer exists ⇒ shared tooling inside `apps/api`, ⛔ not a new package
// ([[project_no_premature_package]]). ⛔ Never fork a second copy: the two routes' parity (`-189` cl.3)
// depends on both surfaces normalising and classifying the same way.

import type { AppDeps } from '../../context.js';

/**
 * ⭐ Characters that occupy ⛔ no visual space — used to decide whether a name is VISUALLY EMPTY and
 * to trim the EDGES of the resolved name. ⛔ NEVER to rewrite the interior. See
 * {@link normalisePublicName}. ⚠ Word-level cleaning of the STORED name (dropping a token with no
 * letter or digit) is ⛔ not done with this list — it lives in `@twt/domain`'s `publicNameTokens`,
 * an allowlist, because a denylist of invisibles can never be complete (sixth review pass).
 *
 * ⚠ Wider than the old `\u200b-\u200f\ufeff`: word joiner + invisible operators, soft hyphen,
 * combining grapheme joiner, Hangul fillers, Mongolian vowel separator, bidi embedding/override and
 * isolate controls, the braille blank, and variation selectors. ⛔ Every one survives
 * `String.prototype.trim()` AND a `.min(1)` bound, and would render an EMPTY `<li>` — which, now that
 * every other withheld row carries visible placeholder text, is the ONE row that announces itself.
 */
// ⚠⛔ **`no-misleading-character-class` IS SUPPRESSED DELIBERATELY, AND ⛔ NOT TO SILENCE A BUG.**
// The rule guards against a class that accidentally SPLITS a grapheme. ⭐ Here the individual
// code points ARE the subject — `\u034f` (combining grapheme joiner) and `\ufe00-\ufe0f`
// (variation selectors) are combining marks we must detect ON THEIR OWN, because a stored name
// consisting only of them is exactly the blank-row case this class exists to catch. ⭐ Both
// regexes carry the `u` flag, so each escape is one code point. ⛔ Re-examine if this class ever
// grows a member intended to match a COMBINED sequence rather than a lone invisible.
/* eslint-disable no-misleading-character-class */
const INVISIBLE_CHARS = /[\u00ad\u034f\u115f\u1160\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\u2800\u3164\ufe00-\ufe0f\ufeff]/gu;

/** Whitespace OR an invisible, anchored to the edges. */
const EDGE_INVISIBLE_OR_SPACE = /^[\s\u00ad\u034f\u115f\u1160\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\u2800\u3164\ufe00-\ufe0f\ufeff]+|[\s\u00ad\u034f\u115f\u1160\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\u2800\u3164\ufe00-\ufe0f\ufeff]+$/gu;
/* eslint-enable no-misleading-character-class */

/**
 * ⭐ Bidi EMBEDDING / OVERRIDE / ISOLATE controls (U+202A–U+202E, U+2066–U+2069) — stripped from the
 * INTERIOR of the value that ships, ⛔ unlike every other invisible above.
 *
 * ⚠⛔ **FOUND 2026-09-18 (fourth review pass).** {@link normalisePublicName} keeps the interior intact
 * so ZWJ/ZWNJ survive — which also kept an interior RLO/LRO, and a stored name carrying one visually
 * REORDERS the text around it on the public page. ⭐ These controls are ⛔ never part of a legal name in
 * any script this Trust serves, so removing them cannot alter a spelling — ⛔ unlike U+200C/U+200D,
 * which ⛔ must stay. ⛔ Do ⛔ not widen this class to the joiners or to LRM/RLM.
 */
const BIDI_CONTROLS = /[\u202a-\u202e\u2066-\u2069]/gu;

/**
 * ⭐ THE PUBLIC NAME NORMALISER — the member’s name as stored, edge-trimmed, or `null` when there
 * is nothing visible to render.
 *
 * ⚠⛔⛔ **IT ⛔ MUST ⛔ NOT REWRITE THE INTERIOR OF A NAME, AND THE FIRST VERSION OF THIS HELPER DID.**
 * Found 2026-09-17 by adversarial review. It ran `value.replace(/[\u200b-\u200f\ufeff]/g, '')`
 * GLOBALLY and returned the rewritten string. That range contains **U+200C ZERO WIDTH NON-JOINER**
 * and **U+200D ZERO WIDTH JOINER**, which are ⛔ **not** invisible noise in Devanagari, Bengali,
 * Gujarati or Gurmukhi — they select half-form versus conjunct. ⇒ a stored legal name
 * `प्रज्‍ञा` was published as `प्रज्ञा`: a DIFFERENT spelling of a real person’s name, on a
 * public memorial page, silently, with ⛔ no log. ⛔⛔ On a surface whose whole purpose is that a
 * family can CHECK the record, publishing an altered name is worse than publishing none.
 *
 * ⭐ **SO THE STRIP IS A TEST, ⛔ NOT A TRANSFORM:** invisibles come off a COPY to ask *"is anything
 * visible here?"*. What ships is edge-trimmed, with ⛔ one interior exception: bidi embedding/override/
 * isolate controls ({@link BIDI_CONTROLS}) are removed everywhere, since they are never part of a
 * spelling and an interior RLO reorders the text around it (fourth review pass, 2026-09-18). ⛔ The
 * joiners stay.
 *
 * ⚠ Returns `null` for "nothing to render", ⛔ never `''`. ⛔ And `null` carries ⛔ NO cause
 * (`2026-09-16-219` cl.3): an all-invisible name, an erasure and a failed decrypt are
 * indistinguishable downstream.
 */
export function normalisePublicName(value: string): string | null {
  const edgeTrimmed = value.replace(EDGE_INVISIBLE_OR_SPACE, '').replace(BIDI_CONTROLS, '');
  // ⚠ The COPY decides emptiness; `edgeTrimmed` is what ships — interior joiners intact.
  if (edgeTrimmed.replace(INVISIBLE_CHARS, '').trim() === '') return null;
  return edgeTrimmed;
}

/**
 * ⭐ A KMS failure that is ⛔ NOT a rejection of the envelope being decrypted — the service is down,
 * throttled, timing out, denying permission, or refusing the key version. ⛔ Never about one member.
 */
export class KmsOutageError extends Error {
  constructor(cause: unknown) {
    super('KMS unavailable while resolving contributor names', { cause });
    this.name = 'KmsOutageError';
  }
}

/** gRPC `INVALID_ARGUMENT` — Cloud KMS's answer for a malformed ciphertext or an AAD mismatch. */
const GRPC_INVALID_ARGUMENT = 3;

/**
 * ⭐⭐ The request's crypto deps with `kms.decryptDek` failures CLASSIFIED (fifth review pass,
 * 2026-09-18; BigDev option 1, *"classify by the error"*).
 *
 *  · ⭐ `code === 3` (INVALID_ARGUMENT) ⇒ KMS rejected THIS envelope ⇒ re-thrown unchanged, and the row's
 *    catch renders the placeholder. ⚠ The fake provider throws the same code for the same faults, so the
 *    integration legs exercise this path, ⛔ not a test-only one.
 *  · ⛔ ANY OTHER failure — a gRPC status (UNAVAILABLE, RESOURCE_EXHAUSTED, DEADLINE_EXCEEDED,
 *    PERMISSION_DENIED, FAILED_PRECONDITION for a disabled key version…) or a status-less error (the
 *    HSM protection-level assertion, an empty response) ⇒ `KmsOutageError`.
 *  · ⭐ Faults AFTER the DEK is unwrapped (envelope parse, the data's GCM tag) never pass through here ⇒
 *    they stay per-envelope, which is what they are.
 *
 * ⚠ **RECORDED COSTS — facts, ⛔ not rules (sixth review pass, 2026-09-18):**
 *  · A row wrapped under a KEK version that is now DISABLED or DESTROYED fails with a non-3 status and is
 *    classed an OUTAGE here ⇒ every page holding it answers 500 (the public app's 503 outage view) while
 *    that version is unavailable, although rows on the current version decrypt. ⛔ Nothing here decides
 *    whether KEK versions may be disabled.
 *  · The premise that Cloud KMS answers INVALID_ARGUMENT for an AAD mismatch or a corrupted ciphertext
 *    is ⛔ UN-ATTESTED against the live service. If it answers otherwise, a corrupt row fails CLOSED (an
 *    outage), ⛔ not open. Verification is owed (`deferred-work.md`, 11b-3b sixth pass).
 *
 * ⚠ The original is looked up AT CALL TIME (`enc.kms.decryptDek(…)`, ⛔ not a captured reference) so a
 * test spy installed on the shared provider still applies.
 */
export function withKmsOutageClassification(enc: AppDeps['encryption']): AppDeps['encryption'] {
  return {
    ...enc,
    kms: {
      ...enc.kms,
      decryptDek: async (encryptedDek, kekRef, aad) => {
        try {
          return await enc.kms.decryptDek(encryptedDek, kekRef, aad);
        } catch (err) {
          const code = typeof err === 'object' && err !== null ? (err as { code?: unknown }).code : undefined;
          if (code === GRPC_INVALID_ARGUMENT) throw err;
          throw new KmsOutageError(err);
        }
      },
    },
  };
}
