// Survey questionnaire hard caps — Story 10.15 (Task 2; AC3, LBD-4).
//
// Five bounds on a TENANT-AUTHORED JSONB structure. Every one is enforced by `validateQuestionnaire`
// / `validateAnswers` with a TYPED 422 NAMING THE VIOLATED BOUND — never a generic parse error, so an
// admin editor can tell the author which limit they hit and by how much.
//
// ── Why these are constants here and re-declared (not imported) in @twt/contracts ─────────────
// `@twt/contracts` cannot import `@twt/domain` — the RN Metro bundle boundary
// ([[project_contracts_domain_bundle_boundary]]). So the contracts mirror RE-DECLARES these numbers
// and a sync-guard test pins the two copies together. The alternative — a shared leaf package — is
// premature at one consumer pair ([[feedback_no_premature_package]]).
//
// ── ⚠ These are OPERATIONAL values, and this is NOT the 10.12 §1.7 frozen-limit-class regime ──
// `custom-fields/limits.ts` carries three limit classes whose EXISTENCE architecture §1.7 freezes
// and whose VALUES are Trustee-Panel operational policy. These five are neither: they are ordinary
// product bounds on one surface, changeable in a PR with a rationale. ⛔ Do not cite the §1.7 review
// path for them — a story that borrows governance weight it was not given makes the real frozen
// limits harder to see.

/**
 * Max questions on one survey. v1 = 20.
 *
 * A survey is a feedback instrument, not a form: the response rate on a 20-question poll answered on
 * a phone is already the practical ceiling, and the cap exists to make the JSONB column's size
 * bounded and predictable rather than to express a UX opinion. 20 × (a question + 10 options) stays
 * comfortably inside a single-row read.
 */
export const MAX_QUESTIONS_PER_SURVEY = 20;

/**
 * Max selectable options on one choice question. v1 = 10.
 *
 * The floor is separately enforced and is 2 (`MIN_OPTIONS_PER_CHOICE_QUESTION`): a one-option choice
 * question is not a question. 10 is where a radio/checkbox list stops being scannable on a phone
 * screen; past it the honest instrument is a free-text question, which is why one exists.
 */
export const MAX_OPTIONS_PER_QUESTION = 10;

/**
 * Minimum options on a `single_choice` / `multi_choice` question. v1 = 2, and it is not a tuning knob.
 *
 * A choice question with 0 or 1 options cannot collect a preference — it collects assent to the only
 * thing on offer. Enforced as its own typed 422 rather than folded into the max, because the two
 * failures mean opposite things to the author.
 */
export const MIN_OPTIONS_PER_CHOICE_QUESTION = 2;

/** Max characters in one question's text, per language field. v1 = 300 — a question, not a preamble. */
export const MAX_QUESTION_TEXT = 300;

/** Max characters in one option's label, per language field. v1 = 120 — a label, not an argument. */
export const MAX_OPTION_TEXT = 120;

/**
 * Max characters in one `free_text` ANSWER. v1 = 1000.
 *
 * ⚠ The only cap here that bounds MEMBER-authored rather than admin-authored text, and the only one
 * that is a PII containment measure as well as a size bound (LBD-3): free-text answers are PII tier 3
 * at best, so an unbounded field would be an unbounded quantity of member-authored personal data with
 * no export path and no consent question attached. 1000 characters is a considered paragraph.
 */
export const MAX_FREE_TEXT_ANSWER = 1000;
