// scripts/microcopy/lib.ts
//
// Pure, importable core for the `microcopy` CI gate (Story 1.17, AC3 — the
// forensic-microcopy / vocabulary / numeral-discipline / FM-14 token-governance lint
// set). Everything here is side-effect-free + fixture-unit-tested (lib.test.ts); the
// impure orchestration (glob, fs reads, process.exit) lives in check.ts — the
// pure-core / impure-shell split of the sibling scripts/benefit-mechanism/.
//
// Four checks, each takes already-read file content (+ the parsed config) and returns
// Finding[]. Every finding NAMES file + line + the canonical replacement (the
// benefit-mechanism "name the offender" contract):
//   (c) checkVocabulary       — prohibited member-visible term → canonical term
//   tone  checkTone           — scarcity / panic / Pool-Reality comparison framing
//   (d) checkNumerals         — Devanagari digits on operational surfaces + inline
//                               Hindi/Devanagari numeral formatting (route via i18n)
//   (b) checkMagicNumberColors — hardcoded color literals in component code (FM-14 #2)
// The allow-list (`isAllowed`) suppresses GENUINE non-applicables (the `passbook row`
// internal pattern name, the `(passbook)` gloss, the Pariwar brand-color form data).

import { parse as parseYaml } from 'yaml';

// ─────────────────────────────────────────────────────────────────────────────
// Config — microcopy.yaml (strict parse; throws loudly on any malformed entry)
// ─────────────────────────────────────────────────────────────────────────────

export interface VocabularyEntry {
  term: string;
  canonical: string;
  /** Forward-compat: scanned only in copy_globs (member surfaces), not code_globs. */
  memberOnly: boolean;
}

export interface ToneEntry {
  label: string;
  pattern: string;
}

export interface NumeralRules {
  flagDevanagariDigits: boolean;
  flagInlineLocaleFormatting: boolean;
  ceremonialGlobs: string[];
}

export interface ScopeGlobs {
  codeGlobs: string[];
  copyGlobs: string[];
}

export interface AllowEntry {
  /** Optional repo-relative path suffix the finding's file must end with. */
  file?: string;
  pattern: string;
  reason: string;
}

export interface MicrocopyConfig {
  version: number;
  vocabulary: VocabularyEntry[];
  tone: ToneEntry[];
  numerals: NumeralRules;
  flagColorLiterals: boolean;
  scope: ScopeGlobs;
  allow: AllowEntry[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const KNOWN_TOP_LEVEL_KEYS = new Set([
  'version',
  'vocabulary',
  'tone',
  'numerals',
  'magic_number',
  'scope',
  'allow',
]);
const KNOWN_NUMERAL_KEYS = new Set([
  'flag_devanagari_digits',
  'flag_inline_locale_formatting',
  'ceremonial_globs',
]);
const KNOWN_SCOPE_KEYS = new Set(['code_globs', 'copy_globs']);
const KNOWN_MAGIC_KEYS = new Set(['flag_color_literals']);

function rejectUnknownKeys(obj: Record<string, unknown>, known: Set<string>, label: string): void {
  for (const key of Object.keys(obj)) {
    if (!known.has(key)) {
      throw new Error(
        `microcopy.yaml: unknown key '${key}' in ${label} (allowed: ${[...known].join(', ')})`,
      );
    }
  }
}

/** Validate a value is a list of non-empty strings (throws on malformed). */
function asStringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`microcopy.yaml: \`${label}\` must be a list`);
  return value.map((v, i) => {
    if (typeof v !== 'string' || v.length === 0) {
      throw new Error(`microcopy.yaml: ${label}[${i}] must be a non-empty string`);
    }
    return v;
  });
}

function asBool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`microcopy.yaml: \`${label}\` must be a boolean`);
  return value;
}

/**
 * Parse + structurally validate microcopy.yaml. Throws Error with a precise message on
 * any malformed entry — a broken config must fail the gate loudly, never silently
 * disable enforcement (mirrors parseBenefitMechanismConfig / parseFr100Config).
 */
