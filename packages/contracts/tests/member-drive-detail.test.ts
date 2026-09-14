// ⭐⭐ THE MEMBER DRIVE-DETAIL CONTRACT — Story 11b.17 (Task 6; AC3, AC7).
//
// ── ⭐ AC3(b): THE COORDINATE KEYS ARE STRUCTURALLY **ABSENT**, ⛔ NEVER `null` ─────────────────
// Asserted against the **SCHEMA**, ⛔ not against a response body. ⚠⛔⛔ **⛔ DO ⛔ NOT WRITE
// `expect(body).not.toHaveProperty('accountNumber')` AGAINST A 404** — ⭐ that passes **VACUOUSLY**
// on a 500, an empty body, or a typo'd id ([[feedback_gate_scope_semantic_coverage]]). The live
// 404 half is `apps/api/tests/integration/contributions/member-drive-detail.spec.ts`.
//
// ── ⭐⭐ AC7's FENCE — AND ITS MODEL IS ⛔ NOT STORY E's AC8 ─────────────────────────────────────
// ⚠⛔⛔ E's AC8 is a **PROSE ENUMERATION that scans ⛔ NOTHING**, and it was **breached by E's own dev
// and then NARROWED in review** (`11b-15:864`) ⇒ ⛔ the worst available model.
// ⭐⭐ **THE MODEL IS `packages/i18n/tests/sahyog-shared-dark-copy.test.ts`**, which carries all four
// properties a fence needs: a **repo walk** over `apps/` + `packages/`; a **NON-VACUITY assertion**
// (⛔ a green scan over an empty file set proves ⛔ nothing); **self-exclusion by REAL PATH**
// (`realpathSync(f) === OWN_FILE`, ⛔ not a basename); and an `AUTHORISED` allow-list that is ⛔ **not
// a waiver**. ⭐ And it was **PROVEN TO BITE** with a planted probe, ⛔ not read off a green run —
// ⭐ which this file's own probes were too.
//
// ── ⚠⛔ WHAT THIS FENCE DOES ⛔ NOT RE-ASSERT ───────────────────────────────────────────────────
// ⛔ **NOT** `drive-list-render.test.ts`'s *"no `onPress`"* — **AC8 amends it BY NAME**, and the
// amendment is stricter (it now catches a handler stripped from a role, which the old assertion could
// ⛔ not). ⛔ **NOT** the dark-copy `AUTHORISED = []` — **AC10 NARROWS it BY NAME**. ⭐ AC7 fences the
// **PUBLIC** surface and the named non-moves, ⛔ nothing inside this story's own blast radius.

import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  MemberDriveDetailParams,
  MemberDriveDetailResponse,
  MemberDriveNomineeAccountView,
  satisfiesMemberDriveDetailLivePairing,
} from '../src/contributions/member-drive-detail.js';

const OWN_FILE = realpathSync(fileURLToPath(import.meta.url));
const repoRoot = join(dirname(OWN_FILE), '../../..');

/**
 * ⭐ Walk `apps/` + `packages/` for source files.
 *
 * ⚠⛔⛔ **THE `SKIP` SET IS COPIED FROM THE MODEL FENCE VERBATIM, AND THAT IS DELIBERATE.**
 * `sahyog-shared-dark-copy.test.ts`'s own doc-block warns that *"two copies drift the moment one
 * gains a `SKIP` entry the other lacks"* — ⭐ so this one carries the SAME entries, in the same
 * spirit: `node_modules`/`dist`/`.turbo` keep a **BUILT** copy of a source file from being read as a
 * second consumer, and **`ios`/`android`** keep the walker out of `apps/mobile`'s native pod trees,
 * which contain **BROKEN SYMLINKS** that make `statSync` THROW (⛔ found by this file failing on
 * `React-jsinspector/.../Base64.h`, ⛔ not assumed).
 * ⚠ ⇒ ⛔ **do ⛔ not add an entry here without adding it there**, and ⛔ vice versa.
 */
const SCAN_ROOTS = ['apps', 'packages'];
const SKIP = new Set(['node_modules', 'dist', '.turbo', 'ios', 'android', '.astro']);
const EXTS = ['.ts', '.tsx', '.astro'];

