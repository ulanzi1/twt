// KmsProvider seam per AR-13 "secrets abstracted behind a provider interface
// (12-factor)". Cloud KMS is the substantive backend; fake-KMS is the tests-only
// backend; both implement this interface. The seam allows Story 1.5 substrate
// to land without external dependencies and supports the architecture §5.1
// single-vendor-risk migration path (line 2931-2936).

export interface KmsKeyRef {
  /** Cloud KMS resource name: projects/<id>/locations/<loc>/keyRings/<ring>/cryptoKeys/<key>. */
  readonly resourceName: string;
  /** Explicit version pin — rotation-safe. */
  readonly keyVersion?: string;
}

export interface EncryptionContext {
  readonly pariwarId: string;
  readonly fieldClass: string;
  readonly rowKey?: string;
}

export interface KmsProvider {
  encryptDek(dek: Uint8Array, kekRef: KmsKeyRef, aad: Uint8Array): Promise<Uint8Array>;
  decryptDek(encryptedDek: Uint8Array, kekRef: KmsKeyRef, aad: Uint8Array): Promise<Uint8Array>;
  computeHmac(
    hmacKeyRef: KmsKeyRef,
    input: Uint8Array,
    context: { pariwarId: string },
  ): Promise<Buffer>;
  // Story 1.10 seam (D10-1.5): Story 1.5 declares the slot; Story 1.10 populates it.
  auditHook?: (
    op: 'encryptDek' | 'decryptDek' | 'computeHmac',
    kekRef: KmsKeyRef,
    ctx: EncryptionContext,
  ) => void;
}

// generateDek is intentionally absent — envelope.ts uses crypto.randomBytes(32) locally.
// Per-row DEK generation requires no KMS round-trip; KMS is only for KEK wrap/unwrap.
