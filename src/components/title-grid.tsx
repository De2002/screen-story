import { Link } from "@tanstack/react-router";
import { Poster } from "./bits";

type T = { id: string; kind: "movie" | "series"; slug: string; title: string; year: number | null; posterPath: string | null };

export function TitleGrid({ items, className = "grid-cols-3 sm:grid-cols-4 md:grid-cols-6" }: { items: T[]; className?: string }) {
  return (
    <ul className={`grid gap-x-3 gap-y-5 ${className}`}>
      {items.map((t) => (
        <li key={t.id}>
          <Link to={t.kind === "movie" ? "/movie/$slug" : "/series/$slug"} params={{ slug: t.slug }} className="group block">
            <Poster path={t.posterPath} title={t.title} size="w185" className="transition-opacity group-hover:opacity-90" />
            <p className="mt-1.5 truncate text-sm font-medium">{t.title}</p>
            <p className="text-xs text-muted-foreground">{t.kind === "movie" ? "Movie" : "Series"}{t.year ? ` · ${t.year}` : ""}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
