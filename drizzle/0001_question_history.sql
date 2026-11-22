CREATE TABLE conversations (user_id TEXT NOT NULL REFERENCES users(id), id TEXT NOT NULL, question TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,id));
--> statement-breakpoint
CREATE INDEX conversations_recent ON conversations(user_id,updated_at DESC);
--> statement-breakpoint
ALTER TABLE requests ADD COLUMN conversation_id TEXT;
--> statement-breakpoint
ALTER TABLE requests ADD COLUMN error TEXT;
--> statement-breakpoint
CREATE INDEX requests_conversation ON requests(user_id,conversation_id,created_at DESC);
--> statement-breakpoint
CREATE UNIQUE INDEX requests_one_pending ON requests(user_id,conversation_id,provider) WHERE status='pending';
