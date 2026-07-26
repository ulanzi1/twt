// BankStatementStorage + StatementScanner adapters — Story 9.3 (Task 1/4, Decision D3).
//
// Proves the local-fs store put/getBytes/signedReadUrl/delete round-trip + cross-instance sharing (the
// D2 property: a future apps/jobs matcher, a separate process, re-reads the blob the api wrote), the
// in-memory fake's introspection, and the two scanner adapters' verdicts (allow-all v1 + the
// quarantine-teeth rejecting double).

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createInMemoryBankStatementStorage } from '../../src/bank-statement-storage/in-memory.js';
import { createLocalFsBankStatementStorage } from '../../src/bank-statement-storage/local-fs.js';
import {
  createNoOpStatementScanner,
  createRejectingStatementScanner,
} from '../../src/statement-scanner/no-op.js';

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'twt-bank-stmt-storage-test-'));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe('createLocalFsBankStatementStorage', () => {
  const KEY = 'pariwar/p1/pool/pool1/stmt1';

  it('put → getBytes round-trips the exact bytes', async () => {
    const storage = createLocalFsBankStatementStorage({ rootDir });
    const bytes = new Uint8Array([100, 97, 116, 101]); // "date"
    await storage.put(KEY, bytes, { contentType: 'text/csv' });
    expect(Array.from(await storage.getBytes(KEY))).toEqual(Array.from(bytes));
  });

  it('getBytes throws a not-found error for a missing key', async () => {
    const storage = createLocalFsBankStatementStorage({ rootDir });
    await expect(storage.getBytes('never/written')).rejects.toThrow(/no object at key/);
  });

  it('signedReadUrl returns a deterministic non-secret file:// URL', async () => {
    const storage = createLocalFsBankStatementStorage({ rootDir });
    const url = await storage.signedReadUrl(KEY, 90);
    expect(url).toMatch(/^file:\/\/.*stmt1\?ttl=90$/);
  });

  it('delete removes the object; a subsequent getBytes throws not-found', async () => {
    const storage = createLocalFsBankStatementStorage({ rootDir });
    await storage.put('k', new Uint8Array([9]), { contentType: 'text/csv' });
    await storage.delete?.('k');
    await expect(storage.getBytes('k')).rejects.toThrow(/no object at key/);
  });

  it('a SEPARATE instance at the same rootDir sees the first instance writes (the 9.4-matcher D2 property)', async () => {
    const writer = createLocalFsBankStatementStorage({ rootDir });
    const reader = createLocalFsBankStatementStorage({ rootDir });
    const bytes = new Uint8Array([7, 7, 7]);
    await writer.put('shared', bytes, { contentType: 'text/csv' });
    expect(Array.from(await reader.getBytes('shared'))).toEqual(Array.from(bytes));
  });
});

describe('createInMemoryBankStatementStorage', () => {
  it('exposes the stored objects for test introspection', async () => {
    const storage = createInMemoryBankStatementStorage();
    await storage.put('k', new Uint8Array([1, 2]), { contentType: 'text/csv' });
    expect(storage.store.get('k')?.contentType).toBe('text/csv');
    expect(Array.from(storage.store.get('k')!.bytes)).toEqual([1, 2]);
  });

  it('signedReadUrl returns a deterministic memory:// URL', async () => {
    const storage = createInMemoryBankStatementStorage();
    expect(await storage.signedReadUrl('k', 30)).toBe('memory://bank-statements/k?ttl=30');
  });
});

describe('StatementScanner adapters', () => {
  it('the no-op v1 scanner reports every input clean', async () => {
    const scanner = createNoOpStatementScanner();
    expect(await scanner.scan(new Uint8Array([1]))).toEqual({ clean: true });
  });

  it('the rejecting double quarantines everything with a reason (quarantine-path teeth)', async () => {
    const scanner = createRejectingStatementScanner({ reason: 'eicar' });
    expect(await scanner.scan(new Uint8Array([1]))).toEqual({ clean: false, reason: 'eicar' });
  });

  it('the rejecting double can flag only inputs matching a predicate', async () => {
    const scanner = createRejectingStatementScanner({ flagIf: (b) => b.length > 2 });
    expect(await scanner.scan(new Uint8Array([1, 2]))).toEqual({ clean: true });
    expect((await scanner.scan(new Uint8Array([1, 2, 3]))).clean).toBe(false);
  });
});
