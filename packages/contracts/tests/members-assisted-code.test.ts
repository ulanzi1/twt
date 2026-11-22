// Story 3.15 (Task 1; AC2, AC5) — "Did someone help you register?": the assisted-code contracts carry ⛔ worker field (N2), take
// exactly 6 digits, and the signup payment confirm no longer takes a `referenceCode` (DL6).
import { describe, expect, it } from 'vitest';

import {
  MEMBER_ASSISTED_CODE_ERROR_CODES,
  MemberAssistedCodeRequest,
  MemberAssistedCodeResponse,
  MemberAssistedCodeStatusResponse,
  VyawasthaShulkConfirmRequest,
} from '../src/index.js';

describe('Story 3.15 — MemberAssistedCode contracts', () => {
  it('the POST body is exactly `{ code }`, 6 digits — letters, 5 or 7 digits and an extra key are refused', () => {
    expect(MemberAssistedCodeRequest.parse({ code: '123456' })).toEqual({ code: '123456' });
    for (const code of ['12ab', '12345', '1234567', ' 123456', '١٢٣٤٥٦', '']) {
      expect(MemberAssistedCodeRequest.safeParse({ code }).success).toBe(false);
    }
    expect(MemberAssistedCodeRequest.safeParse({ code: 123456 }).success).toBe(false);
    expect(MemberAssistedCodeRequest.safeParse({ code: '123456', pariwarId: 'x' }).success).toBe(false);
    expect(MemberAssistedCodeRequest.safeParse({}).success).toBe(false);
  });

  it('the POST answer is exactly `{ recorded: true }` — ⛔ worker id, name or state (N2, DL3)', () => {
    expect(MemberAssistedCodeResponse.parse({ recorded: true })).toEqual({ recorded: true });
    expect(MemberAssistedCodeResponse.safeParse({ recorded: false }).success).toBe(false);
    expect(MemberAssistedCodeResponse.safeParse({ recorded: true, fieldWorkerId: 'x' }).success).toBe(false);
    expect(MemberAssistedCodeResponse.safeParse({ recorded: true, workerName: 'x' }).success).toBe(false);
    expect(Object.keys(MemberAssistedCodeResponse.shape)).toEqual(['recorded']);
  });

  it('the GET answer is exactly `{ recorded: boolean }`', () => {
    expect(MemberAssistedCodeStatusResponse.parse({ recorded: false })).toEqual({ recorded: false });
    expect(MemberAssistedCodeStatusResponse.parse({ recorded: true })).toEqual({ recorded: true });
    expect(MemberAssistedCodeStatusResponse.safeParse({ recorded: true, code: '123456' }).success).toBe(false);
    expect(Object.keys(MemberAssistedCodeStatusResponse.shape)).toEqual(['recorded']);
  });

  it('the three refusal codes', () => {
    expect([...MEMBER_ASSISTED_CODE_ERROR_CODES]).toEqual([
      'attribution.not_signing_up',
      'attribution.already_recorded',
      'attribution.code_not_found',
    ]);
  });

  it('DL6 — the signup confirm refuses a `referenceCode` (the code moved to its own step)', () => {
    const base = { tr: 'tr-1', utr: '123456789012' };
    expect(VyawasthaShulkConfirmRequest.parse(base)).toEqual(base);
    expect(VyawasthaShulkConfirmRequest.safeParse({ ...base, referenceCode: '123456' }).success).toBe(false);
    expect(Object.keys(VyawasthaShulkConfirmRequest.shape)).toEqual(['tr', 'utr']);
  });
});
