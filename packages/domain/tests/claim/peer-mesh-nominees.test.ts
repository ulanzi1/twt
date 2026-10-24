// Story 6.36d (Task 5; AC2, AC9 — M2, M7, M15) — `peerMeshNomineeMatch` (6.36d's `peerMeshNomineeMobileIndexes`, renamed by Story
// 6.36e NE7 — its `mobileIndexes` half is what this file pins; the `memberIds` half is pinned at the end), the ONE read of the
// deceased's nominee indexes:
// the ND1 (b) filter (as recorded before the cut, the PROJECTED version per rank), the normalise (a number stored RAW matches the
// member's canonical login number), the de-duplication, the empty paths (⛔ KMS / ⛔ HMAC), and the fail-closed fault paths.
// Pure: `inScope` hands back the version rows (the live jobs legs go through the real read). Real envelopes under a counting fake
// KMS; every expected index COMPUTED through `mobileBlindIndex` (⛔ transcribed).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { correctionNumberHash } from '../../src/claim/correction-crypto.js';
import {
  PEER_MESH_NOMINEE_EXCLUSION_AUDIT_PURPOSE,
  peerMeshNomineeCiphertextsAsOf,
  peerMeshNomineeLinkedMembersAsOf,
  peerMeshNomineeMatch,
} from '../../src/claim/peer-mesh-nominees.js';
import { peerMeshFilingCut } from '../../src/claim/peer-mesh-read.js';
import { createFakeKmsProvider } from '../../src/encryption/index.js';
import { encryptTier1, serializeEnvelope } from '../../src/encryption/envelope.js';
import { MEMBER_NOMINEE_FIELD_CLASS, type FieldCryptoDeps } from '../../src/encryption/field-classes.js';
import type { KmsProvider } from '../../src/encryption/kms-provider.js';
import { mobileBlindIndex } from '../../src/encryption/member-fields.js';
import { type MemberId, memberId as toMemberId, nomineeVersionId, pariwarId as toPariwarId } from '../../src/ids/index.js';
import type { InScope } from '../../src/member/known-people.js';
import type { NomineeLinkOfVersion } from '../../src/nominee/member-links.js';
import type { MemberNomineeVersionRow } from '../../src/schema/member_nominee_versions.js';

const PARIWAR = toPariwarId(randomUUID());
const DECEASED = toMemberId(randomUUID());
// Filed 2026-10-20 (IST) ⇒ the cut is 2026-10-19T18:30Z.
const CUT = peerMeshFilingCut(new Date('2026-10-20T06:00:00Z'));
const BEFORE = new Date(CUT.cut.getTime() - 5 * 86_400_000);
const AFTER = new Date(CUT.cut.getTime() + 60_000);

interface Counts {
  decrypt: number;
  hmac: number;
}

function countingEnc(opts: { failDecrypt?: boolean; failHmac?: boolean; log?: string[] } = {}): { enc: FieldCryptoDeps; counts: Counts } {
  const base = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
  const counts: Counts = { decrypt: 0, hmac: 0 };
  const kms: KmsProvider = {
    ...base,
    encryptDek: (...a) => base.encryptDek(...a),
    decryptDek: async (...a) => {
      counts.decrypt += 1;
      opts.log?.push('kms:decrypt');
      if (opts.failDecrypt) throw Object.assign(new Error('kms unavailable'), { code: 14 });
      return base.decryptDek(...a);
    },
    computeHmac: async (...a) => {
      counts.hmac += 1;
      opts.log?.push('kms:hmac');
      if (opts.failHmac) throw Object.assign(new Error('kms unavailable'), { code: 14 });
      return base.computeHmac(...a);
    },
  };
  return { enc: { kms, kekRef: { resourceName: 'fake:6-36d-kek' }, hmacKeyRef: { resourceName: 'fake:6-36d-hmac' } }, counts };
}

/** A REAL nominee envelope (the declaration writer's context — the member's real Pariwar, class `member_nominee`). */
async function seal(enc: FieldCryptoDeps, raw: string): Promise<string> {
  const ct = await encryptTier1(Buffer.from(raw, 'utf-8'), { pariwarId: PARIWAR, fieldClass: MEMBER_NOMINEE_FIELD_CLASS }, enc.kms, enc.kekRef);
  return serializeEnvelope(ct);
}

