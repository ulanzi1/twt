// Banner/Popup admin UI derivations — Story 10.9 (Task 6). PURE (no React) → unit-testable.
//
// The display-state → affordance mapping the banner console renders, plus the AC5 VISIBILITY
// VERDICT. Mirrors the domain `nextBannerStatus` legality (the server is the source of truth; these
// gate the UI affordances so a user is not offered an action the server would 409).
//
// ⚠ The verdict is computed by calling the SAME pure `resolveVisibleBanners` the SERVER uses, with
// the draft spliced into the currently-live candidate set. There is deliberately NO second,
// re-implemented comparison here — one resolver, two consumers (AC5).
//
// It is imported from `@twt/contracts`, which is where the pure read-time policy lives precisely so
// that BOTH can reach it: apps/admin is a browser bundle and cannot import `@twt/domain` (pg,
// drizzle, @google-cloud/kms), and `@twt/domain` cannot import `@twt/contracts` either (contracts
// already depends on domain for its test-only sync-guards, so that edge would be a hard cycle).

import {
  BANNER_TARGETABLE_AUDIENCE_SCOPES,
  bannerSeverityRank,
  resolveVisibleBanners,
  type BannerDisplayMode,
  type BannerResponse,
  type BannerSeverity,
} from '@twt/contracts';

export type BannerStatus = 'draft' | 'published' | 'retracted';
export type BannerDisplayState = 'draft' | 'scheduled' | 'live' | 'expired' | 'retracted';

export function displayStateLabel(state: BannerDisplayState): string {
  switch (state) {
    case 'draft':
      return 'Draft';
    case 'scheduled':
      return 'Scheduled';
    case 'live':
      return 'Live now';
    case 'expired':
      return 'Expired';
    case 'retracted':
      return 'Retracted';
  }
}

/** A banner is editable in any non-terminal state. Retraction is terminal (the server 409s). */
export function isEditable(status: BannerStatus): boolean {
  return status !== 'retracted';
}

/** Only a draft may be published (`nextBannerStatus(status, 'publish')`). */
export function canPublish(status: BannerStatus): boolean {
  return status === 'draft';
}

/** A draft (discard) or a published banner (pull down) may be retracted. */
export function canRetract(status: BannerStatus): boolean {
  return status === 'draft' || status === 'published';
}

/**
 * Is this audience scope actually targetable today (Decision 4)? `state`/`role`/`cohort` are stored,
 * tone-reviewed and listed — but visible to NOBODY until Story 1.18 (Geo-Tree Scope Resolver)'s selection primitive lands. The
 * console must say so out loud rather than let an admin publish into a void. Reads the shared
 * contracts list, which the sync-guard pins against @twt/domain's `isMemberInBannerAudience`
 * predicate — so the indicator can never drift from the rule the member read actually applies.
 */
export function isTargetableAudience(audienceScope: string): boolean {
  return (BANNER_TARGETABLE_AUDIENCE_SCOPES as readonly string[]).includes(audienceScope);
}

/** A popup is ALWAYS dismissible (AC4) — the UI forces the toggle; the server 422 is the real boundary. */
export function forcesDismissible(displayMode: string): boolean {
  return displayMode === 'popup';
}

/**
 * The severity treatment classes for the member-render PREVIEW.
 *
 * Two axes, deliberately:
 *   · SEVERITY picks the colour family, from the @twt/tokens registry ONLY —
 *     `status-fail-*` (red) for critical, `status-pending` (yellow) for warning, `status-held`
 *     (slate) for info. ⚠ There is no `status-warn-*` / `status-info-*` in the registry (a few
 *     sibling admin modules reference those names and therefore render unstyled); this module uses
 *     names that actually exist.
 *   · DISPLAY STATE picks solid vs muted-and-dashed. `scheduled` gets the muted/outlined treatment
 *     and `live` the solid one, because "visible now" and "visible tomorrow" otherwise render
 *     identically — the single most common admin misreading of a schedule (AC1's preview requirement).
 */
