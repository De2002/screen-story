export type Kind = "movie" | "series";

export function titleKey(kind: Kind, tmdbId: number) {
  return `${kind}-${tmdbId}`;
}

export function slugify(title: string, year: number | null, tmdbId: number) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return [base || "title", year, tmdbId].filter(Boolean).join("-");
}

/** Slugs end with the catalog id, e.g. interstellar-2014-157336 */
export function parseSlug(slug: string): number | null {
  const m = slug.match(/-(\d+)$/) ?? slug.match(/^(\d+)$/);
  return m ? Number(m[1]) : null;
}

export function posterUrl(path: string | null | undefined, size: "w92" | "w185" | "w342" | "w500" | "w780" = "w342") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function noun(kind: Kind) {
  return kind === "movie" ? "movie" : "series";
}

export type TabKey = "lessons" | "quotes" | "reviews" | "questions" | "moments" | "director" | "trailer";

export const TABS: { key: TabKey; label: string; category?: "lesson" | "quote" | "moment" | "trailer_thought" }[] = [
  { key: "lessons", label: "Lessons", category: "lesson" },
  { key: "quotes", label: "Quotes", category: "quote" },
  { key: "reviews", label: "Reviews" },
  { key: "questions", label: "Questions" },
  { key: "moments", label: "Moments", category: "moment" },
  { key: "director", label: "To the Director", category: "trailer_thought" },
  { key: "trailer", label: "Trailer", category: "trailer_thought" },
];

export function placeholderFor(tab: TabKey, kind: Kind) {
  const n = noun(kind);
  switch (tab) {
    case "lessons": return `What did this ${n} teach you?`;
    case "quotes": return "What quote stayed with you?";
    case "reviews": return `What did you think of this ${n}?`;
    case "questions": return `What would you like to ask about this ${n}?`;
    case "moments": return "Which moment stayed with you?";
    case "trailer": return "What do you think of the trailer?";
  }
}

export const CATEGORY_LABEL: Record<string, string> = {
  lesson: "Lesson",
  quote: "Quote",
  moment: "Moment",
  trailer_thought: "Trailer",
};
