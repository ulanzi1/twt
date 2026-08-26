// Matrix SCHEMA-EXTENSION tests — Story 11a.1 (AC4, AC6, AC8).
//
// Story 1.16b shipped the 4-tier schema; THIS story extends it with the four
// constructs the populated matrix needs, each of which is fail-closed:
//
//   (1) `route` + `renders` per surface (AC1) — a surface names the route it
//       renders at; `renders: false` is the ONLY way a declared surface may have
//       no shipped route (D5 — `member-directory` is declared before 11a.3
//       builds it, so 11a.3 FILLS a declared surface instead of INVENTING one).
//   (2) `tier1_public_exception` (AC4) — the ONE ruled Tier-1-on-public
//       exception (`2026-08-19-135` cl.7(c) + `-136`), carried as an ATTRIBUTED
//       construct so it can never be confused with an ordinary `public` field.
//       A Tier-1 field declared `public` WITHOUT one is rejected; a SECOND such
//       exception anywhere in the matrix is rejected. ⛔ It is an exception, not
//       a door.
//   (3) `escalations` + `escalation_count` (AC8) — the trustee-attestation
//       ledger, cross-checked in BOTH directions so neither half moves alone
//       (the `governance_boundary.yaml` precedent).
//   (4) `per_pariwar_attribute_rule` (AC6) — a RULE, ⛔ never a field list.
//       Trap 1: enumerating member attributes here re-commits SD-1.
//
// ⛔ The loud-throw posture is preserved throughout: a malformed matrix must
// NEVER degrade to "no entries" (the `parseCapabilityBar` doctrine) — a gate
// that silently stopped detecting would certify an invariant nobody enforces.

import { describe, expect, it } from 'vitest';

import { parsePublicVsPrivateMatrix } from '../src/public-pages/index.js';

/** Build a minimal valid matrix document, with `extra` spliced in at the root. */
function doc(body: string): string {
  return `version: 2\n${body}`;
}

const MINIMAL_SURFACE = `surfaces:
  - id: terms
    route: /terms
    search_indexing_policy: index
    cache_policy: edge_cacheable
    fields:
      - id: tc_body_html
        tier: public
`;

describe('surface `route` + `renders` (AC1, D5)', () => {
  it('parses a surface carrying a route', () => {
    const m = parsePublicVsPrivateMatrix(doc(MINIMAL_SURFACE));
    expect(m?.surfaces[0]?.route).toBe('/terms');
  });

  it('defaults `renders` to true when absent (a declared surface renders unless it says otherwise)', () => {
    const m = parsePublicVsPrivateMatrix(doc(MINIMAL_SURFACE));
    expect(m?.surfaces[0]?.renders).toBe(true);
  });

  it('accepts an explicit `renders: false` (the D5 declared-but-unrouted posture)', () => {
    const m = parsePublicVsPrivateMatrix(
      doc(`surfaces:
  - id: member-directory
    route: /members
    renders: false
    search_indexing_policy: noindex
    cache_policy: edge_cacheable
    fields: []
`),
    );
    expect(m?.surfaces[0]?.renders).toBe(false);
  });

  it('REJECTS a surface with no route (fail-closed — every surface names where it renders)', () => {
    expect(() =>
      parsePublicVsPrivateMatrix(
        doc(`surfaces:
  - id: terms
    search_indexing_policy: index
    cache_policy: edge_cacheable
    fields: []
`),
      ),
    ).toThrow(/route/);
  });

  it('NEGATIVE CONTROL — REJECTS two surfaces declaring the SAME route (code review 2026-08-20)', () => {
    // Without this, `gate.ts:checkRouteCoverage`'s `Map` would silently collapse the collision to
    // "last one wins", defeating the AC1 "fail-closed, both directions" guarantee for this case.
    expect(() =>
      parsePublicVsPrivateMatrix(
        doc(`surfaces:
  - id: terms
    route: /terms
    search_indexing_policy: index
    cache_policy: edge_cacheable
    fields: []
  - id: terms-duplicate
    route: /terms
    search_indexing_policy: index
    cache_policy: edge_cacheable
    fields: []
`),
      ),
    ).toThrow(/duplicate route/);
  });
});

