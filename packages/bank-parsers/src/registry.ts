// Runtime parser registry (RE6-6 dispatch) — Story 9.2 (Task 2).
//
// Maps `(pariwar, bank_code)` → the per-bank parser. The registry is the CLOSED set of
// supported parsers; its keys MUST be a subset of `bank-allowlist.yaml` (the Task 4
// conformance test asserts `registry ⊆ allowlist` with teeth). A lookup miss is a typed
// `UnsupportedBankError` (helpdesk-routed) — never a silent drop (AC1).
//
// `pariwar` is the SLUG (`bihar`), not the runtime UUID — see bank-allowlist.yaml.

import { bankStatement } from '@twt/domain';
import { parseSbi } from '../bihar/sbi/parse.js';
import { parsePnb } from '../bihar/pnb/parse.js';
import { parseBob } from '../bihar/bob/parse.js';
import { parseBoi } from '../bihar/boi/parse.js';
import { parseCooperative } from '../bihar/cooperative/parse.js';
import { UnsupportedBankError, BankStatementParseError } from './errors.js';
import type { BankParser } from './factory.js';
import type { BankParseResult } from './normalize.js';

type BankCode = bankStatement.BankCode;

/** A registry key: the pariwar slug + bank code. */
export interface RegistryKey {
  readonly pariwar: string;
  readonly bankCode: BankCode;
}

function keyOf(pariwar: string, bankCode: string): string {
  return `${pariwar}:${bankCode}`;
}

/**
 * The parser registry — the single dispatch table. Frozen so no runtime code can smuggle
 * an unlisted parser past the allowlist conformance test. v1 = the 5 `bihar` parsers.
 */
const REGISTRY: ReadonlyMap<string, BankParser> = new Map<string, BankParser>([
  [keyOf('bihar', 'sbi'), parseSbi],
  [keyOf('bihar', 'pnb'), parsePnb],
  [keyOf('bihar', 'bob'), parseBob],
  [keyOf('bihar', 'boi'), parseBoi],
  [keyOf('bihar', 'cooperative'), parseCooperative],
]);

/**
 * The registry's declared keys — exposed (read-only) so the Task 4 conformance test can
 * assert `registry ⊆ allowlist` + exactly-5 without reaching into private state.
 */
export function registeredPairs(): RegistryKey[] {
  return [...REGISTRY.keys()].map((k) => {
    const [pariwar, bankCode] = k.split(':');
    return { pariwar: pariwar!, bankCode: bankCode as BankCode };
  });
}

/** Whether a `(pariwar, bank_code)` has a registered parser (the allowlist membership test). */
export function isSupported(pariwar: string, bankCode: string): boolean {
  return REGISTRY.has(keyOf(pariwar, bankCode));
}

/**
 * Parse a bank statement for a `(pariwar, bank_code)`. The reconciliation engine's single
 * entry point (the 9.3 upload surface calls this over an in-hand buffer). Dispatches to
 * the registered parser; a miss throws `UnsupportedBankError` (AC1, helpdesk-routed). A
 * parser's internal failure is isolated + rethrown as a typed `BankStatementParseError`
 * (parser-sandbox posture — never an uncaught crash past this boundary).
 */
export function parseStatement(
  pariwar: string,
  bankCode: string,
  input: string | Buffer,
): BankParseResult {
  const parser = REGISTRY.get(keyOf(pariwar, bankCode));
  if (!parser) throw new UnsupportedBankError(pariwar, bankCode);
  try {
    return parser(input);
  } catch (err) {
    if (err instanceof UnsupportedBankError || err instanceof BankStatementParseError) throw err;
    throw new BankStatementParseError(
      bankCode as BankCode,
      err instanceof Error ? err.message : String(err),
    );
  }
}
