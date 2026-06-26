// eAadhaar signed-XML fixture builder — Story 3.3a (Task 6 test support).
//
// Produces a known-good signed eAadhaar XML (and the issuer cert) so the signature
// verifier can be tested end-to-end against a real XMLDSig — plus tampered / wrong-cert
// negatives. The throwaway issuer key + cert live alongside as PEM fixtures (NOT real
// keys). This helper imports `xml-crypto` to SIGN fixtures; it lives under tests/ (NOT
// apps/api/src), so the `kyc-provider-boundary` gate — which scans src trees only — does
// not flag it.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SignedXml } from 'xml-crypto';

const here = dirname(fileURLToPath(import.meta.url));

/** The throwaway issuer cert/key fixtures + a distinct "wrong" cert (negative). */
export const TEST_ISSUER_CERT_PEM = readFileSync(join(here, 'eaadhaar-test-cert.pem'), 'utf8');
export const TEST_ISSUER_KEY_PEM = readFileSync(join(here, 'eaadhaar-test-key.pem'), 'utf8');
export const WRONG_CERT_PEM = readFileSync(join(here, 'eaadhaar-wrong-cert.pem'), 'utf8');

export interface SampleEaadhaarOptions {
  referenceId?: string;
  name?: string;
  dob?: string;
  gender?: string;
  photo?: string;
}

/** Build an UNSIGNED sample eAadhaar offline-eKYC XML (the shape the mapper reads). */
export function sampleEaadhaarXml(opts: SampleEaadhaarOptions = {}): string {
  const referenceId = opts.referenceId ?? '999988887777123420260625';
  const name = opts.name ?? 'Asha Devi';
  const dob = opts.dob ?? '1990-01-01';
  const gender = opts.gender ?? 'F';
  const photo = opts.photo ?? 'QkFTRTY0UEhPVE8=';
  return (
    `<OfflinePaperlessKyc referenceId="${referenceId}">` +
    `<UidData>` +
    `<Poi name="${name}" dob="${dob}" gender="${gender}"/>` +
    `<Pht>${photo}</Pht>` +
    `</UidData>` +
    `</OfflinePaperlessKyc>`
  );
}

/** Sign an eAadhaar XML with the given key (enveloped XMLDSig, exclusive-c14n, rsa-sha256). */
export function signEaadhaarXml(
  unsignedXml: string,
  keyPem: string = TEST_ISSUER_KEY_PEM,
  certPem: string = TEST_ISSUER_CERT_PEM,
): string {
  const sig = new SignedXml({ privateKey: keyPem, publicCert: certPem });
  sig.addReference({
    xpath: "//*[local-name(.)='OfflinePaperlessKyc']",
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
  });
  sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
  sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
  sig.computeSignature(unsignedXml);
  return sig.getSignedXml();
}

/** Convenience: a known-good signed sample eAadhaar XML. */
export function signedSampleEaadhaar(opts: SampleEaadhaarOptions = {}): string {
  return signEaadhaarXml(sampleEaadhaarXml(opts));
}
