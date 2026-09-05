// English console-chrome resolver for the nominee-bank masking-schedule module (Story 11b.3a, Task 5).
//
// The admin console is ENGLISH-FACING — it resolves chrome KEYS locally to English (the
// directory-publication / banners / news-blog / helpdesk per-module `i18n-en.ts` precedent). Every
// `apps/admin` module carries one and EVERY one is English-only; there is no `i18n-hi.ts` anywhere in
// `apps/admin`. Admin copy is staff-facing and carries no en/hi parity obligation.
//
// ⚠ This is ADMIN CHROME: English-facing operator copy. It is NOT a `packages/i18n` catalog key and
// NOT member-facing bilingual content.
//
// ⛔⛔ THE ADVERBS OF IMMEDIACY MAY NOT APPEAR IN THIS FILE, AND NEITHER MAY AN OFFER OF DIRECT SQL —
// the gate named below holds the actual lists, and ⛔ this comment deliberately does not spell them
// out (writing them here would make the scan find itself and read as a real violation).
// Story 11b.3a AC6: a change here is ⛔ NOT immediate. `/sahyog-vivran/[driveToken]` is
// `edge_cacheable` with `s-maxage=300`, so the PREVIOUS projection keeps being served from every warm
// edge PoP until those entries expire — and on THIS control what is served stale is a FULL ACCOUNT
// NUMBER, which is why the same statement is required in three places (here, the schema file and the
// public route header). A source-scan test (`tests/nominee-bank-masking-terminology.test.ts`) fails
// the build if a banned term appears here or if the disclosure disappears. ⛔ Do not "improve" the
// copy past that gate.

