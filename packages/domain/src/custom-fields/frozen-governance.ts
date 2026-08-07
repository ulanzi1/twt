// ⭐ THE GOVERNANCE FENCE — Story 10.12 (Task 1; AC3 layer 1, AC4).
//
// A per-Pariwar custom field lets a tenant add a key the engine then honours. This module is the
// reason that freedom is safe: it is the RUNTIME half of a three-layer control that refuses any
// `field_key` naming a frozen governance concern, and any key or label shaped like naked PII.
//
// ── ⚠ READ THIS BEFORE "WIRING UP STORY 1.16c" — THERE IS NOTHING TO WIRE ──────────────────────────
// epics.md:3605 says custom fields "are NOT permitted to violate frozen governance (e.g., adding a
// `payout_destinations` field is rejected by Story 1.16c CI gate)". That is factually wrong against
// the shipped gate. Story 1.16c is `schema-diff` (scripts/schema-diff/): an INVARIANT SCAN of
// COMMITTED REPO STATE across four roots — drizzle migrations, API route literals, contracts Zod
// exports. A custom field is A KEY INSIDE A JSONB PAYLOAD, AUTHORED AT RUNTIME, INTO A DATABASE ROW.
// It is not a table, a column, a route literal or a Zod export. `pnpm schema:check` would pass —
// green and useless — while a Pariwar admin created a field literally named `payout_destinations`.
//
// This module supplies the enforcement that citation assumed already existed. Do NOT widen
// `schema-diff`'s scan roots to read a tenant database: a CI gate that needs a live tenant DB is not
// a CI gate.
//
// ── THE THREE LAYERS (all three must exist — AC3) ──────────────────────────────────────────────────
//   1. RUNTIME (this module), called by `registry.publishDefinitionVersion` before any INSERT.
//   2. DB MIRROR — `pariwar_custom_field_definitions_frozen_key_ck` in migration 0095. Per migration
//      0088's doctrine: "an app-layer rule with no DB mirror is a rule that holds only for the
//      callers who happen to go through the app layer."
//   3. CI, HONESTLY SCOPED — `scripts/custom-field-governance/`. Definitions are DATABASE ROWS, so
//      the gate cannot scan them; it asserts what CI *can* prove (denylist ⊇ fr-100 forbidden_column,
//      and `insert(pariwarCustomFieldDefinitions)` only inside the sanctioned writer). That scope
//      limit is stated in the gate's README in plain words. It is not overclaimed here either.
//
// ── The fr-100 registry is READ, not re-declared ───────────────────────────────────────────────────
// The `payout_destination*` prefix comes from `fr-100-non-add.yaml` at load time (the `capability-bar
// .ts` loader shape), so the FR-100 forward-compat registry stays the single authority for that
// family. The CI gate's leg (a) asserts this module's denylist is a SUPERSET of the YAML's
// `forbidden_column`, which is what stops the two drifting apart in either direction.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

import { CustomFieldFrozenGovernanceKeyError, CustomFieldNakedPiiKeyError } from './errors.js';

/**
 * How a forbidden pattern is matched against a normalized key.
 *
 * ⚠ THE TWO MODES EXIST BECAUSE ONE MODE CANNOT BE BOTH TIGHT AND LOOSE ENOUGH, and getting this
 * wrong in either direction breaks the fence:
 *
 *   · `'prefix'`  — a bare `startsWith`. Required for `payout_destination`, because the artifact the
 *                   FR-100 registry forbids is the PLURAL `payout_destinations`, and the registry
 *                   declares the singular as a prefix (`patterns.forbidden_column`). A segment match
 *                   would let `payout_destinations` — the literal forbidden table name — sail through.
 *                   Also required for the trailing-underscore families (`audit_`, `consent_`), which
 *                   are declared as open prefixes on purpose.
 *
 *   · `'segment'` — the pattern must be the whole first `_`-delimited segment (key === pattern, or
 *                   key starts with `pattern + '_'`). Required for short English words like `state`,
 *                   which legitimately prefix ordinary tenant fields: under `'prefix'` this rejects
 *                   `stateless_note` and `statement_ref`, and a fence that refuses reasonable names
 *                   is one an author routes around instead of respecting.
 *
 * Choosing per pattern rather than inventing a general rule is deliberate. The distinction between
 * `payout_destinations` (must match) and `stateless_note` (must not) is not structural — both are the
 * pattern plus more letters — so no clever universal predicate separates them. The author of a
 * denylist entry knows which kind their pattern is; the code should ask them, not guess.
 */
export type FrozenKeyMatchMode = 'prefix' | 'segment';

