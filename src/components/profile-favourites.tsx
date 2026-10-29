import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Search } from "lucide-react";
import { toast } from "sonner";
import { favouriteOptions, writeFavourite } from "@/lib/profile-favourites";
import { searchCatalog, type TitleSummary } from "@/lib/tmdb.functions";
import { useDebounced } from "@/components/search-box";
import { Poster } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ProfileFavourites({ userId, editable = false }: { userId: string; editable?: boolean }) {
  const qc = useQueryClient();
  const favourites = useQuery(favouriteOptions(userId));
  const [slot, setSlot] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const term = useDebounced(query.trim());
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const results = useQuery({
    queryKey: ["favourite-search", term],
    enabled: editable && slot !== null && term.length >= 2,
    queryFn: () => searchCatalog({ data: { q: term, type: "all" } }),
  });
  const save = async (index: number, title: TitleSummary | null) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      await writeFavourite(userId, index, title);
      await qc.invalidateQueries({ queryKey: favouriteOptions(userId).queryKey });
      setSlot(null);
      setQuery("");
      toast.success(title ? "Favourite updated" : "Favourite removed");
    } catch (error) {
      toast.error((error as { code?: string }).code === "23505" ? "That title is already in your Favourite Four." : "Couldn't save your favourites. Please try again.");
    } finally { busy.current = false; setPending(false); }
  };
  if (!editable && !favourites.data?.length) return null;
  return (
    <section aria-label="Favourite Four" className="mt-6">
      <h2 className="mb-3 font-display text-xl">Favourite Four</h2>
      {favourites.isError ? <p className="text-sm text-destructive">Couldn't load favourites. <Button variant="link" onClick={() => favourites.refetch()}>Retry</Button></p> : (
        <div className="grid max-w-lg grid-cols-4 gap-2 sm:gap-3">
          {[0, 1, 2, 3].map((index) => {
            const title = favourites.data?.find((f) => f.slot === index)?.title;
            return <div key={index} className="relative min-w-0">
              {editable ? (
                <Button variant="ghost" disabled={pending || favourites.isLoading} aria-label={title ? `Replace favourite ${index + 1}: ${title.title}` : `Choose favourite ${index + 1}`} onClick={() => { setQuery(""); setSlot(index); }} className="block h-auto w-full overflow-hidden rounded-md p-0">
                  {title ? <Poster path={title.poster_path} title={title.title} /> : <span className="flex aspect-[2/3] w-full items-center justify-center rounded-md border border-dashed bg-muted/40"><Plus className="size-5 text-muted-foreground" /></span>}
                </Button>
              ) : title ? (
                <Link to={title.kind === "movie" ? "/movie/$slug" : "/series/$slug"} params={{ slug: title.slug }} title={`${title.title}${title.year ? ` (${title.year})` : ""}`} className="block rounded-md transition-opacity hover:opacity-80"><Poster path={title.poster_path} title={title.title} /></Link>
              ) : <div className="aspect-[2/3]" />}
              {editable && title && <Button variant="secondary" size="icon" disabled={pending} onClick={() => save(index, null)} aria-label={`Remove ${title.title} from favourites`} title={`Remove ${title.title}`} className="absolute right-1 top-1 size-7"><X className="size-3.5" /></Button>}
            </div>;
          })}
        </div>
      )}
      <Dialog open={slot !== null} onOpenChange={(open) => { if (!open && !pending) setSlot(null); }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Choose favourite {slot === null ? "" : slot + 1}</DialogTitle><DialogDescription>Movies &amp; series</DialogDescription></DialogHeader>
          <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search favourites" placeholder="Search movies and series" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" disabled={pending} /></div>
          {term.length >= 2 && results.isFetching && <p className="text-sm text-muted-foreground">Searching…</p>}
          {(results.isError || results.data?.error) && <p className="text-sm text-destructive">Search is unavailable. Please try again.</p>}
          {term.length >= 2 && !results.isFetching && results.data && !results.data.error && !results.data.results.length && <p className="text-sm text-muted-foreground">No titles found.</p>}
          <div className="space-y-1">
            {term.length >= 2 && results.data?.results.map((title) => {
              const selected = favourites.data?.some((f) => f.title?.id === title.id);
              return <Button key={title.id} variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-2 text-left" disabled={pending || selected} onClick={() => { if (slot !== null) save(slot, title); }}>
                <Poster path={title.posterPath} title={title.title} size="w92" className="w-9 shrink-0" />
                <span className="min-w-0 whitespace-normal"><span className="block">{title.title}</span><span className="text-xs text-muted-foreground">{title.kind === "movie" ? "Movie" : "Series"}{title.year ? ` · ${title.year}` : ""}{selected ? " · Selected" : ""}</span></span>
              </Button>;
            })}
          </div>
          {pending && <p role="status" className="text-sm text-muted-foreground">Saving…</p>}
        </DialogContent>
      </Dialog>
    </section>
  );
}