const EN: Record<string, string> = {
  // ── Page chrome ─────────────────────────────────────────────────────────────
  // ⛔ [Review, 11b.11] The four strings below (header.subtitle, status.unconfigured,
  // status.afterDaysZero, status.afterDays, status.permanent) previously described this setting as
  // governing what a family's bank details show on the public Sahyog Vivran page — including which
  // specific fields "remain visible". As of Story 11b.11 (`2026-09-04-190` cl.1) that page never
  // renders the account number, IFSC, bank name, branch or VPA at all, in ANY state of this
  // schedule — the fields themselves were withdrawn, not merely masked. This setting is retained
  // (`-190` cl.4) but currently governs nothing an operator can observe on the public surface; the
  // copy below says so plainly rather than describing a behaviour that no longer occurs.
  'nomineeBankMasking.header.title': 'Nominee bank details — public visibility',
  'nomineeBankMasking.header.subtitle':
    "Controls how long a family's bank account details would stay visible on this Pariwar's public Sahyog Vivran page after a drive closes — but as of Story 11b.11 that page no longer shows any bank detail at all, in any state of this setting. Changing this setting has no visible effect on the public page today; it is kept ready in case that changes.",

  // ── The propagation-floor disclosure (AC6) ──────────────────────────────────
  // ⭐ STANDING copy, rendered ALWAYS — not only after a successful change. Kept even though the
  // public page currently has nothing left for a stale edge cache to leak: the delay itself is a
  // real property of this control, and the day this setting governs a public field again, the
  // caching floor applies from the first change onward, not from whenever someone remembers to
  // restore this disclosure.
  'nomineeBankMasking.propagation.heading': 'Before you change this',
  'nomineeBankMasking.propagation.body':
    "A change here is not reflected on the public pages at once. Those pages are served through an edge cache with a five-minute lifetime (s-maxage=300), so the previous version can keep being served from warm edge locations until those cached copies expire. As of Story 11b.11 this setting has no public field left to affect, so today that delay has no visible consequence — this disclosure is retained for whenever this setting is next wired to something the public page shows.",

  // ── Status region ───────────────────────────────────────────────────────────
  'nomineeBankMasking.status.heading': 'Current setting',
  'nomineeBankMasking.status.loading': 'Loading the current setting…',
  // ⭐ The `configured: false` case: no setting has ever been recorded, which resolves FAIL-OPEN
  // (2026-09-02-179 cl.1) — a RULED default, not an accident. As of Story 11b.11 that default has
  // no visible consequence on the public page (see the file-level note above), so the operator is
  // told the setting's state honestly without claiming an effect that no longer happens.
  'nomineeBankMasking.status.unconfigured':
    'No setting has ever been recorded for this Pariwar. Nobody has chosen this; it is what applies when nothing has been set. As of Story 11b.11 the public Sahyog Vivran page shows no bank detail regardless of this setting, so this has no visible effect today.',
  'nomineeBankMasking.status.afterDaysZero':
    'Set to hide as soon as a drive closes. As of Story 11b.11 the public Sahyog Vivran page shows no bank detail regardless of this setting, so this has no visible effect today.',
  'nomineeBankMasking.status.afterDays':
    'Set to hide {days} days after a drive closes. As of Story 11b.11 the public Sahyog Vivran page shows no bank detail regardless of this setting, so this has no visible effect today.',
  'nomineeBankMasking.status.permanent':
    'Set to hide at all times, including while a drive is still collecting. As of Story 11b.11 the public Sahyog Vivran page shows no bank detail regardless of this setting, so this has no visible effect today.',
  'nomineeBankMasking.status.lastChangedBy': 'Last changed by',
  'nomineeBankMasking.status.inForceSince': 'In force since',
  'nomineeBankMasking.status.lastRationale': 'Reason given',
  'nomineeBankMasking.status.version': 'Setting version',

  // ── The change form ─────────────────────────────────────────────────────────
  'nomineeBankMasking.form.heading': 'Change the setting',
  'nomineeBankMasking.form.modeLabel': 'What should happen after a drive closes',
  'nomineeBankMasking.form.modeAfterDays': 'Hide the details a set number of days after the drive closes',
  'nomineeBankMasking.form.modePermanent': 'Hide the details at all times',
  'nomineeBankMasking.form.daysLabel': 'Days after the drive closes',
  'nomineeBankMasking.form.daysHint':
    'Whole days. Enter 0 to hide the details as soon as a drive closes — that is a choice you are making, not a default.',
  'nomineeBankMasking.form.daysInvalid': 'Enter a whole number of days between 0 and 36500.',
  'nomineeBankMasking.form.rationaleLabel': 'Reason for this change',
  'nomineeBankMasking.form.rationaleHint':
    'Required. Recorded permanently against your name in the audit trail, alongside the change itself. The setting it replaces is kept, not overwritten.',
  'nomineeBankMasking.form.rationalePlaceholder':
    'e.g. Trustee Board resolution of 12 September — bank details to be hidden 30 days after close.',
  'nomineeBankMasking.form.submit': 'Save this setting',
  'nomineeBankMasking.form.submitPending': 'Saving…',
  'nomineeBankMasking.form.rationaleRequired': 'A reason is required before you can save this change.',
  'nomineeBankMasking.form.rationaleTooLong': 'That reason is too long — keep it under 2000 characters.',

  // ── Outcome copy ────────────────────────────────────────────────────────────
  // ⛔ Note what this does NOT say. The save is recorded; the public pages catching up is a separate,
  // slower thing, and the success message names the gap rather than papering over it.
  'nomineeBankMasking.result.saved':
    'Saved. This is now the setting of record for this Pariwar. The public pages will catch up as their cached copies expire — see the note above.',
  'nomineeBankMasking.error.heading': 'That change did not go through',
  'nomineeBankMasking.error.forbidden':
    'Your account does not hold the permission this control requires. It is granted to super administrators only, because the Trustee Panel ruled that this setting is held by the Trust centrally rather than by each Pariwar.',
  // ⚠ A 409 — the acting administrator has no display name on their user record. ⛔ NOT a server
  // fault and ⛔ NOT fixable by reloading: the name is resolved BEFORE the write, so nothing was
  // saved, and the copy says so plainly rather than leaving the operator to retry a loop that cannot
  // succeed. ⭐ It names WHY the name is required — a change to what the public can see of a family's
  // bank account is attributed, and attribution nobody can read is not attribution.
  'nomineeBankMasking.error.displayNameMissing':
    'Your change was not saved because your user record has no display name set. Every change to this setting is recorded against the person who made it, so a name is required before you can save. Ask an administrator to add a display name to your account, then try again.',
  // ⚠ A 400 — the submitted values were rejected at the server boundary (an over-long rationale, or a
  // day count outside the permitted range). ⛔ Nothing was saved; the form itself is the fix.
  'nomineeBankMasking.error.invalid':
    'The server rejected these values, so nothing was saved. Check that the rationale is not excessively long and that the number of days is a whole number within the permitted range, then try again.',
  'nomineeBankMasking.error.unexpected':
    'Something went wrong on the server and the change may not have been saved. Reload the page to check the current setting before trying again.',
};

export function resolveEn(key: string): string {
  return EN[key] ?? key;
}
