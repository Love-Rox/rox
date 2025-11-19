DROP INDEX IF EXISTS "reaction_user_note_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reaction_user_note_reaction_idx" ON "reactions" USING btree ("user_id","note_id","reaction");