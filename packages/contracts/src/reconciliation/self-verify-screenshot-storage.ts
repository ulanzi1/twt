// packages/contracts/src/reconciliation/self-verify-screenshot-storage.ts
//
// The Story 9.7 self-verify SCREENSHOT-UPLOAD transport port + its accepted-MIME/byte-cap constants —
// the injectable object store the member `<SelfVerifySurface>` upload endpoint rides on (Decision D1).
//
// ── A NEW port instance, NOT a ClaimDocumentStorage / BankStatementStorage reuse (Decision D1 — LOCKED) ─
// A self-verify payment screenshot is neither a claim-scoped death-certificate document nor a bank
// statement: it gets its OWN bucket (`SELF_VERIFY_SCREENSHOT_BUCKET`), its own key namespace, and its own
// retention. This mirrors 9.3's D3 ("new port + bucket, not a reuse") exactly, which in turn followed the
// 6.5 `ClaimDocumentStorage` SHAPE (put / getBytes / signedReadUrl / delete). The concrete GCS adapter
// (asia-south1, private, Tier-1 encrypted at rest) is injected; tests inject an in-memory fake.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────────
// MUST NOT import `@twt/domain` at source (the browser-bundle rule — [[project_contracts_domain_bundle_boundary]]).
// Bytes are browser-safe `Uint8Array`, so this port stays in contracts and its adapters in platform-adapters
// (the 6.5 / 9.3 precedent). NO `.openapi()` — the multipart upload route is hand-documented (6.5/9.3 precedent).

/**
 * The MIME types the self-verify upload accepts — image OR PDF (UX §11: "photo-only mobile / file picker").
 * A PhonePe/GPay/Paytm screenshot is a photo; a member using the file picker may attach a PDF receipt.
 * Deliberately NARROWER than the bank-statement CSV set: there is no parser here (a screenshot is stored
 * opaque for a human reviewer, never machine-read), so only genuine image/PDF MIME types are accepted and
 * anything else is a dignified 4xx (no fallback path — a self-verify upload is evidence, not a parse job).
 */
export const SELF_VERIFY_SCREENSHOT_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'application/pdf',
]) as readonly string[];

/**
 * The hard byte cap for a self-verify screenshot (10 MiB) — aligned to the claim-document cap, NOT the
 * smaller 5 MiB bank-statement cap: a screenshot is an IMAGE (a high-resolution phone photo or a
 * multi-page PDF receipt), materially larger than a text CSV. Enforced at the multipart-plugin boundary
 * AND exactly before `put` (defense-in-depth), the 9.3 upload-core discipline.
 */
export const SELF_VERIFY_SCREENSHOT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * The reusable self-verify screenshot object-store port (Decision D1 — a NEW port, NOT a reuse). A PURE TS
 * interface; the concrete Google Cloud Storage adapter (`asia-south1`, own `SELF_VERIFY_SCREENSHOT_BUCKET`)
 * is injected, tests inject an in-memory fake. Bytes are `Uint8Array` (browser-safe, so this port stays in
 * contracts). The bucket is PRIVATE — read access is a short-lived signed URL ONLY, never a public ACL.
 * Self-verify screenshots are Tier-1 PII (a member's payment app screen) — encrypted at rest.
 */
export interface SelfVerifyScreenshotStorage {
  /**
   * Store `bytes` at `key` with the given content type. `key` is an opaque, non-PII object path the
   * CALLER mints, scoped by pariwar/pool (never PII in the key). Idempotent per key — a re-`put` of the
   * same key overwrites the same object.
   */
  put(key: string, bytes: Uint8Array, opts: { contentType: string }): Promise<void>;
  /**
   * Fetch the stored object bytes at `key`. The Story 9.8 reviewer reads the screenshot THIS way (or via
   * a signed URL) — the bytes are never carried in an event/job payload (Decision D2 — the event stores
   * only the object key + the mismatch reference).
   */
  getBytes(key: string): Promise<Uint8Array>;
  /**
   * Mint a short-lived signed READ URL for `key` (the 6.5/9.3 signed-URL precedent). `ttlSeconds` is
   * small — the URL is handed to a Story 9.8 trustee reviewer and must expire quickly. NEVER long-lived/public.
   */
  signedReadUrl(key: string, ttlSeconds: number): Promise<string>;
  /** Delete the object at `key` (compensation on a failed event append / RTBF / hygiene). Optional. */
  delete?(key: string): Promise<void>;
}
