CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE challenges (id TEXT PRIMARY KEY, email TEXT NOT NULL, purpose TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, sent INTEGER NOT NULL DEFAULT 0, consumed INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX challenges_email ON challenges(email, created_at);
--> statement-breakpoint
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE connections (user_id TEXT NOT NULL REFERENCES users(id), provider TEXT NOT NULL, encrypted_key TEXT NOT NULL, model TEXT NOT NULL, models_json TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id, provider));
--> statement-breakpoint
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE requests (user_id TEXT NOT NULL, id TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL, result TEXT, created_at INTEGER NOT NULL, PRIMARY KEY(user_id, id, provider));
