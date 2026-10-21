import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTrending } from "@/lib/tmdb.functions";
import { TitleGrid } from "@/components/title-grid";
import { Page } from "@/components/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionsGrid } from "@/components/collections";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore movies and series — Scruttin" },
      { name: "description", content: "Browse popular movies, series and member collections, and join the conversation." },
      { property: "og:title", content: "Explore — Scruttin" },
      { property: "og:description", content: "Browse movies, series and public collections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explore,
});

const GENRES = ["Drama", "Comedy", "Mystery", "Science fiction", "Animation", "Crime", "Documentary", "Romance", "Horror", "Thriller"];

function Row({ kind, label }: { kind: "movie" | "series"; label: string }) {
  const q = useQuery({ queryKey: ["trending", kind], queryFn: () => getTrending({ data: { kind } }), staleTime: 3600_000 });
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl">{label}</h2>
      <div className="mt-4">
        {q.isLoading ? <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3]" />)}</div>
          : <TitleGrid items={(q.data ?? []).slice(0, 12)} />}
      </div>
    </section>
  );
}

function Explore() {
  return (
    <Page>
      <h1 className="font-display text-4xl">Explore</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <Link key={g} to="/search" search={{ q: g, type: "all" }} className="rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-foreground">{g}</Link>
        ))}
      </div>
      <Row kind="movie" label="Movies people are watching" />
      <Row kind="series" label="Series people are watching" />
      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Member collections</h2>
          <Link to="/collections" className="text-sm text-ember">See all</Link>
        </div>
        <div className="mt-4"><CollectionsGrid limit={6} /></div>
      </section>
    </Page>
  );
}
