import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Page } from "@/components/shell";
import { Empty, UserAvatar } from "@/components/bits";
import { FeedSkeleton, PostFeed, QuestionList, ReviewList } from "@/components/feeds";
import { CollectionsGrid } from "@/components/collections";
import { LibraryGrid } from "@/components/library-grid";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Scruttin` },
      { name: "description", content: `What @${params.username} has been watching and saying on Scruttin.` },
      { property: "og:title", content: `@${params.username} on Scruttin` },
      { property: "og:description", content: "Thoughts, reviews, questions and collections." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

const TABS = ["Thoughts", "Reviews", "Questions", "Watched", "Collections"] as const;

function Profile() {
  const { username } = Route.useParams();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Thoughts");
  const q = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("username", username).maybeSingle()).data,
  });
  if (q.isLoading) return <Page narrow><FeedSkeleton /></Page>;
  const p = q.data;
  if (!p) return <Page narrow><Empty title="No one here by that name" /></Page>;
  return (
    <Page narrow>
      {p.backdrop_path && (
        <div className="relative -mx-4 -mt-6 mb-[-3rem] h-56 overflow-hidden sm:-mx-8 sm:h-72 sm:rounded-b-xl">
          <img src={`https://image.tmdb.org/t/p/w1280${p.backdrop_path}`} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />
        </div>
      )}
      <div className="relative flex items-center gap-4">
        <UserAvatar author={p} size={64} />
        <div>
          <h1 className="font-display text-3xl">{p.display_name || p.username}</h1>
          <p className="text-sm text-muted-foreground">@{p.username} · joined {format(new Date(p.created_at), "MMM yyyy")}</p>
        </div>
      </div>
      {p.bio && <p className="mt-4 text-[15px] leading-relaxed">{p.bio}</p>}
      <div className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("whitespace-nowrap border-b-2 px-3 py-3 text-sm", t === tab ? "border-ember font-medium" : "border-transparent text-muted-foreground")}>{t}</button>
        ))}
      </div>
      {tab === "Thoughts" && <PostFeed filter={{ userId: p.id }} showTitle emptyTitle="Nothing shared yet" />}
      {tab === "Reviews" && <ReviewList userId={p.id} showTitle emptyTitle="No reviews yet" />}
      {tab === "Questions" && <QuestionList userId={p.id} showTitle emptyTitle="No questions yet" />}
      {tab === "Watched" && <div className="mt-6"><LibraryGrid userId={p.id} status="watched" /></div>}
      {tab === "Collections" && <div className="mt-6"><CollectionsGrid userId={p.id} /></div>}
    </Page>
  );
}
