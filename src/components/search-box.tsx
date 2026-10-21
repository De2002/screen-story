import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { searchCatalog, type TitleSummary } from "@/lib/tmdb.functions";
import { Poster } from "./bits";
import { cn } from "@/lib/utils";

export function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function SearchBox({ autoFocus, initial = "", className }: { autoFocus?: boolean; initial?: string; className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TitleSummary[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const dq = useDebounced(q.trim(), 220);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dq.length < 2) { setItems([]); return; }
    let cancel = false;
    setLoading(true);
    searchCatalog({ data: { q: dq, type: "all" } }).then((r) => {
      if (!cancel) { setItems(r.results.slice(0, 7)); setActive(-1); setLoading(false); }
    });
    return () => { cancel = true; };
  }, [dq]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const go = (s: TitleSummary) => {
    setOpen(false);
    navigate({ to: s.kind === "movie" ? "/movie/$slug" : "/series/$slug", params: { slug: s.slug } });
  };
  const submit = () => {
    if (active >= 0 && items[active]) return go(items[active]);
    if (q.trim().length >= 2) { setOpen(false); navigate({ to: "/search", search: { q: q.trim(), type: "all" } }); }
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 focus-within:ring-1 focus-within:ring-ring">
        <Search className="size-4 text-muted-foreground" />
        <input
          role="combobox" aria-expanded={open && items.length > 0} aria-controls="search-suggestions" aria-label="Search movies and series"
          autoFocus={autoFocus} value={q} placeholder="Search a movie, series, actor, genre…"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
            else if (e.key === "Enter") { e.preventDefault(); submit(); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        {q && <button aria-label="Clear" onClick={() => { setQ(""); setItems([]); }}><X className="size-4 text-muted-foreground" /></button>}
      </div>
      {open && dq.length >= 2 && (
        <ul id="search-suggestions" role="listbox" className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-lg border bg-popover shadow-lg">
          {items.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button onMouseEnter={() => setActive(i)} onClick={() => go(s)} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left", i === active && "bg-accent")}>
                <Poster path={s.posterPath} title={s.title} size="w92" className="w-8 shrink-0 rounded-sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{s.title}</span>
                  <span className="text-xs text-muted-foreground">{s.kind === "movie" ? "Movie" : "Series"}{s.year ? ` · ${s.year}` : ""}</span>
                </span>
              </button>
            </li>
          ))}
          {!loading && items.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">Nothing found for “{dq}”. Try fewer words.</li>}
          {items.length > 0 && (
            <li><button onClick={submit} className="w-full border-t px-4 py-2.5 text-left text-sm text-ember">See all results for “{q.trim()}”</button></li>
          )}
        </ul>
      )}
    </div>
  );
}
