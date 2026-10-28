// Story 6.32 (Task 3; AC5, TR3) — the comparable form of a health answer: ONE input rule (claim-scoped; `dont_know` ⇒ NULL)
// and ONE hashing helper for BOTH writers, under ONE field-class literal. A REAL-shape fake KMS (HMAC-SHA256 over a random
// key) — ⛔ a stub that returns its input, which would make a missing claim scope look correct.

import { randomBytes, randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { answerCodeBlindIndexes } from '../../src/claim/answer-code-index.js';
import { ANSWER_CODE_INDEX_FIELD_CLASS, blindIndex, createFakeKmsProvider, type KmsKeyRef, type KmsProvider } from '../../src/encryption/index.js';
import { answerCodeIndexInputs } from '../../src/questionnaires/answers.js';

const HMAC_REF: KmsKeyRef = { resourceName: 'projects/twt-dev/locations/asia-south1/keyRings/twt-dev-keyring/cryptoKeys/pii-tier-2-hmac' };
const PARIWAR = '11111111-1111-4111-8111-111111111111';
const CLAIM = randomUUID();

let kms: KmsProvider;
beforeAll(() => {
  kms = createFakeKmsProvider({ kekBytes: randomBytes(32), hmacKeyBytes: randomBytes(32) });
});

const idx = (claimCaseId: string, questionKey: string, codes: string[], pariwarId = PARIWAR) =>
  answerCodeBlindIndexes({ claimCaseId, questionKey, codes }, { pariwarId }, kms, HMAC_REF);

describe('answerCodeIndexInputs — the ONE input rule (IQ4)', () => {
  it('one plaintext per code, claim-scoped and key-scoped: `${claim}|${key}|${code}`', () => {
    expect(answerCodeIndexInputs(CLAIM, 'death_illness', ['cancer', 'tb'])).toEqual([`${CLAIM}|death_illness|cancer`, `${CLAIM}|death_illness|tb`]);
  });
  it("NULL for an answer with \"I don't know\", an empty answer, or a non-health key", () => {
    expect(answerCodeIndexInputs(CLAIM, 'death_cause', ['dont_know'])).toBeNull();
    expect(answerCodeIndexInputs(CLAIM, 'death_illness', ['cancer', 'dont_know'])).toBeNull();
    expect(answerCodeIndexInputs(CLAIM, 'death_cause', [])).toBeNull();
    expect(answerCodeIndexInputs(CLAIM, 'head_letter', ['collected'])).toBeNull();
    expect(answerCodeIndexInputs(CLAIM, 'has_died', ['not_died'])).toBeNull();
  });
  it('the claim id is case-normalised (a branded id is lower-case; an echoed upper-case one hashes the same)', () => {
    expect(answerCodeIndexInputs(CLAIM.toUpperCase(), 'death_cause', ['accident'])).toEqual(answerCodeIndexInputs(CLAIM, 'death_cause', ['accident']));
  });
});

describe('answerCodeBlindIndexes — the ONE hashing helper (AC5)', () => {
  it('⭐ the SAME (claim, key, code) hashes EQUAL — the neighbours\' writer and the family\'s call this one function', async () => {
    const neighbour = await idx(CLAIM, 'death_cause', ['accident']);
    const family = await idx(CLAIM, 'death_cause', ['accident']);
    expect(neighbour).toHaveLength(1);
    expect(neighbour).toEqual(family);
    expect(neighbour![0]).toMatch(/^[0-9a-f]{64}$/);
  });
  it('a different CLAIM, KEY, CODE or PARIWAR hashes differently (claim-scoped — ⛔ cross-claim correlation)', async () => {
    const base = (await idx(CLAIM, 'death_cause', ['other']))![0];
    expect((await idx(randomUUID(), 'death_cause', ['other']))![0]).not.toBe(base);
    expect((await idx(CLAIM, 'death_illness', ['other']))![0]).not.toBe(base);
    expect((await idx(CLAIM, 'death_cause', ['old_age']))![0]).not.toBe(base);
    expect((await idx(CLAIM, 'death_cause', ['other'], '22222222-2222-4222-8222-222222222222'))![0]).not.toBe(base);
  });
  it('the hash is the class-prefixed blindIndex of the claim-scoped plaintext (⛔ the bare code)', async () => {
    const [h] = (await idx(CLAIM, 'death_cause', ['accident']))!;
    expect(h).toBe(await blindIndex(ANSWER_CODE_INDEX_FIELD_CLASS, `${CLAIM}|death_cause|accident`, { pariwarId: PARIWAR }, kms, HMAC_REF));
    expect(h).not.toBe(await blindIndex(ANSWER_CODE_INDEX_FIELD_CLASS, 'accident', { pariwarId: PARIWAR }, kms, HMAC_REF));
  });
  it("a `dont_know`-containing set stores NULL; a multi answer yields one index per code, in order", async () => {
    expect(await idx(CLAIM, 'death_illness', ['tb', 'dont_know'])).toBeNull();
    const two = await idx(CLAIM, 'death_illness', ['cancer', 'tb']);
    expect(two).toHaveLength(2);
    expect(two![0]).toBe((await idx(CLAIM, 'death_illness', ['cancer']))![0]);
  });
});

describe('TR3 — the field class literal appears ONCE (a second would make every overlap empty)', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repo = path.resolve(here, '../../../..');
  function* walk(dir: string): Generator<string> {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) yield* walk(p);
      else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)) yield p;
    }
  }
  it("`'answer_code'` is declared ONCE in field-classes.ts, with ⛔ by-value twin anywhere in packages/ or apps/", () => {
    expect(ANSWER_CODE_INDEX_FIELD_CLASS).toBe('answer_code');
    const hits: string[] = [];
    for (const root of ['packages', 'apps']) {
      for (const f of walk(path.join(repo, root))) {
        if (/['"`]answer_code['"`]/.test(readFileSync(f, 'utf8'))) hits.push(path.relative(repo, f));
      }
    }
    expect(hits).toEqual(['packages/domain/src/encryption/field-classes.ts']);
  });
});
