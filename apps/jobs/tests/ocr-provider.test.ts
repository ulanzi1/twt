// Deterministic OcrProvider unit tests — Story 6.5 (Task 1; AC1/AC3, Decision D3).
//
// DB-free. Proves the v1 deterministic/manual-entry provider: parser selection by
// documentType, the manual-entry pass-through, the zero-confidence empty parse, the
// unreadable/unsupported error normalization, and the injected-transport swap seam.

import { describe, expect, it } from 'vitest';

import { OcrProviderError, type DeathCertificateFields } from '@twt/contracts';

import { createDeterministicOcrProvider } from '../src/ocr/index.js';

const SOME_BYTES = new Uint8Array([1, 2, 3, 4]);

const MANUAL: DeathCertificateFields = {
  deceasedName: 'Ravi Kumar',
  dateOfBirth: '1955-03-01',
  dateOfDeath: '2026-06-30',
  issuingAuthority: 'Municipal Corporation',
  certificateNumber: 'DC-12345',
  certificateIssueDate: '2026-07-01',
};

describe('createDeterministicOcrProvider — parser selection (AC3)', () => {
  it('parses a death_certificate via the manual-entry path at full confidence', async () => {
    const provider = createDeterministicOcrProvider();
    const result = await provider.extract({
      documentType: 'death_certificate',
      bytes: SOME_BYTES,
      contentType: 'application/pdf',
      manualEntry: MANUAL,
    });
    expect(result.documentType).toBe('death_certificate');
    expect(result.fields).toEqual(MANUAL);
    expect(result.confidence).toBe(1);
  });

  it('throws unsupported_document_type for a non-death-certificate type (the future-parser seam)', async () => {
    const provider = createDeterministicOcrProvider();
    await expect(
      provider.extract({
        documentType: 'ground_inspection_photo',
        bytes: SOME_BYTES,
        contentType: 'image/jpeg',
      }),
    ).rejects.toMatchObject({ name: 'OcrProviderError', code: 'unsupported_document_type' });
  });
});

describe('createDeterministicOcrProvider — extraction outcomes (AC1/AC6)', () => {
  it('returns a zero-confidence empty parse when no manual entry + no transport (→ ambiguous downstream)', async () => {
    const provider = createDeterministicOcrProvider();
    const result = await provider.extract({
      documentType: 'death_certificate',
      bytes: SOME_BYTES,
      contentType: 'application/pdf',
    });
    expect(result.confidence).toBe(0);
    expect(result.fields).toEqual({
      deceasedName: null,
      dateOfBirth: null,
      dateOfDeath: null,
      issuingAuthority: null,
      certificateNumber: null,
      certificateIssueDate: null,
    });
  });

  it('throws unreadable_document for an empty (0-byte) upload', async () => {
    const provider = createDeterministicOcrProvider();
    await expect(
      provider.extract({
        documentType: 'death_certificate',
        bytes: new Uint8Array(0),
        contentType: 'application/pdf',
      }),
    ).rejects.toBeInstanceOf(OcrProviderError);
  });
});

describe('createDeterministicOcrProvider — injected transport (Decision D3 swap seam)', () => {
  it('delegates to the injected vendor transport and validates its result', async () => {
    const provider = createDeterministicOcrProvider({
      transport: async () => ({
        documentType: 'death_certificate' as const,
        fields: { ...MANUAL, certificateNumber: 'VENDOR-OCR-9' },
        confidence: 0.82,
      }),
    });
    const result = await provider.extract({
      documentType: 'death_certificate',
      bytes: SOME_BYTES,
      contentType: 'application/pdf',
      // manualEntry is ignored once a transport is present — the vendor reads the bytes.
      manualEntry: MANUAL,
    });
    expect(result.confidence).toBe(0.82);
    expect(result.fields.certificateNumber).toBe('VENDOR-OCR-9');
  });

  it('rejects a malformed vendor result (defense-in-depth strict parse)', async () => {
    const provider = createDeterministicOcrProvider({
      // Confidence out of [0,1] → the strict DTO parse throws.
      transport: async () =>
        ({
          documentType: 'death_certificate',
          fields: MANUAL,
          confidence: 5,
        }) as never,
    });
    await expect(
      provider.extract({
        documentType: 'death_certificate',
        bytes: SOME_BYTES,
        contentType: 'application/pdf',
      }),
    ).rejects.toBeTruthy();
  });
});
