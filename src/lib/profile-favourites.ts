import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureTitles, type TitleSummary } from "@/lib/tmdb.functions";

export function validateFavouriteSlot(slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 3) throw new Error("Choose one of the four favourite slots.");
}

export function favouriteOptions(userId: string) {
  return queryOptions({
    queryKey: ["profile-favourites", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profile_favourites")
        .select("slot, title:titles(id,kind,slug,title,year,poster_path)")
        .eq("user_id", userId).order("slot");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function writeFavourite(userId: string, slot: number, title: TitleSummary | null) {
  validateFavouriteSlot(slot);
  if (!title) {
    const { error } = await supabase.from("profile_favourites").delete().match({ user_id: userId, slot });
    if (error) throw error;
    return;
  }
  await ensureTitles({ data: { items: [{ kind: title.kind, tmdbId: title.tmdbId }] } });
  const { error } = await supabase.from("profile_favourites").upsert(
    { user_id: userId, slot, title_id: title.id }, { onConflict: "user_id,slot" },
  );
  if (error) throw error;
}