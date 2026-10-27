CREATE OR REPLACE FUNCTION public.cache_title(
  _id text, _kind text, _tmdb_id integer, _slug text, _title text,
  _year integer, _poster_path text, _genres text[]
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _kind NOT IN ('movie','series') OR _tmdb_id <= 0 OR _id <> (_kind || '-' || _tmdb_id::text) THEN
    RAISE EXCEPTION 'invalid title';
  END IF;
  IF length(coalesce(_title,'')) = 0 OR length(_title) > 300 OR length(_slug) > 400
     OR (_poster_path IS NOT NULL AND length(_poster_path) > 200)
     OR coalesce(array_length(_genres,1),0) > 20 THEN
    RAISE EXCEPTION 'invalid title data';
  END IF;
  -- Public callers may only add missing titles; refreshing existing rows needs the server admin key.
  INSERT INTO public.titles (id, kind, tmdb_id, slug, title, year, poster_path, genres, updated_at)
  VALUES (_id, _kind, _tmdb_id, _slug, _title, _year, _poster_path, coalesce(_genres,'{}'), now())
  ON CONFLICT (id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.cache_title(text,text,integer,text,text,integer,text,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cache_title(text,text,integer,text,text,integer,text,text[]) TO anon, authenticated, service_role;