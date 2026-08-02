// English console-chrome resolver for the Banner/Popup admin module (Story 10.9, Task 6).
//
// The admin console is ENGLISH-FACING — it resolves chrome KEYS locally to English (the news-blog /
// helpdesk per-module `i18n-en.ts` precedent). The BANNER's OWN bilingual copy (title/body +
// title_hi/body_hi) is the member-facing CONTENT, authored in the editor and validated in the domain
// — NOT this chrome, and NOT a packages/i18n catalog key. Sibling-module discipline
// ([[project_story_validate_footguns]]): this is the banners module, distinct from news-blog (the
// announcements console) — do not cross-wire their components or their strings.

const EN: Record<string, string> = {
  'banner.title': 'Banners & popups',
  'banner.subtitle':
    'Time-bounded in-app messages. A banner becomes visible when the clock reaches its start time and disappears at its end time — nothing needs to be run. Every banner goes through a non-author tone review before it can publish.',
  'banner.new': 'New banner',
  'banner.filter.all': 'All states',
  'banner.list.empty': 'No banners yet. Create the first one.',
  'banner.list.error': 'Could not load banners. Try refreshing the page.',
  'banner.page.prev': 'Previous',
  'banner.page.next': 'Next',
  'banner.field.title': 'Title (English)',
  'banner.field.body': 'Body (English)',
  'banner.field.titleHi': 'Title (Hindi)',
  'banner.field.bodyHi': 'Body (Hindi)',
  'banner.field.audience': 'Audience',
  'banner.field.audienceValue': 'Audience selector (state / role / cohort)',
  'banner.field.validFrom': 'Visible from',
  'banner.field.validUntil': 'Visible until',
  'banner.field.displayMode': 'Display as',
  'banner.field.dismissible': 'Members can dismiss it',
  'banner.field.displayOnce': 'Show only once per member',
  'banner.field.severity': 'Severity',
  'banner.action.create': 'Create banner',
  'banner.action.save': 'Save',
  'banner.action.publish': 'Publish',
  'banner.action.retract': 'Retract',
  'banner.action.cancel': 'Cancel',
  'banner.preview.heading': 'Member preview',
  'banner.preview.scheduledNote': 'Not visible yet — goes live',
  'banner.preview.dismiss': 'Dismiss',
  'banner.verdict.heading': 'Will anyone see this?',
  'banner.verdict.columnSeverity': 'Severity',
  'banner.verdict.columnTitle': 'Title',
  'banner.verdict.columnVerdict': 'Verdict',
  'banner.verdict.visibleFrom': 'It would first become visible on',
  'banner.verdict.neverVisible': 'Its own window ends before the current banner’s does, so it would never become visible at all.',
  'banner.hint.bilingual': 'Both English and Hindi copy are required before a banner can be published.',
  'banner.hint.popupDismissible': 'A popup is always dismissible — no member may be trapped by a surface they cannot close.',
  'banner.hint.nonDismissibleBanner': 'A banner strip may be non-dismissible when it represents a blocking system state.',
  'banner.hint.notTargetable': 'This audience cannot be targeted yet — the banner will be saved and reviewed, but no member will see it until member selection by state / role / cohort ships.',
  'banner.hint.author': 'You cannot publish, or change the copy of, a banner you wrote yourself — another admin must do it.',
  'banner.hint.revision': 'Changing the wording re-surfaces this banner for every member who had already dismissed it. Changing only the schedule does not.',
};

export function resolveEn(key: string): string {
  return EN[key] ?? key;
}