let versionNo = 0;
function version(
  rank: 1 | 2,
  mobileCiphertext: string | null,
  recordedAt: Date,
  extra: Partial<MemberNomineeVersionRow> = {},
): MemberNomineeVersionRow {
  versionNo += 1;
  return {
    versionId: randomUUID(),
    memberId: DECEASED,
    pariwarId: PARIWAR,
    rank,
    versionNo,
    declarationId: randomUUID(),
    kind: mobileCiphertext === null ? 'vacated' : 'declared',
    source: 'member',
    nameCiphertext: null,
    relationship: null,
    mobileCiphertext,
    addressCiphertext: null,
    splitPct: null,
    recordedAt,
    effectiveAt: recordedAt,
    eventVersion: null,
    correctsVersionId: null,
    createdAt: recordedAt,
    ...extra,
  } as MemberNomineeVersionRow;
}

/** `inScope` handing back the rows (the read itself is the live legs'). Counts how many scopes were opened; `log` records open / close. */
function rowsScope(
  rows: readonly MemberNomineeVersionRow[],
  log?: string[],
  links: readonly NomineeLinkOfVersion[] = [],
): { inScope: InScope; opened: () => number } {
  let n = 0;
  const inScope = (async () => {
    n += 1;
    log?.push('scope:open');
    await Promise.resolve();
    log?.push('scope:close');
    return { versions: rows, links };
  }) as unknown as InScope;
  return { inScope, opened: () => n };
}

async function run(enc: FieldCryptoDeps, rows: readonly MemberNomineeVersionRow[]): Promise<string[]> {
  const match = await peerMeshNomineeMatch({ pariwarId: PARIWAR, deceasedMemberId: DECEASED, cut: CUT, enc, inScope: rowsScope(rows).inScope });
  return [...match.mobileIndexes];
}

