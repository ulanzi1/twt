-- Story 6.27a review R8/R9: every reply/answer follows one tenant, claim, selection and ping.
-- Additive to 0156, which has already been applied locally. Existing inconsistent rows fail migration.
ALTER TABLE claim_peer_mesh_selections ADD CONSTRAINT claim_peer_mesh_selections_tenant_selection_uq UNIQUE (pariwar_id, selection_id);
--> statement-breakpoint
ALTER TABLE claim_peer_mesh_selections ADD CONSTRAINT claim_peer_mesh_selections_tenant_selection_claim_uq UNIQUE (pariwar_id, selection_id, claim_case_id);
--> statement-breakpoint
ALTER TABLE claim_peer_mesh_pings ADD CONSTRAINT claim_peer_mesh_pings_owner_uq UNIQUE (pariwar_id, ping_id, selection_id, member_id);
--> statement-breakpoint
ALTER TABLE claim_peer_mesh_pings ADD CONSTRAINT claim_peer_mesh_pings_selection_owner_fk FOREIGN KEY (pariwar_id, selection_id) REFERENCES claim_peer_mesh_selections (pariwar_id, selection_id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE claim_peer_mesh_replies ADD CONSTRAINT claim_peer_mesh_replies_owner_uq UNIQUE (pariwar_id, reply_id, claim_case_id);
--> statement-breakpoint
ALTER TABLE claim_peer_mesh_replies ADD CONSTRAINT claim_peer_mesh_replies_selection_owner_fk FOREIGN KEY (pariwar_id, selection_id, claim_case_id) REFERENCES claim_peer_mesh_selections (pariwar_id, selection_id, claim_case_id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE claim_peer_mesh_replies ADD CONSTRAINT claim_peer_mesh_replies_ping_owner_fk FOREIGN KEY (pariwar_id, ping_id, selection_id, responder_member_id) REFERENCES claim_peer_mesh_pings (pariwar_id, ping_id, selection_id, member_id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE claim_peer_mesh_reply_answers ADD CONSTRAINT claim_peer_mesh_reply_answers_owner_fk FOREIGN KEY (pariwar_id, reply_id, claim_case_id) REFERENCES claim_peer_mesh_replies (pariwar_id, reply_id, claim_case_id) ON DELETE CASCADE;
