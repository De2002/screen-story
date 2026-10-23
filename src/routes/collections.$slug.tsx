import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, Bookmark, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Page } from "@/components/shell";
import { Empty, Poster, ShareButton } from "@/components/bits";
import { FeedSkeleton } from "@/components/feeds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/collections/$slug")({
  head: () => ({
    meta: [
      { title: "Collection — Scruttin" },
      { name: "description", content: "A collection of movies and series curated by a Scruttin member." },
      { property: "og:title", content: "A collection on Scruttin" },
      { property: "og:description", content: "Movies and series, hand-picked by a member." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollectionPage,
});

type Item = { position: number; title_id: string; title: { kind: "movie" | "series"; slug: string; title: string; year: number | null; poster_path: string | null } };

function CollectionPage() {
  const { slug } = Route.useParams();
  const { user, requireAuth } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const q = useQuery({
    queryKey: ["collection", slug, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections")
        .select("*, author:profiles!collections_user_id_fkey!inner(username, display_name), collection_items(position, title_id, title:titles(kind, slug, title, year, poster_path))")
        .eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      let saved = false;
      if (user) saved = !!(await supabase.from("saved_collections").select("collection_id").eq("user_id", user.id).eq("collection_id", data.id).maybeSingle()).data;
      const items = ((data as any).collection_items as Item[]).sort((a, b) => a.position - b.position);
      return { c: data as any, items, saved };
    },
  });
  if (q.isLoading) return <Page narrow><FeedSkeleton /></Page>;
  if (q.isError) return <Page narrow><Empty title="Couldn't load collection">Please try again.</Empty></Page>;
  if (!q.data) return <Page narrow><Empty title="Collection not found" /></Page>;
  const { c, items, saved } = q.data;
  const mine = user?.id === c.user_id;

  const toggleSave = async () => {
    if (!requireAuth("Sign in to save collections") || !user) return;
    const r = saved
      ? await supabase.from("saved_collections").delete().match({ user_id: user.id, collection_id: c.id })
      : await supabase.from("saved_collections").insert({ user_id: user.id, collection_id: c.id });
    if (r.error) toast.error("Couldn't update."); else q.refetch();
  };
  const move = async (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const a = items[i], b = items[j];
    await Promise.all([
      supabase.from("collection_items").update({ position: j }).match({ collection_id: c.id, title_id: a.title_id }),
      supabase.from("collection_items").update({ position: i }).match({ collection_id: c.id, title_id: b.title_id }),
    ]);
    // normalize others
    await Promise.all(items.map((it, k) => k !== i && k !== j && it.position !== k
      ? supabase.from("collection_items").update({ position: k }).match({ collection_id: c.id, title_id: it.title_id }) : null));
    await supabase.from("collections").update({ updated_at: new Date().toISOString() }).eq("id", c.id);
    q.refetch();
  };
  const remove = async (titleId: string) => {
    await supabase.from("collection_items").delete().match({ collection_id: c.id, title_id: titleId });
    q.refetch();
  };
  const saveMeta = async () => {
    const { error } = await supabase.from("collections").update({ name: name.trim(), description: desc.trim() || null, updated_at: new Date().toISOString() }).eq("id", c.id);
    if (error) toast.error("Couldn't save."); else { setEditing(false); q.refetch(); }
  };
  const del = async () => {
    if (!confirm("Delete this collection?")) return;
    await supabase.from("collections").delete().eq("id", c.id);
    history.back();
  };

  return (
    <Page narrow>
      {editing ? (
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" maxLength={1000} />
          <div className="flex gap-2"><Button size="sm" onClick={saveMeta} disabled={!name.trim()}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button><Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={del}>Delete collection</Button></div>
        </div>
      ) : (
        <>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Collection</p>
          <h1 className="mt-1 font-display text-4xl leading-tight">{c.name}</h1>
          {c.description && <p className="mt-3 text-[15px] leading-relaxed">{c.description}</p>}
          <p className="mt-3 text-sm text-muted-foreground">
            by <Link to="/u/$username" params={{ username: c.author.username }} className="text-foreground hover:underline">{c.author.display_name || c.author.username}</Link>
            {" · "}created {format(new Date(c.created_at), "d MMM yyyy")} · updated {format(new Date(c.updated_at), "d MMM yyyy")}
          </p>
          <div className="mt-4 flex items-center gap-3">
            {!mine && <Button size="sm" variant={saved ? "default" : "outline"} onClick={toggleSave}><Bookmark /> {saved ? "Saved" : "Save collection"}</Button>}
            {mine && <Button size="sm" variant="outline" onClick={() => { setName(c.name); setDesc(c.description ?? ""); setEditing(true); }}>Edit details</Button>}
            <ShareButton path={`/collections/${c.slug}`} />
          </div>
        </>
      )}
      <ol className="mt-8 divide-y border-t">
        {items.map((it, i) => (
          <li key={it.title_id} className="flex items-center gap-4 py-3">
            <span className="w-6 text-right font-display text-lg text-muted-foreground">{i + 1}</span>
            <Link to={it.title.kind === "movie" ? "/movie/$slug" : "/series/$slug"} params={{ slug: it.title.slug }} className="flex min-w-0 flex-1 items-center gap-3">
              <Poster path={it.title.poster_path} title={it.title.title} size="w92" className="w-10 shrink-0" />
              <span className="min-w-0"><span className="block truncate font-medium">{it.title.title}</span><span className="text-xs text-muted-foreground">{it.title.kind === "movie" ? "Movie" : "Series"}{it.title.year ? ` · ${it.title.year}` : ""}</span></span>
            </Link>
            {mine && (
              <div className="flex gap-1 text-muted-foreground">
                <button aria-label="Move up" onClick={() => move(i, -1)} className="p-1 hover:text-foreground"><ArrowUp className="size-4" /></button>
                <button aria-label="Move down" onClick={() => move(i, 1)} className="p-1 hover:text-foreground"><ArrowDown className="size-4" /></button>
                <button aria-label="Remove" onClick={() => remove(it.title_id)} className="p-1 hover:text-foreground"><X className="size-4" /></button>
              </div>
            )}
          </li>
        ))}
      </ol>
      {items.length === 0 && <Empty title="Nothing here yet">{mine ? "Open a movie or series and choose “Add to collection”." : ""}</Empty>}
    </Page>
  );
}
