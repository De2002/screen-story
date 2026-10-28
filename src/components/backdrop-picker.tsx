import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchCatalog, getTitleDetail, type TitleSummary } from "@/lib/tmdb.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function BackdropPicker({ value, onPick }: { value: string | null; onPick: (path: string | null) => void }) {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [title, setTitle] = useState<TitleSummary | null>(null);
  const results = useQuery({
    queryKey: ["backdrop-search", term],
    enabled: term.length > 0,
    queryFn: () => searchCatalog({ data: { q: term, type: "all" } }),
  });
  const detail = useQuery({
    queryKey: ["backdrop-detail", title?.id],
    enabled: !!title,
    queryFn: () => getTitleDetail({ data: { kind: title!.kind, tmdbId: title!.tmdbId } }),
  });

  return (
    <div className="space-y-3">
      {value && (
        <div className="relative overflow-hidden rounded-lg">
          <img src={`https://image.tmdb.org/t/p/w780${value}`} alt="Your current backdrop" className="aspect-[16/7] w-full object-cover" />
          <Button size="sm" variant="secondary" className="absolute right-2 top-2" onClick={() => onPick(null)}>Remove</Button>
        </div>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setTitle(null); setTerm(q.trim()); }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a movie or series for its scenes" />
        <Button type="submit" variant="outline">Search</Button>
      </form>
      {!title && results.data?.results && (
        <div className="flex flex-wrap gap-2">
          {results.data.results.slice(0, 10).map((r) => (
            <button key={r.id} type="button" onClick={() => setTitle(r)} className="rounded-full border px-3 py-1 text-sm hover:bg-muted">
              {r.title}{r.year ? ` (${r.year})` : ""}
            </button>
          ))}
        </div>
      )}
      {title && (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Scenes from {title.title} · <button type="button" className="underline" onClick={() => setTitle(null)}>back to results</button>
          </p>
          {detail.isLoading && <p className="text-sm text-muted-foreground">Loading scenes…</p>}
          {detail.data && detail.data.backdrops.length === 0 && <p className="text-sm text-muted-foreground">No scenes available for this title.</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {detail.data?.backdrops.map((b) => (
              <button key={b} type="button" onClick={() => onPick(b)} className={`overflow-hidden rounded-md ring-offset-2 ring-offset-background ${b === value ? "ring-2 ring-ember" : "hover:opacity-80"}`}>
                <img src={`https://image.tmdb.org/t/p/w300${b}`} alt={`Scene from ${title.title}`} className="aspect-video w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
