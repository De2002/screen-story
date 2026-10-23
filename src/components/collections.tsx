import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { posterUrl } from "@/lib/titles";
import { Empty } from "./bits";
import { Skeleton } from "@/components/ui/skeleton";

export type CollectionCard = {
  id: string; slug: string; name: string; description: string | null; updated_at: string;
  author: { username: string; display_name: string };
  collection_items: { position: number; title: { poster_path: string | null } | null }[];
};

export const COLLECTION_SELECT = "id, slug, name, description, updated_at, author:profiles!collections_user_id_fkey!inner(username, display_name), collection_items(position, title:titles(poster_path))";

export function Cover({ items }: { items: CollectionCard["collection_items"] }) {
  const posters = [...items].sort((a, b) => a.position - b.position).map((i) => i.title?.poster_path).filter(Boolean).slice(0, 4) as string[];
  return (
    <div className="grid aspect-[4/3] grid-cols-4 gap-0.5 overflow-hidden rounded-md bg-muted">
      {posters.length === 0 ? <div className="col-span-4" /> : posters.map((p, i) => (
        <img key={i} src={posterUrl(p, "w185") ?? undefined} alt="" loading="lazy" className="h-full w-full object-cover" />
      ))}
    </div>
  );
}

export function CollectionTile({ c }: { c: CollectionCard }) {
  return (
    <Link to="/collections/$slug" params={{ slug: c.slug }} className="group block">
      <Cover items={c.collection_items} />
      <p className="mt-2 font-display text-lg leading-snug group-hover:underline">{c.name}</p>
      <p className="text-xs text-muted-foreground">by {c.author.display_name || c.author.username} · {c.collection_items.length} titles</p>
    </Link>
  );
}

export function CollectionsGrid({ limit = 24, userId, ids }: { limit?: number; userId?: string; ids?: string[] }) {
  const q = useQuery({
    queryKey: ["collections", limit, userId ?? null, ids?.join(",") ?? null],
    queryFn: async () => {
      let qb = supabase.from("collections").select(COLLECTION_SELECT).eq("removed", false).order("updated_at", { ascending: false }).limit(limit);
      if (userId) qb = qb.eq("user_id", userId);
      if (ids) qb = qb.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const { data, error } = await qb;
      if (error) throw error;
      return data as unknown as CollectionCard[];
    },
  });
  if (q.isLoading) return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/3]" />)}</div>;
  if (q.isError) return <Empty title="Couldn't load collections">Please try again.</Empty>;
  if (!q.data?.length) return <Empty title="No collections yet">Open any movie and choose “Add to collection” to start one.</Empty>;
  return <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">{q.data.map((c) => <CollectionTile key={c.id} c={c} />)}</div>;
}