/**
 * The explicit forbidden-key family — the epics.md:513 architectural freeze table plus the
 * load-bearing DERIVED columns a custom field must never shadow.
 *
 * Every entry is matched against the NORMALIZED key (see {@link normalizeFieldKey}) in its declared
 * {@link FrozenKeyMatchMode}. Matching beyond the exact column name is the point: the vector is not a
 * tenant recreating a column verbatim, it is a tenant creating `payout_destination_upi` or
 * `is_valid_override` and treating it as authoritative downstream.
 *
 * Why each family is here:
 *   · `payout_destination`  — FR-100 Hook 2. v1 ships ZERO payout-destination surface; the v2
 *                             Durghatana Sahayata activation must be greenfield. Also read from
 *                             fr-100-non-add.yaml at runtime; listed here so the set is legible.
 *   · `benefit_mechanism`   — freeze row 12, the pool|reserve discriminator.
 *   · `is_valid`            — the Member Validity Service's COVERAGE verdict (freeze row 11).
 *   · `is_assignable`       — the pool roster's assignability predicate. Distinct from `is_valid`,
 *                             and confusing the two is a known live bug class in this repo.
 *   · `moderation_status`   — the Story 10.10 derived moderation state (event-folded, not stored).
 *   · `state`               — `members.state` is a projector-only replay cache (freeze row 2).
 *   · `state_event_version` — its replay anchor. A shadow copy would be read as authoritative.
 *   · `pariwar_id`          — the RLS predicate column (freeze row 3). A tenant-authored key of this
 *                             name is a tenancy-confusion vector, full stop.
 *   · `member_id`           — the member's events_log stream_id.
 *   · `lock_in`             — FR-8 lock-in policy + its join-time snapshot.
 *   · `fixed_amount`        — FR-15 fixed contribution amount (trustee-set policy).
 *   · `audit_`              — the audit hash-chain (freeze row 5, immutability).
 *   · `consent_`            — Story 2.7 / DPDPA consent artifacts.
 */
export const CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS: ReadonlyArray<{
  pattern: string;
  mode: FrozenKeyMatchMode;
  control: string;
}> = Object.freeze([
  {
    pattern: 'payout_destination',
    mode: 'prefix',
    control:
      'FR-100 forward-compat Hook 2 (architecture §1.13) — v1 ships zero payout-destination surface',
  },
  {
    pattern: 'benefit_mechanism',
    mode: 'segment',
    control: 'freeze row 12 — the pool|reserve benefit discriminator',
  },
  {
    pattern: 'is_valid',
    mode: 'segment',
    control: 'freeze row 11 — the Member Validity Service coverage verdict',
  },
  {
    pattern: 'is_assignable',
    mode: 'segment',
    control: 'the pool roster assignability predicate (Story 7.4)',
  },
  {
    pattern: 'moderation_status',
    mode: 'segment',
    control: 'the Story 10.10 event-derived moderation status',
  },
  {
    pattern: 'state_event_version',
    mode: 'segment',
    control: 'freeze row 2 — the member state replay anchor',
  },
  {
    pattern: 'state',
    mode: 'segment',
    control: 'freeze row 2 — members.state is a projector-only replay cache',
  },
  {
    pattern: 'pariwar_id',
    mode: 'segment',
    control: 'freeze row 3 — the RLS tenant-isolation predicate column',
  },
  { pattern: 'member_id', mode: 'segment', control: "freeze row 2 — the member's events_log stream_id" },
  { pattern: 'lock_in', mode: 'segment', control: 'FR-8 lock-in policy and its join-time snapshot' },
  {
    pattern: 'fixed_amount',
    mode: 'segment',
    control: 'FR-15 trustee-set fixed contribution amount',
  },
  {
    pattern: 'audit_',
    mode: 'prefix',
    control: 'freeze row 5 — the audit log hash-chain immutability property',
  },
  { pattern: 'consent_', mode: 'prefix', control: 'Story 2.7 / DPDPA consent artifacts' },
]);

/**
 * Markers that make a key or label look like naked PII, whatever tier it declares (AC4).
 *
 * ⚠ This is deliberately LOCAL and deliberately CRUDE. It does NOT reach into Story 1.16b's scanner
 * (`packages/contracts/scripts/check-pii-scrape.ts`): that engine scans RENDERED SURFACES, it is not
 * a key-name classifier, and importing contracts into domain inverts the dependency direction. A
 * crude local classifier that catches the obvious cases is the right control here — the real defence
 * is that only `pii_tier: 3` is accepted at all, and this is the backstop against mis-declaration.
 */