describe('the ruled Tier-1 public exception (AC4)', () => {
  const withException = `surfaces:
  - id: member-directory
    route: /members
    renders: false
    search_indexing_policy: noindex
    cache_policy: edge_cacheable
    fields:
      - id: member_name
        tier: public
        pii_tier: 1
        tier1_public_exception:
          decision: '2026-08-19-136'
          rationale: Panel-ruled decrypt of member name for the public directory.
          scope: this surface only
        presentation_policy_ref: pariwar_public_name_presentation.mode
`;

  it('parses a Tier-1 `public` field that carries an attributed exception', () => {
    const m = parsePublicVsPrivateMatrix(doc(withException));
    const field = m?.surfaces[0]?.fields[0];
    expect(field?.pii_tier).toBe(1);
    expect(field?.tier1_public_exception?.decision).toBe('2026-08-19-136');
    expect(field?.presentation_policy_ref).toBe('pariwar_public_name_presentation.mode');
  });

  it('REJECTS a Tier-1 field declared `public` WITHOUT an exception block (fail-closed)', () => {
    expect(() =>
      parsePublicVsPrivateMatrix(
        doc(`surfaces:
  - id: member-directory
    route: /members
    renders: false
    search_indexing_policy: noindex
    cache_policy: edge_cacheable
    fields:
      - id: member_name
        tier: public
        pii_tier: 1
`),
      ),
    ).toThrow(/tier1_public_exception/);
  });

  // ── Decision 2026-08-24-159 cl.2 (Story 11b.1 / D1(b)) — the allowlist ──────────────────
  // The rule moved from "exactly ONE, whichever it is" to "exactly THESE TWO, by name". These
  // four cases pin both halves: the two ruled pairs are admitted, and identity is now load-
  // bearing — an exception on ANY other field fails even though only two exist matrix-wide.

  const sahyogDriveException = `  - id: sahyog-drive
    route: /sahyog
    renders: true
    search_indexing_policy: noindex
    cache_policy: edge_cacheable
    fields:
      - id: deceased_member_name
        tier: public
        pii_tier: 1
        tier1_public_exception:
          decision: '2026-08-24-159'
          rationale: Story 11b.1 D1(b) — consent-gated deceased member name.
          scope: this surface only
`;

  it('ADMITS the SECOND ruled exception — sahyog-drive.deceased_member_name (D1(b))', () => {
    const m = parsePublicVsPrivateMatrix(doc(`${withException}${sahyogDriveException}`));
    expect(m?.surfaces[1]?.fields[0]?.tier1_public_exception?.decision).toBe('2026-08-24-159');
  });

  it('REJECTS a THIRD Tier-1 `public` exception (⛔ the widening is enumerated, not a door)', () => {
    expect(() =>
      parsePublicVsPrivateMatrix(
        doc(`${withException}${sahyogDriveException}  - id: in-memoriam
    route: /in-memoriam
    renders: false
    search_indexing_policy: noindex
    cache_policy: edge_cacheable
    fields:
      - id: deceased_name
        tier: public
        pii_tier: 1
        tier1_public_exception:
          decision: '2026-08-19-136'
          rationale: A third one, which must not be allowed.
          scope: this surface only
`),
      ),
    ).toThrow(/enumerated allowlist|not on it/i);
  });

  // ⭐ THE CASE THE OLD COUNT-ONLY CHECK COULD NOT SEE. Only TWO exceptions exist here, so the
  // pre-widening `exceptions.length > 1` rule would have counted 2 and — under a naive "raise
  // the ceiling to 2" widening — PASSED, licensing In Memoriam to publish a Tier-1 name that
  // no ruling ever authorised. Identity is the control; the count never was.
  it('REJECTS a second exception on an UNRULED field even though only two exist', () => {
    expect(() =>
      parsePublicVsPrivateMatrix(
        doc(`${withException}  - id: in-memoriam
    route: /in-memoriam
    renders: false
    search_indexing_policy: noindex
    cache_policy: edge_cacheable
    fields:
      - id: deceased_name
        tier: public
        pii_tier: 1
        tier1_public_exception:
          decision: '2026-08-19-136'
          rationale: Not the ruled pair — in-memoriam keeps first-name + last-initial.
          scope: this surface only
`),
      ),
    ).toThrow(/in-memoriam\.deceased_name/);
  });

  // ⛔ D1(b)/D10's scope fence, asserted rather than merely written down: the Sahyog Drive
  // ruling does NOT travel to 11b.3's surface just because the field means the same thing.
  it('REJECTS the ruled Sahyog Drive field id when it appears on a DIFFERENT surface', () => {
    expect(() =>
      parsePublicVsPrivateMatrix(
        doc(`${withException}  - id: sahyog-vivran
    route: /sahyog-vivran
    renders: false
    search_indexing_policy: noindex
    cache_policy: edge_cacheable
    fields:
      - id: deceased_member_name
        tier: public
        pii_tier: 1
        tier1_public_exception:
          decision: '2026-08-24-159'
          rationale: Borrowing 11b.1's ruling for a surface it does not reach.
          scope: this surface only
`),
      ),
    ).toThrow(/sahyog-vivran\.deceased_member_name/);
  });

  it('REJECTS an exception block missing its decision ref (attribution is mandatory)', () => {
    expect(() =>
      parsePublicVsPrivateMatrix(
        doc(`surfaces:
  - id: member-directory
    route: /members
    renders: false
    search_indexing_policy: noindex
    cache_policy: edge_cacheable
    fields:
      - id: member_name
        tier: public
        pii_tier: 1
        tier1_public_exception:
          rationale: No decision reference.
          scope: this surface only
`),
      ),
    ).toThrow(/decision/);
  });

  it('REJECTS an exception on a field that is NOT Tier-1 `public` (the construct cannot be decorative)', () => {
    expect(() =>
      parsePublicVsPrivateMatrix(
        doc(`surfaces:
  - id: member-directory
    route: /members
    renders: false
    search_indexing_policy: noindex
    cache_policy: edge_cacheable
    fields:
      - id: district
        tier: public
        pii_tier: 3
        tier1_public_exception:
          decision: '2026-08-19-136'
          rationale: Not a Tier-1 field at all.
          scope: this surface only
`),
      ),
    ).toThrow(/tier1_public_exception/);
  });
});