function walk(dir: string, out: string[]): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    // ⚠⛔⛔ **`statSync` FOLLOWS SYMLINKS AND THROWS ON A BROKEN ONE — AND THIS WALK RUNS AT MODULE
    // SCOPE**, so ⛔ ONE dangling link anywhere under `apps/`/`packages/` failed COLLECTION of this
    // whole file, taking down the six AC3(b) contract-shape assertions that ⛔ never touch the disk.
    // ⭐ The `SKIP` set is ⛔ not a fix for that — it is a list of places we happen to know about
    // (`ios`/`android` were added after this exact failure on `React-jsinspector/.../Base64.h`), and
    // `.expo` / `.tamagui` / `coverage` / `.next` are ⛔ not in it. ⇒ SKIP what we can NAME, and
    // SURVIVE what we cannot ([[feedback_gate_scope_semantic_coverage]]).
    // ⚠ `throwIfNoEntry: false` covers the dangling-link and race cases; the `catch` covers EPERM/ELOOP —
    // ⛔ and ONLY those (review finding, 2026-09-14): a bare `catch` would also swallow a real bug or an
    // unrelated I/O fault as "skip this entry," which is ⛔ not what the comment above claims.
    let st;
    try {
      st = statSync(full, { throwIfNoEntry: false });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EPERM' && code !== 'ELOOP') throw err;
      continue;
    }
    if (st === undefined) continue;
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

const files: string[] = SCAN_ROOTS.flatMap((r) => walk(join(repoRoot, r), []));

/**
 * ⭐⭐ THE SOURCE WITH ITS COMMENTS REMOVED — for assertions about what the code **DOES**.
 *
 * ⚠⛔⛔ **THIS IS ⛔ NOT A CONVENIENCE, AND THIS FILE'S FIRST RUN PROVED IT.** Several assertions below
 * forbid a token OUTRIGHT (`vpa`, `spawned`, `nominee_account_number`, `getDriveTargetVisibilityRow`)
 * — and they FAILED against the raw source, because the codebase's doc-blocks **NAME those tokens in
 * order to FORBID them**. ⇒ ⭐ a raw-source scan makes this repo's own discipline — *"say what you are
 * not doing, and why"* — **indistinguishable from doing it**.
 * ⛔ The wrong fix is to reword the comments until the regex is happy: that deletes the record a
 * future author needs and leaves the fence just as blind. ⭐ The right one is to scan the **CODE**.
 * ⚠ It is the same lesson `apps/mobile/tests/unit/drive-list-render.test.ts` records for its own
 * `codeOnly`; ⛔ do ⛔ not "improve" this into a full parser — every assertion using it is a
 * token-presence check, and it only has to be right about comments.
 */
const code = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');

