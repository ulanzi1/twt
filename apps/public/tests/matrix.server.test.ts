// Story 11a.2 (Task 2; AC1) — the RUNTIME matrix is the COMMITTED matrix, and
// `<MatrixField>`'s decision has teeth.
//
// Two distinct properties are proven here and they are not interchangeable:
//   (1) IDENTITY — the bytes the server bundle carries are the bytes the gate reads.
//       Without this, the renderer could enforce a stale copy while the gate checks
//       the real one; both would be internally consistent and neither would notice.
//   (2) BEHAVIOUR — visible renders, above-ceiling renders NOTHING, undeclared
//       renders NOTHING, and the two omissions are distinguishable in the VERDICT
//       while being identical in the OUTPUT.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getVisibility,
  parsePublicVsPrivateMatrix,
  type PublicVsPrivateMatrix,
} from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import {
  MATRIX_SOURCE,
  RUNTIME_MATRIX,
  matrixFieldOutput,
  outputForVerdict,
  visibilityOf,
} from '../src/lib/matrix.server.js';

const here = dirname(fileURLToPath(import.meta.url));
const committedPath = join(
  here,
  '../../../packages/contracts/public-pages/public-vs-private-matrix.yaml',
);

describe('AC1 — the runtime matrix IS the committed matrix (Trap 3)', () => {
  it('the inlined source is BYTE-IDENTICAL to the committed file', () => {
    // ⛔ Not "parses to the same shape" — byte-identical. A whitespace-only drift
    // would still mean two files, and two files drift.
    expect(MATRIX_SOURCE).toBe(readFileSync(committedPath, 'utf8'));
  });

  it('the runtime parse is non-empty and carries the surfaces the gate sees', () => {
    // Guards against the degradation this module refuses to perform: if `?raw`
    // silently yielded nothing, an empty matrix would make EVERY field invisible
    // and the page would look merely blank rather than broken.
    expect(RUNTIME_MATRIX.surfaces.length).toBeGreaterThan(0);
    const committed = parsePublicVsPrivateMatrix(readFileSync(committedPath, 'utf8'));
    expect(committed).not.toBeNull();
    expect(RUNTIME_MATRIX.surfaces.map((s) => s.id).sort()).toEqual(
      committed!.surfaces.map((s) => s.id).sort(),
    );
  });

  it('the matrix is parsed ONCE per process, not per lookup', () => {
    // Identity, not deep-equality: two lookups must read the same object.
    const a = visibilityOf('terms', 'tc_version', 'public');
    const b = visibilityOf('terms', 'tc_version', 'public');
    expect(a.tier).toBe(b.tier);
    expect(visibilityOf('terms', 'tc_version', 'public').message).toBe(b.message);
  });
});

