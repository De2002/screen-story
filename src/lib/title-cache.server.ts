import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type TitleRow = {
  id: string; kind: string; tmdb_id: number; slug: string; title: string;
  year: number | null; poster_path: string | null; genres: string[];
};

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/**
 * Saves catalog info so community rows (library, collections, posts) can reference it.
 * Uses the admin key where the host provides it (Lovable hosting); otherwise falls back
 * to the insert-only cache_title function so self-hosted deployments still work.
 */
export async function cacheTitle(row: TitleRow) {
  if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("titles").upsert({ ...row, updated_at: new Date().toISOString() });
    if (!error) return;
    console.error("title cache (admin) failed", error);
  }
  const { error } = await publicClient().rpc("cache_title", {
    _id: row.id, _kind: row.kind, _tmdb_id: row.tmdb_id, _slug: row.slug, _title: row.title,
    _year: row.year as number, _poster_path: row.poster_path as string, _genres: row.genres,
  });
  if (error) throw error;
}
