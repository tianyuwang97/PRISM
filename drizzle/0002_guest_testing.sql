ALTER TABLE users ADD COLUMN guest_expires_at INTEGER;
--> statement-breakpoint
CREATE INDEX users_guest_expiry ON users(guest_expires_at);
