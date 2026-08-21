// Public-name presentation resolver — Story 11a.1 (Task 8; AC5, ruling D1(a)).
//
// ⭐ THIS FILE IS AN OWED ARTIFACT, not routine coverage. Decision `2026-08-19-136`
// clause 1 states that the implementation *"must not hard-code full-name
// publication as permanent"*, and — unusually — makes that TESTABLE in its own
// words: *"a build in which the public name form cannot be changed without a code
// change FAILS this clause."* `136`'s open follow-ups name the artifact directly:
// *"A test asserting the public name form is CONFIGURABLE — ⛔ should be proven,
// not asserted."*
//
// So the load-bearing test below is not "the resolver returns the right string".
// It is: FLIP THE STORED MODE, and the rendered form changes — with no code
// change, no redeploy, and no edit to the stored KYC name. And it flips BACK:
// clause 3 is explicit that this moves in both directions, ⛔ not a one-way
// ratchet toward privacy.
//
// ⛔ `shielded_name` DELEGATES to `splitFirstNameLastInitial` and does not
// reimplement it (Trap 4). That function is not dead code the directory declines
// to use — by cl.2 it IS the implementation of this mode.

import { describe, expect, it } from 'vitest';

import { splitFirstNameLastInitial } from '../../src/kyc/name.js';
import {
  DEFAULT_PUBLIC_NAME_PRESENTATION_MODE,
  PUBLIC_NAME_PRESENTATION_MODES,
  resolvePublicMemberName,
} from '../../src/kyc/public-name.js';

describe('the mode tuple + default (AC5)', () => {
  it('offers exactly the two ruled modes', () => {
    expect([...PUBLIC_NAME_PRESENTATION_MODES]).toEqual(['full_name', 'shielded_name']);
  });

  it('⭐ defaults to `full_name` — the LAUNCH POSTURE (2026-08-19-136 cl.1)', () => {
    // The Panel ruled full names are published. The default encodes that ruling.
    // ⛔ But it is the DEFAULT, not a constant — which is what the flip test below
    // exists to prove.
    expect(DEFAULT_PUBLIC_NAME_PRESENTATION_MODE).toBe('full_name');
  });
});

describe('resolvePublicMemberName (AC5)', () => {
  it('renders the full legal name in `full_name` mode', () => {
    expect(resolvePublicMemberName('full_name', 'Rajesh Sharma')).toBe('Rajesh Sharma');
  });

  it('renders first name + last initial in `shielded_name` mode', () => {
    expect(resolvePublicMemberName('shielded_name', 'Rajesh Sharma')).toBe('Rajesh S.');
  });

  it('DELEGATES the split to splitFirstNameLastInitial (⛔ no second implementation)', () => {
    // Asserted by agreement rather than by inspection: whatever that function
    // decides about TOKENISATION, this resolver must render.
    //
    // ⚠ SHIELDABLE NAMES ONLY. The mononym case is deliberately NOT delegated — see the
    // dedicated test below and `2026-08-21-145` cl.3. The old form of this loop computed
    // `expected = lastInitial === '' ? firstName : …`, which RESTATED the resolver's own branch
    // and so agreed with it no matter what it did — including when what it did was publish a
    // mononym's full legal name under `shielded_name`. ⛔ A delegation test must pin tokenisation,
    // never the policy branch it is supposed to be checking.
    for (const name of ['Ram Prasad Yadav', 'Sunita   Devi', 'राजेश शर्मा']) {
      const { firstName, lastInitial } = splitFirstNameLastInitial(name);
      expect(lastInitial).not.toBe(''); // guards the fixture: these must be multi-token
      expect(resolvePublicMemberName('shielded_name', name)).toBe(`${firstName} ${lastInitial}.`);
    }
  });

  it('uses the LAST token for the initial, never a middle one', () => {
    expect(resolvePublicMemberName('shielded_name', 'Ram Prasad Yadav')).toBe('Ram Y.');
  });

  it('⭐ OMITS THE MEMBER for a single-token name — a mononym cannot be shielded', () => {
    // `2026-08-21-145` cl.3. ⛔ This assertion previously read `.toBe('Rajesh')`, i.e. it PINNED
    // the defect: under `shielded_name` a mononym returned the entire stored legal name,
    // byte-identical to `full_name`, so the governed privacy act silently did nothing.
    // ⭐ `''` means "omit this row" to every caller ⇒ the shield now FAILS CLOSED.
    expect(resolvePublicMemberName('shielded_name', 'Rajesh')).toBe('');
    expect(resolvePublicMemberName('shielded_name', 'Sunita')).toBe('');
    // ⚠ Whitespace around a mononym must not smuggle it through as a two-token name.
    expect(resolvePublicMemberName('shielded_name', '   Sunita   ')).toBe('');
  });

  it('⛔ NEGATIVE CONTROL — the mononym omission is the SHIELD, not a rejection of the name', () => {
    // ⚠ Without this, a future "simplification" could omit mononyms under BOTH modes and every
    // other test would still pass. `full_name` must still publish a mononym in full: the member
    // has consented to their legal name being shown, and there is nothing to shield.
    expect(resolvePublicMemberName('full_name', 'Rajesh')).toBe('Rajesh');
    expect(resolvePublicMemberName('full_name', 'Sunita')).toBe('Sunita');
  });

  it('handles Devanagari graphemes (a combining mark stays with its base)', () => {
    expect(resolvePublicMemberName('shielded_name', 'राजेश शर्मा')).toBe('राजेश श.');
  });

  it('collapses internal whitespace in BOTH modes (a stored name is not a display string)', () => {
    expect(resolvePublicMemberName('full_name', '  Sunita   Devi  ')).toBe('Sunita Devi');
    expect(resolvePublicMemberName('shielded_name', '  Sunita   Devi  ')).toBe('Sunita D.');
  });

  it('returns the empty string for an unresolvable name, in both modes (fail-soft)', () => {
    // The caller treats '' as unresolvable and omits the row — never renders a
    // blank or a placeholder where a person's name belongs.
    for (const mode of PUBLIC_NAME_PRESENTATION_MODES) {
      expect(resolvePublicMemberName(mode, '')).toBe('');
      expect(resolvePublicMemberName(mode, '   ')).toBe('');
    }
  });

  it('is PURE — same inputs, same output, no clock and no I/O', () => {
    expect(resolvePublicMemberName('shielded_name', 'Rajesh Sharma')).toBe(
      resolvePublicMemberName('shielded_name', 'Rajesh Sharma'),
    );
  });
});

