// THE NAME IN A CLAIM TEXT — Story 6.37e (Task 1.1; AC1; `2026-10-18-359` B, `2026-10-18-362` B; `2026-10-22-377` SN1–SN5).
// ONE pure function for the four texts that name the deceased member in a `{member}` slot: the three suspicion texts
// (`claim-suspicion-notices.ts`) and the text to the five neighbours (`claim-peer-mesh-requests.ts`). ⛔ IO, ⛔ clock.
//
// The Panel's rule (B, twice): *"Send it with the shorter form of the name, only when the full name does not fit — first name and
// the initial of the surname ("Ramesh S."), the form a Pariwar can already choose."* So, in order:
//   I1 — `full`: the mode-resolved name, AS PASSED, whenever it fits (`fitsDltAlphanumeric` — R9's ONE predicate, code points ≤ 40);
//        the fallback never fires "just in case";
//   I2 — `short`: else the Pariwar's EXISTING shielded form — `resolveMemberFacingDeceasedName('shielded_name', …)` (`-181`'s one
//        member-facing form; `-136` cl.2's `splitFirstNameLastInitial`) — when THAT fits; ⛔ truncation, ⛔ a new splitter, ⛔
//        `resolvePublicMemberName` (its mononym `''` would OMIT the text);
//   I3 — `too_long`: else — each caller keeps TODAY's outcome (the suspicion texts: the send core refuses `value_too_long` + alarm;
//        the neighbours' text: claim-wide `no_target:name_too_long`). ⚠ A ONE-word name is the Panel's stated cost; a MULTI-word
//        name whose short form is still over 40 is PQ2 — routed to the Panel as a non-blocking confirm (`-377` decision 8).
//
// ⭐ WHY THE RESOLVED NAME IS THE INPUT (F7): the neighbours' shared reader returns only the mode-resolved name (⛔ the stored
// name, ⛔ the mode — the WhatsApp reminder reads it too and keeps the FULL name, `-365`). Shielding the RESOLVED name gives the
// same short form: in `full_name` mode the resolver and the splitter share one `/\s+/` split; in `shielded_name` mode re-shielding
// is idempotent, or one code point LONGER for a lone Unicode Prepend last token — never shorter, so I3 holds.
// ⚠ AS BUILT (F16, PQ1): the member-facing shielded arm does ⛔ token cleaning — a long name whose first word is an initial or a
// title, or whose last token is punctuation or an invisible character, gets that word / that grapheme (`"K. S."`, `"Venkata -."`).
// ⛔ A name in a log line, alarm, detail or payload — the short form included (I6); ⛔ record that the short form was used (SN5).

import { notifications } from '@twt/domain';

import { fitsDltAlphanumeric } from './peer-mesh-sms-templates.js';

/** The name a claim text carries in `{member}`, or `too_long` (the caller's existing outcome). */
export type SmsMemberName =
  | { readonly kind: 'full'; readonly name: string }
  | { readonly kind: 'short'; readonly name: string }
  | { readonly kind: 'too_long' };

/** A fixed, name-free message — pg-boss keeps a failed job's error. */
const EMPTY_NAME = '[jobs] sms-member-name: an empty or whitespace-only name (a caller bug)';

/**
 * SN2 — the full mode-resolved name if it fits, else the shielded form if THAT fits, else `too_long`. Throws on an empty or
 * whitespace-only name — a programmer error, unreachable from both callers (each turns `''` into `unresolvable` first): returning
 * `too_long` would let a blank `{member}` (0 code points passes the send core's length check) be SENT. Both checks run before the
 * fit: the second is reached only if the first is removed (`trim()` and `/\s+/` share one whitespace set) — belt and braces.
 */
export function smsMemberName(resolvedName: string): SmsMemberName {
  if (resolvedName.trim() === '') throw new Error(EMPTY_NAME);
  const short = notifications.resolveMemberFacingDeceasedName('shielded_name', resolvedName);
  if (short === '') throw new Error(EMPTY_NAME);
  if (fitsDltAlphanumeric(resolvedName)) return { kind: 'full', name: resolvedName };
  if (fitsDltAlphanumeric(short)) return { kind: 'short', name: short };
  return { kind: 'too_long' };
}
