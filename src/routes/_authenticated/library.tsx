import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Page } from "@/components/shell";
import { LibraryGrid } from "@/components/library-grid";
import { CollectionsGrid } from "@/components/collections";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Your library — Scruttin" },
      { name: "description", content: "What you've watched, what you want to watch, and your collections." },
      { property: "og:title", content: "Your library — Scruttin" },
      { property: "og:description", content: "Watched, want to watch, and collections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Library,
});

const TABS = ["Watched", "Want to watch", "My collections", "Saved"] as const;

function Library() {
  const { userId } = Route.useRouteContext();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Watched");
  const saved = useQuery({
    queryKey: ["saved-collections", userId],
    enabled: tab === "Saved",
    queryFn: async () => ((await supabase.from("saved_collections").select("collection_id").eq("user_id", userId)).data ?? []).map((r) => r.collection_id),
  });
  return (
    <Page>
      <h1 className="font-display text-4xl">Your library</h1>
      <div className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("whitespace-nowrap border-b-2 px-3 py-3 text-sm", t === tab ? "border-ember font-medium" : "border-transparent text-muted-foreground")}>{t}</button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "Watched" && <LibraryGrid userId={userId} status="watched" />}
        {tab === "Want to watch" && <LibraryGrid userId={userId} status="want" />}
        {tab === "My collections" && <CollectionsGrid userId={userId} />}
        {tab === "Saved" && saved.data && <CollectionsGrid ids={saved.data} />}
      </div>
    </Page>
  );
}
