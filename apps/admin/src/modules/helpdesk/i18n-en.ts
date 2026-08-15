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
  // Story 10.21 — the DPDPA data-rights subcategory, shown under the `other` category. Operator-facing
  // wording may be precise (UX-DR54/DR55); this label names the statutory route in plain terms so an
  // operator taking the call can recognise it without knowing the token.
  'helpdesk.subcategory.dpdpa': 'Data rights request (access, correction, portability, erasure)',
  // ── Story 10.21 — the DPDPA fulfilment panel on the ticket detail page ────────────────────────────
  // ⚠ Operator-facing copy, so it may be precise (UX-DR54/DR55). It is written to be HONEST about what
  // each action does and does not do — an operator who over-reads a success message here could hand a
  // member's decrypted dossier to the wrong person, or believe a right was satisfied when it was not.
  'helpdesk.dataRights.title': 'Data rights fulfilment',
  'helpdesk.dataRights.help':
    'This member has no portal access. These actions carry out their statutory data rights through the administrative process — they require a separate permission and a fresh identity check.',
  'helpdesk.dataRights.noPermission':
    'You can view and route this request, but you do not hold the permission to carry it out. Escalate to a Pariwar Admin.',
  'helpdesk.dataRights.buildExport': 'Build the member’s data export',
  // ⛔ CORRECTED (round-2 code review). This previously read "how the file may be handed over is not
  // yet settled, so no download is offered here" — copy written while AC-R1 was blocked, still shipping
  // ~20 lines above the two handover controls it denies the existence of. Delivery was SETTLED by
  // `2026-08-14-109` cl.1, `-110`, `-111`, `-112` and `-113`. ⛔ AC9 is the copy-truth AC of a story
  // whose founding grievance is a shipped sentence that was not true; do not let this one rot again.
  // ⚠ It still says plainly that BUILDING is not DELIVERING — that distinction is real and load-bearing.
  'helpdesk.dataRights.buildExportNote':
    'This assembles the member’s record. It does not send it — releasing it is a separate step below.',
  'helpdesk.dataRights.erasureConfirm':
    'I have verified the caller’s identity and confirm they asked for their data to be erased.',
  'helpdesk.dataRights.erasure': 'Erase this member’s personal data',
  // ── AC-R1 delivery + AC-R2 correction ─────────────────────────────────────────────────────────────
  // ⛔ The fallback copy deliberately reads as an EXCEPTION, not an alternative. An operator who reads
  // these two options as equivalent is the failure mode the ruling exists to prevent.
  'helpdesk.dataRights.deliver': 'Send the export to the member',
  'helpdesk.dataRights.deliverNote':
    'Sends a one-time code to their registered mobile. They open it themselves — this is the normal way.',
  'helpdesk.dataRights.fallbackTitle': 'If the member cannot receive the code',
  'helpdesk.dataRights.fallbackNote':
    'Only when the member has asked you to handle it for them AND the code you already sent has gone unused. You will be handling their personal records yourself, so write down why this was needed.',
  'helpdesk.dataRights.fallbackAttestation': 'Why can the member not receive the code?',
  'helpdesk.dataRights.fallback': 'Handle it for the member',
  'helpdesk.dataRights.fallbackBlocked':
    'Send the code to the member first. This option opens only after that code has gone unused.',
  'helpdesk.dataRights.correctionTitle': 'Record a correction',
  'helpdesk.dataRights.correctionNote':
    'Write down what the member asked to be corrected and what you did about it. This is a record of the request — it does not change their details by itself.',
  'helpdesk.dataRights.correctionRequested': 'What did the member ask to be corrected?',
  'helpdesk.dataRights.correctionAction': 'What did you do?',
  'helpdesk.dataRights.correctionOutcome': 'Outcome',
  'helpdesk.dataRights.correctionSubmit': 'Save this record',
  'helpdesk.dataRights.builtNotice':
    'Export built. It has not been sent yet — use the delivery options below.',
  'helpdesk.dataRights.erasedNotice':
    'Erasure completed. The member’s personal details have been overwritten.',
  'helpdesk.dataRights.erasureNote':
    'Permanent and cannot be undone. Their personal details are overwritten; the membership record and history remain for audit.',
  // ── The data-rights step-up (round-2 code review) ────────────────────────────────────────────────
  // ⛔ Every action on this panel is gated by a DISTINCT step-up context, and the app previously offered
  // no way to satisfy it: `requestDataRightsStepUp` was defined and called from nowhere, so an operator
  // clicked any button and got a bare 403 with no affordance to elevate anywhere in the app.
  'helpdesk.dataRights.stepUpPrompt':
    'This action needs a one-time code. Enter the code sent to your registered mobile.',
  'helpdesk.dataRights.stepUpLabel': 'One-time code',
  'helpdesk.dataRights.stepUpVerify': 'Verify and continue',
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
  // ── Story 10.4 — the responder console (queue + detail + transitions) ──
  'helpdesk.queue.title': 'Helpdesk Responder Queue',
  'helpdesk.queue.subtitle': "The Pariwar's tickets, newest first — pick one up, reply, or resolve. SLA timers and severity are live.",
  'helpdesk.queue.filter.state': 'State',
  'helpdesk.queue.filter.allStates': 'All states',
  'helpdesk.queue.filter.role': 'My queue',
  'helpdesk.queue.filter.allRoles': 'All roles',
  'helpdesk.queue.sort.label': 'Sort',
  'helpdesk.queue.sort.newest': 'Newest first',
  'helpdesk.queue.sort.severity': 'Severity first',
  'helpdesk.queue.page.previous': 'Previous',
  'helpdesk.queue.page.next': 'Next',
  'helpdesk.queue.loading': 'Loading the queue…',
  'helpdesk.queue.empty': 'No tickets match this filter.',
  'helpdesk.queue.open': 'Open',
  'helpdesk.queue.col.subject': 'Subject',
  'helpdesk.queue.col.state': 'State',
  'helpdesk.queue.col.severity': 'Severity',
  'helpdesk.queue.col.sla': 'SLA',
  'helpdesk.queue.col.links': 'Links',
  'helpdesk.badge.helpline': 'Filed by helpline',
  'helpdesk.sla.firstResponse': 'First response',
  'helpdesk.sla.resolution': 'Resolution',
  'helpdesk.crosslink.pending': 'Navigation for this link is not available yet.',
  'helpdesk.detail.title': 'Ticket detail',
  'helpdesk.detail.loading': 'Loading the ticket…',
  'helpdesk.detail.notFound': 'Ticket not found.',
  'helpdesk.detail.thread': 'Reply thread',
  'helpdesk.detail.routedTo': 'Routed to',
  'helpdesk.author.member': 'Member',
  'helpdesk.author.staff': 'Staff',
  'helpdesk.action.pickUp': 'Pick up',
  'helpdesk.action.reply': 'Reply (needs info)',
  'helpdesk.action.resolve': 'Resolve',
  'helpdesk.action.pending': 'Working…',
  'helpdesk.action.messageLabel': 'Your message to the member',
  'helpdesk.action.messagePlaceholder': 'Write a clear, dignified reply the member will read in their app.',
};

/** Resolve a console-chrome key to English (loud-ish fallback: return the key if unmapped). */
export function resolveEn(key: string): string {
  return EN[key] ?? key;
}
