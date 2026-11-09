import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getTrailerReel, type ReelItem } from "@/lib/tmdb.functions";
import { posterUrl } from "@/lib/titles";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore trailers — Scruttin" },
      { name: "description", content: "Scroll through trailers for trending movies and series, with synopsis and cast." },
      { property: "og:title", content: "Explore trailers — Scruttin" },
      { property: "og:description", content: "A scrolling feed of trailers for what people are watching." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explore,
});

function Reel({ item, active }: { item: ReelItem; active: boolean }) {
  const href = `/${item.kind}/${item.slug}`;
  return (
    <article className="reel-item flex min-h-[calc(100svh-4rem)] snap-start flex-col justify-center gap-4 border-b py-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {item.kind === "movie" ? "Movie" : "Series"}{item.year ? ` · ${item.year}` : ""}{item.genres.length ? ` · ${item.genres.join(", ")}` : ""}
        </p>
        <h2 className="mt-1 font-display text-3xl leading-tight">
          <a href={href} className="hover:text-ember">{item.title}</a>
        </h2>
        <p className="mt-2 line-clamp-4 font-display text-base leading-relaxed text-muted-foreground">{item.overview}</p>
      </header>

      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
        {active ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${item.trailerKey}?autoplay=1&mute=1&playsinline=1&rel=0`}
            title={`${item.title} trailer`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <img src={`https://i.ytimg.com/vi/${item.trailerKey}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-80" />
        )}
      </div>

      {item.cast.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Cast</h3>
          <ul className="mt-2 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
            {item.cast.map((c) => (
              <li key={c.name + c.character} className="w-16 shrink-0 text-center">
                {c.profilePath
                  ? <img src={posterUrl(c.profilePath, "w185")!} alt={c.name} loading="lazy" className="mx-auto size-14 rounded-full object-cover" />
                  : <div className="mx-auto grid size-14 place-items-center rounded-full bg-muted text-sm">{c.name[0]}</div>}
                <p className="mt-1 line-clamp-2 text-[11px] leading-tight">{c.name}</p>
                {c.character && <p className="line-clamp-1 text-[10px] text-muted-foreground">{c.character}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <a href={href} className="text-sm text-ember">Join the conversation →</a>
    </article>
  );
}

function Explore() {
  const q = useInfiniteQuery({
    queryKey: ["trailer-reel"],
    queryFn: ({ pageParam }) => getTrailerReel({ data: { page: pageParam } }),
    initialPageParam: 1,
    getNextPageParam: (_l, all) => (all.length < 20 ? all.length + 1 : undefined),
    staleTime: 3600_000,
  });
  const seen = new Set<string>();
  const items = (q.data?.pages.flat() ?? []).filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  const [active, setActive] = useState<string | null>(null);
  const feed = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = feed.current;
    if (!root) return;
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset["id"] ?? null);
    }, { root, threshold: 0.6 });
    root.querySelectorAll<HTMLElement>("[data-id]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
    }, { root: feed.current, rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [q.hasNextPage, q.isFetchingNextPage, items.length]);

  return (
    <div ref={feed} className="mx-auto h-[calc(100svh-4rem)] max-w-2xl snap-y snap-mandatory overflow-y-auto px-4">
      <h1 className="sr-only">Explore trailers</h1>
      {q.isLoading && (
        <div className="space-y-4 py-6"><Skeleton className="h-24" /><Skeleton className="aspect-video" /><Skeleton className="h-20" /></div>
      )}
      {!q.isLoading && items.length === 0 && (
        <p className="py-20 text-center text-muted-foreground">No trailers right now. <Link to="/search" search={{ q: "", type: "all" }} className="text-ember">Search instead</Link></p>
      )}
      {items.map((it) => (
        <div key={it.id} data-id={it.id}><Reel item={it} active={active === it.id} /></div>
      ))}
      <div ref={sentinel} className="h-10" />
      {q.isFetchingNextPage && <p className="pb-6 text-center text-sm text-muted-foreground">Loading more…</p>}
    </div>
  );
}
