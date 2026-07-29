// Turnstile token seam for member-app protected forms (Story 10.2).
//
// FR-88 requires the helpdesk create form to carry a Cloudflare Turnstile token, and the server
// ENFORCES it (`deps.turnstile.verify(...)`, the admin-auth AC-3 pattern). The native app has no
// Turnstile WIDGET yet (Turnstile is a browser challenge; an RN integration needs a webview
// challenge screen) — so this is the client seam that will yield a real token once that widget
// lands. Today it returns a non-empty placeholder: in dev/CI the server's no-op verifier accepts any
// token, so the end-to-end flow works; a real production verifier rejects the placeholder, so the RN
// Turnstile widget is a FORWARD COMMITMENT owed before the helpdesk form ships to production behind a
// live verifier (documented in the Story 10.2 Dev Agent Record — the nominee-VPA deferred-seam posture).

/** Obtain a Turnstile token for a protected member-app form. Placeholder until the RN Turnstile
 *  widget lands (see the header); never empty, so the request satisfies the `min(1)` contract. */
export async function getTurnstileToken(): Promise<string> {
  return 'mobile-app-attestation-pending'
}
