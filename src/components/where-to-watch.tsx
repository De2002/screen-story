import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getWatchProviders, type TitleDetail } from "@/lib/tmdb.functions";

export function WhereToWatch({ title }: { title: TitleDetail }) {
  const providers = useQuery({
    queryKey: ["watch-providers", title.kind, title.tmdbId],
    queryFn: () => getWatchProviders({ data: { kind: title.kind, tmdbId: title.tmdbId } }),
  });

  const list = providers.data?.providers ?? [];
  const link = providers.data?.link ?? null;

  if (providers.isLoading) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-9 shrink-0 rounded-md sm:size-10" />
        ))}
      </div>
    );
  }

  if (providers.isError || list.length === 0) return null;

  const itemClass =
    "shrink-0 transition-transform hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md";

  return (
    <section aria-label={`Where to watch ${title.title}`} className="min-w-0 flex-1">
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {list.map((provider) => (
          <a
            key={provider.name}
            href={link ?? undefined}
            target="_blank"
            rel="noreferrer"
            title={provider.name}
            aria-label={`Watch ${title.title} on ${provider.name}`}
            className={itemClass}
          >
            {provider.logoPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w92${provider.logoPath}`}
                alt=""
                loading="lazy"
                className="size-9 rounded-md bg-card object-cover ring-1 ring-border sm:size-10"
              />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border sm:size-10">
                <Play className="size-4 fill-current" />
              </span>
            )}
          </a>
        ))}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className={`${itemClass} flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground ring-1 ring-border sm:size-10`}
            aria-label="See all watching options on JustWatch"
            title="See all options"
          >
            <span aria-hidden className="text-[10px] font-semibold uppercase tracking-widest">
              All
            </span>
          </a>
        )}
      </div>
    </section>
  );
}
