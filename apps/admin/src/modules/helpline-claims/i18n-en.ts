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