describe('⭐⭐ AC3(b) — the coordinate keys are structurally ABSENT, ⛔ never `null`', () => {
  it('⭐ `driveTargetInr` is OPTIONAL — the key is ABSENT when withheld, ⛔ never `null`', () => {
    // ⭐ The 11b.11 shape, ruled at `2026-09-07-205` **cl.9** (*"the keys are ABSENT, ⛔ never `null`"*).
    // ⚠⛔ ⛔ **NOT `-165`** — that entry is the Tier-1 allowlist widening and contains ⛔ no `.strict()`,
    // ⛔ no `absent`, ⛔ no `null`. The shipped public contract still carries that wrong ground; it is
    // ROUTED in `deferred-work.md`, ⛔ not fixed here (AC7 fences the public surface out).
    const target = MemberDriveDetailResponse.shape.driveTargetInr;
    expect(target.isOptional()).toBe(true);
    // ⛔⛔ AND ⛔ NOT NULLABLE — the two are different wire facts and ⛔ only one of them is the ruled
    // one. ⚠ A `.nullable().optional()` would let a producer ship `null` and still type-check.
    expect(target.isNullable()).toBe(false);
  });

  it('⭐ `confirmedPercentage` IS nullable — ⛔ and that asymmetry with लक्ष्य is DELIBERATE', () => {
    // ⚠⛔ ⛔ **DO ⛔ NOT "ALIGN" THESE TWO.** `confirmedPercentage` mirrors the PUBLIC wire exactly
    // (`2026-09-08-207` cl.1 made it `null` on archived rows, closing the roster-size-by-division
    // channel); `driveTargetInr` is ABSENT-when-withheld (the 11b.11 shape). ⭐ Two ruled shapes, two
    // different rulings, on one response.
    expect(MemberDriveDetailResponse.shape.confirmedPercentage.isNullable()).toBe(true);
    expect(MemberDriveDetailResponse.shape.confirmedPercentage.isOptional()).toBe(false);
  });

  it('⛔⛔ the response is `.strict()` — an unknown key is a CONTRACT VIOLATION, ⛔ not an ignored one', () => {
    // ⭐ That is what makes AC7's fence STRUCTURAL rather than advisory: a `vpa`, a contributor name or
    // a per-member amount ⛔ cannot be added without failing validation.
    const base = {
      poolLetterCode: 'A',
      poolCanonicalIdentifier: 'P-2026-09-001',
      publicToken: 'tok',
      deceasedMemberName: null,
      nomineeName: null,
      status: 'live' as const,
      closedAt: null,
      district: null,
      confirmedContributionCount: 0,
      confirmedPercentage: 0,
      amountRaisedInr: 0,
      fundingOutcome: null,
      nomineeAccounts: [],
    };
    expect(MemberDriveDetailResponse.safeParse(base).success).toBe(true);
    expect(MemberDriveDetailResponse.safeParse({ ...base, vpa: 'x@upi' }).success).toBe(false);
    expect(MemberDriveDetailResponse.safeParse({ ...base, contributorNames: [] }).success).toBe(false);
    // ⛔ AND `null` IS ⛔ NOT AN ACCEPTED SHAPE FOR लक्ष्य — ⭐ the absence rule, enforced by the parser.
    expect(MemberDriveDetailResponse.safeParse({ ...base, driveTargetInr: null }).success).toBe(false);
  });

  it('⛔⛔ at most TWO accounts — the composite PK is the bound, and the contract states it', () => {
    const one = { rank: 1 as const, accountHolderName: 'A', accountNumber: '1', ifsc: 'I', bankName: 'B', branch: null };
    expect(MemberDriveNomineeAccountView.safeParse(one).success).toBe(true);
    // ⛔ `vpa` is ⛔ NOT on this view — `2026-09-10-212` cl.2 ruled the UPI ID onto the PAYMENT screen.
    expect(MemberDriveNomineeAccountView.safeParse({ ...one, vpa: 'x@upi' }).success).toBe(false);
    // ⭐⭐ **BOTH `branch` AND `bankName` ARE NULLABLE — `#decision-2026-09-14-217` cl.2 (Trustee-ratified,
    // DR + KB), option (B).** An unrecorded bank name OMITS ITS ROW, exactly as an absent branch does.
    // ⚠⛔⛔ **THIS ASSERTION PREVIOUSLY READ `bankName …isNullable()).toBe(false)` AND IT WENT RED ON THE
    // RULING — ⭐ THAT IS THE FENCE WORKING, ⛔ not a test to "fix" quietly.** It is amended BY NAME
    // ([[feedback_supersede_never_reinterpret]]): the prior shape forced an empty plaintext `bank_name`
    // to ship `NOMINEE_BANK_DECRYPT_FAILED_SENTINEL`, which reported a **crypto failure that did ⛔ not
    // happen** on a column that is ⛔ never encrypted.
    // ⚠⛔ **THE TWO ARE STILL ⛔ NOT TWINS, AND ⛔ ONE GUARD MUST ⛔ NOT SERVE BOTH:** `branch` is a
    // NULLABLE COLUMN; `bankName` is `NOT NULL` with no non-empty CHECK, so its `null` is MINTED AT THE
    // API BOUNDARY from an empty/whitespace value. ⭐ Same posture, ⛔ different provenance.
    expect(MemberDriveNomineeAccountView.shape.branch.isNullable()).toBe(true);
    expect(MemberDriveNomineeAccountView.shape.bankName.isNullable()).toBe(true);
    // ⛔⛔ **AND THE THREE TIER-1 COORDINATES ARE STILL ⛔ NOT NULLABLE** — ⭐ the ruling moved `bankName`
    // and ⛔ NOTHING ELSE. A null account number cannot be transferred to, exactly as a masked one cannot.
    expect(MemberDriveNomineeAccountView.shape.accountHolderName.isNullable()).toBe(false);
    expect(MemberDriveNomineeAccountView.shape.accountNumber.isNullable()).toBe(false);
    expect(MemberDriveNomineeAccountView.shape.ifsc.isNullable()).toBe(false);
  });

  it('⛔ the route params are `.strict()` — ⛔ no `pariwarId` may be smuggled in (family 12)', () => {
    expect(MemberDriveDetailParams.safeParse({ driveToken: 'tok' }).success).toBe(true);
    // ⭐⭐ THE SCOPE COMES FROM THE SESSION, AND ADDING A PARAMETER WOULD BE **THE DEFECT**. `-199`
    // scope **(i)** is the member's OWN Pariwar; family 12 forbids scoping a member read by a
    // client-supplied id ⇒ ⛔ the scope is ⛔ not expressible here BY CONSTRUCTION.
    expect(
      MemberDriveDetailParams.safeParse({ driveToken: 'tok', pariwarId: 'x' }).success,
      'a `pariwarId` route parameter would let a client choose the tenant — family 12',
    ).toBe(false);
  });

  it('⭐⭐ THE FIVE COORDINATE KEYS ARE REQUIRED AND NON-NULLABLE — ⭐ the keys this block is NAMED for', () => {
    // ⚠⛔⛔ **THIS BLOCK IS TITLED *"the coordinate keys are structurally ABSENT, ⛔ never `null`"* AND
    // ⛔ ASSERTED ⛔ NONE OF THEM.** Its six `it()`s covered `driveTargetInr` (AC2's subject, correctly
    // fenced three ways), `confirmedPercentage`, `.strict()`, the `bankName`/`branch` asymmetry, the
    // params, and the pairing — ⛔ but ⛔ nothing pinned `accountNumber`, `ifsc` or `accountHolderName`,
    // and ⛔ nothing pinned `nomineeAccounts` itself as required. ⇒ AC3's OWN subject was ASSUMED while
    // AC2's was asserted ([[feedback_gate_scope_semantic_coverage]]).
    //
    // ⭐⭐ WHY IT MATTERS ⛔ EVEN THOUGH IT HOLDS TODAY: a later `.nullable()` on `accountNumber` is
    // exactly how *"a masked account# cannot be transferred to"* becomes *"a null account# cannot be
    // transferred to"* — the SAME failure `-190` cl.3 exists to prevent, arriving through the type
    // rather than through a mask. ⛔ `[]` stays a FIRST-CLASS state; ⛔ a `null` ARRAY is ⛔ not.
    const acct = {
      rank: 1 as const,
      accountHolderName: 'Sunita Devi',
      accountNumber: '123456789012',
      ifsc: 'SBIN0001234',
      bankName: 'State Bank of India',
      branch: 'Ranchi Main',
    };
    // ⭐ The three Tier-1 coordinates: ⛔ never `null`, ⛔ never absent.
    for (const key of ['accountHolderName', 'accountNumber', 'ifsc'] as const) {
      expect(
        MemberDriveNomineeAccountView.safeParse({ ...acct, [key]: null }).success,
        `${key} must ⛔ NOT be nullable — a null coordinate cannot be transferred to`,
      ).toBe(false);
      const without: Record<string, unknown> = { ...acct };
      delete without[key];
      expect(
        MemberDriveNomineeAccountView.safeParse(without).success,
        `${key} must be REQUIRED — an absent coordinate is an incomplete payment instruction`,
      ).toBe(false);
      // ⛔ And ⛔ never a BLANK, which could masquerade as real data (the `.min(1)` floor).
      expect(MemberDriveNomineeAccountView.safeParse({ ...acct, [key]: '' }).success).toBe(false);
    }
    // ⭐ `nomineeAccounts` itself — REQUIRED and ⛔ NOT nullable; `[]` is the absence signal.
    const resp = {
      poolLetterCode: 'A',
      poolCanonicalIdentifier: 'P-2026-09-001',
      publicToken: 'tok',
      deceasedMemberName: 'Late Ram Prasad',
      nomineeName: 'Sunita Devi',
      status: 'live' as const,
      closedAt: null,
      district: 'Ranchi',
      confirmedContributionCount: 3,
      confirmedPercentage: 30,
      amountRaisedInr: 3000,
      fundingOutcome: null,
      nomineeAccounts: [acct],
    };
    expect(MemberDriveDetailResponse.safeParse(resp).success).toBe(true);
    expect(
      MemberDriveDetailResponse.safeParse({ ...resp, nomineeAccounts: null }).success,
      '`nomineeAccounts` must ⛔ NOT be nullable — `[]` is the first-class absence signal',
    ).toBe(false);
    const noAccounts: Record<string, unknown> = { ...resp };
    delete noAccounts['nomineeAccounts'];
    expect(MemberDriveDetailResponse.safeParse(noAccounts).success).toBe(false);
    // ⭐ `[]` IS valid — the claim's bank details were ⛔ never collected (6.8 AC3's absence signal).
    expect(MemberDriveDetailResponse.safeParse({ ...resp, nomineeAccounts: [] }).success).toBe(true);
    // ⛔ THREE accounts are ⛔ not representable — bounded by `claim_nominee_bank_accounts_account_rank_check`
    // (`CHECK (account_rank IN (1, 2))`, migration 0056), ⛔ NOT the composite PK (review finding, 2026-09-14:
    // that PK admits one row per distinct rank and does ⛔ not itself cap the rank's range), mirrored on the wire.
    expect(
      MemberDriveDetailResponse.safeParse({ ...resp, nomineeAccounts: [acct, acct, acct] }).success,
    ).toBe(false);
  });

  it('⭐ the live-only pairing predicate is asserted in the WIRE-TOKEN vocabulary', () => {
    // ⚠⛔⛔ **⛔ THE TWO VOCABULARIES ⛔ MUST ⛔ NOT BE MIXED.** `live`/`closed`/**`settled`** are POOL
    // STATES; `live`/`closed`/**`verified`** are WIRE TOKENS. ⭐ A wire assertion written against
    // `settled` matches ⛔ NOTHING — ⭐ asserted below so that mistake fails loudly.
    expect(satisfiesMemberDriveDetailLivePairing({ status: 'live', confirmedPercentage: 0, driveTargetInr: 5000 })).toBe(true);
    expect(satisfiesMemberDriveDetailLivePairing({ status: 'live', confirmedPercentage: null, driveTargetInr: undefined })).toBe(false);
    expect(satisfiesMemberDriveDetailLivePairing({ status: 'verified', confirmedPercentage: null, driveTargetInr: undefined })).toBe(true);
    // ⛔ लक्ष्य on an archived drive — the `-212` cl.1 breach, and a DISCLOSURE defect.
    expect(satisfiesMemberDriveDetailLivePairing({ status: 'verified', confirmedPercentage: null, driveTargetInr: 5000 })).toBe(false);
    // ⛔ a live-only percentage on an archived drive — the `-207` cl.1 roster-recovery channel.
    expect(satisfiesMemberDriveDetailLivePairing({ status: 'closed', confirmedPercentage: 50, driveTargetInr: undefined })).toBe(false);
    // ⛔⛔ `settled` IS ⛔ NOT A WIRE TOKEN — the contract's own enum proves it, so the mistake cannot
    // be made silently.
    expect(MemberDriveDetailResponse.shape.status.safeParse('settled').success).toBe(false);
    expect(MemberDriveDetailResponse.shape.status.safeParse('verified').success).toBe(true);
  });
});