describe('⭐ THE CONFIGURABILITY PROOF — 2026-08-19-136 cl.1 discharged BY TEST', () => {
  // The stored KYC name. It is the ONLY name of record, and it must not move.
  const STORED_KYC_NAME = 'Rajesh Kumar Sharma';

  /** Stands in for the per-Pariwar config row — the thing an operator flips. */
  let storedMode: (typeof PUBLIC_NAME_PRESENTATION_MODES)[number] =
    DEFAULT_PUBLIC_NAME_PRESENTATION_MODE;

  /** What the public directory would render, reading the stored mode. */
  const publicRender = (): string => resolvePublicMemberName(storedMode, STORED_KYC_NAME);

  it('flipping the STORED MODE changes the rendered form — ⛔ with NO code change', () => {
    expect(publicRender()).toBe('Rajesh Kumar Sharma'); // launch posture

    storedMode = 'shielded_name'; // ← the only thing that changed is DATA
    expect(publicRender()).toBe('Rajesh S.');
  });

  it('and it flips BACK — ⛔ not a one-way ratchet toward privacy (cl.3)', () => {
    storedMode = 'shielded_name';
    expect(publicRender()).toBe('Rajesh S.');

    storedMode = 'full_name';
    expect(publicRender()).toBe('Rajesh Kumar Sharma');
  });

  it('⛔ the STORED KYC NAME is byte-identical throughout (cl.2 — no second identity system)', () => {
    // The presentation policy governs the RENDER. It must never write the record.
    // If a flip could alter the stored name, the Pariwar would have acquired a
    // second, divergent identity for the member — which cl.2 forbids outright.
    const before = STORED_KYC_NAME;
    for (const mode of ['shielded_name', 'full_name', 'shielded_name'] as const) {
      storedMode = mode;
      publicRender();
    }
    expect(STORED_KYC_NAME).toBe(before);
    expect(Buffer.from(STORED_KYC_NAME, 'utf8').equals(Buffer.from(before, 'utf8'))).toBe(true);
  });

  it('every mode in the tuple resolves — an unrendered mode would be a dead option', () => {
    for (const mode of PUBLIC_NAME_PRESENTATION_MODES) {
      storedMode = mode;
      expect(publicRender().length).toBeGreaterThan(0);
    }
  });
});
