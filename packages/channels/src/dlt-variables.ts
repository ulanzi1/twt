// The ONE typed-variable vocabulary for every SMS template registered on DLT — Story 6.34 (TV1; `2026-10-10-313`,
// corrected by `2026-10-12-322`).
//
// ── Why this exists ─────────────────────────────────────────────────────────────────────────────────────
// TRAI's Direction of 18 Nov 2025 (para 8, Annexure-I) requires every variable in every SMS content template to
// be TAGGED with its type; an untagged template is refused at registration, and once scrubbing has run 60 days a
// message failing the tag check is rejected and not delivered. The PE registers on STPL's SmartPing portal,
// where the template TEXT keeps the untyped marker below and each variable's TYPE is picked, in order, in a
// separate tagging section (BigDev, 2026-10-10). So a registered text NEVER carries a typed tag — a typed tag
// in the text would be registered as literal text and never match a send. Each template instead declares one
// typed, named slot per marker (`DltSlot`), and its registry test runs `checkDltTemplateShape` over it.
//
// ── The six types (TRAI Annexure-I) ─────────────────────────────────────────────────────────────────────
// Written here WITHOUT braces, by house rule (`-322` C2): numeric (digits only), alphanumeric (letters, digits
// and special characters, at most 40 — TRAI), url and urlott (validated against registered CTAs), cbn (a
// registered callback number), email. There is no date type. Every ceiling other than alphanumeric 40 is Vi's
// manual alone — ONE constant each, so a portal answer (roster Row 30 (a) / (d)) moves exactly one number.
//
// ── Shape rules (TCCCPR 2nd Amendment, 12 Feb 2025; the 2023 / 2025 Directions) ─────────────────────────
// At most 3 variables (the third "in case of exigency"); two variables ⛔ adjacent (separated only by space,
// comma or other special characters) unless both are alphanumeric; at least 30 % of the template FIXED —
// formally a condition of the more-than-three-variables clause, applied to EVERY template here as the
// conservative reading (the explanatory memorandum ¶25). Fixed share = fixed characters / (fixed characters +
// the sum of every slot's `maxLength`), counted as JS string length (UTF-16 code units).
//
// ⚠ The marker below is read at runtime by `renderOtpBody` — change it and the OTP is sent with ⛔ code.

/** The ONE variable marker every registered SMS text carries (SmartPing's — the type is declared beside it). */
export const DLT_VAR = '{#var#}';

/** TRAI Annexure-I's six variable types — the same words the registration sheet tells BigDev to select. */
export const DLT_VARIABLE_TYPES = ['numeric', 'alphanumeric', 'url', 'urlott', 'cbn', 'email'] as const;

/** One TRAI variable type. */
export type DltVariableType = (typeof DLT_VARIABLE_TYPES)[number];

/**
 * The per-type value ceiling (characters). alphanumeric 40 is TRAI's; numeric / email 40, url / urlott 120 and
 * cbn 14 are Vi's manual only (Jio: "Not Applicable" for cbn / email / url / urlott) — Row 30 (a) may move them.
 */
export const DLT_TYPE_MAX_LENGTH: Readonly<Record<DltVariableType, number>> = {
  numeric: 40,
  alphanumeric: 40,
  url: 120,
  urlott: 120,
  cbn: 14,
  email: 40,
};

/** The shortest callback number Vi's manual admits. */
export const DLT_CBN_MIN_LENGTH = 3;

/** At most three variables per template (the third "in case of exigency" — it needs a justification line). */
export const DLT_MAX_VARIABLES = 3;

/** At least 30 % of a template fixed (the conservative reading — see the header). */
export const DLT_MIN_FIXED_RATIO = 0.3;

/** A slot's stable name — the i18n param the render uses and the MSG91 `##name##` variable (TV13). */
const SLOT_NAME = /^[a-z][a-z0-9_]*$/;

/** Text between two markers that does NOT separate them: empty, whitespace, punctuation or symbols only. */
const NON_SEPARATING = /^[\s\p{P}\p{S}]*$/u;

