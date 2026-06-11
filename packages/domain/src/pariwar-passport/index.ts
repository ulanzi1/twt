// Barrel for the Pariwar-Passport read accessor + write path + freshness contract.
// Re-exported from @twt/domain as the `passport` namespace (see ../index.ts) so
// downstream consumers call `passport.getPariwarPassport(...)` /
// `passport.upsertPariwarPassport(...)`. Story 1.7 substrate (AC-2, AC-3).

export * from './read.js';
export * from './write.js';
