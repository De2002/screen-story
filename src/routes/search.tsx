import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { searchCatalog } from "@/lib/tmdb.functions";
import { supabase } from "@/integrations/supabase/client";
import { Page } from "@/components/shell";
import { SearchBox } from "@/components/search-box";
import { TitleGrid } from "@/components/title-grid";
import { CollectionTile, COLLECTION_SELECT, type CollectionCard } from "@/components/collections";
import { Empty } from "@/components/bits";
import { FeedSkeleton } from "@/components/feeds";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({
    q: z.string().catch("").default(""),
    type: z.enum(["all", "movie", "series", "collections"]).catch("all").default("all"),
  }),
  head: () => ({
    meta: [
      { title: "Search — Scruttin" },
      { name: "description", content: "Find any movie or series by title, year, actor, director or genre." },
      { property: "og:title", content: "Search — Scruttin" },
      { property: "og:description", content: "Find any movie or series." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

const FILTERS = [["all", "All"], ["movie", "Movies"], ["series", "Series"], ["collections", "Collections"]] as const;

function SearchPage() {
  const { q, type } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const term = q.trim();
  const titles = useQuery({
    queryKey: ["search", term, type],
    enabled: term.length >= 2 && type !== "collections",
    queryFn: () => searchCatalog({ data: { q: term, type: type as "all" | "movie" | "series" } }),
  });
  const cols = useQuery({
    queryKey: ["search-collections", term],
    enabled: term.length >= 2 && (type === "all" || type === "collections"),
    queryFn: async () => {
      const { data: hits } = await supabase.rpc("search_collections", { q: term });
      const ids = (hits ?? []).map((h) => h.id);
      if (!ids.length) return [] as CollectionCard[];
      const { data } = await supabase.from("collections").select(COLLECTION_SELECT).in("id", ids);
      return (data ?? []) as unknown as CollectionCard[];
    },
  });

  return (
    <Page>
      <SearchBox key={term} initial={term} autoFocus={!term} />
      <div className="mt-4 flex gap-2">
        {FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => navigate({ search: { q, type: k } })}
            className={cn("rounded-full border px-3 py-1 text-sm", type === k ? "border-foreground bg-foreground text-background" : "text-muted-foreground")}>{label}</button>
        ))}
      </div>
      {term.length < 2 ? (
        <Empty title="Find something to talk about">Try a title, a year (“dune 2021”), an actor, or a genre.</Empty>
      ) : (
        <div className="mt-8 space-y-10">
          {type !== "collections" && (
            titles.isLoading ? <FeedSkeleton /> :
            titles.data?.error ? <Empty title="Search is resting">{titles.data.error}</Empty> :
            titles.data?.results.length ? <TitleGrid items={titles.data.results} /> :
            <Empty title={`Nothing for “${term}”`}>Check the spelling, or try just part of the title.</Empty>
          )}
          {(type === "all" || type === "collections") && (cols.data?.length ?? 0) > 0 && (
            <section>
              <h2 className="font-display text-2xl">Collections</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">{cols.data!.map((c) => <CollectionTile key={c.id} c={c} />)}</div>
            </section>
          )}
          {type === "collections" && !cols.isLoading && !cols.data?.length && <Empty title="No collections match">Try another word.</Empty>}
        </div>
      )}
    </Page>
  );
}
