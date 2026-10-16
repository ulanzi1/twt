// The workplace pages' input bounds (Story 6.36c, code review round 2) — ONE place for the `maxLength`s both pages use.

/**
 * The contracts' input bounds as `maxLength` (code review round 2): the district is `District` (`.max(200)`), the codes
 * are `/^[0-9]{6}$/` and `/^[0-9]{11}$/`, and a search is `WORKPLACE_SEARCH_TEXT_MAX_WIRE` (imported from the contracts
 * where it is used). These count UTF-16 units, as zod's `.max` does. ⛔ None on the NAME or the VILLAGE:
 * those are counted in CODE POINTS (`StaffWorkplaceName` / `StaffVillage`), so a `maxLength` would cut a pasted name the
 * contract accepts (the `ApprovalWarningReasonsPage` round-3 rule) — the server's 400 has words instead.
 */
export const WORKPLACE_DISTRICT_INPUT_MAX = 200;
export const WORKPLACE_BLOCK_CODE_INPUT_MAX = 6;
export const WORKPLACE_UDISE_INPUT_MAX = 11;
