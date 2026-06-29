// Barrel for the signup-fee payment accessors — Story 3.6b (Task 2).
// Re-exported from @twt/domain as the `payment` namespace (see ../index.ts) so consumers call
// `payment.insertVyawasthaShulkReceipt(...)` / `payment.getLatestReceipt(...)` /
// `payment.insertMemberAttribution(...)`. Mirrors the `nominee/` write/read/index split. No
// `errors.ts` — these accessors return rows or throw the raw 23505 (the handler narrows it via
// `isReceiptTrDuplicate` for the idempotent re-confirm path).

export * from './receipt-write.js';
export * from './receipt-read.js';
export * from './attribution-write.js';
