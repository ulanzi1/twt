// English console-chrome resolver for the helpline-claims module (Story 6.3, Task 6; AC6).
//
// The admin console is ENGLISH-FACING — it resolves chrome KEYS locally to English (the
// shipped member-status/i18n-en.ts precedent). We deliberately do NOT wire the admin console
// into the @twt/i18n runtime toggle just for chrome. The ONE exception is the READ-BACK
// SUGGESTED TEXT (what the operator voices to the caller): that is available BILINGUALLY via
// the shared @twt/i18n `claim` namespace (`readBackScript` below), so the operator can voice
// the Hindi phrasing to a Hindi-speaking caller — AC6's "console English, read-back bilingual".

import { t } from '@twt/i18n';

const EN: Record<string, string> = {
  // Console chrome
  'helpline.title': 'Helpline Operator Console',
  'helpline.subtitle':
    'File a claim on a bereaved caller’s behalf. Look up the member, read their details back to confirm, then submit the intake under your operator attribution.',
  'helpline.pane.lookup': 'Member lookup',
  'helpline.pane.readback': 'Read-back & intake',
  'helpline.call.sticky': 'Call in progress',
  // Selection / lookup guidance
  'helpline.select.prompt': 'Look up and select the deceased member to begin the read-back.',
  'helpline.nomatch.hint':
    'No match? There is no name/date search and no stub claim in v1 — escalate to a supervisor or advise the caller to use the app.',
  // Relationship
  'helpline.relationship.label': 'Caller’s relationship to the deceased',
  'helpline.relationship.placeholder': 'Select the relationship…',
  // Submit / gate
  'helpline.submit': 'File the claim (submit intake)',
  'helpline.submit.pending': 'Filing…',
  'helpline.submit.gateHint':
    'The identity read-back must be confirmed before the claim can be filed.',
  // Post-intake
  'helpline.result.created': 'Claim filed. The member’s account is now in memorial/frozen state.',
  'helpline.result.exists':
    'A claim already exists for this member — the existing claim was returned (no second claim was created).',
  'helpline.result.routeForVerification':
    'Next: route the case for verification. The claim is at intake_pending.',
  // Escalation (AR-61)
  'helpline.escalate': 'Escalate to supervisor',
  'helpline.escalate.held':
    'Case held for supervisor. The claim (if any) stays at intake_pending until the supervisor resolves it.',
  // Deep-link handover seam (Decision #4 — flagged, non-functional)
  'helpline.handover.seam': 'Convert to member-app handover',
  'helpline.handover.comingSoon':
    'Coming soon — the deep-link handover to the member app is not built in this release. Use “route for verification” for now.',
  // Step-up (the operator’s own admin step-up — §2.2)
  'helpline.stepup.required': 'A fresh step-up verification is required to file a claim.',
  'helpline.stepup.request': 'Send step-up code',
  'helpline.stepup.otpLabel': 'Enter the step-up code',
  'helpline.stepup.verify': 'Verify & elevate',
  'helpline.stepup.elevated': 'Step-up verified — you can now file the claim.',
  'helpline.stepup.region': 'Step-up verification',
  // Read-back card chrome
  'helpline.readback.confirm': 'Caller confirmed',
  'helpline.readback.correct': 'Caller corrected — update',
  'helpline.readback.correctionPlaceholder': 'Note the correction the caller gave…',
  'helpline.readback.addCorrection': 'Add correction',
  'helpline.readback.correctionLog': 'Corrections noted',
  'helpline.readback.ariaLabel.identity': 'Identity read-back',
  'helpline.readback.ariaLabel.nominee': 'Nominee read-back',

  // ── Story 6.18 (AC6/AC7) — the bank-details section (`2026-09-19-226` cl.1/cl.2/cl.7) ──
  // English-only by design: admin console chrome stays OUT of @twt/i18n and the member-facing
  // parity gate (this module's own convention).
  'helpline.bank.heading': 'Bank accounts for the support amount',
  // ⭐ The duty, stated to the person cl.1 actually names.
  'helpline.bank.duty':
    "Two accounts are required before this claim can be approved. Check that the name on each account is the nominee the member declared — the names are shown below once you save. If a name differs only in form (an initial, a married name, the bank's short form), record it and add a note for the District Admin.",
  'helpline.bank.primary': 'Account 1 (main)',
  'helpline.bank.secondary': 'Account 2 (backup)',
  'helpline.bank.holder': "Account holder's name (in English)",
  'helpline.bank.number': 'Account number',
  'helpline.bank.ifsc': 'IFSC code',
  'helpline.bank.note': 'Note for the District Admin (optional)',
  'helpline.bank.submit': 'Save both accounts',
  'helpline.bank.recorded': 'Both accounts are saved. Check the two names below.',
  'helpline.bank.namesLoading': 'Loading the names…',
  'helpline.bank.namesOnAccounts': 'Name on the bank account',
  'helpline.bank.namesDeclared': 'Nominee the member declared',
  'helpline.bank.noNominees': 'The member declared no nominees.',
  'helpline.bank.unreadable': 'Could not be read',
  'helpline.bank.anonymized': 'Removed at this person\u2019s request',
  'helpline.bank.incomplete': "Fill in both accounts — the holder's name, the account number and the IFSC.",
  'helpline.bank.englishRequired': 'Please enter the account holder\u2019s name in English.',
  'helpline.bank.accountInvalid': 'An account number is 9–18 digits.',
  'helpline.bank.ifscInvalid': 'That IFSC does not look right (for example SBIN0000001).',
  'helpline.bank.duplicate':
    'The two accounts must be different — a second account is what lets the amount through if the first one fails.',
  // ⭐ AC6 — the claim WAITS for the accounts; it is never refused for the want of them.
  'helpline.bank.required': 'This claim needs both bank accounts before the District Admin can check it.',
  // Code review 2026-09-23b — the status read is what `recorded` is DERIVED from; while it is loading
  // or has failed, the card must ⛔ not present "nothing on file" (first-entry form, no correction
  // reason) for a claim that may already hold two accounts.
  'helpline.bank.statusLoading': 'Checking which bank details are already on file…',
  'helpline.bank.statusError':
    'The bank details on file could not be read just now. Try again before entering any — this claim may already have accounts saved.',
  // Code review 2026-09-23c — a failed REFRESH of a status already read: the card stays, with this beside it.
  'helpline.bank.statusRefreshError':
    'The bank details could not be refreshed just now. What is shown may be out of date — try again.',
  'helpline.bank.retry': 'Try again',
  // ── The CORRECTION path (code review 2026-09-20, D4) ─────────────────────────────
  // `-226` cl.1 puts the duty of making sure the names match on THIS operator, and `-227` cl.11
  // makes them the one who types the corrected details after the District Admin has called the
  // family. ⛔ None of this copy says "rejected" or "denied": the claim is open throughout.
  'helpline.bank.correct': 'Correct these bank details',
  'helpline.bank.cancelCorrection': 'Cancel',
  'helpline.bank.submitCorrection': 'Save the corrected accounts',
  'helpline.bank.correctionReason': 'Why are you correcting these? (recorded)',
  'helpline.bank.correctionReasonRequired':
    'Say why you are correcting the accounts already on file — it is recorded against this claim.',
  'helpline.bank.correctionNeeded':
    'These bank details need correcting. Take the corrected account details from the family and save them here — the claim stays open and has not been refused.',
  'helpline.bank.namesError':
    'The two names could not be loaded, so they have not been checked. Do not treat this as "the names match".',
};

/** Resolve a console-chrome key to English (loud-ish fallback: return the key if unmapped). */
export function resolveEn(key: string): string {
  return EN[key] ?? key;
}

/**
 * The BILINGUAL read-back suggested text (AC6). Resolves the shared @twt/i18n `claim`-namespace
 * read-back script in BOTH English and Hindi so the operator can voice the Hindi phrasing to a
 * Hindi-speaking caller. The member value(s) are injected at render only (never persisted).
 */
export function readBackScript(
  variant: 'identity' | 'nominee',
  params: { name: string; count?: number },
): { en: string; hi: string; titleEn: string } {
  const key = variant === 'identity' ? 'readback.identity.script' : 'readback.nominee.script';
  const titleKey = variant === 'identity' ? 'readback.identity.title' : 'readback.nominee.title';
  // Both scripts template {name}; the nominee script also templates {count}.
  const tParams = { name: params.name, count: params.count ?? 0 };
  return {
    en: t(key, tParams, { locale: 'en', namespace: 'claim' }),
    hi: t(key, tParams, { locale: 'hi', namespace: 'claim' }),
    titleEn: t(titleKey, undefined, { locale: 'en', namespace: 'claim' }),
  };
}
