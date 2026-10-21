import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getTrending } from "@/lib/tmdb.functions";
import { useAuth } from "@/lib/auth";
import { PostFeed, QuestionList, ReviewList } from "@/components/feeds";
import { SearchBox } from "@/components/search-box";
import { Poster } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scruttin — Come talk movies and series" },
      { name: "description", content: "Share your thoughts, ask questions, and see what others have to say. You don't have to be a critic to have something worth saying." },
      { property: "og:title", content: "Scruttin — Come talk movies and series" },
      { property: "og:description", content: "You don't have to be a critic to have something worth saying." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const FEEDS = ["Thoughts", "Reviews", "Questions"] as const;

function Home() {
  const { user, ready } = useAuth();
  const [feed, setFeed] = useState<(typeof FEEDS)[number]>("Thoughts");
  const trending = useQuery({ queryKey: ["trending", "all"], queryFn: () => getTrending({ data: { kind: "all" } }), staleTime: 3600_000 });

  return (
    <div className="mx-auto max-w-5xl px-4">
      {ready && !user && (
        <section className="border-b py-12 sm:py-16">
          <h1 className="max-w-2xl font-display text-4xl leading-[1.1] sm:text-5xl">Come talk movies and series.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">Share your thoughts, ask questions, and see what others have to say. You don't have to be a critic to have something worth saying.</p>
          <div className="mt-6 flex gap-3">
            <Button asChild><Link to="/auth" search={{ mode: "signup", redirect: "/" }}>Get started</Link></Button>
            <Button variant="ghost" asChild><Link to="/explore">Look around first</Link></Button>
          </div>
        </section>
      )}
      <div className="md:hidden pt-5"><SearchBox /></div>

      <div className="grid gap-10 py-6 md:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <div className="flex gap-1 border-b" role="tablist">
            {FEEDS.map((f) => (
              <button key={f} role="tab" aria-selected={feed === f} onClick={() => setFeed(f)}
                className={cn("border-b-2 px-3 py-3 text-sm", feed === f ? "border-ember font-medium" : "border-transparent text-muted-foreground")}>{f}</button>
            ))}
          </div>
          {feed === "Thoughts" && <PostFeed filter={{}} showTitle emptyTitle="The room is quiet" emptyText="Open any movie or series and leave the first lesson, quote or moment." />}
          {feed === "Reviews" && <ReviewList showTitle emptyTitle="No reviews yet" />}
          {feed === "Questions" && <QuestionList showTitle emptyTitle="No questions yet" />}
        </div>
        <aside>
          <h2 className="font-display text-xl">Being talked about this week</h2>
          <ul className="mt-4 space-y-3">
            {(trending.data ?? []).slice(0, 8).map((t) => (
              <li key={t.id}>
                <Link to={t.kind === "movie" ? "/movie/$slug" : "/series/$slug"} params={{ slug: t.slug }} className="flex items-center gap-3 group">
                  <Poster path={t.posterPath} title={t.title} size="w92" className="w-10 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium group-hover:underline">{t.title}</span>
                    <span className="text-xs text-muted-foreground">{t.kind === "movie" ? "Movie" : "Series"}{t.year ? ` · ${t.year}` : ""}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
