import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TitleGrid } from "./title-grid";
import { Empty } from "./bits";
import { FeedSkeleton } from "./feeds";

export function LibraryGrid({ userId, status }: { userId: string; status: "watched" | "want" }) {
  const q = useQuery({
    queryKey: ["library", userId, status],
    queryFn: async () => {
      const { data } = await supabase.from("library").select("created_at, title:titles(id, kind, slug, title, year, poster_path)")
        .eq("user_id", userId).eq("status", status).order("created_at", { ascending: false }).limit(200);
      return (data ?? []).map((d: any) => ({ ...d.title, posterPath: d.title.poster_path }));
    },
  });
  if (q.isLoading) return <FeedSkeleton />;
  if (!q.data?.length) return <Empty title={status === "watched" ? "Nothing marked watched yet" : "Nothing on the list yet"} />;
  return <TitleGrid items={q.data} className="grid-cols-3 sm:grid-cols-5" />;
}
