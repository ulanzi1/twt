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
  // (review fix, code review 2026-08-13) Previously implied a district admin reaching a block row via
  // a published tree was a normal, reachable operating condition. No Pariwar can currently publish a
  // geo tree in production at all (Story 1.18 shipped no writer surface — Escalation 2) — the ancestry
  // path is DECLARED, NOT PRODUCTION-ACTIVE. Restated so the hint does not overpromise a capability no
  // real operator can trigger today.
  'gi.block.hint': 'Leave blank to work at district level. Naming a block authorizes the assignment at the block level instead — a block admin reaches it directly. A district admin can only reach a block-tagged assignment once their Pariwar publishes a geo tree placing that block under their district; no Pariwar can do that yet.',
  'gi.locator.exactlyOne': 'Load by district OR by block — fill in exactly one.',
  'gi.load': 'Load assignments',
  'gi.empty': 'No ground-inspection assignments for this claim under this jurisdiction yet — the absence of a completed inspection is itself a signal the verifier must acknowledge.',
  // Schedule form
  'gi.schedule.heading': 'Schedule a new assignment',
  // (review fix, code review 2026-08-13) DISTINCT from `gi.district.label` / `gi.block.label` above —
  // once a scope is loaded, the scope-load form and this ScheduleForm are both on screen, and reusing
  // the same label text gave two simultaneously-visible inputs the SAME accessible name (an a11y
  // regression and a `getByLabelText` collision).
  'gi.schedule.district': 'Assignment district',
  'gi.schedule.block': 'Assignment block (optional)',
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
  // ⭐ Story 6.26a (GI4 / GI5 / GI12) — the original certificate, the dates, the certificate check
  'gi.photo.kind': 'What the photo shows',
  'gi.photo.kind.site': 'The site',
  'gi.photo.kind.original_certificate': 'The original death certificate',
  'gi.card.photosOriginal': 'Original certificate photos',
  'gi.card.photosSite': 'Site photos',
  'gi.card.verdict': 'Original vs the copy we hold',
  'gi.card.verdict.matches': 'Matches the copy',
  'gi.card.verdict.does_not_match': 'Does NOT match the copy',
  'gi.card.deathDate.family_statement': "Date of death (the family's word)",
  'gi.card.deathDate.original_certificate': 'Date printed on the original',
  'gi.card.deathTime': 'Time of death',
  'gi.card.deathTimeUnknown': 'Not known',
  'gi.stage.certificate_check': 'Certificate check (the original only)',
  'gi.compare.open': 'Compare with the certificate we hold',
  'gi.compare.pending': 'Opening…',
  'gi.compare.heading': 'The certificate the family uploaded — hold the original beside it',
  'gi.compare.view': 'Open the uploaded certificate',
  'gi.compare.needed': 'Open the uploaded certificate before you record whether the original matches it.',
  'gi.verdict.legend': 'Does the original match the uploaded copy?',
  'gi.verdict.matches': 'It matches',
  'gi.verdict.does_not_match': 'It does not match',
  'gi.date.family': "Date of death the family gives (required)",
  'gi.date.printed': 'Date of death printed on the original (required)',
  'gi.time.family': 'Time of death the family gives (24h, leave blank if not known)',
  'gi.action.completeNeedsOriginalPhoto': 'Upload at least one photo of the original death certificate before completing.',
  'gi.action.completeNeedsCurrentOriginalPhoto':
    'The photo of the original was taken for an earlier certificate. Photograph the original of the certificate the claim now relies on.',
  'gi.refuse.originalNotProduced': 'The family did not produce the original certificate',
  // The new 409s, in words (Story 6.26a).
  'gi.error.original_certificate_required': 'Record the original certificate first: a photo of it, whether it matches, and the copy you compared it with.',
  'gi.error.certificate_changed': 'The family has replaced the certificate since you opened it. Open the new one and compare again.',
  'gi.error.no_current_certificate': 'This claim has no uploaded death certificate to compare the original with yet.',
  'gi.error.death_date_required': 'Record the date of death before completing.',
  'gi.error.death_date_in_future': 'The date of death cannot be after today.',
  'gi.error.invalid_death_facts': 'The date or time of death is not valid.',
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