export const CUSTOM_FIELD_NAKED_PII_MARKERS: readonly string[] = Object.freeze([
  'aadhaar',
  'adhaar',
  'aadhar',
  'pan',
  'mobile',
  'phone',
  'email',
  'dob',
  'birth',
  'account_no',
  'ifsc',
  'upi',
  'vpa',
  'bank',
]);

/**
 * ⭐ [Review][Patch] The Devanagari-script counterpart to {@link CUSTOM_FIELD_NAKED_PII_MARKERS}.
 *
 * `label_hi` is REQUIRED on every definition (AC9) and is exactly the string a member reads first —
 * yet the English-only marker list above could never see a Hindi-only PII-shaped label
 * (`label_hi: "आधार संख्या"` passed clean regardless of declared tier). Curated 1:1 against the English
 * list, deliberately crude in the same spirit as its sibling: the real defence is that only
 * `pii_tier: 3` is accepted at all; this is the backstop against mis-declaration, in BOTH the
 * languages this form actually requires.
 */
export const CUSTOM_FIELD_NAKED_PII_MARKERS_HI: readonly string[] = Object.freeze([
  'आधार', // aadhaar
  'पैन', // PAN
  'मोबाइल', // mobile
  'फोन', // phone
  'ईमेल', // email
  'जन्म', // birth / dob
  'बैंक', // bank
  'खाता', // account
  'आईएफएससी', // IFSC
  'यूपीआई', // UPI
  'वीपीए', // VPA
]);

/**
 * Normalize a candidate key for matching: case-fold, and collapse `-`, `.` and whitespace to `_`.
 *
 * ⚠ THIS IS WHY THE FENCE HOLDS. Without normalization, `Payout-Destinations`, `payout.destination`
 * and `PAYOUT_DESTINATIONS` are three trivially-different strings that all mean the same thing to a
 * human reading a form — and a fence a tenant can step over by changing a hyphen is decoration.
 * Repeated separators collapse to one so `payout--destination` and `payout _ destination` normalize
 * identically too.
 */
export function normalizeFieldKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[-.\s]+/g, '_')
    .replace(/_+/g, '_');
}

/** Absolute path to the repo-root `fr-100-non-add.yaml` (the `capabilityBarPath()` shape). */
export function fr100ConfigPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // src/custom-fields/ → src/ → packages/domain/ → packages/ → repo root
  return join(here, '..', '..', '..', '..', 'fr-100-non-add.yaml');
}

/**
 * The forbidden COLUMN prefix declared by the FR-100 registry, memoized per process.
 *
 * ⚠ FAILS OPEN TO THE STATIC LIST, NOT TO NOTHING. If the YAML is missing or malformed this returns
 * `null` and the caller falls back to {@link CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS}, which already
 * contains `payout_destination`. That is the opposite of `capability-bar.ts`'s loud-throw posture,
 * and the difference is deliberate: there, the YAML IS the allowlist, so an empty parse makes every
 * check pass vacuously. Here the YAML is a SECOND source of a prefix the static list already covers,
 * so a read failure must not take down the fence it is only reinforcing.
 */
let cachedFr100Column: string | null | undefined;

/** Drop the memoized FR-100 prefix. For tests that write a fixture registry and re-read it. */
export function clearFr100Cache(): void {
  cachedFr100Column = undefined;
}

export function fr100ForbiddenColumnPrefix(): string | null {
  if (cachedFr100Column !== undefined) return cachedFr100Column;
  try {
    const doc: unknown = parseYaml(readFileSync(fr100ConfigPath(), 'utf8'));
    const patterns =
      typeof doc === 'object' && doc !== null
        ? (doc as { patterns?: Record<string, unknown> }).patterns
        : undefined;
    const col = patterns?.forbidden_column;
    cachedFr100Column = typeof col === 'string' && col.length > 0 ? normalizeFieldKey(col) : null;
  } catch {
    cachedFr100Column = null;
  }
  return cachedFr100Column;
}

/** A matched frozen-governance pattern — what matched, how, and which control it protects. */
export interface FrozenGovernanceMatch {
  normalizedKey: string;
  pattern: string;
  mode: FrozenKeyMatchMode;
  control: string;
}

/** Does the already-normalized `key` match `pattern` under `mode`? See {@link FrozenKeyMatchMode}. */
export function keyMatchesPattern(
  normalizedKey: string,
  pattern: string,
  mode: FrozenKeyMatchMode,
): boolean {
  if (mode === 'prefix') return normalizedKey.startsWith(pattern);
  return normalizedKey === pattern || normalizedKey.startsWith(`${pattern}_`);
}

/**
 * Does `fieldKey` name a frozen governance concern? Returns the match, or `null` when the key is
 * clean. PURE apart from the memoized YAML read — the gate's fixtures call it directly.
 */
