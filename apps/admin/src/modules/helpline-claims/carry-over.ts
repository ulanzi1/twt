// The HAND-OVER of unsent answers between two questionnaire instances (Story 6.33 review RV7) — shared by the helpline card
// and the inspector's panel. The merge rule itself is ONE function in `@twt/api-client` (beside `PeerAnswerEditor.carryOverDrafts`),
// the same one the mobile app uses; re-exported here so both screens keep one local import.
//
// Each instance MIRRORS its unsent answers into a shared hand-over as they change, so that ANY rebuild (a reload after a
// version-stale save, a refetch that changes the data and then the generation, a background refetch that brings a new
// version) gives the next instance the last unsent answers of the one it replaces. An instance that has not applied what was
// handed to it yet has no drafts of its own — so what it mirrors MERGES the not-yet-applied answers with its own drafts.

export { mergeCarried, type CarriedDraft } from '@twt/api-client';
