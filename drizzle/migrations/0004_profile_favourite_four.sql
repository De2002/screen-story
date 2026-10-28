CREATE TABLE public.profile_favourites (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 slot smallint NOT NULL CHECK (slot BETWEEN 0 AND 3),
 title_id text NOT NULL REFERENCES public.titles(id),
 PRIMARY KEY (user_id, slot),
 UNIQUE (user_id, title_id)
);
GRANT SELECT ON public.profile_favourites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_favourites TO authenticated;
GRANT ALL ON public.profile_favourites TO service_role;
ALTER TABLE public.profile_favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favourites public read" ON public.profile_favourites FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "favourites owner insert" ON public.profile_favourites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_write(auth.uid()));
CREATE POLICY "favourites owner update" ON public.profile_favourites FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.can_write(auth.uid()));
CREATE POLICY "favourites owner delete" ON public.profile_favourites FOR DELETE TO authenticated USING (user_id = auth.uid());