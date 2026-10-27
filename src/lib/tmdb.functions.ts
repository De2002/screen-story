import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { slugify, titleKey, type Kind } from "./titles";

const API = "https://api.themoviedb.org/3";

async function tmdb(path: string, params: Record<string, string | number | undefined> = {}) {
  const key = process.env["TMDB_API_KEY"];
  if (!key) throw new Error("Movie catalog is not configured");
  const url = new URL(API + path);
  url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Catalog request failed (${res.status})`);
  return res.json() as Promise<any>;
}

export type TitleSummary = {
  id: string;
  kind: Kind;
  tmdbId: number;
  slug: string;
  title: string;
  year: number | null;
  posterPath: string | null;
  overview: string;
};

function toSummary(r: any, forcedKind?: Kind): TitleSummary | null {
  const mt = forcedKind ?? (r.media_type === "tv" ? "series" : r.media_type === "movie" ? "movie" : null);
  if (!mt) return null;
  const title = r.title ?? r.name;
  if (!title) return null;
  const date = r.release_date ?? r.first_air_date;
  const year = date ? Number(String(date).slice(0, 4)) || null : null;
  return {
    id: titleKey(mt, r.id),
    kind: mt,
    tmdbId: r.id,
    slug: slugify(title, year, r.id),
    title,
    year,
    posterPath: r.poster_path ?? null,
    overview: r.overview ?? "",
  };
}

const GENRES: Record<string, { movie?: number; tv?: number }> = {
  action: { movie: 28, tv: 10759 }, adventure: { movie: 12, tv: 10759 }, animation: { movie: 16, tv: 16 },
  comedy: { movie: 35, tv: 35 }, crime: { movie: 80, tv: 80 }, documentary: { movie: 99, tv: 99 },
  drama: { movie: 18, tv: 18 }, family: { movie: 10751, tv: 10751 }, fantasy: { movie: 14, tv: 10765 },
  history: { movie: 36 }, horror: { movie: 27 }, music: { movie: 10402 }, mystery: { movie: 9648, tv: 9648 },
  romance: { movie: 10749 }, "science fiction": { movie: 878, tv: 10765 }, "sci-fi": { movie: 878, tv: 10765 },
  thriller: { movie: 53 }, war: { movie: 10752, tv: 10768 }, western: { movie: 37, tv: 37 },
};

function score(s: TitleSummary, q: string, pop: number) {
  const t = s.title.toLowerCase();
  let v = Math.log10(1 + pop);
  if (t === q) v += 10;
  else if (t.startsWith(q)) v += 5;
  else if (t.includes(q)) v += 2;
  return v;
}

export const searchCatalog = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().min(1).max(100), type: z.enum(["all", "movie", "series"]).default("all") }).parse(d))
  .handler(async ({ data }) => {
    let q = data.q.trim();
    let year: number | undefined;
    const ym = q.match(/\b(19|20)\d{2}\b$/);
    if (ym) { year = Number(ym[0]); q = q.replace(ym[0], "").trim() || q; }
    const lower = q.toLowerCase();
    const pool = new Map<string, { s: TitleSummary; pop: number; via?: string }>();
    const add = (r: any, kind?: Kind, via?: string) => {
      const s = toSummary(r, kind);
      if (!s) return;
      if (data.type !== "all" && s.kind !== data.type) return;
      if (year && s.year !== year) return;
      if (!pool.has(s.id)) pool.set(s.id, { s, pop: r.popularity ?? 0, via });
    };
    try {
      const pages = await Promise.all([
        tmdb("/search/multi", { query: q, include_adult: "false" }),
        tmdb("/search/multi", { query: q, include_adult: "false", page: 2 }).catch(() => ({ results: [] })),
      ]);
      for (const p of pages) for (const r of p.results ?? []) {
        if (r.media_type === "person") {
          for (const k of r.known_for ?? []) add(k, undefined, r.name);
        } else add(r);
      }
      // Fuzzy fallback for misspellings: try trimmed / shortened queries
      if (pool.size < 3 && q.length > 4) {
        const variants = [q.slice(0, -1), q.slice(0, Math.ceil(q.length * 0.6)), q.replace(/(.)\1+/g, "$1")];
        for (const v of variants) {
          const r = await tmdb("/search/multi", { query: v }).catch(() => ({ results: [] }));
          for (const x of r.results ?? []) if (x.media_type !== "person") add(x);
          if (pool.size >= 5) break;
        }
      }
      const g = GENRES[lower];
      if (g) {
        const [m, t] = await Promise.all([
          g.movie && data.type !== "series" ? tmdb("/discover/movie", { with_genres: g.movie, sort_by: "popularity.desc", primary_release_year: year }) : null,
          g.tv && data.type !== "movie" ? tmdb("/discover/tv", { with_genres: g.tv, sort_by: "popularity.desc", first_air_date_year: year }) : null,
        ]);
        for (const r of m?.results ?? []) add(r, "movie", "genre");
        for (const r of t?.results ?? []) add(r, "series", "genre");
      }
      const results = [...pool.values()]
        .sort((a, b) => score(b.s, lower, b.pop) - score(a.s, lower, a.pop))
        .slice(0, 24)
        .map((x) => ({ ...x.s, via: x.via ?? null }));
      return { results, error: null as string | null };
    } catch (e) {
      console.error(e);
      return { results: [], error: "Search is unavailable right now." };
    }
  });

export const getTrending = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ kind: z.enum(["all", "movie", "series"]).default("all") }).parse(d))
  .handler(async ({ data }) => {
    try {
      const path = data.kind === "movie" ? "/trending/movie/week" : data.kind === "series" ? "/trending/tv/week" : "/trending/all/week";
      const r = await tmdb(path);
      const forced = data.kind === "movie" ? "movie" : data.kind === "series" ? "series" : undefined;
      return (r.results ?? []).map((x: any) => toSummary(x, forced as Kind | undefined)).filter(Boolean) as TitleSummary[];
    } catch (e) {
      console.error(e);
      return [] as TitleSummary[];
    }
  });

export const getTitleDetail = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ kind: z.enum(["movie", "series"]), tmdbId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const path = data.kind === "movie" ? `/movie/${data.tmdbId}` : `/tv/${data.tmdbId}`;
    let r: any;
    try {
      r = await tmdb(path, { append_to_response: "credits,videos" });
    } catch {
      return null;
    }
    const s = toSummary(r, data.kind)!;
    const videos = (r.videos?.results ?? []).filter((v: any) => v.site === "YouTube");
    const trailer = videos.find((v: any) => v.type === "Trailer" && v.official) ?? videos.find((v: any) => v.type === "Trailer") ?? videos[0];
    const crew = r.credits?.crew ?? [];
    const creators = data.kind === "series"
      ? (r.created_by ?? []).map((c: any) => c.name)
      : crew.filter((c: any) => c.job === "Director").map((c: any) => c.name);
    const detail = {
      ...s,
      genres: (r.genres ?? []).map((g: any) => g.name as string),
      overview: r.overview ?? "",
      tagline: r.tagline ?? "",
      runtime: r.runtime ?? (r.episode_run_time?.[0] ?? null),
      seasons: r.number_of_seasons ?? null,
      episodes: r.number_of_episodes ?? null,
      backdropPath: r.backdrop_path ?? null,
      trailerKey: trailer?.key ?? null,
      creators: creators as string[],
      cast: (r.credits?.cast ?? []).slice(0, 8).map((c: any) => ({ name: c.name as string, character: c.character as string })),
      language: r.original_language ?? null,
      status: r.status ?? null,
    };
    // cache into titles table for community joins
    try {
      const { cacheTitle } = await import("./title-cache.server");
      await cacheTitle({
        id: s.id, kind: s.kind, tmdb_id: s.tmdbId, slug: s.slug, title: s.title, year: s.year,
        poster_path: s.posterPath, genres: detail.genres,
      });
    } catch (e) {
      console.error("title cache failed", e);
    }
    return detail;
  });

export type TitleDetail = NonNullable<Awaited<ReturnType<typeof getTitleDetail>>>;

export type WatchProvider = {
  name: string;
  logoPath: string | null;
  link: string | null;
};

export const getWatchProviders = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ kind: z.enum(["movie", "series"]), tmdbId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const path = data.kind === "movie" ? `/movie/${data.tmdbId}/watch/providers` : `/tv/${data.tmdbId}/watch/providers`;
      const r = await tmdb(path);
      const us = r.results?.US ?? r.results?.GB ?? Object.values(r.results ?? {})[0] ?? {};
      const providers = [
        ...(us.flatrate ?? []),
        ...(us.free ?? []),
        ...(us.ads ?? []),
        ...(us.rent ?? []),
        ...(us.buy ?? []),
      ];
      const seen = new Set<string>();
      return {
        region: r.results?.US ? "US" : r.results?.GB ? "GB" : null,
        link: us.link ?? null,
        providers: providers.filter((p: any) => {
          if (seen.has(p.provider_id)) return false;
          seen.add(p.provider_id);
          return true;
        }).map((p: any) => ({ name: p.provider_name, logoPath: p.logo_path ?? null, link: us.link ?? null })) as WatchProvider[],
      };
    } catch (e) {
      console.error(e);
      return { region: null, link: null, providers: [] as WatchProvider[] };
    }
  });

export const ensureTitles = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ items: z.array(z.object({ kind: z.enum(["movie", "series"]), tmdbId: z.number().int() })).max(5) }).parse(d))
  .handler(async ({ data }) => {
    const { cacheTitle } = await import("./title-cache.server");
    for (const it of data.items) {
      const r = await tmdb(it.kind === "movie" ? `/movie/${it.tmdbId}` : `/tv/${it.tmdbId}`).catch(() => null);
      if (!r) continue;
      const s = toSummary(r, it.kind)!;
      await cacheTitle({
        id: s.id, kind: s.kind, tmdb_id: s.tmdbId, slug: s.slug, title: s.title, year: s.year,
        poster_path: s.posterPath, genres: (r.genres ?? []).map((g: any) => g.name),
      });
    }
    return { ok: true };
  });
