// eAadhaar XMLDSig signature verification — Story 3.3a (Task 2; AC7).
//
// Verifies the DigiLocker eAadhaar PKI signature (an enveloped XMLDSig over the
// `UidData`) against the issuer's CACHED public certificate (architecture §2.8 / §3.8).
// The SECURITY-LOAD-BEARING property (AC7): verification ALWAYS uses OUR trusted cached
// cert, NEVER a cert embedded in the (attacker-influenceable) XML's `KeyInfo`. xml-crypto
// resolves the verify key as `getCertFromKeyInfo(keyInfo) || publicCert || privateKey`
// (signed-xml.js); we set `publicCert` to the cached cert AND override
// `getCertFromKeyInfo` to return it — so the embedded `KeyInfo` is ignored. Any failure
// (no signature, wrong key, tampered payload, disallowed algorithm) returns `{ valid:
// false }` — the provider maps that to `KycError(signature_invalid | verification_failed)`
// and NEVER silently accepts.
//
// `xml-crypto` (+ its `@xmldom/xmldom` / `xpath` transport deps) is imported ONLY here +
// in this provider directory — the `kyc-provider-boundary` CI gate enforces that.

import { DOMParser } from '@xmldom/xmldom';
import * as xpath from 'xpath';
import { SignedXml } from 'xml-crypto';

const RSA_SHA256 = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
const RSA_SHA512 = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512';
/** Reject weak/legacy signature algorithms (e.g. rsa-sha1) — never silently accept. */
const ALLOWED_SIGNATURE_ALGORITHMS = new Set<string>([RSA_SHA256, RSA_SHA512]);

export interface SignatureVerification {
  valid: boolean;
  /** A machine reason when `valid` is false (drives the provider's error-code mapping). */
  reason?:
    | 'xml_parse_failed'
    | 'no_signature'
    | 'multiple_signatures'
    | 'load_signature_failed'
    | 'disallowed_algorithm'
    | 'signature_mismatch'
    | 'check_failed';
  /**
   * The already-parsed XML document, set only when `valid` is `true`. Passed to
   * `mapEaadhaarToKycProfile` to avoid re-parsing the same XML string a second time
   * (P3 — single parse guarantees the verified doc and the mapped doc are identical).
   */
  doc?: Node;
}

/**
 * Verify the enveloped eAadhaar signature against the trusted cached cert PEM (AC7). Pure
 * + side-effect-free; deterministically testable against a known-good signed fixture (and
 * tampered / wrong-cert negatives). Returns `{ valid: true }` only when the signature AND
 * every reference digest validate against `trustedCertPem` using an allowed algorithm.
 */
export function verifyEaadhaarSignature(xml: string, trustedCertPem: string): SignatureVerification {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, 'text/xml') as unknown as Document;
  } catch {
    return { valid: false, reason: 'xml_parse_failed' };
  }

  const sigNodes = xpath.select("//*[local-name(.)='Signature']", doc as unknown as Node);
  if (!Array.isArray(sigNodes) || sigNodes.length === 0) {
    return { valid: false, reason: 'no_signature' };
  }
  if (sigNodes.length > 1) {
    // A multi-signature document is out-of-contract for eAadhaar — reject rather than
    // guess which signature is authoritative.
    return { valid: false, reason: 'multiple_signatures' };
  }
  const signatureNode = sigNodes[0] as Node;

  const verifier = new SignedXml({ publicCert: trustedCertPem });
  // PIN to our cached cert: force the embedded KeyInfo cert to be ignored (belt-and-braces
  // on top of the `getCertFromKeyInfo` default being `noop`).
  verifier.getCertFromKeyInfo = () => trustedCertPem;

  try {
    verifier.loadSignature(signatureNode);
  } catch {
    return { valid: false, reason: 'load_signature_failed' };
  }

  const alg = verifier.signatureAlgorithm;
  if (!alg || !ALLOWED_SIGNATURE_ALGORITHMS.has(alg)) {
    return { valid: false, reason: 'disallowed_algorithm' };
  }

  let valid = false;
  try {
    valid = verifier.checkSignature(xml);
  } catch {
    // xml-crypto throws on certain validation failures — treat as a hard failure.
    return { valid: false, reason: 'check_failed' };
  }
  return valid
    ? { valid: true, doc: doc as unknown as Node }
    : { valid: false, reason: 'signature_mismatch' };
}
