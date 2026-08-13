// English console-chrome resolver for the ground-inspection module (Story 6.7, Task 6).
//
// The admin console is ENGLISH-FACING — it resolves chrome KEYS locally to English (the shipped
// helpline-claims / member-status i18n-en.ts precedent). We deliberately do NOT wire the admin
// console into the @twt/i18n runtime toggle for chrome, so this module adds NO new @twt/i18n locale
// keys and does NOT trip the i18n-parity gate (ground inspection is an admin surface, not member-facing).

const EN: Record<string, string> = {
  'gi.title': 'Ground Inspection',
  'gi.subtitle':
    'Schedule a physical verification assignment, record findings, upload photos, and complete or record a refusal. Ground inspection runs alongside the peer mesh — both signals, not either.',
  'gi.claim.label': 'Claim case id',
  'gi.district.label': 'District (your jurisdiction)',
  'gi.block.label': 'Block (optional)',
  'gi.block.hint': 'Leave blank to work at district level. Naming a block authorizes the assignment at the block level instead — a block admin reaches it directly, and a district admin reaches it only where the Pariwar has published a geo tree placing that block under their district.',
  'gi.locator.exactlyOne': 'Load by district OR by block — fill in exactly one.',
  'gi.load': 'Load assignments',
  'gi.empty': 'No ground-inspection assignments for this claim under this jurisdiction yet — the absence of a completed inspection is itself a signal the verifier must acknowledge.',
  // Schedule form
  'gi.schedule.heading': 'Schedule a new assignment',
  'gi.schedule.stage': 'Inspection stage',
  'gi.schedule.siteType': 'Site type',
  'gi.schedule.inspector': 'Assigned inspector (actor id)',
  'gi.schedule.scheduledAt': 'Scheduled date & time',
  'gi.schedule.location': 'Exact address / landmark / site detail (encrypted)',
  'gi.schedule.familyContact': 'Family contact (encrypted)',
  'gi.schedule.notes': 'Notes (encrypted)',
  'gi.schedule.submit': 'Schedule assignment',
  'gi.schedule.pending': 'Scheduling…',
  'gi.schedule.otherRequiresLocation': "Site type 'other' requires a location description.",
  'gi.schedule.blockImmutable': 'A reschedule cannot move the assignment to a different block.',
  // Assignment card
  'gi.card.status': 'Status',
  'gi.card.inspector': 'Inspector',
  'gi.card.stage': 'Stage',
  'gi.card.site': 'Site',
  'gi.card.district': 'District',
  'gi.card.block': 'Block',
  'gi.card.blockNone': 'District level (no block)',
  'gi.card.photos': 'Photos',
  'gi.card.scheduledAt': 'Scheduled',
  // Actions
  'gi.action.uploadPhoto': 'Upload photo',
  'gi.action.uploadPending': 'Uploading…',
  'gi.action.caption': 'Caption (optional, encrypted)',
  'gi.action.complete': 'Complete inspection',
  'gi.action.completePending': 'Completing…',
  'gi.action.completeNeedsPhoto': 'At least one photo is required to complete.',
  'gi.action.refuse': 'Record refusal',
  'gi.action.refusePending': 'Recording…',
  'gi.refuse.disposition': 'Disposition',
  'gi.refuse.reason': 'Reason',
  'gi.refuse.note': 'Mandatory reason note (encrypted)',
  // Result / errors
  'gi.result.scheduled': 'Assignment scheduled.',
  'gi.result.completed': 'Inspection completed.',
  'gi.result.refused': 'Refusal recorded — the claim is escalated to the verifier.',
  'gi.result.photoUploaded': 'Photo uploaded.',
  'gi.error.generic': 'The action could not be completed.',
};

/** Resolve a console-chrome key to English (loud-ish fallback: return the key if unmapped). */
export function resolveEn(key: string): string {
  return EN[key] ?? key;
}
