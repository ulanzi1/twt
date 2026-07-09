// Death-certificate OCR parity check — Story 6.5 (Task 3; AC2/AC6). PURE + DB-free.
//
// `evaluateParity(ocr, member)` compares the normalized OCR-extracted identity fields
// against the deceased member's stored record and returns one of `match | mismatch |
// ambiguous` + per-field NON-PII flags. Deterministic, no I/O, no Date.now() read unless a
// `now` is injected — unit-testable as a truth table (the `claim/state.ts` reducer
// discipline). The route/job reads + decrypts the member KYC profile and hands PLAINTEXT to
// this function; this function never touches the DB, ciphertext, or the encryption context.
//
// ── AR-61: absent data → ambiguous, NEVER mismatch ────────────────────────────────────
// A missing comparison source (no member name/DoB on file — the KYC profile is optional /
// RTBF-sentinel'd) or an unreadable OCR field routes to `ambiguous` (→ manual review), never
// a `mismatch` (which reads as "the document is wrong"). 6.5 NEVER auto-rejects — the
// verifier (6.10/6.11) makes the final call.
//
// ── Name fuzzy tolerance ──────────────────────────────────────────────────────────────
// Names compare via a NORMALIZED Levenshtein edit distance: `distance / max(len)` must be
// ≤ `NAME_MAX_NORMALIZED_DISTANCE` (0.2 — up to 20% of the longer string may differ, covering
// minor transcription / spelling variance). Transliteration tolerance (Devanagari↔Latin) is a
// noted future consideration, NOT a v1 requirement.

// NOTE: `@twt/domain` must NOT import `@twt/contracts` (turbo cycle — the legal edge is
// contracts→domain). The raw OCR-fields shape is therefore RE-DECLARED here, value-aligned
// with the contracts `DeathCertificateFields` DTO (the member/events.ts re-declaration
// precedent). The provider output is structurally assignable to this shape at the call site.

/** The six raw death-certificate fields (value-aligned with contracts `DeathCertificateFields`). */
export interface RawOcrFields {
  readonly deceasedName: string | null;
  readonly dateOfBirth: string | null;
  readonly dateOfDeath: string | null;
  readonly issuingAuthority: string | null;
  readonly certificateNumber: string | null;
  readonly certificateIssueDate: string | null;
}

/** The parity verdict (value-aligned with the `claim_document_parity_outcome` pgEnum). */
export type ParityOutcome = 'match' | 'mismatch' | 'ambiguous';

/** Up to 20% of the longer normalized name may differ and still count as a match. */
export const NAME_MAX_NORMALIZED_DISTANCE = 0.2;

/** OCR fields after normalization (trim / case-fold / whitespace-collapse; dates canonical). */
export interface NormalizedOcrFields {
  readonly deceasedName: string | null;
  readonly dateOfBirth: string | null;
  readonly dateOfDeath: string | null;
  readonly issuingAuthority: string | null;
  readonly certificateNumber: string | null;
  readonly certificateIssueDate: string | null;
}

/** The deceased member's stored record (DECRYPTED plaintext — the caller decrypts). */
export interface DeceasedRecord {
  /** Verified/declared name (member_kyc_profiles.name, decrypted). Null = no source on file. */
  readonly name: string | null;
  /** Declared DoB (member_kyc_profiles.dob, decrypted). Null = no source on file. */
  readonly dateOfBirth: string | null;
  /**
   * The member's join instant — for the "death before member joined is implausible" rule.
   * NOTE: no production caller passes this yet (no canonical membership-start timestamp
   * exists — `members.createdAt` is row-creation, not membership start, and would false-flag
   * imported/backdated members). The rule is fully implemented + unit-tested and activates the
   * moment a caller supplies a trustworthy value. Deferred, not dead — see the 6.5 review notes.
   */
  readonly joinedAt?: Date | null;
}

export interface ParityResult {
  readonly outcome: ParityOutcome;
  /** Per-field NON-PII reasons (never the compared plaintext values). */
  readonly flags: Record<string, string>;
  /** Set on any `mismatch` OR `ambiguous` outcome (AC5/AC6). */
  readonly verifierReviewRequired: boolean;
}

// ── Normalization ───────────────────────────────────────────────────────────────────────

/** Trim, collapse internal whitespace, and case-fold. Empty → null. */
export function normalizeName(value: string | null | undefined): string | null {
  if (value == null) return null;
  const collapsed = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return collapsed.length > 0 ? collapsed : null;
}

/**
 * Parse a date string to a canonical `YYYY-MM-DD`. Accepts ISO (`YYYY-MM-DD`, optionally with
 * a time part) and common Indian civil forms `DD/MM/YYYY` / `DD-MM-YYYY`. Returns null when
 * unparseable or not a real calendar date (round-trip validated so `31/02/2020` → null).
 */
