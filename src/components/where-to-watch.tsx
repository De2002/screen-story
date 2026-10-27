import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Play, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { getWatchProviders, type TitleDetail } from "@/lib/tmdb.functions";

export function WhereToWatch({ title }: { title: TitleDetail }) {
  const [open, setOpen] = useState(false);
  const providers = useQuery({
    queryKey: ["watch-providers", title.kind, title.tmdbId],
    enabled: open,
    queryFn: () => getWatchProviders({ data: { kind: title.kind, tmdbId: title.tmdbId } }),
  });

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="sm" variant="outline"><Play data-icon="inline-start" /> Where to watch</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="mx-auto w-full max-w-2xl px-4">
          <DrawerTitle className="font-display text-2xl">Where to watch {title.title}</DrawerTitle>
          <DrawerDescription>Streaming availability from TMDB. Availability can vary by country.</DrawerDescription>
        </DrawerHeader>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-8">
          {providers.isLoading && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>}
          {providers.isError && <p className="text-sm text-muted-foreground">Streaming options are unavailable right now.</p>}
          {!providers.isLoading && !providers.isError && providers.data?.providers.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center"><Radio className="text-muted-foreground" /><p className="text-sm text-muted-foreground">No streaming options found for this title.</p></div>
          )}
          {!!providers.data?.providers.length && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{providers.data.providers.map((provider) => (
            <a key={provider.name} href={provider.link ?? undefined} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent">
              {provider.logoPath ? <img src={`https://image.tmdb.org/t/p/w92${provider.logoPath}`} alt="" className="size-10 rounded-lg" /> : <div className="flex size-10 items-center justify-center rounded-lg bg-muted"><Play data-icon="inline-start" /></div>}
              <span className="text-sm font-medium">{provider.name}</span><ExternalLink data-icon="inline-end" className="ml-auto shrink-0 text-muted-foreground" />
            </a>
          ))}</div>}
          {!!providers.data?.link && <a href={providers.data.link} target="_blank" rel="noreferrer" className="text-center text-xs text-muted-foreground underline underline-offset-4">See all options on JustWatch</a>}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
