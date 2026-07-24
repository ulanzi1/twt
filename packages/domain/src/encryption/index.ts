// @twt/domain encryption substrate per AR-12 + architecture §2.7 + §5.2 + §5.9
// + §Cross-cutting concerns line 4539.
//
// Public API:
//   - Tier model: PiiTier, PII_TIER_1/2/3
//   - KMS seam: KmsProvider, KmsKeyRef, EncryptionContext
//   - Providers: createCloudKmsProvider (production), createFakeKmsProvider (tests)
//   - Tier-1 envelope: encryptTier1, decryptTier1, Tier1Ciphertext,
//                      serializeEnvelope, parseEnvelope
//   - Tier-2 blind index: blindIndex
//   - Tier-3 pass-through: passThroughTier3, TIER_3_MARKER
//   - Drizzle integration: piiColumn, withEncryptionContext,
//                           encryptionContextStorage, getEncryptionStore,
//                           EncryptionStore

export type { PiiTier } from './tiers.js';
export { PII_TIER_1, PII_TIER_2, PII_TIER_3 } from './tiers.js';

export type { EncryptionContext, KmsKeyRef, KmsProvider } from './kms-provider.js';

export {
  encryptTier1,
  decryptTier1,
  serializeEnvelope,
  parseEnvelope,
  type Tier1Ciphertext,
} from './envelope.js';

export { blindIndex } from './blind-index.js';

export { passThroughTier3, TIER_3_MARKER } from './pass-through.js';

export {
  piiColumn,
  withEncryptionContext,
  encryptionContextStorage,
  getEncryptionStore,
  type EncryptionStore,
  type PiiColumnConfig,
} from './column.js';

export { createCloudKmsProvider, type CloudKmsProviderOpts } from './cloud-kms-provider.js';
export { createFakeKmsProvider } from './fake-kms-provider.js';

// Story 8.8 (Task 1) — the member PII field-class constants + the field crypto helpers, relocated
// from apps/api so apps/jobs' live notification fan-out can resolve delivery targets under the SAME
// encryption context the apps/api write path used (apps cannot import apps). apps/api re-exports
// every symbol below from its original module, so no apps/api call site changed.
export {
  ADMIN_GLOBAL_NAMESPACE,
  MEMBER_IDENTITY_NAMESPACE,
  MEMBER_MOBILE_FIELD_CLASS,
  MEMBER_KYC_FIELD_CLASS,
  MEMBER_DEVICE_TOKEN_FIELD_CLASS,
  type FieldCryptoDeps,
} from './field-classes.js';
export {
  encryptDeviceToken,
  decryptDeviceToken,
  deviceTokenBlindIndex,
  normalizeMobile,
  maskMobile,
  mobileBlindIndex,
  encryptMobile,
  decryptMobile,
  encryptKycField,
  decryptKycField,
} from './member-fields.js';
