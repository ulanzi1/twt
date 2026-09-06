// English console-chrome resolver for the drive-target module (Story 11b.13, Task 4).
//
// The admin console is ENGLISH-FACING — it resolves chrome KEYS locally to English (the
// nominee-bank-masking / directory-publication / banners per-module `i18n-en.ts` precedent). Every
// `apps/admin` module carries one and EVERY one is English-only; admin copy is staff-facing and
// carries ⛔ no en/hi parity obligation.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// ⛔⛔ THE COPY'S ONE NON-NEGOTIABLE CLAIM: THE FIGURE IS SHOWN TO **NOBODY** UNLESS THE TRUST
// REVEALS IT (AC5)
// ══════════════════════════════════════════════════════════════════════════════════════════════
// `2026-09-04-190` **cl.7(b)**. ⚠ This is ⛔ NOT a nicety: an operator who assumes a target they type
// becomes visible has misunderstood the control entirely, and the mistake is invisible to them —
// there is nothing on any surface to contradict it, because ⛔ nothing renders the target
// (Story 11b.13, Trap 3). ⇒ the page says it in STANDING copy, above the control, in every state.
//
// ⚠⛔ AND ⛔ DO ⛔ NOT PROMISE A PROPAGATION DELAY THAT DOES NOT APPLY. The sibling
// `nominee-bank-masking` console carries an `s-maxage=300` edge-cache disclosure because its setting
// once governed a public projection. ⛔ THIS control governs nothing rendered at all, so an
// equivalent sentence here would describe a mechanism that does not exist. ⭐ What is said instead is
// the TRUE thing: the figure is not shown anywhere yet, and a future surface (Story 11b.14) will
// consume it server-side. ⛔ Do not "improve" this by importing the masking copy.

