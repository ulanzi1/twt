// What a declaring trustee is told about the cycle-open SMS bridge — Story 5.8b (FS11 (a), FS4 (d), FS17 (a); `2026-10-28-415`).
//
// ONE wording, used on the page header, the declare form and the active banner (it REPLACES 5.8's AR-20 force-SMS sentence — false
// since 5.11 and false under FS3 (a): the text goes first and the app / WhatsApp ladder is the fallback; cost-optimization never touched
// a time-critical alert). Hard-coded English like the rest of this module (5.8's review; T17 — ⛔ an i18n wrapper for one sentence).
// True at merge: ⛔ template id is approved yet, so nothing is texted until then (said); declaring after a freeze never bridges that
// cycle, revoking after it never un-bridges it (F2).

/**
 * FS11 (a)'s template caveat — its words, cut out of the sentence below (⛔ new words) so the banner's "armed" headline can carry it
 * (code review 2026-10-28 (second pass), Decision 1 (b)).
 */
export const BRIDGE_TEXT_TEMPLATE_CAVEAT = "once the bridge's text templates are approved (until then no text is sent)";

/** FS11 (a)'s sentence, verbatim (BigDev, 2026-10-28). */
export const BRIDGE_TEXT_EXPLAINER =
  'While this is active, each cycle that opens texts every member assigned to a pool in it, once, in their language — ' +
  `${BRIDGE_TEXT_TEMPLATE_CAVEAT}. A member who cannot be texted still gets the app and ` +
  'WhatsApp notification. A cycle that opened before you declared is not affected; revoking does not stop texts for a cycle that ' +
  'opened while this was active.';

/** FS4 (d) — the death overlay is excluded (I10). */
export const BRIDGE_TEXT_DEATH_EXCLUSION = 'Members whose death has been reported are not texted.';

/** FS17 (a) — the Trust-wide switch. */
export const BRIDGE_TEXT_SWITCH_NOTE = 'A Super Admin can switch these texts off for every Pariwar.';

/**
 * FS17 (a) — the banner's "switched off" words (Story 5.8b's banner headline, moved here unchanged). Code review 2026-10-28 (second
 * pass), Decision 1 (b) (BigDev): the SAME words sit beside the paragraph in the header and the declare form while the switch is OFF,
 * so the paragraph's "texts every member" never stands alone then — ⛔ new words.
 */
export const BRIDGE_TEXTS_SWITCHED_OFF =
  "the bridge's texts are switched off for every Pariwar; the app and WhatsApp notifications still go";

/** {@link BRIDGE_TEXTS_SWITCHED_OFF} standing as its own sentence (capital first letter, full stop — the same words). */
export const BRIDGE_TEXTS_SWITCHED_OFF_SENTENCE = `${BRIDGE_TEXTS_SWITCHED_OFF.charAt(0).toUpperCase()}${BRIDGE_TEXTS_SWITCHED_OFF.slice(1)}.`;

/**
 * Code review 2026-10-28 (P2-3; invariant family 13 (d)) — the confirmation a Super Admin's change is ANNOUNCED with (the page's
 * persistent status region): the state the SERVER returned, so a screen-reader operator hears what a sighted one sees.
 */
export function bridgeSwitchSavedMessage(enabled: boolean): string {
  return enabled ? 'Saved — bridge texts are now ON for every Pariwar.' : 'Saved — bridge texts are now OFF for every Pariwar.';
}

/** The three, in order — the one paragraph each surface shows. */
export const BRIDGE_TEXT_PARAGRAPH = `${BRIDGE_TEXT_EXPLAINER} ${BRIDGE_TEXT_DEATH_EXCLUSION} ${BRIDGE_TEXT_SWITCH_NOTE}`;
