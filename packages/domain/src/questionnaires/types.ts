// The questionnaire DEFINITION shape — Story 6.27a PM23 (a) (`2026-10-10-311`; the questions ruled by `2026-10-10-304`).
//
// A questionnaire is DATA, versioned (BigDev: *"these questions are of evolving nature"*): pages of 1–3 questions, each
// question a stable `key` (the same across versions), a `kind`, option CODES (the words are copy keys, resolved on the
// server in en and hi), `optional`, `showIf`, `sensitive`, `warning`, `approvedBy`, `health` and `counselBasis`.
//
// ⛔ PURE: no `db`, `pg` or `drizzle-orm` import anywhere under `questionnaires/` (a reachability test proves it), and
// ⛔ never `@twt/contracts` (domain cannot import it — F30; contracts mirrors the WIRE shape with a test-only lockstep).

/** The questionnaire kinds the registry knows (PM23 (a)). `ground_inspection` gets its own rule from row 6-32. */
export const QUESTIONNAIRE_KINDS = ['peer_mesh', 'ground_inspection'] as const;
export type QuestionnaireKind = (typeof QUESTIONNAIRE_KINDS)[number];

/** How a question is answered. `date` = a calendar date OR one of its options (e.g. *"I don't know the date"*). */
export const QUESTION_KINDS = ['single', 'multi', 'date', 'yes_no'] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

/**
 * Story 6.27b (`-328` read with `-329` decisions 1–3) — WHO a `callback_consent` question's words ask about: v2 asks
 * *"May the District Admin phone you …?"* (`district_admin`), v3 *"May the Admin phone you …?"* (`admin` — the District
 * Admin AND the Pariwar Admin). The approvers' read shows a Pariwar Admin the number ONLY for a *"Yes"* to an `admin`
 * question; a *"Yes"* to v2's words stays with the District Admin's side (Q1 C in full). Read from the REPLY's version —
 * ⛔ never a list of version ids.
 */
export const CALLBACK_AUDIENCES = ['district_admin', 'admin'] as const;
export type CallbackAudience = (typeof CALLBACK_AUDIENCES)[number];

/** `counselBasis` — a STATE, ⛔ never a boolean: `'pending'`, or counsel's recorded basis as a decision id. */
export type CounselBasis = 'pending' | string;

/**
 * Story 6.33 (`2026-10-30-421` QE4) — words STORED on a chain-authored question or option, in both languages (⛔ a copy
 * key: `t()`'s catalog is a static import). EXACTLY ONE of `copyKey` / `text` per question and option (the validator,
 * by `typeof`); the ONE word function resolves either.
 */
export interface StoredText {
  readonly en: string;
  readonly hi: string;
}

export interface QuestionOption {
  /** The stored plaintext / encrypted CODE — stable across versions. */
  readonly code: string;
  /** The copy key of the option's words (`claim` namespace), resolved in en and hi on the server. */
  readonly copyKey?: string;
  /** Story 6.33 — a chain option's stored words (⛔ with `copyKey`). */
  readonly text?: StoredText;
  /** A `multi` option that must stand alone (e.g. *"I don't know"*). */
  readonly exclusive?: boolean;
}

/** Shown only while an EARLIER question's live answer has one of `anyOf`. */
export interface QuestionShowIf {
  readonly key: string;
  readonly anyOf: readonly string[];
}

export interface QuestionDefinition {
  readonly key: string;
  readonly kind: QuestionKind;
  /** The question's words (`claim` namespace). May interpolate `{member}`. */
  readonly copyKey?: string;
  /** Story 6.33 — a chain question's stored words (⛔ with `copyKey`); `{member}` is the only placeholder. */
  readonly text?: StoredText;
  readonly options: readonly QuestionOption[];
  readonly optional: boolean;
  readonly showIf: QuestionShowIf | null;
  /** Stored as a Tier-1 ciphertext (the date, the cause, the illness) — ⛔ never a plaintext code. */
  readonly sensitive: boolean;
  /** Feeds a 6.27b warning kind — ONLY `has_died` and `death_date` (CF3 (b)); the validator refuses any other. */
  readonly warning: boolean;
  /** Trustee-ratified decision ids — or, on a chain question (Story 6.33), exactly `['chain:<its version's id>']`. */
  readonly approvedBy: readonly string[];
  /** Health information (CF3 (d)) — needs counsel's basis before it is served. */
  readonly health: boolean;
  /** `null` unless `health`; `'pending'` ⇒ the SERVED definition skips the question. */
  readonly counselBasis: CounselBasis | null;
  /** Story 6.27b — REQUIRED on `callback_consent` (whom its words name), refused on every other key (the validator). */
  readonly callbackAudience?: CallbackAudience;
}

export interface QuestionnairePage {
  readonly questions: readonly QuestionDefinition[];
}

export type QuestionnaireScope = { readonly kind: 'all' } | { readonly kind: 'pariwar'; readonly pariwarId: string };

/** `live` = may be pinned by a NEW reply; `historical` = registered (old replies stay tied to it), ⛔ never served new. */
export type QuestionnaireStatus = 'live' | 'historical';

export interface QuestionnaireDefinition {
  readonly kind: QuestionnaireKind;
  /** `<kind>.v<version>` — stored on the reply (`questionnaire_version_id`). */
  readonly versionId: string;
  readonly version: number;
  readonly scope: QuestionnaireScope;
  readonly status: QuestionnaireStatus;
  readonly approvedBy: readonly string[];
  readonly pages: readonly QuestionnairePage[];
  /** The note before Submit and the Thank-you (`-304` Q6 A, verbatim in en). */
  readonly closingNoteCopyKey: string;
  readonly thankYouCopyKey: string;
}

/** An answer as the member (or the helpline) gives it: codes, or a calendar date for a `date` question. */
export type QuestionnaireAnswerValue =
  | { readonly codes: readonly string[] }
  | { readonly date: string };
