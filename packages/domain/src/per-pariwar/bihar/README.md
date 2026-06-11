# src/per-pariwar/bihar/

**Landing Story: 1.7 (deferred) + 10.12** — Per-Pariwar JSONB schema per
architecture §1.7 line 936-985 + AR-21.

Bihar-specific custom-field JSON Schema fragments + validators. Story 10.12
lands the Bihar-specific Phase-2/3 fields.

**Story 1.7 disposition — NOT landed (explicit deferral, per
[[feedback_closure_language_precision]]):** the per-Pariwar custom-field
mechanism (architecture §1.7 line 936-985) is the GIN-indexed JSONB extension on
the **members / claims / pools** tables — those host tables do not exist until
Epic 3 / 6 / 7. Story 1.7's epic ACs require only the Pariwar-Passport table +
branding (which DID land at `../../schema/pariwar_passport.ts`), not custom
fields. Landing custom-field fragments with no host table to attach to would be
speculative. This directory therefore stays a placeholder; the Bihar identity
envelope couples to the Passport's `branding_bundle` + display names, which the
Passport already carries. Re-triggered when the first custom-field host table
lands (Epic 3+). Recorded in deferred-work.md.