export function previewClasses(severity: string, displayState: BannerDisplayState): string {
  const live = displayState === 'live';
  const base = live ? 'border-l-4 p-3 ' : 'border-l-4 border-dashed p-3 opacity-70 ';
  switch (severity) {
    case 'critical':
      return `${base}border-status-fail-border text-status-fail-fg ${live ? 'bg-status-fail-bg' : ''}`.trim();
    case 'warning':
      return `${base}border-status-pending text-status-pending ${live ? 'bg-status-muted-bg' : ''}`.trim();
    default:
      return `${base}border-status-held text-status-held ${live ? 'bg-status-muted-bg' : ''}`.trim();
  }
}

// ── The AC5 visibility verdict ─────────────────────────────────────────────────

/** One row of the two-row Current-winner / This-draft comparison. */
export interface VerdictRow {
  label: 'Current winner' | 'This draft';
  severity: BannerSeverity;
  title: string;
  verdict: 'Visible' | 'Hidden';
}

export interface VisibilityVerdict {
  /** The two comparison rows the editor renders. */
  rows: VerdictRow[];
  /** True when this draft would LOSE — the case worth warning about. */
  draftHidden: boolean;
  /** The consequence, stated in those words, when the draft loses. */
  consequence: string | null;
  /** The deciding rule, named so the admin can act on it. */
  decidingRule: string | null;
  /**
   * The earliest instant this draft WOULD become visible — the current winner's `valid_until`, since
   * that is when the winner stops competing. Null when the draft already wins, and null when the
   * winner outlives the draft's own window (in which case the draft is never visible at all).
   */
  visibleFrom: string | null;
}

/**
 * The shape the verdict needs from a draft-in-progress (which may not be saved yet). `severity` and
 * `displayMode` are the CONTRACT enums, not `string`: the resolver's comparator is total only over
 * the real vocabulary, and a widened type here would silently let an unrankable value through.
 */
export interface DraftCandidate {
  bannerId: string;
  title: string;
  severity: BannerSeverity;
  displayMode: BannerDisplayMode;
  validFrom: Date;
  validUntil: Date;
}

/** A synthetic id that sorts LAST on the final tiebreak, so an unsaved draft never wins by luck. */
export const UNSAVED_DRAFT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

/**
 * Compute the AC5 verdict: would anyone actually SEE this draft if it were published now?
 *
 * Splices the draft into the currently-LIVE candidate set AS IF PUBLISHED (which is precisely the
 * question the admin is asking) and calls the SAME `resolveVisibleBanners` the server uses. Returns
 * `null` when there is nothing to compare against — no overlap, no warning.
 *
 * Developers reason in logic; admins reason in "will anyone see this?". So the output is a VERDICT
 * (Visible / Hidden) plus a consequence sentence, not an "overlap detected" notice. It is read-only:
 * overlapping windows are legitimate and this never blocks a publish.
 */
