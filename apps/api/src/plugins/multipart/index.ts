// @fastify/multipart registration — Story 6.5 (Task 5).
//
// Enables `request.file()` / `request.parts()` for the claim-document upload endpoints (the
// FIRST file-upload surface in the stack). Registered with a hard per-file byte cap
// (CLAIM_DOCUMENT_MAX_BYTES) + a single-file limit so an oversized/multi-file upload is
// rejected at the transport before any handler work. The exact-cap + MIME allowlist checks
// live in the upload handler (dignified 4xx errors, never a 500). No `attachFieldsToBody` —
// the handlers read the file part explicitly.

import fastifyMultipart from '@fastify/multipart';
import { CLAIM_DOCUMENT_MAX_BYTES } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';

export async function registerMultipart(app: FastifyInstance): Promise<void> {
  await app.register(fastifyMultipart, {
    limits: {
      // One document per upload request; the handler enforces the exact byte cap + MIME.
      files: 1,
      // A little headroom over the documented cap so the handler returns the dignified
      // `claim_document.too_large` 413 rather than the plugin's generic truncation error.
      fileSize: CLAIM_DOCUMENT_MAX_BYTES + 64 * 1024,
      // Non-file fields are tiny (none expected — documentType rides the querystring).
      fields: 8,
    },
  });
}
