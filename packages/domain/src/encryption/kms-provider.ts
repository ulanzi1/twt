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

/**
 * The audit hook's context: the encryption context, plus — for the ONE line a BATCH of HMACs writes (Story 6.36b;
 * 6.36a SW12) — how many values the batch computed and what for. An audit row has ⛔ no context column (only a payload
 * hash), so the sink carries `purpose` and `count` in the line's row key.
 */
export interface KmsAuditContext extends EncryptionContext {
  readonly count?: number;
  readonly purpose?: string;
}

export interface KmsProvider {
  encryptDek(dek: Uint8Array, kekRef: KmsKeyRef, aad: Uint8Array): Promise<Uint8Array>;
  decryptDek(encryptedDek: Uint8Array, kekRef: KmsKeyRef, aad: Uint8Array): Promise<Uint8Array>;
  /**
   * Compute an HMAC for a blind-index input.
   *
   * CONTRACT (Option B, D9-1.5): implementors MUST prepend `pariwar:<pariwarId>|`
   * to `input` before computing the HMAC. `blindIndex` passes `fieldClass:plaintext`
   * as `input`; the full HMAC payload is therefore `pariwar:<id>|<fieldClass>:<plaintext>`.
   * A provider that omits this prefix produces blind indexes incompatible with all other
   * providers and breaks cross-provider round-trips silently.
   */
  computeHmac(
    hmacKeyRef: KmsKeyRef,
    input: Uint8Array,
    context: { pariwarId: string },
  ): Promise<Buffer>;
  // Story 1.10 seam (D10-1.5): Story 1.5 declares the slot; Story 1.10 populates it.
  auditHook?: (
    op: 'encryptDek' | 'decryptDek' | 'computeHmac',
    kekRef: KmsKeyRef,
    ctx: KmsAuditContext,
  ) => void;
}

// generateDek is intentionally absent — envelope.ts uses crypto.randomBytes(32) locally.
// Per-row DEK generation requires no KMS round-trip; KMS is only for KEK wrap/unwrap.
