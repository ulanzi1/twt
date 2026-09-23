// Tier-1 crypto for the Story 6.20 nominee-declaration surfaces (D4, D7). Mirrors
// `concealment-assessment-crypto.ts`: encrypt before the domain writer, decrypt only on the authorized
// on-demand read. ⚠ A correction's PROPOSED nominee details use `encryptNomineeField` (the member-nominee
// field class), ⛔ not this module — they become a version and a projection row when applied.

import { encryption } from '@twt/domain';

import {
  NOMINEE_CORRECTION_FIELD_CLASS,
  NOMINEE_DETERMINATION_FIELD_CLASS,
  type EncryptionDeps,
} from '../../context.js';

async function enc(value: string, pariwarId: string, fieldClass: string, deps: EncryptionDeps): Promise<string> {
  const ct = await encryption.encryptTier1(Buffer.from(value, 'utf-8'), { pariwarId, fieldClass }, deps.kms, deps.kekRef);
  return encryption.serializeEnvelope(ct);
}

async function dec(serialized: string, pariwarId: string, fieldClass: string, deps: EncryptionDeps): Promise<string> {
  const bytes = await encryption.decryptTier1(encryption.parseEnvelope(serialized), { pariwarId, fieldClass }, deps.kms, deps.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}

/** The determination's certificate date or note. */
export const encryptDeterminationField = (v: string, p: string, d: EncryptionDeps) => enc(v, p, NOMINEE_DETERMINATION_FIELD_CLASS, d);
export const decryptDeterminationField = (v: string, p: string, d: EncryptionDeps) => dec(v, p, NOMINEE_DETERMINATION_FIELD_CLASS, d);
/** A correction's raise note or step note. */
export const encryptCorrectionNote = (v: string, p: string, d: EncryptionDeps) => enc(v, p, NOMINEE_CORRECTION_FIELD_CLASS, d);
export const decryptCorrectionNote = (v: string, p: string, d: EncryptionDeps) => dec(v, p, NOMINEE_CORRECTION_FIELD_CLASS, d);