const EN: Record<string, string> = {
  // ── Page chrome ─────────────────────────────────────────────────────────────
  'driveTarget.header.title': 'Drive target — what this Pariwar aims to raise',
  'driveTarget.header.subtitle':
    "The amount this Pariwar's Sahyog Drives aim to raise. It is the same figure for every drive here — there is no per-drive target. Recording it does not show it to anyone: the figure stays hidden from members and from the public unless the Trust decides otherwise.",

  // ── The standing "this is not shown to anyone" disclosure (AC5) ─────────────
  // ⭐ STANDING copy, rendered ALWAYS and above the control — ⛔ not a success-state message and
  // ⛔ not collapsed behind a disclosure widget. An operator has to read it BEFORE acting.
  'driveTarget.notice.heading': 'Before you set this',
  'driveTarget.notice.body':
    'This figure is not shown to anyone. Members do not see it, the public does not see it, and nothing on any page displays it today. Only the Trust can decide to reveal it, and that is a separate control this screen will only show you if you hold it. Setting a target is never the same thing as revealing one.',

  // ── The target status region ────────────────────────────────────────────────
  'driveTarget.status.heading': 'Current target',
  'driveTarget.status.loading': 'Loading the current target…',
  // ⭐ The `configured: false` case, stated EXPLICITLY — ⛔ never inferred from a blank field. An
  // unset target and a small target are different facts, and Story 11b.14 renders NO progress bar
  // at all for the first.
  'driveTarget.status.unconfigured':
    'No target has ever been recorded for this Pariwar. Nothing has been chosen; this is what applies when nothing is set. Until a target is recorded, no progress can be measured against one.',
  'driveTarget.status.amount': 'Target: ₹{amount}',
  'driveTarget.status.lastChangedBy': 'Last changed by',
  'driveTarget.status.inForceSince': 'In force since',
  'driveTarget.status.lastRationale': 'Reason given',
  'driveTarget.status.version': 'Target version',
  // ⭐⭐ `2026-09-05-201` cl.5 REFUSED removing the version from this screen — the cheap option, and
  // the wrong one: it would remove the operator's provenance view in order to avoid building the
  // guard, on the one surface whose stated purpose IS provenance. ⇒ it stays, and now it means
  // something: it is sent back with the next change, and a mismatch is refused.
  'driveTarget.status.versionHint':
    'This number goes back to the server with your next change. If someone else changes the target first, your change is refused rather than quietly overwriting theirs.',

  // ── The change form ─────────────────────────────────────────────────────────
  'driveTarget.form.heading': 'Change the target',
  'driveTarget.form.amountLabel': 'Target amount (₹)',
  'driveTarget.form.amountHint':
    'Whole rupees, greater than zero. Zero is not a valid target — if you want no target at all, that is a different thing and is not set from this screen.',
  'driveTarget.form.amountInvalid': 'Enter a whole number of rupees between 1 and 100000000.',
  'driveTarget.form.rationaleLabel': 'Reason for this change',
  'driveTarget.form.rationaleHint':
    'Required. Recorded permanently against your name in the audit trail, alongside the change itself. The target it replaces is kept, not overwritten.',
  'driveTarget.form.rationalePlaceholder':
    'e.g. Trustee Board resolution of 12 September — each drive to aim for ₹5,00,000.',
  'driveTarget.form.submit': 'Save this target',
  'driveTarget.form.submitPending': 'Saving…',
  'driveTarget.form.rationaleRequired': 'A reason is required before you can save this change.',
  'driveTarget.form.rationaleTooLong': 'That reason is too long — keep it under 2000 characters.',

  // ── The reveal region (super_admin only) ────────────────────────────────────
  // ⛔⛔ RENDERED ONLY WHEN THE SERVER ANSWERS THE VISIBILITY READ. A pariwar_admin gets a 403 there,
  // and this whole section stays absent — which is AC5's "the reveal switches are visible only to a
  // super_admin", satisfied by the SERVER's answer rather than by a client-side role check.
  'driveTarget.reveal.heading': 'Who may see this target',
  'driveTarget.reveal.loading': 'Checking whether you hold the reveal control…',
  'driveTarget.reveal.intro':
    'Revealing the target is a separate decision from setting it, and it is held by the Trust centrally rather than by each Pariwar. The two switches below are independent.',
  'driveTarget.reveal.unconfigured':
    'No reveal decision has ever been recorded for this Pariwar, so the target is hidden from everyone. Nobody chose this; it is what applies when nothing has been decided.',
  'driveTarget.reveal.members': 'Members of this Pariwar may see the target',
  'driveTarget.reveal.public': 'Anyone on the internet may see the target',
  // ⭐⭐ The ONE refused combination (`2026-09-04-189` cl.3), stated in the form rather than only
  // discovered as a 422. ⚠ It is ONE-WAY: revealing to members without revealing publicly is the
  // ordinary case and is never refused.
  'driveTarget.reveal.orderHint':
    'The public can never be shown more than members are. If you want the target public, members must be able to see it too.',
  'driveTarget.reveal.orderInvalid':
    'The target cannot be public while it is hidden from members. Turn on the members switch as well, or turn off the public switch.',
  'driveTarget.reveal.rationaleLabel': 'Reason for this decision',
  'driveTarget.reveal.rationaleHint':
    'Required. Recorded permanently against your name in the audit trail. A decision about what the public can see is not recorded as a bare value change.',
  'driveTarget.reveal.submit': 'Save this decision',
  'driveTarget.reveal.submitPending': 'Saving…',
  'driveTarget.reveal.lastChangedBy': 'Last changed by',
  'driveTarget.reveal.lastRationale': 'Reason given',
  'driveTarget.reveal.updatedAt': 'Last changed',
  // ⚠ Even a revealed target is not rendered anywhere TODAY — Story 11b.14 builds the first
  // consumer. ⛔ Saying so is the honest thing: an operator who reveals it and then goes looking for
  // it on the public page must not conclude the switch failed.
  'driveTarget.reveal.noConsumerNote':
    'Note: no page displays this target yet, in any state of these switches. These switches decide what a future page will be allowed to show; they do not make anything appear today.',

  // ── Outcome copy ────────────────────────────────────────────────────────────
  'driveTarget.result.saved':
    'Saved. This is now the target of record for this Pariwar. It is still not shown to anyone.',
  'driveTarget.result.revealSaved': 'Saved. This is now the reveal decision of record.',
  'driveTarget.error.heading': 'That change did not go through',
  'driveTarget.error.forbidden':
    'Your account does not hold the permission this control requires. Recording a target is granted to Pariwar administrators; deciding who may see it is granted to super administrators only, because the Trustee Panel ruled that revealing the figure is held by the Trust centrally.',
  // ⚠ A 409 version conflict — the ONE error whose copy has to explain a concept. ⛔ Not a server
  // fault and ⛔ not fixed by retrying the same submission.
  'driveTarget.error.versionConflict':
    'Somebody else changed the target while this page was open, so your change was not saved — saving it would have quietly undone theirs. Reload to see the current target, then decide whether you still want your change.',
  'driveTarget.error.displayNameMissing':
    'Your change was not saved because your user record has no display name set. Every change to this setting is recorded against the person who made it, so a name is required before you can save. Ask an administrator to add a display name to your account, then try again.',
  'driveTarget.error.invalid':
    'The server rejected these values, so nothing was saved. Check that the amount is a whole number of rupees greater than zero and within the permitted range, and that the reason is not excessively long.',
  'driveTarget.error.visibilityInvalid':
    'The target cannot be revealed to the public while it is hidden from members — that would show the public more than a member of this Pariwar. Nothing was saved.',
  'driveTarget.error.unexpected':
    'Something went wrong on the server and the change may not have been saved. Reload the page to check the current values before trying again.',
};

export function resolveEn(key: string): string {
  return EN[key] ?? key;
}
