// Story 11b.4a (review R22) — the FIFTH `null` arm of `resolvePublicFamilyMemorial`: every word left out AND no photo ⇒ nothing is left
// to show ⇒ `familyMemorial: null` (the page then renders nothing — ⛔ no heading over an empty section). DB-free: the chain read
// and the decrypt are replaced (the "ciphertext" IS the plaintext); the presenter, the join and the arm under test are the real code.

import type { MemorialOmission } from '@twt/contracts';
import type { Db, ids } from '@twt/domain';
import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppDeps, EncryptionDeps } from '../../src/context.js';

const readPublicMemorial = vi.hoisted(() => vi.fn());

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return { ...actual, memorial: { ...actual.memorial, readPublicMemorial } };
});
vi.mock('../../src/modules/memorial/memorial-crypto.js', () => ({
  decryptMemorialField: async (serialized: string) => serialized,
}));

const { resolvePublicFamilyMemorial } = await import('../../src/modules/public-pages/memorial-public-read.js');

const BODY = 'He was kind to everyone.\n\nWe miss him every day.';
const ALT = 'Papa in the garden';
const cut = (field: 'body' | 'altText', text: string): MemorialOmission => ({ field, start: 0, end: text.length, reason: 'against_the_law' });

function shown(over: { omissions?: readonly MemorialOmission[]; photo?: boolean }) {
  return {
    submissionId: 's-1',
    bodyCiphertext: BODY,
    altTextCiphertext: over.photo === true ? ALT : null,
    omissions: over.omissions ?? [],
    // Story 11b.5a — ⛔ family list on these versions.
    kinshipCiphertext: null,
    kinshipOmissions: [],
    photo: over.photo === true ? { objectKey: 'k', mime: 'image/jpeg' } : null,
  };
}

describe('resolvePublicFamilyMemorial — nothing left to show is `null`, ⛔ not an empty memorial (R22)', () => {
  const log = { error: vi.fn(), warn: vi.fn() };
  const run = () =>
    resolvePublicFamilyMemorial(
      { config: { memorialAuthorshipEnabled: true } } as unknown as Pick<AppDeps, 'config'>,
      log as unknown as FastifyBaseLogger,
      {} as Db,
      { pariwarId: 'p' as ids.PariwarId, pariwarIdStr: 'p', poolId: 'q' as ids.PoolId, encryption: {} as EncryptionDeps },
    );

  beforeEach(() => {
    readPublicMemorial.mockReset();
    log.error.mockReset();
    log.warn.mockReset();
  });

  it('every word cut and ⛔ no photo ⇒ `null` — silently (not a decrypt failure, not the erasure sentinel)', async () => {
    readPublicMemorial.mockResolvedValue(shown({ omissions: [cut('body', BODY)] }));
    expect(await run()).toBeNull();
    expect(log.error).not.toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('non-vacuity — the SAME cut body WITH a photo is a memorial (words: [], the photo and its description)', async () => {
    readPublicMemorial.mockResolvedValue(shown({ omissions: [cut('body', BODY)], photo: true }));
    expect(await run()).toEqual({ words: [], photo: { altText: ALT }, kinship: [] });
  });

  it('non-vacuity — kept words WITHOUT a photo are a memorial (words, photo: null)', async () => {
    readPublicMemorial.mockResolvedValue(shown({ omissions: [cut('body', 'He was kind to everyone.')] }));
    expect(await run()).toEqual({ words: ['We miss him every day.'], photo: null, kinship: [] });
  });
});