describe('Story 6.36d — peerMeshNomineeMatch, the number half (AC2)', () => {
  it('the audit purpose is a plain lower-case key (blindIndexMany refuses anything else)', () => {
    expect(PEER_MESH_NOMINEE_EXCLUSION_AUDIT_PURPOSE).toMatch(/^[a-z][a-z0-9_]{0,63}$/);
  });

  it('⛔ version at all ⇒ [] and ⛔ KMS call of any kind', async () => {
    const { enc, counts } = countingEnc();
    expect(await run(enc, [])).toEqual([]);
    expect(counts).toEqual({ decrypt: 0, hmac: 0 });
  });

  it('M15 — a version recorded ON or AFTER the cut excludes nobody (ND1 (b)); ⛔ KMS when nothing is before the cut', async () => {
    const { enc, counts } = countingEnc();
    const atCut = version(1, await seal(enc, '9876543210'), CUT.cut);
    const after = version(2, await seal(enc, '9876543211'), AFTER);
    const sealCalls = counts.decrypt;
    expect(await run(enc, [atCut, after])).toEqual([]);
    expect(counts.decrypt - sealCalls).toBe(0);
    expect(counts.hmac).toBe(0);
  });

  it('M15 — a later re-declaration after the cut does ⛔ replace the number recorded before it', async () => {
    const { enc } = countingEnc();
    const v1 = version(1, await seal(enc, '9876543210'), BEFORE);
    const v2 = version(1, await seal(enc, '9123456780'), AFTER);
    expect(await run(enc, [v1, v2])).toEqual([await mobileBlindIndex('9876543210', enc)]);
  });

  it('M2 / M7 — a number stored with spaces, +91, a 0 prefix or hyphens matches the canonical LOGIN index', async () => {
    for (const stored of ['+91 98765 43210', '098765-43210', '91 98765-43210', '(98765) 43210']) {
      const { enc } = countingEnc();
      const v = version(1, await seal(enc, stored), BEFORE);
      const got = await run(enc, [v]);
      const login = await mobileBlindIndex('9876543210', enc);
      expect(got).toEqual([login]);
      // M7 — the WRONG hash space (`correctionNumberHash`, class `claim_contact_mobile`) never equals the login index.
      expect(got[0]).not.toBe(await correctionNumberHash('+919876543210', PARIWAR, enc));
    }
  });

  it('the PROJECTED version per rank: a re-declaration before the cut replaces the earlier number; both ranks count', async () => {
    const { enc } = countingEnc();
    const r1v1 = version(1, await seal(enc, '9000000001'), new Date(BEFORE.getTime() - 86_400_000));
    const r1v2 = version(1, await seal(enc, '9000000002'), BEFORE);
    const r2v1 = version(2, await seal(enc, '9000000003'), BEFORE);
    const got = await run(enc, [r1v1, r1v2, r2v1]);
    expect(got).toEqual([await mobileBlindIndex('9000000002', enc), await mobileBlindIndex('9000000003', enc)]);
  });

  it('a vacated rank excludes nobody (its tombstone is the projected version)', async () => {
    const { enc, counts } = countingEnc();
    const r2v1 = version(2, await seal(enc, '9000000003'), new Date(BEFORE.getTime() - 86_400_000));
    const r2v2 = version(2, null, BEFORE);
    const sealCalls = counts.decrypt;
    expect(await run(enc, [r2v1, r2v2])).toEqual([]);
    expect(counts.decrypt - sealCalls).toBe(0);
    expect(counts.hmac).toBe(0);
  });

  it('a sentinel or invalid number excludes nobody and does ⛔ throw — the decrypts run, ⛔ HMAC call', async () => {
    const { enc, counts } = countingEnc();
    const sentinel = version(1, await seal(enc, '[anonymized]'), BEFORE);
    const invalid = version(2, await seal(enc, '0091 98765 43210'), BEFORE); // 13 digits ⇒ normalizeMobile null (ND8)
    const sealCalls = counts.decrypt;
    expect(await run(enc, [sentinel, invalid])).toEqual([]);
    expect(counts.decrypt - sealCalls).toBe(2);
    expect(counts.hmac).toBe(0);
  });

  it('two versions with the same number make ONE HMAC input (de-duplication)', async () => {
    const { enc, counts } = countingEnc();
    const r1 = version(1, await seal(enc, '9876543210'), BEFORE);
    const r2 = version(2, await seal(enc, '+91-98765-43210'), BEFORE);
    const got = await run(enc, [r1, r2]);
    expect(counts.hmac).toBe(1);
    expect(got).toEqual([await mobileBlindIndex('9876543210', enc)]);
  });

  it('M8 (unit) — a KMS decrypt error THROWS (⛔ [])', async () => {
    const { enc } = countingEnc();
    const v = version(1, await seal(enc, '9876543210'), BEFORE);
    const failing = countingEnc({ failDecrypt: true });
    await expect(run(failing.enc, [v])).rejects.toThrow();
  });

  it('M8 (unit) — a KMS HMAC error THROWS (⛔ [])', async () => {
    const { enc } = countingEnc({ failHmac: true });
    const v = version(1, await seal(enc, '9876543210'), BEFORE);
    await expect(run(enc, [v])).rejects.toThrow();
  });

  it('a malformed envelope THROWS (⛔ [])', async () => {
    const { enc } = countingEnc();
    await expect(run(enc, [version(1, 'enc:v1:not-an-envelope', BEFORE)])).rejects.toThrow();
  });

  it('the version read opens ONE scope and AWAITS it before the first KMS call (a stub proves the order, ⛔ that a real scope closed — the live M9 pins that against a real pool)', async () => {
    const log: string[] = [];
    const { enc } = countingEnc({ log });
    const v = version(1, await seal(enc, '9876543210'), BEFORE);
    log.length = 0; // sealing is the declaration writer's KMS work, ⛔ this function's
    const scope = rowsScope([v], log);
    await peerMeshNomineeMatch({ pariwarId: PARIWAR, deceasedMemberId: DECEASED, cut: CUT, enc, inScope: scope.inScope });
    expect(scope.opened()).toBe(1);
    // the stub resolves when `inScope` is awaited, so this pins "awaited before KMS", ⛔ that a real scope was closed
    expect(log).toEqual(['scope:open', 'scope:close', 'kms:decrypt', 'kms:hmac']); // one nominee ⇒ one decrypt, then ONE batch HMAC
  });

  it('peerMeshNomineeCiphertextsAsOf — a correction recorded after the cut is ⛔ read (the set is fixed per claim)', () => {
    const v1 = version(1, 'enc:a', BEFORE);
    const corr = version(1, 'enc:b', AFTER, { source: 'correction', correctsVersionId: v1.versionId });
    expect(peerMeshNomineeCiphertextsAsOf([v1, corr], CUT.cut)).toEqual(['enc:a']);
  });
});

