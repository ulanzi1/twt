// English console-chrome resolver for the directory-publication kill-switch module (Story 10.30, Task 4).
//
// The admin console is ENGLISH-FACING — it resolves chrome KEYS locally to English (the banners /
// news-blog / helpdesk / claim-appeal per-module `i18n-en.ts` precedent). Eleven `apps/admin` modules
// carry one and EVERY one is English-only; there is no `i18n-hi.ts` anywhere in `apps/admin`. Admin
// copy is staff-facing and carries no en/hi parity obligation.
//
// ⚠ This is ADMIN CHROME: English-facing operator copy. It is NOT a `packages/i18n` catalog key and
// NOT member-facing bilingual content.
//
// ⛔⛔ THE ADVERBS OF IMMEDIACY MAY NOT APPEAR IN THIS FILE — the gate named below holds the actual
// list, and ⛔ this comment deliberately does not spell them out (writing them here would make the
// scan find itself and read as a real violation).
// Decision `2026-08-21-147` cl.1(d) forbids describing this control as immediate, because it is not:
// `/members` is `edge_cacheable` with `s-maxage=300`, so a Pariwar that has just been unpublished
// keeps being served from every warm edge PoP, PER PAGE NUMBER, until those entries expire
// (`2026-08-21-145` cl.5(e)). A source-scan test (`tests/directory-publication-terminology.test.ts`)
// fails the build if any of those words appears here. ⛔ Do not "improve" the copy past that gate.

const EN: Record<string, string> = {
  // ── Page chrome ─────────────────────────────────────────────────────────────
  'directoryPublication.header.title': 'Public Member Directory — publication',
  'directoryPublication.header.subtitle':
    "Controls whether this Pariwar's members appear in the public Member Directory at all. This is a legal and privacy control, not a content preference: it is the lever for pulling a Pariwar's listing without asking an engineer to run a database change.",

  // ── The propagation-floor disclosure (AC5) ──────────────────────────────────
  // ⭐ STANDING copy, rendered ALWAYS — not only after a successful change. An operator has to read
  // it BEFORE acting, because the gap between flipping this switch and the public page reflecting it
  // is the window in which real member names are still being served.
  'directoryPublication.propagation.heading': 'Before you change this',
  'directoryPublication.propagation.body':
    'A change here is not reflected on the public directory at once. The public pages are served through an edge cache with a five-minute lifetime (s-maxage=300), so a Pariwar that has just been unpublished can keep being served from warm edge locations — separately for each page number — until those cached entries expire. Plan for a delay of up to five minutes, and longer if a page was cached moments before the change.',

  // ── Status region ───────────────────────────────────────────────────────────
  'directoryPublication.status.heading': 'Current state',
  'directoryPublication.status.published': 'Published — this Pariwar’s members appear in the public Member Directory.',
  'directoryPublication.status.unpublished':
    'Not published — this Pariwar’s members are withheld from the public Member Directory.',
  'directoryPublication.status.loading': 'Loading the current state…',
  // The `configured: false` case: default-on because nobody has ever set it, which is a different
  // fact from somebody deliberately re-enabling it. The operator is told which one they are seeing.
  'directoryPublication.status.unconfigured':
    'No setting has ever been recorded for this Pariwar, so the directory is published by default. Nobody has turned it on; nobody has turned it off.',
  'directoryPublication.status.lastChangedBy': 'Last changed by',
  'directoryPublication.status.lastChangedAt': 'Last changed at',
  'directoryPublication.status.lastRationale': 'Reason given',

  // ── The flip form ───────────────────────────────────────────────────────────
  'directoryPublication.form.heading': 'Change the setting',
  'directoryPublication.form.rationaleLabel': 'Reason for this change',
  'directoryPublication.form.rationaleHint':
    'Required. Recorded permanently against your name in the audit trail, alongside the change itself.',
  'directoryPublication.form.rationalePlaceholder':
    'e.g. Pulled at the Pariwar’s written request pending a privacy review.',
  'directoryPublication.form.submitUnpublish': 'Withhold this Pariwar from the public directory',
  'directoryPublication.form.submitPublish': 'Publish this Pariwar in the public directory',
  'directoryPublication.form.submitPending': 'Saving…',
  'directoryPublication.form.rationaleRequired': 'A reason is required before you can save this change.',
  'directoryPublication.form.rationaleTooLong': 'That reason is too long — keep it under 2000 characters.',

  // ── Outcome copy ────────────────────────────────────────────────────────────
  // ⛔ Note what this does NOT say. The save is recorded; the public surface catching up is a
  // separate, slower thing, and the success message names the gap rather than papering over it.
  'directoryPublication.result.savedUnpublished':
    'Saved. This Pariwar is now withheld from the public Member Directory. The public pages will catch up as their cached copies expire — see the note above.',
  'directoryPublication.result.savedPublished':
    'Saved. This Pariwar is now published in the public Member Directory. The public pages will catch up as their cached copies expire — see the note above.',
  'directoryPublication.error.heading': 'That change did not go through',
  'directoryPublication.error.forbidden':
    'Your account does not hold the permission this control requires. It is granted to super administrators only.',
};

export function resolveEn(key: string): string {
  return EN[key] ?? key;
}