export function matchFrozenGovernanceKey(fieldKey: string): FrozenGovernanceMatch | null {
  const normalized = normalizeFieldKey(fieldKey);

  // The FR-100 registry's own prefix is checked FIRST and always in `'prefix'` mode — the registry
  // declares it as a prefix (`forbidden_column: payout_destination` → `payout_destination*`), and the
  // artifact it exists to forbid is the plural table name.
  const fr100 = fr100ForbiddenColumnPrefix();
  if (fr100 !== null && keyMatchesPattern(normalized, fr100, 'prefix')) {
    return {
      normalizedKey: normalized,
      pattern: fr100,
      mode: 'prefix',
      control: 'the FR-100 non-add registry (fr-100-non-add.yaml patterns.forbidden_column)',
    };
  }

  for (const { pattern, mode, control } of CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS) {
    if (keyMatchesPattern(normalized, pattern, mode)) {
      return { normalizedKey: normalized, pattern, mode, control };
    }
  }
  return null;
}

/**
 * ⭐ Layer 1 of AC3. Throws if `fieldKey` names a frozen governance concern.
 *
 * @throws CustomFieldFrozenGovernanceKeyError
 */
export function assertNotFrozenGovernanceKey(fieldKey: string): void {
  const match = matchFrozenGovernanceKey(fieldKey);
  if (match) {
    throw new CustomFieldFrozenGovernanceKeyError(
      fieldKey,
      match.normalizedKey,
      match.pattern,
      match.control,
    );
  }
}

/** A matched naked-PII marker — the marker and where it was found. */
export interface NakedPiiMatch {
  marker: string;
  where: 'field_key' | 'label_en' | 'label_hi';
}

/**
 * Does the key or either label look like naked PII? Returns the first match, or `null`.
 *
 * The KEY is matched on normalized WORD boundaries (`_`-delimited segments), the LABELS on plain
 * lowercased substrings.
 *
 * ⚠ The split is not laziness. A key is a machine identifier the author chose from a bounded
 * vocabulary, so `pan` must match `pan_number` and `member_pan` but NOT `panchayat_ward` — a
 * substring test would reject a perfectly ordinary Bihar administrative field and teach authors that
 * the detector is noise. A label is free prose, where "PAN" can appear mid-phrase ("Enter PAN
 * details"), so substring is the only match that catches it.
 */
export function matchNakedPii(fieldKey: string, labelEn: string, labelHi: string): NakedPiiMatch | null {
  const segments = new Set(normalizeFieldKey(fieldKey).split('_').filter((s) => s.length > 0));
  for (const marker of CUSTOM_FIELD_NAKED_PII_MARKERS) {
    // A multi-word marker (`account_no`) is matched as a normalized substring of the key, since it
    // spans segments by construction.
    if (marker.includes('_')) {
      if (normalizeFieldKey(fieldKey).includes(marker)) return { marker, where: 'field_key' };
    } else if (segments.has(marker)) {
      return { marker, where: 'field_key' };
    }
  }

  const en = labelEn.toLowerCase();
  const hi = labelHi.toLowerCase();
  for (const marker of CUSTOM_FIELD_NAKED_PII_MARKERS) {
    // Labels are free prose — substring, but on a marker of 3+ chars only, so short markers
    // ('pan', 'dob') do not fire on an unrelated English or transliterated word fragment. Checked
    // against BOTH labels: a Hindi label written in Roman transliteration ("Aadhaar sankhya") is
    // still English-marker-shaped.
    if (marker.length >= 4 && en.includes(marker)) return { marker, where: 'label_en' };
    if (marker.length >= 4 && hi.includes(marker)) return { marker, where: 'label_hi' };
  }
  // ⭐ [Review][Patch] The Devanagari-script markers — labelHi only, since field_key and labelEn are
  // not expected to carry Devanagari text. No length gate: every entry is already a complete,
  // specific word (not an abbreviation prone to accidental collision the way 'pan' or 'dob' are).
  for (const marker of CUSTOM_FIELD_NAKED_PII_MARKERS_HI) {
    if (labelHi.includes(marker)) return { marker, where: 'label_hi' };
  }
  return null;
}

/**
 * Layer 1 of AC4's naked-PII guard. Throws if the key or either label is PII-shaped.
 *
 * @throws CustomFieldNakedPiiKeyError
 */
export function assertNotNakedPii(fieldKey: string, labelEn: string, labelHi: string): void {
  const match = matchNakedPii(fieldKey, labelEn, labelHi);
  if (match) throw new CustomFieldNakedPiiKeyError(fieldKey, match.marker, match.where);
}