export function normalizeDate(value: string | null | undefined): string | null {
  if (value == null) return null;
  const s = value.trim();
  if (s.length === 0) return null;

  let year: number;
  let month: number;
  let day: number;

  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(s);
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  } else {
    return null;
  }

  // Round-trip validation: reject non-calendar dates (e.g. 2020-02-31, month 13).
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** Normalize a raw OCR-fields object (provider output) into comparison-ready fields. */
export function normalizeOcrFields(fields: RawOcrFields): NormalizedOcrFields {
  return {
    deceasedName: normalizeName(fields.deceasedName),
    dateOfBirth: normalizeDate(fields.dateOfBirth),
    dateOfDeath: normalizeDate(fields.dateOfDeath),
    issuingAuthority: normalizeName(fields.issuingAuthority),
    certificateNumber:
      fields.certificateNumber == null
        ? null
        : fields.certificateNumber.trim().replace(/\s+/g, '').toLowerCase() || null,
    certificateIssueDate: normalizeDate(fields.certificateIssueDate),
  };
}

// ── Levenshtein edit distance (pure) ──────────────────────────────────────────────────

/** Classic single-row Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    let prevDiag = row[0]!; // value at [i-1][0]
    row[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const above = row[j]!; // [i-1][j] before overwrite
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1]! + 1, above + 1, prevDiag + cost);
      prevDiag = above;
    }
  }
  return row[n]!;
}

/** True iff two normalized names are within the fuzzy tolerance (≤ 20% normalized distance). */
export function namesWithinTolerance(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return true;
  return levenshtein(a, b) / maxLen <= NAME_MAX_NORMALIZED_DISTANCE;
}

// ── The parity check ──────────────────────────────────────────────────────────────────

/**
 * Compare normalized OCR fields against the deceased member's record.
 *
 *   · No comparison source (member name/DoB absent) → `ambiguous` (AR-61 — never mismatch).
 *   · OCR name AND DoB both unreadable → `ambiguous` (nothing to compare).
 *   · Name beyond fuzzy tolerance → flag `name: beyond_tolerance`.
 *   · DoB differs after normalization → flag `dob: mismatch`.
 *   · Implausible dates (death before birth / after certificate issue / before member joined /
 *     in the future) → flag.
 *
 * Outcome: `ambiguous` if a critical field (name or DoB) is unreadable on either side; else
 * `mismatch` if any flag fired; else `match`.
 */
export function evaluateParity(
  ocr: NormalizedOcrFields,
  member: DeceasedRecord,
  opts: { now?: Date } = {},
): ParityResult {
  const flags: Record<string, string> = {};
  const memberName = normalizeName(member.name);
  const memberDob = normalizeDate(member.dateOfBirth);

  // AR-61: no comparison source on file → ambiguous, never mismatch.
  if (memberName === null || memberDob === null) {
    return ambiguous({ source: 'missing_member_record' });
  }
  // Nothing readable to compare on the document → ambiguous.
  if (ocr.deceasedName === null && ocr.dateOfBirth === null) {
    return ambiguous({ ocr: 'unreadable' });
  }

  let critical = false;

  // Name.
  if (ocr.deceasedName === null) {
    flags['name'] = 'missing';
    critical = true;
  } else if (!namesWithinTolerance(ocr.deceasedName, memberName)) {
    flags['name'] = 'beyond_tolerance';
  }

  // DoB (exact after normalization).
  if (ocr.dateOfBirth === null) {
    flags['dob'] = 'missing';
    critical = true;
  } else if (ocr.dateOfBirth !== memberDob) {
    flags['dob'] = 'mismatch';
  }

  // Date plausibility (AC2). Uses the OCR dates + the member join instant.
  const now = opts.now ?? new Date();
  if (ocr.dateOfDeath !== null) {
    if (ocr.dateOfBirth !== null && ocr.dateOfDeath < ocr.dateOfBirth) {
      flags['date'] = 'death_before_birth';
    } else if (ocr.certificateIssueDate !== null && ocr.dateOfDeath > ocr.certificateIssueDate) {
      // A certificate cannot be issued before the death it records. Absent/unreadable issue
      // date is NOT inferred as a mismatch (AR-61 — missing evidence stays silent here).
      flags['date'] = 'death_after_certificate_issue';
    } else if (member.joinedAt != null && ocr.dateOfDeath < toDateOnly(member.joinedAt)) {
      flags['date'] = 'death_before_member_joined';
    } else if (ocr.dateOfDeath > toDateOnly(now)) {
      flags['date'] = 'death_in_future';
    }
  }

  if (critical) {
    return { outcome: 'ambiguous', flags, verifierReviewRequired: true };
  }
  const hasFlag = Object.keys(flags).length > 0;
  return {
    outcome: hasFlag ? 'mismatch' : 'match',
    flags,
    verifierReviewRequired: hasFlag,
  };
}

function ambiguous(flags: Record<string, string>): ParityResult {
  return { outcome: 'ambiguous', flags, verifierReviewRequired: true };
}

/** A `Date` → canonical `YYYY-MM-DD` (UTC) for lexicographic comparison with normalized dates. */
function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}
