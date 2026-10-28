// What a declaring trustee is told about the cycle-open SMS bridge — Story 5.8b (FS11 (a), FS4 (d), FS17 (a); `2026-10-28-415`).
//
// ONE wording, used on the page header, the declare form and the active banner (it REPLACES 5.8's AR-20 promise that cycle-open
// alerts *"force SMS to every eligible member, bypassing cost-optimization"* — false since 5.11 and false under FS3 (a): the text goes
// first and the app / WhatsApp ladder is the fallback; cost-optimization never touched a time-critical alert). Hard-coded English like
// the rest of this module (5.8's review; T17 — ⛔ an i18n wrapper for one sentence). True at merge: ⛔ template id is approved yet, so
// nothing is texted until then (said); declaring after a freeze never bridges that cycle, revoking after it never un-bridges it (F2).

/** FS11 (a)'s sentence, verbatim (BigDev, 2026-10-28). */
export const BRIDGE_TEXT_EXPLAINER =
  'While this is active, each cycle that opens texts every member assigned to a pool in it, once, in their language — once the ' +
  "bridge's text templates are approved (until then no text is sent). A member who cannot be texted still gets the app and " +
  'WhatsApp notification. A cycle that opened before you declared is not affected; revoking does not stop texts for a cycle that ' +
  'opened while this was active.';

/** FS4 (d) — the death overlay is excluded (I10). */
export const BRIDGE_TEXT_DEATH_EXCLUSION = 'Members whose death has been reported are not texted.';

/** FS17 (a) — the Trust-wide switch. */
export const BRIDGE_TEXT_SWITCH_NOTE = 'A Super Admin can switch these texts off for every Pariwar.';

/** The three, in order — the one paragraph each surface shows. */
export const BRIDGE_TEXT_PARAGRAPH = `${BRIDGE_TEXT_EXPLAINER} ${BRIDGE_TEXT_DEATH_EXCLUSION} ${BRIDGE_TEXT_SWITCH_NOTE}`;
