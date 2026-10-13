-- Story 6.27a second-pass review S4: the ruled Tier-1 questions are ALWAYS stored encrypted. Additive to 0156 / 0157.
-- ⚠ LOCKSTEP with `questionnaires/keys.ts` `PEER_MESH_SENSITIVE_QUESTION_KEYS` (a policy-spec leg pins the two equal).
-- `death_date` keeps ONE plaintext form — *"I don't know the date"* (`ARRAY['unknown']`, ⛔ no ciphertext, ⛔ no indexes);
-- `death_cause` / `death_illness` have ⛔ none. Without this, a plaintext row escapes `anonymizeMember`'s scrub, which
-- filters on `value_ciphertext IS NOT NULL`. Existing inconsistent rows fail the migration.
ALTER TABLE "claim_peer_mesh_reply_answers" ADD CONSTRAINT "claim_peer_mesh_reply_answers_sensitive_encrypted_check" CHECK (
  "question_key" NOT IN ('death_date', 'death_cause', 'death_illness')
  OR "value_codes" IS NULL
  OR ("question_key" = 'death_date' AND "value_codes" = ARRAY['unknown']::text[])
);