export function visibilityVerdict(
  draft: DraftCandidate,
  liveBanners: readonly BannerResponse[],
  now: Date,
): VisibilityVerdict | null {
  // Only same-mode, same-AUDIENCE banners compete (AC5: "the same display_mode and audience"). A
  // `state`/`role`/`cohort`-scoped banner resolves to visible-to-NOBODY (Decision 4) — it can never
  // actually contest a draft's visibility, so it must not be able to "win" the verdict. `public` and
  // `members-all` are both effectively "every member" today, so they correctly still compete with
  // each other — this filters on TARGETABILITY, not literal audience_scope equality.
  const competitors = liveBanners.filter(
    (b) => b.display_mode === draft.displayMode && isTargetableAudience(b.audience_scope),
  );
  if (competitors.length === 0) return null;

  const asCandidate = (b: BannerResponse) => ({
    bannerId: b.banner_id,
    severity: b.severity,
    displayMode: b.display_mode,
    validFrom: new Date(b.valid_from),
    validUntil: new Date(b.valid_until),
    status: 'published' as const,
  });
  const draftCandidate = {
    bannerId: draft.bannerId,
    severity: draft.severity,
    displayMode: draft.displayMode,
    validFrom: draft.validFrom,
    validUntil: draft.validUntil,
    // Spliced in AS PUBLISHED: "if I published this now, would it be seen?" is the question.
    status: 'published' as const,
  };

  const currentWinner = resolveVisibleBanners(competitors.map(asCandidate), now);
  const withDraft = resolveVisibleBanners([...competitors.map(asCandidate), draftCandidate], now);

  const winnerLane = draft.displayMode === 'popup' ? 'popup' : 'banner';
  const incumbent = currentWinner[winnerLane];
  const winner = withDraft[winnerLane];
  if (!incumbent) return null;

  const incumbentRow = competitors.find((b) => b.banner_id === incumbent.bannerId);
  const draftWins = winner?.bannerId === draft.bannerId;
  const incumbentTitle = incumbentRow?.title ?? '(untitled)';

  const rows: VerdictRow[] = [
    {
      label: 'Current winner',
      severity: incumbent.severity,
      title: incumbentTitle,
      verdict: draftWins ? 'Hidden' : 'Visible',
    },
    {
      label: 'This draft',
      severity: draft.severity,
      title: draft.title || '(untitled)',
      verdict: draftWins ? 'Visible' : 'Hidden',
    },
  ];

  if (draftWins) {
    return { rows, draftHidden: false, consequence: null, decidingRule: null, visibleFrom: null };
  }

  // The draft loses. Name the consequence in the admin's words, the deciding rule, and the earliest
  // instant the draft could become visible — the incumbent's `valid_until`, unless that is already
  // past the draft's own window, in which case the draft is never visible at all.
  const incumbentEnds = incumbent.validUntil;
  const neverVisible = incumbentEnds.getTime() >= draft.validUntil.getTime();
  return {
    rows,
    draftHidden: true,
    consequence: `This banner will never be seen while “${incumbentTitle}” is live.`,
    decidingRule: decidingRule(draft, incumbent),
    visibleFrom: neverVisible ? null : incumbentEnds.toISOString(),
  };
}

/** Which comparator key decided it — severity, then recency, then id (the total order). */
function decidingRule(
  draft: DraftCandidate,
  incumbent: { severity: BannerSeverity; validFrom: Date; bannerId: string },
): string {
  const draftRank = bannerSeverityRank(draft.severity);
  const incumbentRank = bannerSeverityRank(incumbent.severity);
  if (draftRank !== incumbentRank) {
    return `Severity decides first: “${incumbent.severity}” outranks “${draft.severity}”.`;
  }
  if (draft.validFrom.getTime() !== incumbent.validFrom.getTime()) {
    return 'Equal severity, so the more recently activated banner wins.';
  }
  return 'Equal severity and start time, so the lower banner id wins (a deterministic tiebreak).';
}

/** Map a server error code → a user-facing resolution hint (the news `newsErrorGuidance` shape). */
export function bannerErrorGuidance(code: string | undefined): string | null {
  switch (code) {
    case 'banner.popup_must_be_dismissible':
      return 'A popup must always be dismissible — no member may be trapped by a surface they cannot close. Turn dismissible on, or use a banner strip instead.';
    case 'banner.bilingual_required':
      return 'Both English and Hindi copy are required before a banner can be published.';
    case 'banner.window_invalid':
      return 'The “visible until” time must be later than the “visible from” time.';
    case 'banner.invalid_state':
      return 'This action is not allowed for the banner’s current state. Refresh to see the latest state.';
    case 'tone_review.required':
      return 'A non-author tone review is required. You cannot publish — or change the copy of — a banner you wrote yourself; another admin must do it.';
    default:
      return null;
  }
}
