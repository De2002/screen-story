create extension if not exists pg_trgm;

create type public.app_role as enum ('admin','moderator','user');
create type public.account_status as enum ('active','restricted','suspended','banned');
create type public.post_category as enum ('lesson','quote','moment','trailer_thought');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  avatar_url text,
  bio text not null default '',
  status public.account_status not null default 'active',
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.can_write(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and status = 'active')
$$;

create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "admin profile update" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- keep status changes admin-only
create or replace function public.guard_profile_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> old.status and not public.has_role(auth.uid(),'admin') and auth.role() <> 'service_role' then
    new.status := old.status;
  end if;
  return new;
end $$;
create trigger profiles_guard_status before update on public.profiles for each row execute function public.guard_profile_status();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; uname text;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1), 'viewer'), '[^a-zA-Z0-9_]', '', 'g'));
  if length(base) < 3 then base := 'viewer'; end if;
  uname := left(base, 20);
  while exists (select 1 from public.profiles where username = uname) loop
    uname := left(base, 16) || floor(random()*9000+1000)::int;
  end loop;
  insert into public.profiles (id, username, display_name, avatar_url)
  values (new.id, uname,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', uname),
    new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if (select count(*) from public.user_roles where role = 'admin') = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- titles cached from TMDB
create table public.titles (
  id text primary key, -- e.g. movie-157336
  kind text not null check (kind in ('movie','series')),
  tmdb_id integer not null,
  slug text not null,
  title text not null,
  year integer,
  poster_path text,
  genres text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create index titles_trgm on public.titles using gin (title gin_trgm_ops);
grant select on public.titles to anon, authenticated;
grant all on public.titles to service_role;
alter table public.titles enable row level security;
create policy "titles readable" on public.titles for select using (true);

-- posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title_id text not null references public.titles(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category public.post_category not null,
  body text not null check (char_length(body) between 1 and 2000),
  quote_character text,
  explanation text,
  spoiler boolean not null default false,
  season integer, episode integer,
  like_count integer not null default 0,
  reply_count integer not null default 0,
  removed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_title_cat on public.posts (title_id, category, created_at desc);
create index posts_feed on public.posts (created_at desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  title_id text not null references public.titles(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  heading text,
  body text not null check (char_length(body) between 1 and 20000),
  spoiler boolean not null default false,
  like_count integer not null default 0,
  reply_count integer not null default 0,
  removed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (title_id, user_id)
);
create index reviews_title on public.reviews (title_id, created_at desc);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  title_id text not null references public.titles(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null check (char_length(question) between 3 and 300),
  details text,
  spoiler boolean not null default false,
  season integer, episode integer,
  answer_count integer not null default 0,
  like_count integer not null default 0,
  removed boolean not null default false,
  created_at timestamptz not null default now()
);
create index questions_title on public.questions (title_id, created_at desc);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  spoiler boolean not null default false,
  helpful boolean not null default false,
  like_count integer not null default 0,
  reply_count integer not null default 0,
  removed boolean not null default false,
  created_at timestamptz not null default now()
);
create index answers_q on public.answers (question_id, created_at);

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  parent_type text not null check (parent_type in ('post','review','answer')),
  parent_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  spoiler boolean not null default false,
  removed boolean not null default false,
  created_at timestamptz not null default now()
);
create index replies_parent on public.replies (parent_type, parent_id, created_at);

create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','review','question','answer')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

do $$ declare t text; begin
  foreach t in array array['posts','reviews','questions','answers','replies'] loop
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "read visible" on public.%I for select using (not removed or user_id = auth.uid() or public.has_role(auth.uid(),''admin''))', t);
    execute format('create policy "insert own" on public.%I for insert to authenticated with check (user_id = auth.uid() and public.can_write(auth.uid()) and not removed)', t);
    execute format('create policy "update own" on public.%I for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),''admin''))', t);
    execute format('create policy "delete own" on public.%I for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;

grant select on public.likes to anon;
grant select, insert, delete on public.likes to authenticated;
grant all on public.likes to service_role;
alter table public.likes enable row level security;
create policy "likes readable" on public.likes for select using (true);
create policy "like own" on public.likes for insert to authenticated with check (user_id = auth.uid() and public.can_write(auth.uid()));
create policy "unlike own" on public.likes for delete to authenticated using (user_id = auth.uid());

-- guard: non-admins can't flip removed / counters; question author may mark helpful
create or replace function public.guard_content_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  if not public.has_role(auth.uid(),'admin') then
    new.removed := old.removed;
  end if;
  if tg_table_name in ('posts','reviews','questions','answers') then
    new.like_count := old.like_count;
  end if;
  if tg_table_name in ('posts','reviews','answers') then new.reply_count := old.reply_count; end if;
  if tg_table_name = 'questions' then new.answer_count := old.answer_count; end if;
  return new;
end $$;
create trigger posts_guard before update on public.posts for each row execute function public.guard_content_update();
create trigger reviews_guard before update on public.reviews for each row execute function public.guard_content_update();
create trigger questions_guard before update on public.questions for each row execute function public.guard_content_update();
create trigger answers_guard before update on public.answers for each row execute function public.guard_content_update();
create trigger replies_guard before update on public.replies for each row execute function public.guard_content_update();

-- helpful marking by question author
create or replace function public.mark_helpful(_answer_id uuid, _value boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.answers a join public.questions q on q.id = a.question_id
                 where a.id = _answer_id and q.user_id = auth.uid()) then
    raise exception 'Only the question author can mark answers as helpful';
  end if;
  update public.answers set helpful = _value where id = _answer_id;
end $$;
grant execute on function public.mark_helpful(uuid, boolean) to authenticated;

-- counters
create or replace function public.bump_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare d int := case when tg_op = 'INSERT' then 1 else -1 end; r record;
begin
  r := coalesce(new, old);
  if r.target_type = 'post' then update public.posts set like_count = greatest(0, like_count + d) where id = r.target_id;
  elsif r.target_type = 'review' then update public.reviews set like_count = greatest(0, like_count + d) where id = r.target_id;
  elsif r.target_type = 'question' then update public.questions set like_count = greatest(0, like_count + d) where id = r.target_id;
  elsif r.target_type = 'answer' then update public.answers set like_count = greatest(0, like_count + d) where id = r.target_id;
  end if;
  return null;
end $$;
create trigger likes_count after insert or delete on public.likes for each row execute function public.bump_like_count();

create or replace function public.bump_reply_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare d int := case when tg_op = 'INSERT' then 1 else -1 end; r record;
begin
  r := coalesce(new, old);
  if r.parent_type = 'post' then update public.posts set reply_count = greatest(0, reply_count + d) where id = r.parent_id;
  elsif r.parent_type = 'review' then update public.reviews set reply_count = greatest(0, reply_count + d) where id = r.parent_id;
  elsif r.parent_type = 'answer' then update public.answers set reply_count = greatest(0, reply_count + d) where id = r.parent_id;
  end if;
  return null;
end $$;
create trigger replies_count after insert or delete on public.replies for each row execute function public.bump_reply_count();

create or replace function public.bump_answer_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then update public.questions set answer_count = answer_count + 1 where id = new.question_id;
  else update public.questions set answer_count = greatest(0, answer_count - 1) where id = old.question_id; end if;
  return null;
end $$;
create trigger answers_count after insert or delete on public.answers for each row execute function public.bump_answer_count();

-- library
create table public.library (
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id text not null references public.titles(id),
  status text not null check (status in ('watched','want')),
  created_at timestamptz not null default now(),
  primary key (user_id, title_id)
);
grant select on public.library to anon;
grant select, insert, update, delete on public.library to authenticated;
grant all on public.library to service_role;
alter table public.library enable row level security;
create policy "library readable" on public.library for select using (true);
create policy "library own ins" on public.library for insert to authenticated with check (user_id = auth.uid());
create policy "library own upd" on public.library for update to authenticated using (user_id = auth.uid());
create policy "library own del" on public.library for delete to authenticated using (user_id = auth.uid());

-- collections
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  removed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index collections_name_trgm on public.collections using gin (name gin_trgm_ops);
create table public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  title_id text not null references public.titles(id),
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (collection_id, title_id)
);
create table public.saved_collections (
  user_id uuid not null references public.profiles(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, collection_id)
);
grant select on public.collections, public.collection_items, public.saved_collections to anon;
grant select, insert, update, delete on public.collections, public.collection_items, public.saved_collections to authenticated;
grant all on public.collections, public.collection_items, public.saved_collections to service_role;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.saved_collections enable row level security;
create policy "collections readable" on public.collections for select using (not removed or user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "collections ins" on public.collections for insert to authenticated with check (user_id = auth.uid() and public.can_write(auth.uid()));
create policy "collections upd" on public.collections for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "collections del" on public.collections for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create trigger collections_guard before update on public.collections for each row execute function public.guard_content_update();

create or replace function public.owns_collection(_cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.collections where id = _cid and user_id = auth.uid())
$$;
create policy "items readable" on public.collection_items for select using (true);
create policy "items ins" on public.collection_items for insert to authenticated with check (public.owns_collection(collection_id));
create policy "items upd" on public.collection_items for update to authenticated using (public.owns_collection(collection_id));
create policy "items del" on public.collection_items for delete to authenticated using (public.owns_collection(collection_id));
create policy "saved readable" on public.saved_collections for select using (true);
create policy "saved ins" on public.saved_collections for insert to authenticated with check (user_id = auth.uid());
create policy "saved del" on public.saved_collections for delete to authenticated using (user_id = auth.uid());

-- reports & moderation
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','review','question','answer','reply','collection','copyright')),
  target_id uuid,
  reason text not null check (char_length(reason) between 1 and 2000),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "report create" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "report read" on public.reports for select to authenticated using (reporter_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "report admin upd" on public.reports for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert on public.moderation_log to authenticated;
grant all on public.moderation_log to service_role;
alter table public.moderation_log enable row level security;
create policy "modlog admin read" on public.moderation_log for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "modlog admin ins" on public.moderation_log for insert to authenticated with check (admin_id = auth.uid() and public.has_role(auth.uid(),'admin'));

-- collection search
create or replace function public.search_collections(q text)
returns setof public.collections language sql stable set search_path = public as $$
  select * from public.collections
  where not removed and (name ilike '%' || q || '%' or similarity(name, q) > 0.2)
  order by similarity(name, q) desc limit 10
$$;
grant execute on function public.search_collections(text) to anon, authenticated;