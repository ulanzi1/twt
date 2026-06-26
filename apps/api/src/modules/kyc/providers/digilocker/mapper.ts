// eAadhaar XML → provider-neutral KycProfile mapping — Story 3.3a (Task 2; AC4).
//
// Parses the verified eAadhaar offline XML and projects it onto the neutral `KycProfile`
// (the ONLY shape consumers see — architectural-freeze row 13). The Aadhaar number is
// MASKED to its last 4 digits AT THIS BOUNDARY (`aadhaarMaskedId`) — the full number
// never enters the profile. `verificationStrength` is `aadhaar_kyc` (a DigiLocker pull).
//
// The eAadhaar XML format has drifted across API versions (v1.x / v2.0); this parser
// reads the stable offline-eKYC shape (`Poi` demographic attributes + `Pht` photo + a
// reference id) and is intentionally version-tolerant on the reference-id source. It
// lives INSIDE the provider directory (the `@xmldom/xmldom` transport dep is gate-fenced
// here). NEVER log the returned profile (Tier-1 PII).

import { DOMParser } from '@xmldom/xmldom';
import * as xpath from 'xpath';

import type { KycProfile } from '@twt/contracts';
import { KycProviderError } from '@twt/contracts';

/** Read an attribute off the first matching element, or '' if absent. */
function attr(doc: Node, localName: string, attribute: string): string {
  const node = xpath.select1(`//*[local-name(.)='${localName}']`, doc);
  if (node && typeof (node as { getAttribute?: unknown }).getAttribute === 'function') {
    return (node as unknown as Element).getAttribute(attribute) ?? '';
  }
  return '';
}

/** Read the text content of the first matching element, or '' if absent. */
function text(doc: Node, localName: string): string {
  const node = xpath.select1(`//*[local-name(.)='${localName}']/text()`, doc);
  return node && typeof (node as { data?: unknown }).data === 'string'
    ? ((node as unknown as { data: string }).data)
    : '';
}

/**
 * Mask an Aadhaar reference to its last 4 digits: `XXXXXXXX1234`. The reference id (or a
 * `uid` attribute) carries a digit tail; we keep only the last 4 visible. Empty in →
 * 'XXXX' (no digits to reveal).
 */
export function maskAadhaar(reference: string): string {
  const digits = reference.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return last4.length === 4 ? `XXXXXXXX${last4}` : 'XXXX';
}

/**
 * Map verified eAadhaar XML → `KycProfile` (AC4). Throws `KycProviderError(
 * verification_failed)` if the XML cannot be parsed or carries no demographic name / dob
 * (a structurally-unusable response — never a silent empty profile).
 *
 * Accepts either a raw XML string **or** an already-parsed `Node` (Document returned by
 * `verifyEaadhaarSignature` on success). Passing the pre-parsed doc avoids a second
 * DOMParser round-trip and guarantees the doc we map is identical to the one we verified.
 */
export function mapEaadhaarToKycProfile(xml: string | Node): KycProfile {
  let doc: Node;
  if (typeof xml === 'string') {
    try {
      doc = new DOMParser().parseFromString(xml, 'text/xml') as unknown as Node;
    } catch {
      throw new KycProviderError('verification_failed', 'eAadhaar XML could not be parsed');
    }
  } else {
    doc = xml;
  }

  const name = attr(doc, 'Poi', 'name');
  const dob = attr(doc, 'Poi', 'dob');
  if (!name) {
    throw new KycProviderError('verification_failed', 'eAadhaar XML carried no demographic name');
  }
  if (!dob) {
    throw new KycProviderError('verification_failed', 'eAadhaar XML carried no date of birth');
  }

  // Reference id source (version-tolerant): the root `referenceId` attribute, else a
  // `UidData`/`Poi` `uid` attribute. Only the last 4 digits survive masking.
  const root = (doc as unknown as Document).documentElement;
  const referenceId =
    (root && typeof root.getAttribute === 'function' ? root.getAttribute('referenceId') : null) ??
    attr(doc, 'UidData', 'uid') ??
    '';

  const photo = text(doc, 'Pht');

  return {
    aadhaarMaskedId: maskAadhaar(referenceId),
    name,
    dob,
    // A handle the consumer (3.3b) may persist under its PII policy. Empty when no photo.
    photoUrl: photo ? `data:image/jpeg;base64,${photo}` : '',
    verificationStrength: 'aadhaar_kyc',
  };
}
