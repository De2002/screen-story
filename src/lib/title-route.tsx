import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { getTitleDetail, type TitleDetail } from "./tmdb.functions";
import { parseSlug, posterUrl, type Kind } from "./titles";

export const tabSearch = z.object({
  tab: z.enum(["lessons", "quotes", "reviews", "questions", "moments", "trailer"]).catch("lessons").default("lessons"),
});

export async function loadTitle(kind: Kind, slug: string) {
  const id = parseSlug(slug);
  if (!id) throw notFound();
  const t = await getTitleDetail({ data: { kind, tmdbId: id } });
  if (!t) throw notFound();
  return t;
}

export function titleHead(t: TitleDetail | undefined) {
  if (!t) return { meta: [
    { title: "Title not found — Scruttin" },
    { name: "description", content: "This movie or series could not be found on Scruttin." },
    { property: "og:title", content: "Title not found — Scruttin" },
    { property: "og:description", content: "This movie or series could not be found on Scruttin." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] };
  const name = `${t.title}${t.year ? ` (${t.year})` : ""}`;
  const desc = `Lessons, quotes, reviews and questions about ${name} from everyday viewers on Scruttin.`;
  const img = posterUrl(t.posterPath, "w780");
  return {
    meta: [
      { title: `${name} — talk about it on Scruttin` },
      { name: "description", content: desc },
      { property: "og:title", content: `${name} on Scruttin` },
      { property: "og:description", content: desc },
      { property: "og:type", content: t.kind === "movie" ? "video.movie" : "video.tv_show" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
    ],
    links: [{ rel: "canonical", href: `/${t.kind}/${t.slug}` }],
  };
}
