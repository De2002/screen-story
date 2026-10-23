import { supabase } from "@/integrations/supabase/client";

/** Repeated additions keep the original position instead of failing or moving it. */
export async function addCollectionItem(collectionId: string, titleId: string, position: number) {
  const { error } = await supabase.from("collection_items").upsert(
    { collection_id: collectionId, title_id: titleId, position },
    { onConflict: "collection_id,title_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}