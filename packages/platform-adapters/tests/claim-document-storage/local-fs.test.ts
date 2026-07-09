// Local-filesystem ClaimDocumentStorage — post-review fix (cross-process dev/CI storage gap).
// Proves put/getBytes/signedReadUrl/delete round-trip through the shared directory, and that
// a SEPARATE adapter instance pointed at the SAME rootDir sees what the first one wrote — the
// exact property that made this a fix (two Node processes, same filesystem, same directory).

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createLocalFsClaimDocumentStorage } from '../../src/claim-document-storage/local-fs.js';

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'twt-claim-doc-storage-test-'));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

describe('createLocalFsClaimDocumentStorage', () => {
  it('put → getBytes round-trips the exact bytes', async () => {
    const storage = createLocalFsClaimDocumentStorage({ rootDir });
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    await storage.put('pariwar/p1/claim/c1/death_certificate/doc1', bytes, {
      contentType: 'application/pdf',
    });
    const readBack = await storage.getBytes('pariwar/p1/claim/c1/death_certificate/doc1');
    expect(Array.from(readBack)).toEqual(Array.from(bytes));
  });

  it('getBytes throws a not-found error for a missing key', async () => {
    const storage = createLocalFsClaimDocumentStorage({ rootDir });
    await expect(storage.getBytes('never/written')).rejects.toThrow(/no object at key/);
  });

  it('signedReadUrl returns a deterministic non-secret file:// URL', async () => {
    const storage = createLocalFsClaimDocumentStorage({ rootDir });
    const url = await storage.signedReadUrl('pariwar/p1/claim/c1/death_certificate/doc1', 60);
    expect(url).toMatch(/^file:\/\/.*doc1\?ttl=60$/);
  });

  it('delete removes the object; a subsequent getBytes throws not-found', async () => {
    const storage = createLocalFsClaimDocumentStorage({ rootDir });
    await storage.put('k', new Uint8Array([9]), { contentType: 'image/png' });
    await storage.delete?.('k');
    await expect(storage.getBytes('k')).rejects.toThrow(/no object at key/);
  });

  it('a SEPARATE adapter instance pointed at the same rootDir sees writes from the first — the cross-process fix', async () => {
    const writer = createLocalFsClaimDocumentStorage({ rootDir });
    const reader = createLocalFsClaimDocumentStorage({ rootDir });
    const bytes = new Uint8Array([7, 7, 7]);
    await writer.put('shared-key', bytes, { contentType: 'application/pdf' });
    const readBack = await reader.getBytes('shared-key');
    expect(Array.from(readBack)).toEqual(Array.from(bytes));
  });
});
