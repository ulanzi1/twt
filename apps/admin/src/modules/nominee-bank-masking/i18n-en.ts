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
  'nomineeBankMasking.header.title': 'Nominee bank details — public visibility',
  'nomineeBankMasking.header.subtitle':
    "Controls how long a family's bank account details stay visible on this Pariwar's public Sahyog Vivran pages after a drive closes. While a drive is still collecting, the complete details are shown so that anyone can check the trust is paying a real family. This setting governs what happens afterwards.",

  // ── The propagation-floor disclosure (AC6) ──────────────────────────────────
  // ⭐ STANDING copy, rendered ALWAYS — not only after a successful change. An operator has to read
  // it BEFORE acting, because the gap between saving here and the public page reflecting it is the
  // window in which a full account number is still being served.
  'nomineeBankMasking.propagation.heading': 'Before you change this',
  'nomineeBankMasking.propagation.body':
    'A change here is not reflected on the public pages at once. Those pages are served through an edge cache with a five-minute lifetime (s-maxage=300), so the previous version can keep being served from warm edge locations until those cached copies expire — and until they do, that includes the full account number. Plan for a delay of up to five minutes, and longer if a page was cached moments before the change.',

  // ── Status region ───────────────────────────────────────────────────────────
  'nomineeBankMasking.status.heading': 'Current setting',
  'nomineeBankMasking.status.loading': 'Loading the current setting…',
  // ⭐ The `configured: false` case, and it is the one that matters most on this control: no setting
  // has ever been recorded, which means the details stay fully visible after a drive closes. That is
  // a RULED default (2026-09-02-179 cl.1), not an accident — but the operator is told plainly that
  // it is what is in force today.
  'nomineeBankMasking.status.unconfigured':
    'No setting has ever been recorded for this Pariwar. Until one is, the complete bank details stay visible on the public pages after a drive closes. Nobody has chosen this; it is what applies when nothing has been set.',
  'nomineeBankMasking.status.afterDaysZero':
    'The details are hidden as soon as a drive closes. Only the last four digits, the bank, the branch and the IFSC code remain visible.',
  'nomineeBankMasking.status.afterDays':
    'The details stay visible for {days} days after a drive closes, and are hidden after that. Only the last four digits, the bank, the branch and the IFSC code remain visible.',
  'nomineeBankMasking.status.permanent':
    'The details are hidden on the public pages at all times, including while a drive is still collecting. Only the last four digits, the bank, the branch and the IFSC code are ever shown.',
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