describe('escalation ledger + count cross-check (AC8)', () => {
  const ledger = (count: number, entries: string): string =>
    doc(`${MINIMAL_SURFACE}escalation_count: ${count}
escalations:
${entries}`);

  const ONE_ENTRY = `  - surface: terms
    field: tc_body_html
    from: authenticated_member
    to: public
    decision: '2026-08-20-140'
    rationale: The T&C body is institutional content published to every visitor.
`;

  it('parses a ledger whose count agrees with its entries', () => {
    const m = parsePublicVsPrivateMatrix(ledger(1, ONE_ENTRY));
    expect(m?.escalation_count).toBe(1);
    expect(m?.escalations).toHaveLength(1);
    expect(m?.escalations[0]?.decision).toBe('2026-08-20-140');
  });

  it('defaults to an EMPTY ledger with count 0 when absent', () => {
    const m = parsePublicVsPrivateMatrix(doc(MINIMAL_SURFACE));
    expect(m?.escalations).toEqual([]);
    expect(m?.escalation_count).toBe(0);
  });

  it('REJECTS a count that disagrees with the entry total (neither half moves alone)', () => {
    expect(() => parsePublicVsPrivateMatrix(ledger(2, ONE_ENTRY))).toThrow(/escalation_count/);
  });

  it('REJECTS an entry with an empty decision ref (attestation is the point)', () => {
    expect(() =>
      parsePublicVsPrivateMatrix(
        ledger(
          1,
          `  - surface: terms
    field: tc_body_html
    from: authenticated_member
    to: public
    decision: ''
    rationale: No attestation.
`,
        ),
      ),
    ).toThrow(/decision/);
  });

  it('REJECTS a non-escalating entry (from must be MORE sensitive than to)', () => {
    expect(() =>
      parsePublicVsPrivateMatrix(
        ledger(
          1,
          `  - surface: terms
    field: tc_body_html
    from: public
    to: authenticated_member
    decision: '2026-08-20-140'
    rationale: This is a RESTRICTION, not an escalation.
`,
        ),
      ),
    ).toThrow(/escalat/i);
  });

  it('REJECTS a malformed ledger LOUDLY — ⛔ never degrading to "no entries"', () => {
    expect(() =>
      parsePublicVsPrivateMatrix(
        doc(`${MINIMAL_SURFACE}escalation_count: 1
escalations: "not a list"
`),
      ),
    ).toThrow();
  });

  it('NEGATIVE CONTROL — REJECTS an entry whose `to` disagrees with the field\'s CURRENT declared tier (code review 2026-08-20)', () => {
    // MINIMAL_SURFACE declares `tc_body_html` at tier `public`. This entry is a well-formed
    // escalation shape (from a MORE sensitive tier to a LESS sensitive one) but claims the field
    // landed at `authenticated_member` — which disagrees with what the matrix actually declares.
    expect(() =>
      parsePublicVsPrivateMatrix(
        ledger(
          1,
          `  - surface: terms
    field: tc_body_html
    from: operator_restricted
    to: authenticated_member
    decision: '2026-08-20-140'
    rationale: The ledger claims a tier the field does not actually carry.
`,
        ),
      ),
    ).toThrow(/currently declared at tier "public"/);
  });
});

describe('per-Pariwar attribute RULE (AC6, Trap 1)', () => {
  const rule = `per_pariwar_attribute_rule:
  default_tier: operator_restricted
  ceiling_tier: public
  declaration_site: registry data (pariwar_custom_field_definitions rows)
  note: >-
    A Pariwar-selected directory attribute is NOT enumerated here. This block
    declares the tier such an attribute defaults to and the ceiling it may never
    exceed. ⛔ There is no canonical directory schema (2026-08-19-132 R7).
`;

  it('parses the rule block', () => {
    const m = parsePublicVsPrivateMatrix(doc(`${MINIMAL_SURFACE}${rule}`));
    expect(m?.per_pariwar_attribute_rule?.default_tier).toBe('operator_restricted');
    expect(m?.per_pariwar_attribute_rule?.ceiling_tier).toBe('public');
  });

  it('REJECTS a rule whose default is MORE exposed than its ceiling', () => {
    expect(() =>
      parsePublicVsPrivateMatrix(
        doc(`${MINIMAL_SURFACE}per_pariwar_attribute_rule:
  default_tier: public
  ceiling_tier: operator_restricted
  declaration_site: registry data
`),
      ),
    ).toThrow(/ceiling/i);
  });

  it('REJECTS an unknown key inside the rule block (⛔ no field list smuggled in as `fields:`)', () => {
    expect(() =>
      parsePublicVsPrivateMatrix(
        doc(`${MINIMAL_SURFACE}per_pariwar_attribute_rule:
  default_tier: operator_restricted
  ceiling_tier: public
  declaration_site: registry data
  fields:
    - school
    - designation
`),
      ),
    ).toThrow();
  });
});
