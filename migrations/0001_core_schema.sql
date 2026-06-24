PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  picture TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES students(id),
  purpose TEXT,
  domain TEXT NOT NULL,
  comment TEXT,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'disabled', 'deleted')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expiration INTEGER
) STRICT;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS link_reports (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL REFERENCES links(id),
  reporter_id TEXT REFERENCES students(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected')),
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT REFERENCES students(id)
) STRICT;

CREATE TABLE IF NOT EXISTS slug_blacklist (
  slug TEXT PRIMARY KEY,
  reason TEXT,
  created_at INTEGER NOT NULL,
  created_by TEXT REFERENCES students(id)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_links_owner_created ON links(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_domain_created ON links(domain, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_owner_purpose_created ON links(owner_id, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_status_created ON links(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_student ON auth_sessions(student_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON link_reports(status, created_at DESC);
