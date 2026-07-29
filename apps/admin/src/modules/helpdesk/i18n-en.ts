// English console-chrome resolver for the helpdesk operator module (Story 10.3, Task 5; AC5).
//
// The admin console is ENGLISH-FACING — it resolves chrome KEYS locally to English (the shipped
// member-status / helpline-claims per-module `i18n-en.ts` precedent; admin app copy is per-module
// `resolveEn`, NOT the `packages/i18n` member namespaces). Operator-facing wording may be PRECISE
// (category keys, SLA target labels) per UX-DR54/DR55 — the DIGNIFIED, jargon-free member-facing copy
// is the "We filed this for you — Operator [Name]" header, which renders in the MOBILE app through the
// bilingual `helpdesk` i18n namespace, not here.
//
// ⚠ Sibling-module discipline ([[project_story_validate_footguns]]): `helpline-claims` is the CLAIM
// intake console; THIS module is the helpdesk TICKET console. Do not cross their copy or components.

const EN: Record<string, string> = {
  // Console chrome
  'helpdesk.title': 'Helpdesk Operator Console',
  'helpdesk.subtitle':
    'File a support ticket on a caller’s behalf. Look up the member, capture their stated issue, and submit — the ticket is routed, SLA-tracked, and stamped with your operator name.',
  'helpdesk.pane.lookup': 'Member lookup',
  'helpdesk.pane.intake': 'Issue & filing',
  'helpdesk.call.sticky': 'Call in progress',
  // Selection / lookup guidance
  'helpdesk.select.prompt': 'Look up and select the member to begin filing a ticket.',
  'helpdesk.nomatch.hint':
    'No match? There is no name/date search in v1 — confirm the caller’s registered mobile or member ID, or advise them to use the app.',
  // Category picker
  'helpdesk.category.label': 'Category',
  'helpdesk.category.placeholder': 'Select a category…',
  'helpdesk.category.loading': 'Loading the category list…',
  'helpdesk.category.error': 'Could not load the category list. Retry in a moment.',
  'helpdesk.subcategory.label': 'Subcategory (optional)',
  'helpdesk.subcategory.placeholder': 'Select a subcategory…',
  'helpdesk.subcategory.none': 'No subcategories for this category',
  // Body capture
  'helpdesk.body.label': 'The caller’s stated issue',
  'helpdesk.body.placeholder': 'Capture what the caller described, in their words.',
  // Submit / gate
  'helpdesk.submit': 'File the ticket',
  'helpdesk.submit.pending': 'Filing…',
  'helpdesk.submit.gateHint': 'Select a member, a category, and capture the issue before filing.',
  // Post-filing confirmation
  'helpdesk.result.filed': 'Ticket filed. It’s now in the member’s inbox and routed for a response.',
  'helpdesk.result.routedTo': 'Routed to',
  'helpdesk.result.sla': 'First-response due',
  'helpdesk.result.slaResolution': 'Resolution due',
  'helpdesk.result.ticketId': 'Ticket',
  'helpdesk.result.fileAnother': 'File another ticket',
};

/** Resolve a console-chrome key to English (loud-ish fallback: return the key if unmapped). */
export function resolveEn(key: string): string {
  return EN[key] ?? key;
}
