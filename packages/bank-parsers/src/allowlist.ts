// bank-allowlist.yaml loader + parser — Story 9.2 (Task 4).
//
// The loud-throwing parser for the repo-root governance registry. Mirrors
// benefit-mechanism.yaml's `parseBenefitMechanismConfig` posture: a malformed or
// count-mismatched allowlist is a HARD failure at load (never a silent default), so a
// bad edit is caught at boot / in the conformance test, not at reconciliation time.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { bankStatement } from '@twt/domain';

type BankCode = bankStatement.BankCode;
const { BANK_CODES } = bankStatement;

/** One permitted (pariwar, bank) pair. `pariwar` is the SLUG (`bihar`), not a UUID. */
export interface AllowlistPair {
  readonly pariwar: string;
  readonly bankCode: BankCode;
  readonly bankName: string;
}

export interface BankAllowlist {
  readonly version: number;
  readonly count: number;
  readonly pairs: readonly AllowlistPair[];
}

/** Thrown when `bank-allowlist.yaml` is malformed or internally inconsistent. */
export class BankAllowlistError extends Error {
  constructor(reason: string) {
    super(`[bank-allowlist] ${reason}`);
    this.name = 'BankAllowlistError';
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Parse + validate the allowlist YAML text into a `BankAllowlist`. Loud on: missing/
 * wrong-typed fields, an out-of-`BankCode`-enum bank_code, a `count` that disagrees with
 * `pairs.length`, and a duplicate (pariwar, bank_code) pair. Pure (text in → value out).
 */
export function parseBankAllowlist(yamlText: string): BankAllowlist {
  const raw: unknown = parseYaml(yamlText);
  if (!isRecord(raw)) throw new BankAllowlistError('top-level document must be a mapping');

  const { version, count, pairs } = raw;
  if (typeof version !== 'number') throw new BankAllowlistError('`version` must be a number');
  if (typeof count !== 'number') throw new BankAllowlistError('`count` must be a number');
  if (!Array.isArray(pairs)) throw new BankAllowlistError('`pairs` must be a list');

  const seen = new Set<string>();
  const parsed: AllowlistPair[] = pairs.map((p, i) => {
    if (!isRecord(p)) throw new BankAllowlistError(`pairs[${i}] must be a mapping`);
    const { pariwar, bank_code: bankCode, bank_name: bankName } = p;
    if (typeof pariwar !== 'string' || pariwar.length === 0) {
      throw new BankAllowlistError(`pairs[${i}].pariwar must be a non-empty string`);
    }
    if (typeof bankCode !== 'string' || !(BANK_CODES as readonly string[]).includes(bankCode)) {
      throw new BankAllowlistError(
        `pairs[${i}].bank_code ${JSON.stringify(bankCode)} is not a known BankCode ` +
          `(${BANK_CODES.join(', ')})`,
      );
    }
    if (typeof bankName !== 'string' || bankName.length === 0) {
      throw new BankAllowlistError(`pairs[${i}].bank_name must be a non-empty string`);
    }
    const key = `${pariwar}:${bankCode}`;
    if (seen.has(key)) throw new BankAllowlistError(`duplicate pair ${key}`);
    seen.add(key);
    return { pariwar, bankCode: bankCode as BankCode, bankName };
  });

  if (parsed.length !== count) {
    throw new BankAllowlistError(`count (${count}) !== pairs.length (${parsed.length})`);
  }

  return { version, count, pairs: parsed };
}

/** Absolute path to the repo-root `bank-allowlist.yaml` (two dirs up from this package). */
export function bankAllowlistPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // src/ → packages/bank-parsers/ → packages/ → repo root
  return join(here, '..', '..', '..', 'bank-allowlist.yaml');
}

/** Load + parse the repo-root allowlist. Throws `BankAllowlistError` on any problem. */
export function loadBankAllowlist(): BankAllowlist {
  return parseBankAllowlist(readFileSync(bankAllowlistPath(), 'utf8'));
}
