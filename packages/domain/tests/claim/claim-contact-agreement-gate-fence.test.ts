// Story 6.37d AC2 — the DIFF FENCE on the agreement-state gate. The WhatsApp basis (`-357` G3) is a NEW reader;
// the nominees' texts and letters, the approval gate, the closure letter and the W8 re-save rule keep reading
// `live` / `revoked` ONLY (`-355` d16 / `-354` d5: ⛔ changed until counsel answers). This pins each F13 caller's
// gate as it stands and that ⛔ one of them consults the WhatsApp basis or the version registry.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const src = (name: string): string => readFileSync(join(here, '../../src/claim', name), 'utf8');

/** Each F13 caller and the gate line it must keep, verbatim. */
const GATES: readonly (readonly [string, string])[] = [
  ['claim-contact-check.ts', "if (input.agreement !== 'live') return 'agreement_withdrawn';"],
  ['correction-chase.ts', "if (agreement !== 'live') return none('agreement_not_live');"],
  ['certificate-reminder.ts', "if (agreement !== 'live') return { cannotRemind: 'agreement_not_live', people: [], contactLocale: locale };"],
  ['closure-letter.ts', "if ((await readClaimContactAgreementState(db, pariwarId, snapshot.contact.agreementConsentId)) !== 'live') {"],
  ['claim-contact-persist.ts', "const agreement = await readClaimContactAgreementState(db, input.pariwarId, stored.agreementConsentId);"],
];

describe('the agreement-state gate is UNCHANGED (AC2 diff fence)', () => {
  it('⭐ readClaimContactAgreementState still selects revokedAt + consentType only and answers live / revoked / missing', () => {
    const check = src('claim-contact-check.ts');
    const body = check.slice(check.indexOf('export async function readClaimContactAgreementState('));
    const fn = body.slice(0, body.indexOf('\n}\n') + 2);
    expect(fn).toContain('.select({ revokedAt: consentRecords.revokedAt, consentType: consentRecords.consentType })');
    expect(fn).toContain("if (!row || row.consentType !== 'claim_contact_agreement') return 'missing';");
    expect(fn).toContain("return row.revokedAt === null ? 'live' : 'revoked';");
    expect(fn).not.toMatch(/copyVersion|consentPayload/);
  });

  for (const [file, gate] of GATES) {
    it(`[${file}] keeps its gate verbatim and ⛔ reads the WhatsApp basis or the version registry`, () => {
      const text = src(file);
      expect(text).toContain(gate);
      expect(text).not.toMatch(/readClaimantWhatsappBasis|evaluateClaimantWhatsappBasis|CLAIM_CONTACT_AGREEMENT_VERSIONS/);
    });
  }

  it('the persist module reads ONLY the earlier-wording helper (the helpline line), ⛔ the basis verdict', () => {
    const persist = src('claim-contact-persist.ts');
    expect(persist).toContain('agreementOnFileNamesWhatsapp(');
    expect(persist).not.toMatch(/readClaimantWhatsappBasis|evaluateClaimantWhatsappBasis/);
  });
});