export function parseMicrocopyConfig(raw: string): MicrocopyConfig {
  const doc: unknown = parseYaml(raw);
  if (!isObject(doc)) throw new Error('microcopy.yaml: top-level must be a mapping');
  rejectUnknownKeys(doc, KNOWN_TOP_LEVEL_KEYS, 'top-level');

  if (typeof doc.version !== 'number')
    throw new Error('microcopy.yaml: `version` must be a number');

  // vocabulary
  if (!Array.isArray(doc.vocabulary))
    throw new Error('microcopy.yaml: `vocabulary` must be a list');
  const vocabulary: VocabularyEntry[] = doc.vocabulary.map((raw0, i) => {
    if (!isObject(raw0)) throw new Error(`microcopy.yaml: vocabulary[${i}] must be a mapping`);
    rejectUnknownKeys(raw0, new Set(['term', 'canonical', 'member_only']), `vocabulary[${i}]`);
    if (typeof raw0.term !== 'string' || raw0.term.length === 0) {
      throw new Error(`microcopy.yaml: vocabulary[${i}].term must be a non-empty string`);
    }
    if (typeof raw0.canonical !== 'string' || raw0.canonical.length === 0) {
      throw new Error(`microcopy.yaml: vocabulary[${i}].canonical must be a non-empty string`);
    }
    if (raw0.member_only !== undefined && typeof raw0.member_only !== 'boolean') {
      throw new Error(`microcopy.yaml: vocabulary[${i}].member_only must be a boolean`);
    }
    return { term: raw0.term, canonical: raw0.canonical, memberOnly: raw0.member_only === true };
  });

  // tone
  if (!Array.isArray(doc.tone)) throw new Error('microcopy.yaml: `tone` must be a list');
  const tone: ToneEntry[] = doc.tone.map((raw0, i) => {
    if (!isObject(raw0)) throw new Error(`microcopy.yaml: tone[${i}] must be a mapping`);
    rejectUnknownKeys(raw0, new Set(['label', 'pattern']), `tone[${i}]`);
    if (typeof raw0.label !== 'string' || raw0.label.length === 0) {
      throw new Error(`microcopy.yaml: tone[${i}].label must be a non-empty string`);
    }
    if (typeof raw0.pattern !== 'string' || raw0.pattern.length === 0) {
      throw new Error(`microcopy.yaml: tone[${i}].pattern must be a non-empty string`);
    }
    assertValidRegex(raw0.pattern, `tone[${i}].pattern`);
    return { label: raw0.label, pattern: raw0.pattern };
  });

  // numerals
  const numRaw = doc.numerals;
  if (!isObject(numRaw)) throw new Error('microcopy.yaml: `numerals` must be a mapping');
  rejectUnknownKeys(numRaw, KNOWN_NUMERAL_KEYS, 'numerals');
  const numerals: NumeralRules = {
    flagDevanagariDigits: asBool(numRaw.flag_devanagari_digits, 'numerals.flag_devanagari_digits'),
    flagInlineLocaleFormatting: asBool(
      numRaw.flag_inline_locale_formatting,
      'numerals.flag_inline_locale_formatting',
    ),
    ceremonialGlobs:
      numRaw.ceremonial_globs === undefined
        ? []
        : asStringList(numRaw.ceremonial_globs, 'numerals.ceremonial_globs'),
  };

  // magic_number
  const magicRaw = doc.magic_number;
  if (!isObject(magicRaw)) throw new Error('microcopy.yaml: `magic_number` must be a mapping');
  rejectUnknownKeys(magicRaw, KNOWN_MAGIC_KEYS, 'magic_number');
  const flagColorLiterals = asBool(
    magicRaw.flag_color_literals,
    'magic_number.flag_color_literals',
  );

  // scope
  const scopeRaw = doc.scope;
  if (!isObject(scopeRaw)) throw new Error('microcopy.yaml: `scope` must be a mapping');
  rejectUnknownKeys(scopeRaw, KNOWN_SCOPE_KEYS, 'scope');
  const scope: ScopeGlobs = {
    codeGlobs:
      scopeRaw.code_globs === undefined
        ? []
        : asStringList(scopeRaw.code_globs, 'scope.code_globs'),
    copyGlobs:
      scopeRaw.copy_globs === undefined
        ? []
        : asStringList(scopeRaw.copy_globs, 'scope.copy_globs'),
  };

  // allow
  const allowRaw = doc.allow;
  if (allowRaw !== undefined && !Array.isArray(allowRaw)) {
    throw new Error('microcopy.yaml: `allow` must be a list');
  }
  const allow: AllowEntry[] = (Array.isArray(allowRaw) ? allowRaw : []).map((raw0, i) => {
    if (!isObject(raw0)) throw new Error(`microcopy.yaml: allow[${i}] must be a mapping`);
    rejectUnknownKeys(raw0, new Set(['file', 'pattern', 'reason']), `allow[${i}]`);
    if (typeof raw0.pattern !== 'string' || raw0.pattern.length === 0) {
      throw new Error(`microcopy.yaml: allow[${i}].pattern must be a non-empty string`);
    }
    if (typeof raw0.reason !== 'string' || raw0.reason.length === 0) {
      throw new Error(`microcopy.yaml: allow[${i}].reason must be a non-empty string`);
    }
    if (raw0.file !== undefined && (typeof raw0.file !== 'string' || raw0.file.length === 0)) {
      throw new Error(`microcopy.yaml: allow[${i}].file must be a non-empty string when present`);
    }
    assertValidRegex(raw0.pattern, `allow[${i}].pattern`);
    return { file: raw0.file, pattern: raw0.pattern, reason: raw0.reason };
  });

  return { version: doc.version, vocabulary, tone, numerals, flagColorLiterals, scope, allow };
}

