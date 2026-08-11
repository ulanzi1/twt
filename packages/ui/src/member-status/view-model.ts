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

/**
 * The member's moderation EXPLANATION — the full prose AC9 owes them, as a top-level view-model
 * field rather than a detail line buried in the headline section.
 *
 * ── Why it is here and not in `sections` (review follow-up) ──────────────────────────────────────
 * It WAS a `detailKey` on the `headline` section. Both render layers filter that section out
 * (`.filter((s) => s.id !== 'headline')`) and render only `headlineKey` — so the prose, its two
 * catalog entries in en+hi, and the whole `{reason}` plumbing were unreachable. A suspended member
 * saw "Under review" and an appeal button, and was NEVER TOLD WHY: the exact outcome the flag is
 * member-visible to prevent, and the dignity commitment behind keeping a SUSPENDED member's access
 * open at all.
 *
 * ⚖ Story 10.19: this used to credit "Decision 6 keeping login open". Decision 6 is SUPERSEDED by
 * Decision `2026-08-10-097` clause 8 and Niyamavali §8.4 ([[feedback_supersede_never_reinterpret]] —
 * the original record stands unedited). The dignity commitment survives it and is now SPLIT, which
 * is exactly what this detail prose serves: a SUSPENDED member keeps access and must be told why, on
 * the surface they are still using to cure. A TERMINATED member loses access once the
 * `termination_access_block` flag is enabled (default OFF, flip gated on Story 10.21), and their
 * explanation travels in the termination NOTICE and the API's structured denial payload instead —
 * because after the flip they cannot reach this panel at all.
 *
 * Two keys, not one resolved string, because the view-model carries no copy (it is
 * render-agnostic): the render layer resolves `detailKey` with `{ reason: t(reasonLabelKey) }`.
 * `t()` throws on a missing interpolation param, so a renderer MUST pass `reason` — which is why
 * this is a distinct, obviously-parameterized field instead of another bare `detailKeys` entry a
 * renderer would resolve with `t(k)` and crash on.
 */
export interface ModerationNotice {
  status: 'suspended' | 'terminated';
  /** i18n KEY for the full prose. REQUIRES a `{ reason }` interpolation param. */
  detailKey: string;
  /** i18n KEY for the reason-code LABEL — never the raw code (`ux-design-specification.md:1896`). */
  reasonLabelKey: string;
}

export interface MemberStatusViewModel {
  headlineState: HeadlineState;
  /** i18n KEY for the headline label. */
  headlineKey: string;
  /** Present ONLY when a moderation standing is in force; null otherwise. */
  moderationNotice: ModerationNotice | null;
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
