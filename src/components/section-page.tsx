import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TABS, noun, type TabKey } from "@/lib/titles";
import type { TitleDetail } from "@/lib/tmdb.functions";
import { Poster } from "./bits";
import { TitleActions } from "./title-actions";
import { PostComposer, QuestionComposer, ReviewComposer } from "./composer";
import { PostFeed, QuestionList, ReviewList, postsKey } from "./feeds";

const copy: Record<
  string,
  {
    label: string;
    intro: string;
    category?: "lesson" | "quote" | "moment" | "trailer_thought";
    tone: string;
  }
> = {
  lessons: {
    label: "Lessons",
    intro: "This is where viewers share what the story taught them about life, people, or society.",
    category: "lesson",
    tone: "bg-amber-50/70",
  },
  quotes: {
    label: "Quotes",
    intro: "This is where memorable dialogue finds a second life through the people who heard it.",
    category: "quote",
    tone: "bg-sky-50/70",
  },
  reviews: {
    label: "Reviews",
    intro: "This is where personal opinions and critical assessments meet in conversation.",
    tone: "bg-rose-50/70",
  },
  questions: {
    label: "Questions",
    intro: "This is where viewers bring the questions they want to explore or discuss.",
    tone: "bg-violet-50/70",
  },
  moments: {
    label: "Moments",
    intro: "This is where memorable scenes, events, and turning points are collected.",
    category: "moment",
    tone: "bg-emerald-50/70",
  },
  director: {
    label: "To the Director",
    intro: "This is where viewers leave messages, observations, or questions for the filmmaker.",
    category: "trailer_thought",
    tone: "bg-orange-50/70",
  },
};

export function SectionPage({ t, section }: { t: TitleDetail; section: string }) {
  const details = copy[section] ?? copy["lessons"];
  const current = TABS.find((x) => x.key === section);
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editingReview, setEditingReview] = useState(false);
  const myReview = useQuery({
    queryKey: ["my-review", t.id, user?.id],
    enabled: !!user && section === "reviews",
    queryFn: async () => {
      if (!user) return null;
      return (
        await supabase
          .from("reviews")
          .select("id, heading, body, spoiler")
          .eq("title_id", t.id)
          .eq("user_id", user.id)
          .maybeSingle()
      ).data;
    },
  });
  const refresh = () => {
    if (details.category)
      qc.invalidateQueries({ queryKey: postsKey({ titleId: t.id, category: details.category }) });
    qc.invalidateQueries({ queryKey: ["reviews"] });
    qc.invalidateQueries({ queryKey: ["questions"] });
    qc.invalidateQueries({ queryKey: ["my-review"] });
  };
  const kindPath = t.kind === "movie" ? "/movie/$slug" : "/series/$slug";

  // Each section gets its own backdrop; index 0 is the main title-page backdrop.
  const pool = t.backdrops?.length ? t.backdrops : t.backdropPath ? [t.backdropPath] : [];
  const sectionIndex = Math.max(0, Object.keys(copy).indexOf(section));
  const chosen = pool.length > 1 ? pool[1 + (sectionIndex % (pool.length - 1))] : pool[0];
  const hasBackdrop = Boolean(chosen);
  const backdropUrl = hasBackdrop ? `https://image.tmdb.org/t/p/w1280${chosen}` : undefined;

  return (
    <main className="min-h-screen">
      <div
        className={`relative overflow-hidden border-b ${hasBackdrop ? "bg-slate-950 text-white" : details.tone}`}
      >
        {backdropUrl && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backdropUrl})` }}
          />
        )}
        {hasBackdrop && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.94)_0%,rgba(3,7,18,0.78)_45%,rgba(3,7,18,0.58)_100%)]"
          />
        )}
        <div className="relative mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <Link
            to={kindPath}
            params={{ slug: t.slug }}
            className={
              hasBackdrop
                ? "inline-flex items-center gap-2 text-sm text-white/75 hover:text-white"
                : "inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            <ArrowLeft className="size-4" /> Back to {t.title}
          </Link>
          <div className="mt-8 flex items-end gap-5">
            <Poster
              path={t.posterPath}
              title={t.title}
              size="w342"
              className="w-24 shrink-0 shadow-md sm:w-32"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-ember">
                {t.kind === "movie" ? "Movie" : "Series"} conversation
              </p>
              <h1 className="mt-2 font-display text-4xl leading-tight sm:text-6xl">
                {details.label}
              </h1>
              <p
                className={
                  hasBackdrop ? "mt-2 text-sm text-white/75" : "mt-2 text-sm text-foreground/65"
                }
              >
                {t.title}
                {t.year ? ` · ${t.year}` : ""}
              </p>
            </div>
          </div>
          <p
            className={
              hasBackdrop
                ? "mt-7 max-w-2xl font-display text-xl leading-relaxed text-white/90"
                : "mt-7 max-w-2xl font-display text-xl leading-relaxed text-foreground/80"
            }
          >
            {details.intro}
          </p>
          <div className="mt-4">
            <TitleActions title={t} />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 pb-16">
        <div className="flex gap-2 overflow-x-auto border-b py-2 text-sm no-scrollbar">
          {Object.entries(copy).map(([key, item]) => (
            <Link
              key={key}
              to={t.kind === "movie" ? "/movie/$slug/$section" : "/series/$slug/$section"}
              params={{ slug: t.slug, section: key }}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 ${key === section ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <section aria-labelledby="feed-heading" className="mt-7">
          <h2 id="feed-heading" className="sr-only">
            {details.label} from viewers
          </h2>
          {details.category && (
            <>
              <PostComposer
                titleId={t.id}
                kind={t.kind}
                category={details.category}
                placeholder={
                  current
                    ? `Share your ${noun(t.kind)} ${details.label.toLowerCase()}`
                    : "Share your thoughts"
                }
                onPosted={refresh}
              />
              <PostFeed
                filter={{ titleId: t.id, category: details.category }}
                emptyTitle={`No ${details.label.toLowerCase()} yet`}
                emptyText={`Be the first to share something about this ${noun(t.kind)}.`}
              />
            </>
          )}
          {section === "reviews" && (
            <>
              <ReviewComposer
                titleId={t.id}
                placeholder={`What did you think of this ${noun(t.kind)}?`}
                existing={editingReview ? myReview.data : null}
                onCancel={editingReview ? () => setEditingReview(false) : undefined}
                onPosted={() => {
                  setEditingReview(false);
                  refresh();
                }}
              />
              <ReviewList titleId={t.id} emptyTitle="No reviews yet" />
            </>
          )}
          {section === "questions" && (
            <>
              <QuestionComposer
                titleId={t.id}
                kind={t.kind}
                placeholder={`What would you like to ask about this ${noun(t.kind)}?`}
                onPosted={refresh}
              />
              <QuestionList titleId={t.id} emptyTitle="No questions yet" />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
