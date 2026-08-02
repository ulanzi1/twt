// The `<MemberStatusPanel>` view-model — Story 4.7 (Task 3; D4-A). The framework-agnostic render
// contract BOTH variants share (apps/admin web + apps/mobile RN), produced by the strictly-pure
// presenter (presenter.ts). It is rendered-agnostic: NO react/react-native, NO copy — only structured
// values + i18n KEYS the render layer resolves. This is the single answer to "what is this member's
// status?" so the two panels cannot drift on eligibility (the most-disputed surface — D4).

/**
 * The headline states, each derived from the canonical `MemberValidityPayload` — never a second
 * source of truth:
 *   · active                 — covered + narrowly active (isValid && isActive).
 *   · pending-onboarding      — not yet fully onboarded (never paid / mid-signup).
 *   · suspended-with-reason   — standing withheld: a concealment-review flag, or (Story 10.10) an
 *                               active moderation SUSPENSION.
 *   · terminated-with-reason  — (Story 10.10) membership ENDED by a moderation decision.
 *   · expired-renewable       — Vyawastha Shulk lapsed but still renewable (grace / lapsed-unpaid).
 *   · expired-not-renewable   — a lock-in violation / terminal standing (not restorable by renewal).
 *
 * ⚠ `terminated-with-reason` is a DELIBERATE EXTENSION of the UX spec's FIVE listed panel states
 * (`ux-design-specification.md:1894`), which never modelled termination — FR-56 postdates that list.
 * Collapsing it into `suspended-with-reason` was rejected: the two standings differ in what the
 * member can do next (a suspension is under review; a termination has ended and carries a 12-month
 * rejoin lock), and telling someone their membership is "under review" when it has ended would be
 * exactly the kind of soft misinformation UX Stance #5's dignity requirement forbids. Recorded in
 * the Dev Agent Record.
 */
export type HeadlineState =
  | 'active'
  | 'pending-onboarding'
  | 'suspended-with-reason'
  | 'terminated-with-reason'
  | 'expired-renewable'
  | 'expired-not-renewable';

/** The status colour/severity a render layer maps to a badge; NOT eligibility (that is the payload). */
export type SectionStatus = 'ok' | 'warn' | 'fail' | 'unavailable' | 'info';

/** The seven labeled sections (a)–(g) of AC1, in render order. */
export type SectionId =
  | 'headline'
  | 'vyawastha-shulk'
  | 'lock-in'
  | 'contribution'
  | 'medical'
  | 'retirement'
  | 'special-flags';

export interface PanelSection {
  id: SectionId;
  /** i18n KEY for the section title (the render layer resolves it — Hindi-first for the member variant). */
  titleKey: string;
  status: SectionStatus;
  /** i18n KEYS for the section's human-readable detail lines (full prose, NOT error codes — UX a11y). */
  detailKeys: string[];
  /** Structured values the render layer formats (dates, counts, the lock-in policy clause deep-link). */
  data: Record<string, string | number | boolean | string[] | null>;
  /** Whether to render this section at all (e.g. retirement only when applicable; special-flags only when present). */
  visible: boolean;
}

/** One rule-by-rule provenance explanation, ordered by the payload's declared precedence. */
export interface RuleExplanation {
  clauseId: string;
  clauseVersionId: string;
  reasonCode: string;
  outcome: string;
  /** i18n KEY for the full-prose explanation (NOT the raw reason code — UX a11y `:1896`). */
  explanationKey: string;
}

/** The active-from / valid-through window the panel shows (from the canonical payload). */
export interface ValidityWindow {
  /** Not carried on the FR-12A payload today — null until a join-anchor field is added (documented). */
  activeFrom: string | null;
  /** The Vyawastha Shulk `paidThrough` (the coverage-valid-through instant); null when never paid. */
  validThrough: string | null;
}

export interface MemberStatusViewModel {
  headlineState: HeadlineState;
  /** i18n KEY for the headline label. */
  headlineKey: string;
  sections: PanelSection[];
  ruleExplanations: RuleExplanation[];
  validityWindow: ValidityWindow;
  /** Appeal CTA reachable from EVERY failure state (UX + a11y). */
  showAppealCta: boolean;
  /** True for the member-facing (redacted/simplified) view — identity suppressed, provenance simplified. */
  redactionApplied: boolean;
  /** True when the render layer must NOT display member identity / Aadhaar / KYC (AC2a; member variant). */
  identitySuppressed: boolean;
}
