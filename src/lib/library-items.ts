import { supabase } from "@/integrations/supabase/client";

export type LibraryStatus = "watched" | "want";

// Title detail loading already caches catalog data on the server.
export async function writeLibraryStatus(userId: string, titleId: string, status: LibraryStatus | null) {
  const result = status === null
    ? await supabase.from("library").delete().match({ user_id: userId, title_id: titleId })
    : await supabase.from("library").upsert(
        { user_id: userId, title_id: titleId, status },
        { onConflict: "user_id,title_id" },
      );
  if (result.error) throw result.error;
}