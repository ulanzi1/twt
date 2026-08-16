// English console-chrome resolver for the fixed-amount setter module (Story 10.13, Task 7).
//
// The admin console is ENGLISH-FACING — it resolves chrome KEYS locally to English (the banners /
// news-blog / helpdesk / claim-appeal per-module `i18n-en.ts` precedent). This module's page predates
// that convention (it shipped with Story 7.5, before the convention settled), so ONLY the strings
// Story 10.13 adds or changes resolve through here.
//
// ⚠ DELIBERATELY NOT A WHOLE-FILE MIGRATION. Rewriting the 7.5 strings this story does not otherwise
// touch would inflate the diff the friction-budget gate attributes to 10.13
// ([[project_friction_budget_baseline_ratchet]]) while changing nothing a trustee sees. The remaining
// 7.5 literals are a known, recorded gap — not an oversight, and not this story's to close.
//
// ⚠ This is ADMIN CHROME: English-facing operator copy. It is NOT a `packages/i18n` catalog key and
// NOT member-facing bilingual content. The amounts and dates it frames ARE member-facing; the words
// around them are not.

const EN: Record<string, string> = {
  // ── The Scheduled region (AC4) ──────────────────────────────────────────────
  'fixedAmount.scheduled.heading': 'Scheduled',
  'fixedAmount.scheduled.none': 'No change is scheduled. The amount above stays in force until one is.',
  'fixedAmount.scheduled.hint':
    'This amount is not in force yet. Pools that spawn before the date below still snapshot the current amount.',

  // ── The attesting-panel picker (AC2) ────────────────────────────────────────
  'fixedAmount.panel.heading': 'Attesting panel',
  'fixedAmount.panel.hint':
    'Select at least 2 distinct trustees who may attest an emergency adjustment in this Pariwar. Only trustees who hold the emergency permission here are listed — the server checks every selection again on submit.',
  'fixedAmount.panel.loading': 'Loading eligible attestors…',
  'fixedAmount.panel.empty':
    'No eligible attestors in this Pariwar. An emergency override needs at least 2 trustees holding the emergency permission here, so it cannot be applied until those grants exist.',
  'fixedAmount.panel.insufficient':
    'Only one eligible attestor in this Pariwar. An emergency override needs at least 2 distinct trustees, so it cannot be applied yet.',
  'fixedAmount.panel.forbidden':
    'You do not hold the emergency permission in this Pariwar, so the list of eligible attestors is not available to you.',
  'fixedAmount.panel.error': 'Could not load the eligible attestors. Try refreshing the page.',
  'fixedAmount.panel.selectedCount': 'selected',
  // ⚠ Says CAPABILITY, never assent — the record names who was eligible to attest, and the system has
  // no way to prove any of them agreed. Overstating that in the UI would put a promise on screen the
  // product cannot keep (Decision `2026-08-16-123` clause 14).
  'fixedAmount.panel.recordNote':
    'The trustees you select are written permanently into the immutable Emergency Adjustment Record.',
};

export function resolveEn(key: string): string {
  return EN[key] ?? key;
}