describe('⭐⭐ AC7 — ⛔ NOTHING ELSE MOVES. A fence that SCANS, ⛔ not a prose enumeration', () => {
  it('⛔ the walk is NON-VACUOUS — ⭐ the anti-vacuity guard, ⛔ without which every scan below is meaningless', () => {
    // ⭐ A green scan over an EMPTY file set proves ⛔ nothing
    // ([[feedback_gate_scope_semantic_coverage]]). ⚠ It is the property E's AC8 never had.
    expect(files.length).toBeGreaterThan(200);
    // ⭐ And the walk genuinely reaches the surfaces this fence is ABOUT — ⛔ a `SKIP` entry that
    // accidentally excluded `apps/public` would leave the public fence scanning nothing.
    expect(files.some((f) => f.includes('/apps/public/src/lib/surface-fields.ts'))).toBe(true);
    expect(files.some((f) => f.includes('/apps/mobile/components/drive-detail/'))).toBe(true);
  });

  it('⛔⛔ ⛔ NO MASKING BEHAVIOUR ANYWHERE ON THIS SURFACE — ⭐ and the walk is what proves it', () => {
    // ⚠⛔⛔ **THIS IS THE ASSERTION THE FENCE WAS MISSING, AND ITS ABSENCE MADE THE WALK DEAD WEIGHT.**
    // `files` was built over the whole repo and then consumed by ⛔ NOTHING but the non-vacuity guard
    // above — every other assertion in this file opens ONE of six hard-coded paths. ⇒ the anti-vacuity
    // guard guarded a scan that ⛔ did ⛔ not exist, which is structurally the *"PROSE ENUMERATION that
    // scans ⛔ NOTHING"* model AC7 calls the worst available ([[feedback_gate_scope_semantic_coverage]]).
    //
    // ⭐ AC7's named non-move: *"⛔ no masking behaviour (dormant per `-190` cl.4)"*. ⛔ Unmasked is the
    // POINT — *"a masked account# cannot be transferred to"* — and the safety question is WHO SEES IT
    // (`-199`), ⛔ never how much of it. ⇒ a well-meaning `.slice(-4)` "for safety" on any of this
    // surface's files would BREAK the one thing the field exists for.
    const surfaceFiles = files.filter(
      (f) =>
        f.includes('/components/drive-detail/') ||
        f.endsWith('/contributions/member-drive-detail.ts') ||
        f.endsWith('/pool/member-drive-detail.ts'),
    );
    // ⭐ Non-vacuity for THIS scan specifically — ⛔ never inherited from the guard above.
    expect(surfaceFiles.length).toBeGreaterThanOrEqual(3);
    for (const f of surfaceFiles) {
      const src = code(readFileSync(f, 'utf8'));
      expect(src).not.toMatch(/\.slice\(\s*-\d/);
      expect(src).not.toMatch(/\bmask(ed|ing)?\b/i);
      expect(src).not.toMatch(/\u2022{2,}|\bXXXX\b/);
    }
  });

  it('⛔⛔ ⛔ NO `vpa` REACHES THIS WIRE — on ⛔ any drive, in ⛔ any stage (D3(D), `-212` cl.2)', () => {
    const contract = readFileSync(
      join(repoRoot, 'packages/contracts/src/contributions/member-drive-detail.ts'),
      'utf8',
    );
    const domain = readFileSync(
      join(repoRoot, 'packages/domain/src/pool/member-drive-detail.ts'),
      'utf8',
    );
    // ⭐ Scanned as CODE, ⛔ not as prose: both files NAME `vpa` in order to FORBID it, so a raw-source
    // scan would make the codebase's own discipline — *"say what you are not doing, and why"* —
    // indistinguishable from doing it (the `drive-list-render.test.ts` `codeOnly` lesson).
    expect(code(contract)).not.toMatch(/\bvpa\b/i);
    // ⭐⭐ AND THE EXCLUSION IS **STRUCTURAL** IN THE DOMAIN READ: `vpaCiphertext` is ⛔ NOT PROJECTED,
    // so there is ⛔ nothing downstream to decrypt. ⚠ The shared accessor still RETURNS it (it serves
    // the 9.9 donor path, which needs it) — ⭐ the projection is the withdrawal, exactly as story A's
    // public one was.
    // ⚠⛔⛔ **TOKEN-WIDE, ⛔ NOT `/vpaCiphertext:/`.** The key-literal form fenced ⛔ only the
    // `vpaCiphertext:` PROPERTY-ASSIGNMENT spelling — and the regression that actually threatens this
    // projection is the one family 6 exists to name: collapsing the `flatMap`'s explicit object literal
    // to `{ ...r }` (or `const { vpaCiphertext, ...rest } = r`) over a row the shared accessor
    // `SELECT *`s. Either carries the Tier-1 VPA onto `MemberDriveDetailEntry` and matched ⛔ NOTHING.
    // ⭐ Matching the contract half's own `\bvpa\b` posture closes it.
    expect(code(domain)).not.toMatch(/vpaCiphertext/);
    // ⭐⭐ AND THE SPREAD ITSELF IS FENCED — the projection must stay an EXPLICIT field-pick, which is
    // the property *"THE PROJECTION IS THE EXCLUSION"* actually rests on (checklist family 6).
    expect(code(domain)).not.toMatch(/\.\.\.r\b/);
  });

  it('⛔⛔ the PUBLIC Sahyog Vivran contract is UNTOUCHED — ⛔ no coordinate returns to it', () => {
    // ⭐ Story **A** (`11b-11`) withdrew the coordinates from the public surface under
    // Trustee-ratified `2026-09-04-190` cl.1, and THIS story renders them on the MEMBER side ⛔ only.
    // ⚠⛔ A well-meaning *"the member has them, so the public can too"* is exactly the inversion
    // `-190` closed.
    const publicContract = readFileSync(
      join(repoRoot, 'packages/contracts/src/public-pages/sahyog-vivran.ts'),
      'utf8',
    );
    for (const banned of [
      /accountNumber\s*:\s*z\./,
      /accountNumberLast4\s*:\s*z\./,
      /ifsc\s*:\s*z\./i,
      /bankName\s*:\s*z\./,
      /branch\s*:\s*z\./,
    ]) {
      expect(publicContract).not.toMatch(banned);
    }
  });

  it('⛔⛔ the PUBLIC nominee-account FIELD MAP still carries ⛔ ONE id — ⭐ story A\'s withdrawal holds', () => {
    // ⭐ `deriveFieldIds` THROWS on an id with no `public-vs-private-matrix.yaml` row, so re-adding a
    // coordinate id here fails loudly — ⭐ that is the gate WORKING. ⚠ This assertion is the cheap
    // early warning beside it.
    // ⚠⛔⛔ **SCANNED AS CODE, ⛔ NOT AS PROSE** — ⭐ THIS ASSERTION FAILED AGAINST THE RAW SOURCE ON
    // ITS FIRST RUN, because that map's own doc-block **enumerates all five withdrawn ids in order to
    // forbid re-adding them** (*"Five entries stood beside it until 11b.11 — `nominee_bank_name`,
    // `nominee_branch`, …"*). ⛔ Rewording that comment to satisfy a regex would delete the record; ⭐ the
    // fence scans the CODE instead.
    const surfaceFields = code(
      readFileSync(join(repoRoot, 'apps/public/src/lib/surface-fields.ts'), 'utf8'),
    );
    const block = surfaceFields.slice(
      surfaceFields.indexOf('SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS'),
    );
    const mapBody = block.slice(block.indexOf('{'), block.indexOf('};'));
    for (const banned of ['nominee_bank_name', 'nominee_branch', 'nominee_account_number', 'nominee_ifsc', 'nominee_vpa']) {
      expect(mapBody, `story A deleted '${banned}' from the PUBLIC map — re-adding it needs its own ruling`).not.toContain(banned);
    }
    expect(mapBody).toContain('nominee_account_holder_name');
  });

  it('⛔⛔ the 9.9 DONOR PATH and the member LIST keep their ONE-DECRYPT behaviour — ⛔ untouched', () => {
    // ⭐ `2026-09-10-213` cl.1: *"the list's and the pay screen's one-decrypt behaviour is CORRECT and
    // is ⛔ NOT to be touched."* ⚠ The rule there governs the HOLDER NAME, which those surfaces render
    // in a SUMMARY slot with room for ⛔ no second value.
    // ⚠⛔⛔ **⛔ NOT because it is *"the SAME nominee"* twice — that ground is FALSE and SUPERSEDED**
    // (`#decision-2026-09-13-215`: ⛔ no FK, ⛔ no `nominee_rank`, ⛔ no match rule ⇒ two DIFFERING
    // holder names are a LEGITIMATE state). ⛔ Do ⛔ not restore the equality reading.
    // ⭐ THIS surface renders `accountNumber`/`ifsc`, which DIFFER, which is why both accounts render
    // here and ⛔ nothing changes there.
    const listDomain = readFileSync(
      join(repoRoot, 'packages/domain/src/pool/member-drive-list.ts'),
      'utf8',
    );
    // ⭐ The member LIST still selects exactly ONE nominee ciphertext (the correlated `LIMIT 1`
    // fragment), ⛔ not an array of accounts.
    expect(code(listDomain)).toContain('NOMINEE_ACCOUNT_HOLDER_NAME_CIPHERTEXT');
    // ⚠⛔ **SCANNED AS CODE.** A doc-comment in this repo's own style (*"⛔ never call
    // `getClaimNomineeBankAccountsCiphertext` here — the list decrypts ONE"*) is exactly the sentence a
    // future author SHOULD write, and against RAW source it would turn this fence red for a purely
    // documentary edit — the false-positive class this file's own header documents.
    expect(code(listDomain)).not.toContain('getClaimNomineeBankAccountsCiphertext');
    // ⭐ And the 9.9 DONOR PATH's own gate is untouched by this story.
    // ⚠⛔⛔ **THE GATE IS `resolveMemberLivePool` + the `unassigned` refusal — ⛔ NOT `vpaPresent`.**
    // This assertion previously read `expect(payment).toContain('vpaPresent')`, which fenced ⛔ the
    // WRONG THING twice over: `vpaPresent` is `8-17`'s VPA decrypt, ⛔ not the donor gate, so deleting
    // the gate outright left it GREEN — and it scanned RAW source, so the word survives in a
    // doc-comment even if every line of gate CODE is removed. ⭐ Both halves are fixed here.
    const payment = readFileSync(join(repoRoot, 'apps/api/src/modules/payment/handlers.ts'), 'utf8');
    expect(code(payment)).toContain('resolveMemberLivePool');
    expect(code(payment)).toContain("reason: 'unassigned'");
    // ⭐ And `8-17`'s VPA decrypt is still there — a SEPARATE property, asserted separately.
    expect(code(payment)).toContain('vpaPresent');
  });

  it('⛔ ⛔ NO `spawned` DRIVE IS VISIBLE — ⛔ a DISCLOSURE change, ⛔ not a filter widening', () => {
    const domain = readFileSync(
      join(repoRoot, 'packages/domain/src/pool/member-drive-detail.ts'),
      'utf8',
    );
    // ⭐ The tuple is declared as a literal, and `spawned` is a PURE DENY — a pool that never opened
    // follows an APPROVED CLAIM, so showing it would disclose the claim's underlying event AND its
    // approval to the whole Pariwar, earlier than any surface does today — and here it would expose a
    // bereaved family's banking coordinates before a single contribution had been asked for.
    expect(domain).toContain("MEMBER_DRIVE_DETAIL_VISIBLE_POOL_STATES = ['live', 'closed', 'settled']");
    expect(code(domain)).not.toContain("'spawned'");
  });

  it('⛔⛔ THE लक्ष्य GATE GOES THROUGH `resolveDriveTargetVisibility`, ⛔ NEVER the raw row reader', () => {
    // ⚠⛔⛔ *"A caller interpreting it is exactly how a fail-closed default becomes fail-open"*
    // (`-211` cl.3). ⚠ A regression here is a **DISCLOSURE defect**, ⛔ not a UI defect
    // (`-211` Consequence 4) — which is why it is fenced rather than left to review.
    const domain = readFileSync(
      join(repoRoot, 'packages/domain/src/pool/member-drive-detail.ts'),
      'utf8',
    );
    expect(code(domain)).toContain('resolveDriveTargetVisibility(db, pariwarId)');
    expect(code(domain)).not.toContain('getDriveTargetVisibilityRow');
    // ⛔ AND THE FIGURE IS **DERIVED** — `resolveEffectiveDriveTargetInr` reads a TYPED schedule and
    // `-204` cl.2 rules there is ⛔ NO setter. ⛔ Nothing here may read it to "check" the derivation.
    expect(code(domain)).not.toContain('resolveEffectiveDriveTargetInr');
    expect(code(domain)).not.toContain('pariwarDriveTargetSchedule');
  });
});
