# Cloudflare D1 schema

## Source-of-truth review

The existing application queries these entities: `profiles`, `user_roles`, `titles`, `posts`, `reviews`, `questions`, `answers`, `replies`, `likes`, `library`, `collections`, `collection_items`, `saved_collections`, `reports`, and `moderation_log`. The prior checked-in migration was PostgreSQL/Supabase-specific (`auth.users`, enums, `uuid`, `timestamptz`, RLS, PL/pgSQL, `pg_trgm`, and RPCs), so it cannot be applied to D1. No existing D1 schema or D1 migration directory was present. `schema.sql` and `migrations/0001_initial_d1.sql` are therefore a non-destructive baseline.

All application identity columns are `TEXT` and are intended to contain Clerk subject IDs. D1 does not provide RLS or polymorphic foreign keys. Enforce authorization in the server/API layer, and validate `parent_type`/`parent_id` and `target_type`/`target_id` before writes. `titles.genres` is JSON text because SQLite has no array type.

## Tables and relationships

- `profiles`: public account profile keyed by Clerk ID; owns authored content and library records.
- `user_roles`: many-to-many role assignments for `admin`, `moderator`, and `user`.
- `titles`: TMDB title cache referenced by posts, reviews, questions, library, and collection items.
- `posts`: title discussion posts with category, spoiler, moderation, and denormalized counters.
- `reviews`: one review per user/title, with moderation and counters.
- `questions`: title questions; `answers` belong to questions.
- `answers`: answers authored by profiles, with helpful state and counters.
- `replies`: polymorphic replies to posts, reviews, or answers.
- `likes`: polymorphic likes for posts, reviews, questions, and answers; triggers maintain counters.
- `library`: watched/want-to-watch title state per profile.
- `collections`: user-owned named collections.
- `collection_items`: ordered title junction table for collections.
- `saved_collections`: profile-to-collection saved junction table.
- `reports`: moderation reports, including copyright reports with no target row.
- `moderation_log`: administrator audit events.
- `visible_collections`: convenience view excluding removed collections.

## Apply with Wrangler

From the project root, review the SQL first, then apply locally and remotely:

```bash
npx wrangler d1 execute <DATABASE_NAME> --local --file=./migrations/0001_initial_d1.sql
npx wrangler d1 execute <DATABASE_NAME> --remote --file=./migrations/0001_initial_d1.sql
```

For later migrations, create the next numbered file and run it once against the target database. Do not run `schema.sql` against a populated database unless the statements have first been reviewed; it is intended for fresh initialization and mirrors the baseline migration.

## Verification

```sql
PRAGMA foreign_keys;
SELECT name, type FROM sqlite_master WHERE type IN ('table','index','trigger','view') ORDER BY type, name;
SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('profiles','user_roles','titles','posts','reviews','questions','answers','replies','likes','library','collections','collection_items','saved_collections','reports','moderation_log');
PRAGMA table_info(profiles);
PRAGMA foreign_key_list(posts);
PRAGMA index_list(posts);
SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name IN ('trg_likes_insert','trg_likes_delete','trg_answers_insert','trg_answers_delete','trg_replies_insert','trg_replies_delete');
PRAGMA integrity_check;
```

## Potentially destructive or ambiguous items

No destructive SQL is included. The existing application still imports Supabase Auth and Supabase client APIs, while this schema is Clerk-compatible as requested; migrating runtime authentication and query code to Clerk/D1 is a separate application change and is not silently performed here. D1 cannot reproduce Supabase RPC/RLS behavior, so `search_collections`, `mark_helpful`, role checks, and content authorization must be implemented as server-side functions before production cutover. Existing PostgreSQL data also needs an explicit export/transform/import plan because UUIDs, timestamps, enums, arrays, and auth-user records are not directly portable to D1/Clerk.
