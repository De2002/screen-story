PRAGMA foreign_keys = ON;

-- Cloudflare D1 / SQLite schema for screen-story.
-- Clerk is the identity provider; user_id and profile.id store Clerk subject IDs.

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','restricted','suspended','banned')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','moderator','user')),
  UNIQUE (user_id, role)
);
CREATE TABLE IF NOT EXISTS titles (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('movie','series')),
  tmdb_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  year INTEGER,
  poster_path TEXT,
  genres TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (kind, tmdb_id)
);
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), title_id TEXT NOT NULL REFERENCES titles(id), user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('lesson','quote','moment','trailer_thought')), body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000), quote_character TEXT, explanation TEXT, spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0,1)), season INTEGER, episode INTEGER, like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0), reply_count INTEGER NOT NULL DEFAULT 0 CHECK (reply_count >= 0), removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0,1)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), title_id TEXT NOT NULL REFERENCES titles(id), user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  heading TEXT, body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 20000), spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0,1)), like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0), reply_count INTEGER NOT NULL DEFAULT 0 CHECK (reply_count >= 0), removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0,1)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE (title_id, user_id)
);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), title_id TEXT NOT NULL REFERENCES titles(id), user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (length(question) BETWEEN 3 AND 300), details TEXT, spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0,1)), season INTEGER, episode INTEGER, answer_count INTEGER NOT NULL DEFAULT 0 CHECK (answer_count >= 0), like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0), removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0,1)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 10000), spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0,1)), helpful INTEGER NOT NULL DEFAULT 0 CHECK (helpful IN (0,1)), like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0), reply_count INTEGER NOT NULL DEFAULT 0 CHECK (reply_count >= 0), removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0,1)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS replies (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), parent_type TEXT NOT NULL CHECK (parent_type IN ('post','review','answer')), parent_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000), spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0,1)), removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0,1)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, target_type TEXT NOT NULL CHECK (target_type IN ('post','review','question','answer')), target_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), PRIMARY KEY (user_id, target_type, target_id)
);
CREATE TABLE IF NOT EXISTS library (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, title_id TEXT NOT NULL REFERENCES titles(id), status TEXT NOT NULL CHECK (status IN ('watched','want')), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), PRIMARY KEY (user_id, title_id)
);
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), slug TEXT NOT NULL UNIQUE COLLATE NOCASE, user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120), description TEXT, removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0,1)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS collection_items (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE, title_id TEXT NOT NULL REFERENCES titles(id), position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0), added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), PRIMARY KEY (collection_id, title_id)
);
CREATE TABLE IF NOT EXISTS saved_collections (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), PRIMARY KEY (user_id, collection_id)
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), reporter_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, target_type TEXT NOT NULL CHECK (target_type IN ('post','review','question','answer','reply','collection','copyright')), target_id TEXT, reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 2000), status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS moderation_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), admin_id TEXT NOT NULL REFERENCES profiles(id), action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_feed ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_title_category ON posts(title_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_title ON reviews(title_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_title ON questions(title_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id, created_at);
CREATE INDEX IF NOT EXISTS idx_replies_parent ON replies(parent_type, parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_library_user_status ON library(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_items_position ON collection_items(collection_id, position);
CREATE INDEX IF NOT EXISTS idx_collections_user_updated ON collections(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_collections_collection ON saved_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_log_created ON moderation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_titles_title ON titles(title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

CREATE VIEW IF NOT EXISTS visible_collections AS SELECT * FROM collections WHERE removed = 0;
CREATE TRIGGER IF NOT EXISTS trg_likes_insert AFTER INSERT ON likes BEGIN
  UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.target_id AND NEW.target_type = 'post';
  UPDATE reviews SET like_count = like_count + 1 WHERE id = NEW.target_id AND NEW.target_type = 'review';
  UPDATE questions SET like_count = like_count + 1 WHERE id = NEW.target_id AND NEW.target_type = 'question';
  UPDATE answers SET like_count = like_count + 1 WHERE id = NEW.target_id AND NEW.target_type = 'answer';
END;
CREATE TRIGGER IF NOT EXISTS trg_likes_delete AFTER DELETE ON likes BEGIN
  UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE id = OLD.target_id AND OLD.target_type = 'post';
  UPDATE reviews SET like_count = MAX(0, like_count - 1) WHERE id = OLD.target_id AND OLD.target_type = 'review';
  UPDATE questions SET like_count = MAX(0, like_count - 1) WHERE id = OLD.target_id AND OLD.target_type = 'question';
  UPDATE answers SET like_count = MAX(0, like_count - 1) WHERE id = OLD.target_id AND OLD.target_type = 'answer';
END;
CREATE TRIGGER IF NOT EXISTS trg_answers_insert AFTER INSERT ON answers BEGIN UPDATE questions SET answer_count = answer_count + 1 WHERE id = NEW.question_id; END;
CREATE TRIGGER IF NOT EXISTS trg_answers_delete AFTER DELETE ON answers BEGIN UPDATE questions SET answer_count = MAX(0, answer_count - 1) WHERE id = OLD.question_id; END;
CREATE TRIGGER IF NOT EXISTS trg_replies_insert AFTER INSERT ON replies BEGIN
  UPDATE posts SET reply_count = reply_count + 1 WHERE id = NEW.parent_id AND NEW.parent_type = 'post';
  UPDATE reviews SET reply_count = reply_count + 1 WHERE id = NEW.parent_id AND NEW.parent_type = 'review';
  UPDATE answers SET reply_count = reply_count + 1 WHERE id = NEW.parent_id AND NEW.parent_type = 'answer';
END;
CREATE TRIGGER IF NOT EXISTS trg_replies_delete AFTER DELETE ON replies BEGIN
  UPDATE posts SET reply_count = MAX(0, reply_count - 1) WHERE id = OLD.parent_id AND OLD.parent_type = 'post';
  UPDATE reviews SET reply_count = MAX(0, reply_count - 1) WHERE id = OLD.parent_id AND OLD.parent_type = 'review';
  UPDATE answers SET reply_count = MAX(0, reply_count - 1) WHERE id = OLD.parent_id AND OLD.parent_type = 'answer';
END;
