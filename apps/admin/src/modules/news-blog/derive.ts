// News/Blog admin UI derivations — Story 10.5 (Task 7). PURE (no React) → unit-testable.
//
// The status → affordance mapping the authoring console renders. Mirrors the domain `nextPostStatus`
// legality (the source of truth is the server; these gate the UI affordances so a user is not offered
// an action the server would 409). The author≠reviewer identity rule is enforced server-side (403);
// the UI surfaces it as a hint, never as the security boundary.

export type NewsPostStatus = 'draft' | 'submitted' | 'approved' | 'scheduled' | 'published';

export function statusLabel(status: NewsPostStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'In review';
    case 'approved':
      return 'Approved';
    case 'scheduled':
      return 'Scheduled';
    case 'published':
      return 'Published';
  }
}

/** A draft is editable ONLY while in `draft` (the server edit-lock; AC1). */
export function isEditable(status: NewsPostStatus): boolean {
  return status === 'draft';
}

export function canSubmit(status: NewsPostStatus): boolean {
  return status === 'draft';
}

export function canApprove(status: NewsPostStatus): boolean {
  return status === 'submitted';
}

export function canSchedule(status: NewsPostStatus): boolean {
  return status === 'approved';
}

export function canPublish(status: NewsPostStatus): boolean {
  return status === 'approved';
}

/** A public/members-all post requires Hindi copy before submit/approve (AC7) — a UI pre-hint. */
export function requiresHindi(audienceScope: string): boolean {
  return audienceScope === 'public' || audienceScope === 'members-all';
}

/** Map a server error code → a user-facing resolution hint (the niyamavali publishErrorGuidance shape). */
export function newsErrorGuidance(code: string | undefined): string | null {
  switch (code) {
    case 'news.author_is_reviewer':
      return 'The author cannot be the reviewer or approver — a different admin must review and approve this post.';
    case 'news.bilingual_required':
      return 'Public and members-all posts require both English and Hindi copy before they can be submitted.';
    case 'news.post_invalid_state':
      return 'This action is not allowed for the post’s current status. Refresh to see the latest state.';
    case 'tone_review.required':
      return 'A non-author tone-review sign-off is required before this post can be approved.';
    default:
      return null;
  }
}