describe('AC1 — <MatrixField> delegates every decision to getVisibility()', () => {
  it('a declared public field at a public viewer RENDERS its value', () => {
    const { verdict, output } = matrixFieldOutput('terms', 'tc_version', 'public', 'v3');
    expect(verdict.visible).toBe(true);
    expect(output).toBe('v3');
  });

  it('NEGATIVE CONTROL — an authenticated_member-tier field asked at `public` renders NOTHING', () => {
    // ⚠ PLANTED, and it HAS to be. Every field the committed matrix declares today is
    // tier `public` (the seven shipped surfaces are public by construction, and
    // `member_name` carries the ruled Tier-1 exception), so asking the real matrix for
    // an above-ceiling field would be VACUOUS — a control proving nothing, silently.
    // So the TIER is planted on a copy and the verdict is fed through the SAME
    // `outputForVerdict` the component calls. ⛔ The rule is not restated here.
    const planted: PublicVsPrivateMatrix = {
      ...RUNTIME_MATRIX,
      surfaces: RUNTIME_MATRIX.surfaces.map((s) =>
        s.id !== 'member-directory'
          ? s
          : {
              ...s,
              fields: s.fields.map((f) =>
                f.id === 'district' ? { ...f, tier: 'authenticated_member' as const } : f,
              ),
            },
      ),
    };
    const verdict = getVisibility(planted, 'member-directory', 'district', 'public');
    expect(verdict.visible).toBe(false);
    expect(verdict.reason).toBe('above_viewer_ceiling');
    expect(verdict.tier).toBe('authenticated_member');
    expect(outputForVerdict(verdict, 'Bhopal')).toBeNull();
  });

  it('NEGATIVE CONTROL — an operator_restricted field asked at `public` renders NOTHING', () => {
    // Independently planted from the control above: a DIFFERENT tier on a DIFFERENT
    // surface, so neither can quietly stop firing behind the other.
    const planted: PublicVsPrivateMatrix = {
      ...RUNTIME_MATRIX,
      surfaces: RUNTIME_MATRIX.surfaces.map((s) =>
        s.id !== 'terms'
          ? s
          : {
              ...s,
              fields: s.fields.map((f) =>
                f.id === 'tc_version' ? { ...f, tier: 'operator_restricted' as const } : f,
              ),
            },
      ),
    };
    const verdict = getVisibility(planted, 'terms', 'tc_version', 'public');
    expect(verdict.visible).toBe(false);
    expect(verdict.reason).toBe('above_viewer_ceiling');
    expect(outputForVerdict(verdict, 'v3')).toBeNull();
  });

  it('the ruled Tier-1 `member_name` exception IS visible at public — ⛔ a silent revocation fails here', () => {
    // ⛔ Not a redundancy check: `2026-08-19-136` cl.1 makes the public name form a
    // GOVERNED setting. A change that quietly revoked the exception would otherwise be
    // discovered on the live directory rather than in CI.
    // ⚠ Visibility is not rendering: Story 11a.2 ⛔ does NOT render member_name — the
    // Tier-1 decrypt stays behind Story 11a.3's anti-enumeration safeguards.
    expect(visibilityOf('member-directory', 'member_name', 'public').visible).toBe(true);
  });

  it('NEGATIVE CONTROL — an UNDECLARED field renders NOTHING and is `undeclared_field`', () => {
    const { verdict, output } = matrixFieldOutput(
      'member-directory',
      'member_mobile',
      'public',
      '9876500000',
    );
    expect(verdict.visible).toBe(false);
    expect(verdict.reason).toBe('undeclared_field');
    expect(output).toBeNull();
  });

  it('NEGATIVE CONTROL — an UNKNOWN surface renders NOTHING and is `unknown_surface`', () => {
    const { verdict, output } = matrixFieldOutput('sahyog-vivran', 'amount', 'public', '5000');
    expect(verdict.visible).toBe(false);
    expect(verdict.reason).toBe('unknown_surface');
    expect(output).toBeNull();
  });

  it('⛔ the two omissions are IDENTICAL in output and DISTINGUISHABLE only in the verdict', () => {
    // The anti-enumeration property, asserted directly: a scraper diffing renders
    // must not be able to tell "exists but withheld" from "does not exist".
    const undeclared = matrixFieldOutput('member-directory', 'member_mobile', 'public', 'x');
    const unknown = matrixFieldOutput('no-such-surface', 'whatever', 'public', 'x');
    expect(undeclared.output).toBe(unknown.output);
    expect(undeclared.output).toBeNull();
    expect(undeclared.verdict.reason).not.toBe(unknown.verdict.reason);
  });

  it('⛔ a visible field with an empty value renders NOTHING (no empty element)', () => {
    expect(matrixFieldOutput('terms', 'tc_version', 'public', '').output).toBeNull();
    expect(matrixFieldOutput('terms', 'tc_version', 'public', null).output).toBeNull();
    expect(matrixFieldOutput('terms', 'tc_version', 'public', undefined).output).toBeNull();
  });
});