/** Any braced hash tag. The closing brace is escaped (`#\}`) so the CI gate's own detector never matches this line. */
const BRACED_TAG = /\{#[^#{}]*#\}/g;

/** One declared variable of a registered template, in text order. */
export interface DltSlot {
  /** The stable name (TV13) — equal to the i18n param the render already uses; `^[a-z][a-z0-9_]*$`, unique. */
  readonly name: string;
  /** The TRAI type BigDev selects for this variable in SmartPing's tagging section. */
  readonly type: DltVariableType;
  /** The longest value this slot carries — ≤ its type's ceiling; counted towards the 30 % fixed rule. */
  readonly maxLength: number;
  /** What the slot holds, for the registration sheet (e.g. "claim reference"). */
  readonly label: string;
}

/** The rule a template breaks. */
export type DltShapeRule =
  | 'slot_count'
  | 'foreign_tag'
  | 'too_many_variables'
  | 'adjacent_variables'
  | 'fixed_share'
  | 'slot_name'
  | 'duplicate_slot_name'
  | 'slot_max_length';

/** One problem `checkDltTemplateShape` found. */
export interface DltShapeProblem {
  readonly rule: DltShapeRule;
  readonly message: string;
}

/**
 * Check a registered text and its declared slots against TRAI's shape rules. Returns every problem found —
 * an empty list means the template is registrable as declared. Pure; a registry's unit test runs it over every
 * entry.
 */
export function checkDltTemplateShape(text: string, slots: readonly DltSlot[]): readonly DltShapeProblem[] {
  const problems: DltShapeProblem[] = [];
  const parts = text.split(DLT_VAR);
  const markers = parts.length - 1;

  if (markers !== slots.length) {
    problems.push({
      rule: 'slot_count',
      message: `the text has ${markers} variable marker(s) but ${slots.length} slot(s) are declared`,
    });
  }

  for (const tag of text.match(BRACED_TAG) ?? []) {
    if (tag !== DLT_VAR) {
      problems.push({
        rule: 'foreign_tag',
        message: `the text carries a braced tag other than the variable marker: ${tag} — on SmartPing the type is declared beside the text, never in it`,
      });
    }
  }

  if (markers > DLT_MAX_VARIABLES) {
    problems.push({
      rule: 'too_many_variables',
      message: `the text has ${markers} variables — at most ${DLT_MAX_VARIABLES}`,
    });
  }

  for (let i = 1; i < markers; i += 1) {
    const between = parts[i] ?? '';
    if (!NON_SEPARATING.test(between)) continue;
    const left = slots[i - 1];
    const right = slots[i];
    if (left?.type === 'alphanumeric' && right?.type === 'alphanumeric') continue;
    problems.push({
      rule: 'adjacent_variables',
      message: `variables ${i} and ${i + 1} are separated only by space or punctuation — allowed only when both are alphanumeric`,
    });
  }

  const fixed = text.length - markers * DLT_VAR.length;
  const variable = slots.reduce((sum, slot) => sum + slot.maxLength, 0);
  const total = fixed + variable;
  if (total === 0 || fixed / total < DLT_MIN_FIXED_RATIO) {
    const share = total === 0 ? 0 : Math.floor((fixed / total) * 1000) / 10;
    problems.push({
      rule: 'fixed_share',
      message: `only ${share} % of the template is fixed (${fixed} of ${total} characters) — at least ${DLT_MIN_FIXED_RATIO * 100} %`,
    });
  }

  const seen = new Set<string>();
  for (const slot of slots) {
    if (!SLOT_NAME.test(slot.name)) {
      problems.push({ rule: 'slot_name', message: `slot name "${slot.name}" must match ${SLOT_NAME.source}` });
    }
    if (seen.has(slot.name)) {
      problems.push({ rule: 'duplicate_slot_name', message: `slot name "${slot.name}" is declared twice` });
    }
    seen.add(slot.name);
    const ceiling = DLT_TYPE_MAX_LENGTH[slot.type];
    const minimum = slot.type === 'cbn' ? DLT_CBN_MIN_LENGTH : 1;
    if (!Number.isInteger(slot.maxLength) || slot.maxLength < minimum || slot.maxLength > ceiling) {
      problems.push({
        rule: 'slot_max_length',
        message: `slot "${slot.name}" declares maxLength ${slot.maxLength} — a ${slot.type} variable holds ${minimum} to ${ceiling}`,
      });
    }
  }

  return problems;
}

/** A value an operator accepts in a numeric variable: digits only, at most the numeric ceiling. */
export function isDltNumeric(value: string): boolean {
  return /^\d+$/.test(value) && value.length <= DLT_TYPE_MAX_LENGTH.numeric;
}

/**
 * A value an operator accepts in a cbn variable: digits only, 3 to 14 characters — ⛔ `+`, ⛔ spaces (a country
 * code belongs to the fixed text, and templates 1–12's words are ratified, so a mobile is written `91…`).
 */
export function isDltCallbackNumber(value: string): boolean {
  return (
    /^\d+$/.test(value) && value.length >= DLT_CBN_MIN_LENGTH && value.length <= DLT_TYPE_MAX_LENGTH.cbn
  );
}
