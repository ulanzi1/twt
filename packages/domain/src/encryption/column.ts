// Drizzle column-transformer factory + AsyncLocalStorage encryption-context
// propagation per architecture §Essential patterns line 3615.
//
// Story 1.5 deviation note (per story file Dev Notes "Drizzle column-transformer
// pattern" fallback (b)): Drizzle 0.45's customType requires SYNCHRONOUS
// toDriver/fromDriver callbacks. Auto-encryption inside customType requires
// either a sync KMS provider (Cloud KMS is async-only over HTTPS) or async
// customType (Drizzle 0.46+). Story 1.5 commits the substrate via:
//   1. piiColumn(tier, fieldClass?) returns a TEXT customType with tier
//      metadata attached (no in-place encryption — toDriver/fromDriver are
//      identity-pass-through over string).
//   2. Service-layer helpers (encryptTier1 / decryptTier1 / blindIndex) handle
//      the substantive encryption explicitly. Callers pre-encrypt before
//      `db.insert(...)` and post-decrypt after `db.select(...)`.
//   3. The tier annotation attached via piiColumn is the structural primitive
//      the Story 1.16b PII-shielding CI gate consumes (D8-1.5).
//   4. AsyncLocalStorage encryptionContextStorage + withEncryptionContext are
//      committed as the architecture-canonical context-propagation seam
//      (architecture §Essential patterns line 3615); apps/api Story 1.9+
//      Fastify pre-handler hooks substantively populate the store.

import { AsyncLocalStorage } from 'node:async_hooks';

import { customType } from 'drizzle-orm/pg-core';

import type { EncryptionContext, KmsKeyRef, KmsProvider } from './kms-provider.js';
import { type PiiTier } from './tiers.js';

export interface EncryptionStore {
  readonly context: EncryptionContext;
  readonly kms: KmsProvider;
  readonly kekRef: KmsKeyRef;
  readonly hmacKeyRef: KmsKeyRef;
}

export const encryptionContextStorage = new AsyncLocalStorage<EncryptionStore>();

export function withEncryptionContext<T>(store: EncryptionStore, fn: () => T): T {
  return encryptionContextStorage.run(store, fn);
}

export function getEncryptionStore(): EncryptionStore {
  const s = encryptionContextStorage.getStore();
  if (!s) {
    throw new Error(
      'encryptionContextStorage: no store — wrap DB operations with withEncryptionContext(...)',
    );
  }
  return s;
}

export interface PiiColumnConfig {
  readonly tier: PiiTier;
  readonly fieldClass?: string;
}

/**
 * Drizzle column-transformer factory.
 *
 * Returns a TEXT customType with tier metadata attached as a column-config
 * marker. Per Story 1.5 substrate fallback (b), toDriver/fromDriver are
 * identity over `string` — substantive encryption is handled by the
 * service-layer helpers (`encryptTier1`, `decryptTier1`, `blindIndex`).
 *
 * Usage:
 *   mobile: piiColumn(1, 'mobile')('mobile').notNull(),
 *   mobileHash: piiColumn(2, 'mobile')('mobile_hash').notNull(),
 *   firstName: piiColumn(3)('first_name').notNull(),
 */
export function piiColumn(tier: PiiTier, fieldClass?: string) {
  const inner = customType<{
    data: string;
    driverData: string;
    config: PiiColumnConfig;
  }>({
    dataType() {
      return 'text';
    },
    toDriver(value) {
      return value;
    },
    fromDriver(value) {
      return value;
    },
  });
  return (name: string) => inner(name, { tier, ...(fieldClass !== undefined ? { fieldClass } : {}) });
}
