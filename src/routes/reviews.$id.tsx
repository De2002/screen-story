import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AUTHOR, TITLE, fetchMyLikes, type Review } from "@/lib/community";
import { AuthorLine, Empty, ItemMenu, LikeButton, ShareButton, Spoiler, TitleChip, UserAvatar } from "@/components/bits";
import { ReviewComposer } from "@/components/composer";
import { FeedSkeleton, Replies } from "@/components/feeds";
import { Page } from "@/components/shell";

export const Route = createFileRoute("/reviews/$id")({
  head: () => ({
    meta: [
      { title: "Review — Scruttin" },
      { name: "description", content: "A personal review and its discussion on Scruttin." },
      { property: "og:title", content: "A review on Scruttin" },
      { property: "og:description", content: "Read it and join the discussion." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const q = useQuery({
    queryKey: ["review", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select(`*, ${AUTHOR}, ${TITLE}`).eq("id", id).maybeSingle();
      if (!data) return null;
      const liked = await fetchMyLikes(user?.id, "review", [id]);
      return { r: data as unknown as Review, liked: liked.has(id) };
    },
  });
  if (q.isLoading) return <Page narrow><FeedSkeleton /></Page>;
  if (!q.data) return <Page narrow><Empty title="Review not found" /></Page>;
  const { r, liked } = q.data;
  return (
    <Page narrow>
      {r.title && <TitleChip title={r.title} />}
      {editing ? (
        <ReviewComposer titleId={r.title_id} placeholder="What did you think?" existing={r} onCancel={() => setEditing(false)} onPosted={() => { setEditing(false); q.refetch(); }} />
      ) : (
        <article className="border-b pb-6 pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3"><UserAvatar author={r.author} /><AuthorLine author={r.author} date={r.created_at} /></div>
            <ItemMenu type="review" id={r.id} ownerId={r.user_id} onEdit={() => setEditing(true)}
              onDeleted={() => r.title ? navigate({ to: r.title.kind === "movie" ? "/movie/$slug" : "/series/$slug", params: { slug: r.title.slug }, search: { tab: "reviews" } }) : navigate({ to: "/" })} />
          </div>
          {r.heading && <h1 className="mt-5 font-display text-3xl leading-tight">{r.heading}</h1>}
          <Spoiler on={r.spoiler}><div className="mt-4 whitespace-pre-line font-display text-lg leading-relaxed">{r.body}</div></Spoiler>
          {r.updated_at !== r.created_at && <p className="mt-4 text-xs text-muted-foreground">Edited</p>}
          <div className="mt-5 flex gap-6">
            <LikeButton type="review" id={r.id} count={r.like_count} liked={liked} />
            <ShareButton path={`/reviews/${r.id}`} />
          </div>
        </article>
      )}
      <h2 className="mt-6 text-sm uppercase tracking-widest text-muted-foreground">Discussion</h2>
      <Replies parentType="review" parentId={r.id} onChanged={() => q.refetch()} />
    </Page>
  );
}
