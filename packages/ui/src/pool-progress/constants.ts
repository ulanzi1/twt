// The `<PoolProgressCard>` token-role constant — Story 9.12 (Task 2). The presenter emits a `@twt/tokens`
// `color` role NAME as a string (never a hex, never a `@twt/tokens` runtime import — the `status-pill`
// discipline: `packages/ui` stays framework- AND palette-free so the SAME presenter serves RN, the PDF
// template, and the Epic-11b public web). The render layer resolves the actual colour (FM-14 #2 — no
// magic-number colours in component code). A unit test asserts this role exists in `@twt/tokens` `color`.

/**
 * The confirmed/green family role for the meter fill. A low-or-zero confirmed meter is honest — NEVER a
 * red/danger tone (AC5 / Story 2.2 dignified register; the existing 8.2 card's rule).
 */
export const COLOR_TOKEN_STATUS_CONFIRMED = 'status-confirmed';
