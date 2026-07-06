-- Migration 0041 — pariwar_wa_config webhook-credential NAME columns (Story 5.4, Task 2; AC2):
-- Two additive Secret-Manager NAME pointers the inbound-webhook ingress primitive resolves at request time:
--   · app_secret_secret_name           — NAME of the Meta app secret used to verify inbound
--                                         X-Hub-Signature-256 (HMAC-SHA256 over the RAW body). NULL ⇒ the
--                                         POST receiver rejects (fail-closed).
--   · webhook_verify_token_secret_name — NAME of the token echoed in Meta's GET subscription-verification
--                                         challenge (hub.verify_token). NULL ⇒ the GET challenge fails-closed.
-- Both are NAMES (pointers), NEVER the secret value — the SAME AI-4-3(c) discipline access_token_secret_name
-- uses (plain text, nullable). Additive ALTER TABLE ADD COLUMN — no RLS/grant change (the columns inherit the
-- table's existing tenant-isolation policies from 0038).
--
-- ⚠ DO NOT REGENERATE THIS FILE with `db:generate` (drizzle journal `when`, not SQL hash → skips; snapshots
-- stop at 0020). Hand-authored, mirroring 0038/0039. DO NOT reset via DROP SCHEMA (strips twt_app USAGE).

ALTER TABLE "pariwar_wa_config" ADD COLUMN IF NOT EXISTS "app_secret_secret_name" text;--> statement-breakpoint
ALTER TABLE "pariwar_wa_config" ADD COLUMN IF NOT EXISTS "webhook_verify_token_secret_name" text;