function assertValidRegex(pattern: string, label: string): void {
  try {
    new RegExp(pattern);
  } catch (err) {
    throw new Error(
      `microcopy.yaml: ${label} is not a valid regex: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Findings
// ─────────────────────────────────────────────────────────────────────────────

export type FindingKind = 'vocabulary' | 'tone' | 'numeral' | 'magic-number';

/** A gate finding — prints kind + file:line + the offending text + the canonical fix. */
export interface Finding {
  kind: FindingKind;
  file: string;
  /** 1-based line number within `file`. */
  line: number;
  /** The offending text matched. */
  match: string;
  /** The canonical replacement / remediation guidance. */
  replacement: string;
}

/** One-line structured pointer (kind + file:line + offending text → canonical fix). */
export function formatFinding(f: Finding): string {
  return `[${f.kind}] ${f.file}:${f.line} — "${f.match}" → ${f.replacement}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Allow-list
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True iff some allow entry suppresses a finding on `lineText` in `file`: the entry's
 * `pattern` (case-insensitive regex) matches the line AND, if the entry pins a `file`,
 * the finding's path ends with it. The #1 false-positive guard (e.g. `passbook row`).
 */
export function isAllowed(file: string, lineText: string, config: MicrocopyConfig): boolean {
  return config.allow.some((entry) => {
    if (entry.file !== undefined && !file.endsWith(entry.file)) return false;
    return new RegExp(entry.pattern, 'i').test(lineText);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Line helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Iterate `text` line by line, yielding [lineNumber (1-based), lineText]. */
function eachLine(text: string, fn: (lineNo: number, line: string) => void): void {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) fn(i + 1, lines[i] ?? '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Check (c) — vocabulary register
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flag prohibited member-visible terms (word-boundary, case-insensitive), naming the
 * canonical replacement. `includeMemberOnly` gates the forward-compat member-address
 * terms (user/customer/donor/Late Teacher) to copy scope only. Allow-listed lines (e.g.
 * the `passbook row` pattern name, the `(passbook)` gloss) are suppressed.
 */
export function checkVocabulary(
  file: string,
  text: string,
  config: MicrocopyConfig,
  options: { includeMemberOnly: boolean },
): Finding[] {
  const findings: Finding[] = [];
  const active = config.vocabulary.filter((v) => options.includeMemberOnly || !v.memberOnly);
  eachLine(text, (lineNo, line) => {
    for (const entry of active) {
      const re = new RegExp(`\\b${escapeRegex(entry.term)}\\b`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        if (isAllowed(file, line, config)) continue;
        findings.push({
          kind: 'vocabulary',
          file,
          line: lineNo,
          match: m[0],
          replacement: `use "${entry.canonical}"`,
        });
      }
    }
  });
  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tone prohibitions
// ─────────────────────────────────────────────────────────────────────────────

/** Flag scarcity / panic / Pool-Reality-comparison framing in member-visible copy. */
export function checkTone(file: string, text: string, config: MicrocopyConfig): Finding[] {
  const findings: Finding[] = [];
  eachLine(text, (lineNo, line) => {
    for (const entry of config.tone) {
      const re = new RegExp(entry.pattern, 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        if (m[0].length === 0) break; // guard against a zero-width pattern looping
        if (isAllowed(file, line, config)) continue;
        findings.push({
          kind: 'tone',
          file,
          line: lineNo,
          match: m[0],
          replacement: `remove ${entry.label} framing (member copy must not pressure / compare-to-target)`,
        });
      }
    }
  });
  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check (d) — numeral discipline (amendment A2)
// ─────────────────────────────────────────────────────────────────────────────

const DEVANAGARI_DIGITS = /[०-९]+/g;
// Inline Hindi/Devanagari numeral formatting that must route through packages/i18n
// (Story 2.1) instead of being formatted inline: a Hindi locale arg to
// toLocaleString / Intl.NumberFormat, or an explicit Devanagari numbering system.
const INLINE_HINDI_FORMAT =
  /(?:toLocaleString|Intl\.NumberFormat)\s*\(\s*['"]hi(?:-[A-Za-z]+)?['"]|numberingSystem\s*:\s*['"]deva['"]/g;

/**
 * Flag Devanagari numerals on operational surfaces (A2: operational = Gregorian + Latin;
 * Hindi numerals are reserved for memorial Devanagari prose on Shradhanjali). When
 * `isCeremonial`, the Devanagari-digit check is skipped (memorial prose is the one
 * place Hindi numerals are permitted) — the inline-formatting check still applies.
 */
export function checkNumerals(
  file: string,
  text: string,
  config: MicrocopyConfig,
  options: { isCeremonial: boolean },
): Finding[] {
  const findings: Finding[] = [];
  eachLine(text, (lineNo, line) => {
    if (config.numerals.flagDevanagariDigits && !options.isCeremonial) {
      for (const m of line.matchAll(DEVANAGARI_DIGITS)) {
        if (isAllowed(file, line, config)) continue;
        findings.push({
          kind: 'numeral',
          file,
          line: lineNo,
          match: m[0],
          replacement:
            'use Latin numerals on operational surfaces (amendment A2; Devanagari digits only in Shradhanjali memorial prose)',
        });
      }
    }
    if (config.numerals.flagInlineLocaleFormatting) {
      for (const m of line.matchAll(INLINE_HINDI_FORMAT)) {
        if (isAllowed(file, line, config)) continue;
        findings.push({
          kind: 'numeral',
          file,
          line: lineNo,
          match: m[0],
          replacement:
            'route numeral/locale formatting through the packages/i18n utility (Story 2.1), not inline',
        });
      }
    }
  });
  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check (b) — FM-14 #2 magic-number color literals
// ─────────────────────────────────────────────────────────────────────────────

// Hex colors of valid length (3/4/6/8) + functional rgb()/rgba()/hsl()/hsla().
const HEX_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
const FUNCTIONAL_COLOR = /\b(?:rgba?|hsla?)\s*\(/g;

/**
 * Flag hardcoded color literals (hex, rgb/rgba, hsl/hsla) in component code — FM-14 #2
 * (no magic numbers; use a @twt/tokens color token). The spacing/border/font px-literal
 * facet is forward-compat (those token values are placeholder until P0-2). Allow-listed
 * lines (e.g. Pariwar brand-color form data) are suppressed.
 */
export function checkMagicNumberColors(
  file: string,
  text: string,
  config: MicrocopyConfig,
): Finding[] {
  if (!config.flagColorLiterals) return [];
  const findings: Finding[] = [];
  eachLine(text, (lineNo, line) => {
    for (const re of [HEX_COLOR, FUNCTIONAL_COLOR]) {
      for (const m of line.matchAll(re)) {
        if (isAllowed(file, line, config)) continue;
        findings.push({
          kind: 'magic-number',
          file,
          line: lineNo,
          match: m[0],
          replacement:
            'use a @twt/tokens color token (FM-14 #2: no magic-number color literals in component code)',
        });
      }
    }
  });
  return findings;
}
