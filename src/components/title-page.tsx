import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TABS, noun, placeholderFor, type TabKey } from "@/lib/titles";
import type { TitleDetail } from "@/lib/tmdb.functions";
import { Poster } from "./bits";
import { TitleActions } from "./title-actions";
import { PostComposer, QuestionComposer, ReviewComposer } from "./composer";
import { PostFeed, QuestionList, ReviewList, postsKey } from "./feeds";
import { cn } from "@/lib/utils";

export function TitlePage({ t, tab }: { t: TitleDetail; tab: TabKey }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [about, setAbout] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const current = TABS.find((x) => x.key === tab) ?? TABS[0];
  const placeholder = placeholderFor(current.key, t.kind);

  const myReview = useQuery({
    queryKey: ["my-review", t.id, user?.id],
    enabled: !!user && tab === "reviews",
    queryFn: async () => (await supabase.from("reviews").select("id, heading, body, spoiler").eq("title_id", t.id).eq("user_id", user!.id).maybeSingle()).data,
  });
  const [editingReview, setEditingReview] = useState(false);

  const refresh = () => {
    if (current.category) qc.invalidateQueries({ queryKey: postsKey({ titleId: t.id, category: current.category }) });
    qc.invalidateQueries({ queryKey: ["reviews"] });
    qc.invalidateQueries({ queryKey: ["questions"] });
    qc.invalidateQueries({ queryKey: ["my-review"] });
    qc.invalidateQueries({ queryKey: postsKey({}) });
  };

  return (
    <div>
      {t.backdropPath && (
        <div className="relative mx-auto max-w-5xl">
          <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[21/9]">
            <img src={`https://image.tmdb.org/t/p/w1280${t.backdropPath}`} alt="" className="h-full w-full object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40" />
          </div>
        </div>
      )}
    <div className={cn("mx-auto max-w-3xl px-4 pb-6", t.backdropPath ? "relative -mt-20 sm:-mt-28" : "pt-6")}>
      <header className="flex items-start gap-4 sm:gap-6">
        <div className="min-w-0 flex-1 pt-2">
          <h1 className="font-display text-3xl leading-tight drop-shadow-sm sm:text-5xl">{t.title}</h1>
          <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
            {t.kind === "movie" ? "Movie" : "Series"}{t.year ? ` · ${t.year}` : ""}{t.creators.length > 0 ? ` · ${t.kind === "movie" ? "Directed by" : "Created by"}` : ""}
          </p>
          {t.creators.length > 0 && <p className="mt-1 font-medium">{t.creators.slice(0, 2).join(", ")}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {t.trailerKey && (
              <button onClick={() => setShowTrailer((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-secondary-foreground hover:bg-accent">
                <Play className="size-3.5 fill-current" /> {showTrailer ? "Hide" : "Trailer"}
              </button>
            )}
            {t.runtime && <span className="text-muted-foreground">{t.runtime} mins</span>}
            {t.seasons && <span className="text-muted-foreground">{t.seasons} season{t.seasons > 1 ? "s" : ""}</span>}
          </div>
          {t.genres.length > 0 && <p className="mt-3 text-sm text-muted-foreground">{t.genres.join(" · ")}</p>}
        </div>
        <Poster path={t.posterPath} title={t.title} size="w342" className="w-28 shrink-0 shadow-lg ring-1 ring-border sm:w-44" />
      </header>

      <p className={cn("mt-6 font-display text-lg leading-relaxed text-foreground/85", !about && "line-clamp-4")}>{t.overview}</p>
      <div className="mt-4"><TitleActions titleId={t.id} /></div>

      <div className="mt-5 flex flex-wrap gap-4 text-sm">
        <button onClick={() => setAbout((v) => !v)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" aria-expanded={about}>
          {about ? "Less" : "More details"} <ChevronDown className={cn("size-4 transition-transform", about && "rotate-180")} />
        </button>
      </div>
      {showTrailer && t.trailerKey && (
        <div className="mt-4 aspect-video overflow-hidden rounded-lg bg-muted">
          <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${t.trailerKey}`} title={`${t.title} trailer`} allow="encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      )}
      {about && (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t pt-4 text-sm">
          {t.tagline && <><dt className="text-muted-foreground">Tagline</dt><dd className="italic">{t.tagline}</dd></>}
          {t.creators.length > 0 && <><dt className="text-muted-foreground">{t.kind === "movie" ? "Director" : "Created by"}</dt><dd>{t.creators.join(", ")}</dd></>}
          {t.cast.length > 0 && <><dt className="text-muted-foreground">Cast</dt><dd>{t.cast.map((c: { name: string }) => c.name).join(", ")}</dd></>}
          {t.runtime && <><dt className="text-muted-foreground">Runtime</dt><dd>{t.runtime} min</dd></>}
          {t.seasons && <><dt className="text-muted-foreground">Seasons</dt><dd>{t.seasons} ({t.episodes} episodes)</dd></>}
          {t.status && <><dt className="text-muted-foreground">Status</dt><dd>{t.status}</dd></>}
        </dl>
      )}

      <nav className="no-scrollbar sticky top-14 z-30 -mx-4 mt-8 flex gap-1 overflow-x-auto border-b bg-background px-4" aria-label="Community">
        {TABS.map((x) => (
          <Link key={x.key} to="." search={{ tab: x.key }} replace resetScroll={false}
            className={cn("whitespace-nowrap border-b-2 px-3 py-3 text-sm", x.key === current.key ? "border-ember font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {x.label}
          </Link>
        ))}
      </nav>

      <section aria-label={current.label}>
        {current.category && (
          <>
            <PostComposer key={current.key} titleId={t.id} kind={t.kind} category={current.category} placeholder={placeholder} onPosted={refresh} />
            <PostFeed filter={{ titleId: t.id, category: current.category }} emptyTitle={`No ${current.label.toLowerCase()} yet`} emptyText={`Be the first to share something about this ${noun(t.kind)}.`} />
          </>
        )}
        {current.key === "reviews" && (
          <>
            {myReview.data && !editingReview ? (
              <div className="flex items-center justify-between border-b py-4 text-sm">
                <span className="text-muted-foreground">You've reviewed this {noun(t.kind)}.</span>
                <div className="flex gap-4">
                  <Link to="/reviews/$id" params={{ id: myReview.data.id }} className="text-ember">View</Link>
                  <button className="text-ember" onClick={() => setEditingReview(true)}>Edit</button>
                </div>
              </div>
            ) : (
              <ReviewComposer titleId={t.id} placeholder={placeholder} existing={editingReview ? myReview.data : null}
                onCancel={editingReview ? () => setEditingReview(false) : undefined}
                onPosted={() => { setEditingReview(false); refresh(); }} />
            )}
            <ReviewList titleId={t.id} emptyTitle="No reviews yet" />
          </>
        )}
        {current.key === "questions" && (
          <>
            <QuestionComposer titleId={t.id} kind={t.kind} placeholder={placeholder} onPosted={refresh} />
            <QuestionList titleId={t.id} emptyTitle="No questions yet" />
          </>
        )}
      </section>
    </div>
    </div>
  );
}
