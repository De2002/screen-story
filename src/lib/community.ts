import { supabase } from "@/integrations/supabase/client";

export const PAGE = 15;
export const AUTHOR = "author:profiles!inner(id, username, display_name, avatar_url)";
export const TITLE = "title:titles(id, kind, slug, title, year, poster_path)";

export type Author = { id: string; username: string; display_name: string; avatar_url: string | null };
export type TitleRef = { id: string; kind: "movie" | "series"; slug: string; title: string; year: number | null; poster_path: string | null };

export type Post = {
  id: string; title_id: string; user_id: string; category: "lesson" | "quote" | "moment" | "trailer_thought";
  body: string; quote_character: string | null; explanation: string | null; spoiler: boolean;
  season: number | null; episode: number | null; like_count: number; reply_count: number;
  removed: boolean; created_at: string; author: Author; title: TitleRef | null;
};

export type Review = {
  id: string; title_id: string; user_id: string; heading: string | null; body: string; spoiler: boolean;
  like_count: number; reply_count: number; removed: boolean; created_at: string; updated_at: string;
  author: Author; title: TitleRef | null;
};

export type Question = {
  id: string; title_id: string; user_id: string; question: string; details: string | null; spoiler: boolean;
  season: number | null; episode: number | null;
  answer_count: number; like_count: number; removed: boolean; created_at: string; author: Author; title: TitleRef | null;
};

export type Answer = {
  id: string; question_id: string; user_id: string; body: string; spoiler: boolean; helpful: boolean;
  like_count: number; reply_count: number; removed: boolean; created_at: string; author: Author;
};

export type Reply = {
  id: string; parent_type: string; parent_id: string; user_id: string; body: string; spoiler: boolean;
  removed: boolean; created_at: string; author: Author;
};

export type TargetType = "post" | "review" | "question" | "answer";

export async function fetchMyLikes(userId: string | undefined, type: TargetType, ids: string[]) {
  if (!userId || ids.length === 0) return new Set<string>();
  const { data } = await supabase.from("likes").select("target_id").eq("user_id", userId).eq("target_type", type).in("target_id", ids);
  return new Set((data ?? []).map((d) => d.target_id));
}

export function collectionSlug(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "collection";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}
