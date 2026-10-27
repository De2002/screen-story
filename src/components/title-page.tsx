import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ArrowUpRight, Play } from "lucide-react";
import { TABS, type TabKey } from "@/lib/titles";
import type { TitleDetail } from "@/lib/tmdb.functions";
import { Poster } from "./bits";
import { TitleActions } from "./title-actions";
import { WhereToWatch } from "./where-to-watch";
import { cn } from "@/lib/utils";

const sectionCopy: Record<string, { intro: string; tone: string }> = {
  lessons: {
    intro: "What this story leaves us thinking about life, people, and society.",
    tone: "bg-amber-50/70",
  },
  quotes: {
    intro: "The lines that stayed with us long after the credits rolled.",
    tone: "bg-sky-50/70",
  },
  reviews: {
    intro: "Personal responses and critical takes from people who watched it.",
    tone: "bg-rose-50/70",
  },
  questions: {
    intro: "The things this story makes us curious enough to ask out loud.",
    tone: "bg-violet-50/70",
  },
  moments: {
    intro: "Scenes, events, and turning points that changed the way we saw the story.",
    tone: "bg-emerald-50/70",
  },
  director: {
    intro: "Messages, observations, and questions addressed to the filmmaker.",
    tone: "bg-orange-50/70",
  },
};

export function TitlePage({ t }: { t: TitleDetail; tab?: TabKey }) {
  const [about, setAbout] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const sections = TABS.filter((x) => x.key !== "trailer");

  return (
    <div>
      {t.backdropPath && (
        <div className="relative mx-auto max-w-5xl">
          <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[21/9]">
            <img
              src={`https://image.tmdb.org/t/p/w1280${t.backdropPath}`}
              alt=""
              className="h-full w-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40" />
          </div>
        </div>
      )}
      <main
        className={cn(
          "mx-auto max-w-4xl px-4 pb-12",
          t.backdropPath ? "relative -mt-20 sm:-mt-28" : "pt-8",
        )}
      >
        <header className="flex items-start gap-4 sm:gap-7">
          <div className="min-w-0 flex-1 pt-2">
            <p className="text-xs uppercase tracking-[0.22em] text-ember">
              {t.kind === "movie" ? "Movie" : "Series"}
              {t.year ? ` · ${t.year}` : ""}
            </p>
            <h1 className="mt-2 font-display text-4xl leading-tight sm:text-6xl">{t.title}</h1>
            {t.creators.length > 0 && (
              <p className="mt-3 font-medium">{t.creators.slice(0, 2).join(", ")}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {t.trailerKey && (
                <button
                  onClick={() => setShowTrailer((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-secondary-foreground hover:bg-accent"
                >
                  <Play className="size-3.5 fill-current" />
                  {showTrailer ? "Hide" : "Trailer"}
                </button>
              )}
              {t.runtime && <span>{t.runtime} mins</span>}
              {t.seasons && (
                <span>
                  {t.seasons} season{t.seasons > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <Poster
            path={t.posterPath}
            title={t.title}
            size="w342"
            className="w-28 shrink-0 shadow-lg ring-1 ring-border sm:w-44"
          />
        </header>
        <section className="mt-7 max-w-3xl" aria-labelledby="synopsis-heading">
          <h2 id="synopsis-heading" className="sr-only">Synopsis</h2>
          <p className={cn("font-display text-lg leading-relaxed text-foreground/85", !about && "line-clamp-4")}>
            {t.overview}
          </p>
          <button
            onClick={() => setAbout((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            aria-expanded={about}
          >
            {about ? "Read less" : "Read more"}
            <ChevronDown className={cn("size-4 transition-transform", about && "rotate-180")} />
          </button>
        </section>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <TitleActions title={t} />
          <WhereToWatch title={t} />
        </div>
        {showTrailer && t.trailerKey && (
          <div className="mt-5 aspect-video overflow-hidden rounded-lg bg-muted">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${t.trailerKey}`}
              title={`${t.title} trailer`}
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-ember">The conversation</p>
              <h2 className="mt-1 font-display text-3xl">Go deeper</h2>
            </div>
            <p className="hidden max-w-xs text-right text-sm text-muted-foreground sm:block">
              Choose a thread and see what other viewers took from {t.title}.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map((section) => {
              const copy = sectionCopy[section.key];
              const path = t.kind === "movie" ? "/movie/$slug/$section" : "/series/$slug/$section";
              return (
                <Link
                  key={section.key}
                  to={path}
                  params={{ slug: t.slug, section: section.key }}
                  className={cn(
                    "group rounded-2xl border p-5 transition-transform hover:-translate-y-0.5 hover:border-foreground/30",
                    copy.tone,
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-2xl">{section.label}</h3>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-foreground/70">
                        {section.key === "reviews"
                          ? "Personal opinions and critical assessments."
                          : section.key === "questions"
                            ? "Questions viewers want to explore or discuss."
                            : section.key === "lessons"
                              ? "What the story teaches us about life, people, or society."
                              : section.key === "quotes"
                                ? "Memorable dialogue from the story."
                                : section.key === "moments"
                                  ? "Memorable scenes, events, and turning points."
                                  : "Messages, observations, or questions for the filmmaker."}
                      </p>
                    </div>
                    <ArrowUpRight className="size-5 shrink-0 text-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <p className="mt-5 text-xs font-medium uppercase tracking-widest text-foreground/50">
                    Open {section.label}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
