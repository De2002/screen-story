import { useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type TabKey } from "@/lib/titles";
import type { TitleDetail } from "@/lib/tmdb.functions";
import { Poster } from "./bits";
import { TitleActions } from "./title-actions";
import { WhereToWatch } from "./where-to-watch";
import { cn } from "@/lib/utils";
import { SectionIndex } from "./section-index";

export function TitlePage({ t }: { t: TitleDetail; tab?: TabKey }) {
  const [about, setAbout] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

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
                  onClick={() => setShowTrailer(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-secondary-foreground hover:bg-accent"
                >
                  <Play className="size-3.5 fill-current" />
                  Trailer
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
          <h2 id="synopsis-heading" className="sr-only">
            Synopsis
          </h2>
          <p
            className={cn(
              "font-display text-lg leading-relaxed text-foreground/85",
              !about && "line-clamp-4",
            )}
          >
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
        {t.trailerKey && (
          <>
            <div className="hidden sm:block">
              <Dialog open={showTrailer} onOpenChange={setShowTrailer}>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl">{t.title} trailer</DialogTitle>
                    <DialogDescription>
                      Watch the trailer before joining the conversation.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                    <iframe
                      className="h-full w-full"
                      src={`https://www.youtube-nocookie.com/embed/${t.trailerKey}`}
                      title={`${t.title} trailer`}
                      allow="encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="sm:hidden">
              <Drawer open={showTrailer} onOpenChange={setShowTrailer}>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle className="font-display text-2xl">{t.title} trailer</DrawerTitle>
                    <DrawerDescription>
                      Watch the trailer before joining the conversation.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4 pb-6">
                    <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                      <iframe
                        className="h-full w-full"
                        src={`https://www.youtube-nocookie.com/embed/${t.trailerKey}`}
                        title={`${t.title} trailer`}
                        allow="encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </>
        )}
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-ember">The conversation</p>
              <h2 className="mt-1 font-display text-3xl">Go deeper</h2>
            </div>
          </div>
          <SectionIndex title={t} />
        </section>
      </main>
    </div>
  );
}