// ── Story 6.36e (Task 2.2; AC6; `2026-10-24-397` NE7) — the MARKED-member half ────────────────────────────────────────────
describe('Story 6.36e — peerMeshNomineeMatch, the marked-member half (NE7)', () => {
  const nominee = (): MemberId => toMemberId(randomUUID());
  const link = (v: MemberNomineeVersionRow, who: MemberId, endedAt: Date | null = null): NomineeLinkOfVersion => ({
    versionId: nomineeVersionId(v.versionId),
    nomineeMemberId: who,
    endedAt,
  });

  it('a link on the version projected as of the cut counts; a link ended AT or after the cut still counts', () => {
    const v1 = version(1, 'enc:a', BEFORE);
    const [a, b] = [nominee(), nominee()];
    expect(peerMeshNomineeLinkedMembersAsOf([v1], [link(v1, a)], CUT.cut)).toEqual([a]);
    expect(peerMeshNomineeLinkedMembersAsOf([v1], [link(v1, b, CUT.cut)], CUT.cut)).toEqual([b]);
    expect(peerMeshNomineeLinkedMembersAsOf([v1], [link(v1, b, AFTER)], CUT.cut)).toEqual([b]);
  });

  it('a link ended BEFORE the cut is ⛔ counted', () => {
    const v1 = version(1, 'enc:a', BEFORE);
    expect(peerMeshNomineeLinkedMembersAsOf([v1], [link(v1, nominee(), new Date(CUT.cut.getTime() - 1))], CUT.cut)).toEqual([]);
  });

  it('a link on a version RECORDED after the cut is ⛔ counted (V15 — the version decides, ⛔ the link)', () => {
    const v1 = version(1, 'enc:a', BEFORE);
    const v2 = version(1, 'enc:b', AFTER);
    const [a, b] = [nominee(), nominee()];
    expect(peerMeshNomineeLinkedMembersAsOf([v1, v2], [link(v1, a, AFTER), link(v2, b)], CUT.cut)).toEqual([a]);
  });

  it('a link on a version ⛔ projected as of the cut (re-declared before it) is ⛔ counted; the carried one is', () => {
    const v1 = version(1, 'enc:a', new Date(BEFORE.getTime() - 86_400_000));
    const v2 = version(1, 'enc:a', BEFORE);
    const [a, b] = [nominee(), nominee()];
    // `a`'s link is left LIVE on the superseded v1 (`endedAt: null` — ⛔ `BEFORE`, which the `endedAt < cut` check would exclude on
    // its own and leave this leg green without the projection filter); `b` was marked on v2, the version projected at the cut.
    expect(peerMeshNomineeLinkedMembersAsOf([v1, v2], [link(v1, a), link(v2, b)], CUT.cut)).toEqual([b]);
  });

  it('a vacated rank counts ⛔ link; both ranks count; one member is listed once', () => {
    const r1 = version(1, 'enc:a', BEFORE);
    const r2v1 = version(2, 'enc:b', new Date(BEFORE.getTime() - 86_400_000));
    const r2v2 = version(2, null, BEFORE); // the tombstone
    const a = nominee();
    // (the vacated rank's link is `endedAt: null` — see above: only the projection can exclude it)
    expect(peerMeshNomineeLinkedMembersAsOf([r1, r2v1, r2v2], [link(r1, a), link(r2v1, nominee())], CUT.cut)).toEqual([a]);
    const r2 = version(2, 'enc:c', BEFORE);
    const b = nominee();
    expect(peerMeshNomineeLinkedMembersAsOf([r1, r2], [link(r1, a), link(r2, b)], CUT.cut).sort()).toEqual([a, b].sort());
  });

  it('the read returns the marked members from the SAME scope — DB only, ⛔ KMS for them; ⛔ number still ⇒ ⛔ HMAC', async () => {
    const { enc, counts } = countingEnc();
    const sentinel = version(1, await seal(enc, '0000000000'), BEFORE);
    const a = nominee();
    const scope = rowsScope([sentinel], undefined, [link(sentinel, a)]);
    const got = await peerMeshNomineeMatch({ pariwarId: PARIWAR, deceasedMemberId: DECEASED, cut: CUT, enc, inScope: scope.inScope });
    expect(got).toEqual({ mobileIndexes: [], memberIds: [a] });
    expect(scope.opened()).toBe(1);
    expect(counts.hmac).toBe(0);
  });
});
