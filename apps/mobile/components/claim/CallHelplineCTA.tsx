// CallHelplineCTA — re-export shim (Story 8.11, AC5).
//
// The component RELOCATED to `components/common/CallHelplineCTA.tsx` to match its cross-cutting role
// (UX-DR49: it serves the contribution loop as well as the claim loop). This thin re-export keeps the
// old `components/claim/` import path working so every shipped claim call site stays byte-identical —
// the 8.8 relocation-with-re-export precedent. New callers should import from `../common/CallHelplineCTA`.

export { CallHelplineCTA, type CallHelplineCTAProps } from '../common/CallHelplineCTA'
