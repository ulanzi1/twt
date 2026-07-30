// English console-chrome resolver for the News/Blog admin module (Story 10.5, Task 7).
//
// The admin console is ENGLISH-FACING — it resolves chrome KEYS locally to English (the helpdesk /
// helpline-claims per-module `i18n-en.ts` precedent). The POST's OWN bilingual copy (title/body +
// title_hi/body_markdown_hi) is the member-facing CONTENT, authored in the editor + validated in the
// domain — NOT this chrome. Sibling-module discipline ([[project_story_validate_footguns]]): this is
// the News/Blog module, distinct from niyamavali-admin (the rule-amendment console).

const EN: Record<string, string> = {
  'news.title': 'News / Blog',
  'news.subtitle':
    'Author member-facing announcements. Every post goes through a non-author tone review before it can publish, and dispatches to the chosen channels at the chosen time.',
  'news.new': 'New post',
  'news.filter.all': 'All statuses',
  'news.list.empty': 'No posts yet. Create the first one.',
  'news.field.title': 'Title (English)',
  'news.field.body': 'Body (English, Markdown)',
  'news.field.titleHi': 'Title (Hindi)',
  'news.field.bodyHi': 'Body (Hindi, Markdown)',
  'news.field.audience': 'Audience',
  'news.field.audienceValue': 'Audience selector (state / role / cohort)',
  'news.field.channels': 'Channels',
  'news.field.reviewer': 'Reviewer (a different admin)',
  'news.field.schedule': 'Scheduled publish time',
  'news.action.save': 'Save draft',
  'news.action.create': 'Create draft',
  'news.action.submit': 'Submit for review',
  'news.action.approve': 'Approve (record sign-off)',
  'news.action.schedule': 'Schedule',
  'news.action.publish': 'Publish now',
  'news.hint.bilingual': 'Public and members-all posts require both English and Hindi copy.',
  'news.hint.reviewer': 'The reviewer must be a different admin — you cannot review your own post.',
};

export function resolveEn(key: string): string {
  return EN[key] ?? key;
}
