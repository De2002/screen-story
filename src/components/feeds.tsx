import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AUTHOR, PAGE, TITLE, fetchMyLikes, type Post, type Review, type Question, type Answer, type Reply } from "@/lib/community";
import { CATEGORY_LABEL } from "@/lib/titles";
import { AuthorLine, Empty, ItemMenu, LikeButton, ShareButton, Spoiler, TitleChip, UserAvatar } from "./bits";
import { SimpleComposer } from "./composer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type PostFilter = { titleId?: string; category?: Post["category"]; userId?: string };

export function postsKey(f: PostFilter) {
  return ["posts", f.titleId ?? null, f.category ?? null, f.userId ?? null];
}

export function PostFeed({ filter, showTitle, emptyTitle, emptyText }: { filter: PostFilter; showTitle?: boolean; emptyTitle: string; emptyText?: string }) {
  const { user } = useAuth();
  const q = useInfiniteQuery({
    queryKey: [...postsKey(filter), user?.id ?? null],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let qb = supabase.from("posts").select(`*, ${AUTHOR}, ${TITLE}`).eq("removed", false).order("created_at", { ascending: false }).limit(PAGE);
      if (filter.titleId) qb = qb.eq("title_id", filter.titleId);
      if (filter.category) qb = qb.eq("category", filter.category);
      if (filter.userId) qb = qb.eq("user_id", filter.userId);
      if (pageParam) qb = qb.lt("created_at", pageParam);
      const { data, error } = await qb;
      if (error) throw error;
      const rows = (data ?? []) as unknown as Post[];
      const liked = await fetchMyLikes(user?.id, "post", rows.map((r) => r.id));
      return { rows, liked };
    },
    getNextPageParam: (last) => (last.rows.length === PAGE ? last.rows[last.rows.length - 1].created_at : null),
  });
  if (q.isLoading) return <FeedSkeleton />;
  if (q.isError) return <Empty title="Couldn't load this feed">Please try again in a moment.</Empty>;
  const pages = q.data?.pages ?? [];
  const all = pages.flatMap((p) => p.rows.map((r) => ({ r, liked: p.liked.has(r.id) })));
  if (all.length === 0) return <Empty title={emptyTitle}>{emptyText}</Empty>;
  return (
    <div>
      {all.map(({ r, liked }) => <PostItem key={r.id} post={r} liked={liked} showTitle={showTitle} onChanged={() => q.refetch()} />)}
      {q.hasNextPage && (
        <div className="py-6 text-center">
          <Button variant="ghost" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>{q.isFetchingNextPage ? "Loading…" : "Show more"}</Button>
        </div>
      )}
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-6 py-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3"><Skeleton className="size-9 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div></div>
      ))}
    </div>
  );
}

function EpisodeTag({ season, episode }: { season: number | null; episode: number | null }) {
  if (!season && !episode) return null;
  return <span className="text-xs text-muted-foreground">· {season ? `S${season}` : ""}{episode ? `E${episode}` : ""}</span>;
}

export function PostItem({ post, liked, showTitle, onChanged }: { post: Post; liked: boolean; showTitle?: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(post.body);
  const [openReplies, setOpenReplies] = useState(false);
  const save = async () => {
    const { error } = await supabase.from("posts").update({ body: body.trim(), updated_at: new Date().toISOString() }).eq("id", post.id);
    if (error) toast.error("Couldn't save."); else { setEditing(false); onChanged(); }
  };
  const path = post.title ? `/${post.title.kind}/${post.title.slug}?tab=${tabFor(post.category)}` : "/";
  return (
    <article className="flex gap-3 border-b py-4">
      <UserAvatar author={post.author} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <AuthorLine author={post.author} date={post.created_at} extra={<><span className="text-xs uppercase tracking-wide text-ember">· {CATEGORY_LABEL[post.category]}</span><EpisodeTag season={post.season} episode={post.episode} /></>} />
          <ItemMenu type="post" id={post.id} ownerId={post.user_id} onEdit={() => setEditing(true)} onDeleted={onChanged} />
        </div>
        {editing ? (
          <div className="mt-2">
            <textarea className="w-full rounded-md border bg-transparent p-2 text-[15px] outline-none" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="mt-2 flex gap-2"><Button size="sm" onClick={save}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></div>
          </div>
        ) : (
          <Spoiler on={post.spoiler}>
            {post.category === "quote" ? (
              <blockquote className="mt-1.5 border-l-2 border-ember pl-3">
                <p className="font-display text-lg italic leading-snug">“{post.body}”</p>
                {post.quote_character && <p className="mt-1 text-sm text-muted-foreground">— {post.quote_character}</p>}
                {post.explanation && <p className="mt-2 text-[15px] not-italic">{post.explanation}</p>}
              </blockquote>
            ) : (
              <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{post.body}</p>
            )}
          </Spoiler>
        )}
        {showTitle && post.title && <TitleChip title={post.title} />}
        <div className="mt-3 flex items-center gap-6">
          <LikeButton type="post" id={post.id} count={post.like_count} liked={liked} />
          <button onClick={() => setOpenReplies((v) => !v)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" aria-label="Replies">
            <MessageCircle className="size-4" />{post.reply_count > 0 && post.reply_count}
          </button>
          <ShareButton path={path} />
        </div>
        {openReplies && <Replies parentType="post" parentId={post.id} onChanged={onChanged} />}
      </div>
    </article>
  );
}

function tabFor(c: Post["category"]) {
  return c === "lesson" ? "lessons" : c === "quote" ? "quotes" : c === "moment" ? "moments" : "trailer";
}

export function Replies({ parentType, parentId, onChanged }: { parentType: "post" | "review" | "answer"; parentId: string; onChanged?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["replies", parentType, parentId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("replies").select(`*, ${AUTHOR}`).eq("parent_type", parentType).eq("parent_id", parentId).eq("removed", false).order("created_at").limit(100);
      if (error) throw error;
      return data as unknown as Reply[];
    },
  });
  return (
    <div className="mt-3 border-l pl-3">
      {(q.data ?? []).map((r) => (
        <div key={r.id} className="flex gap-2 py-2">
          <UserAvatar author={r.author} size={26} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <AuthorLine author={r.author} date={r.created_at} />
              <ItemMenu type="reply" id={r.id} ownerId={r.user_id} onDeleted={() => { qc.invalidateQueries({ queryKey: key }); onChanged?.(); }} />
            </div>
            <Spoiler on={r.spoiler}><p className="whitespace-pre-line text-sm leading-relaxed">{r.body}</p></Spoiler>
          </div>
        </div>
      ))}
      <SimpleComposer placeholder="Write a reply" cta="Reply" rows={1} onSubmit={async (body, spoiler) => {
        const { error } = await supabase.from("replies").insert({ parent_type: parentType, parent_id: parentId, user_id: user!.id, body, spoiler });
        if (error) { toast.error("Couldn't reply."); return false; }
        qc.invalidateQueries({ queryKey: key }); onChanged?.();
        return true;
      }} />
    </div>
  );
}

export function ReviewCard({ review, showTitle }: { review: Review; showTitle?: boolean }) {
  const excerpt = review.body.length > 260 ? review.body.slice(0, 260).trimEnd() + "…" : review.body;
  return (
    <article className="flex gap-3 border-b py-5">
      <UserAvatar author={review.author} />
      <div className="min-w-0 flex-1">
        <AuthorLine author={review.author} date={review.created_at} />
        <Link to="/reviews/$id" params={{ id: review.id }} className="mt-1.5 block group">
          {review.heading && <h3 className="font-display text-xl leading-snug group-hover:underline">{review.heading}</h3>}
          <Spoiler on={review.spoiler}><p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{excerpt}</p></Spoiler>
          <span className="mt-2 inline-block text-sm font-medium text-ember">Read more</span>
        </Link>
        {showTitle && review.title && <TitleChip title={review.title} />}
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span>{review.like_count} likes</span><span>{review.reply_count} replies</span>
        </div>
      </div>
    </article>
  );
}

export function QuestionCard({ question, showTitle, topAnswer }: { question: Question; showTitle?: boolean; topAnswer?: Answer | null }) {
  return (
    <article className="border-b py-5">
      <Link to="/questions/$id" params={{ id: question.id }} className="group block">
        <Spoiler on={question.spoiler}>
          <h3 className="font-display text-xl leading-snug group-hover:underline">{question.question}</h3>
        </Spoiler>
      </Link>
      <div className="mt-1.5 flex items-center gap-2 text-sm">
        <AuthorLine author={question.author} date={question.created_at} extra={<EpisodeTag season={question.season} episode={question.episode} />} />
      </div>
      {topAnswer && (
        <div className="mt-3 border-l-2 pl-3 text-[15px] leading-relaxed text-foreground/85">
          {topAnswer.helpful && <span className="mb-1 inline-flex items-center gap-1 text-xs text-ember"><CheckCircle2 className="size-3.5" /> Marked helpful</span>}
          <Spoiler on={topAnswer.spoiler}><p className="line-clamp-3">{topAnswer.body}</p></Spoiler>
        </div>
      )}
      {showTitle && question.title && <TitleChip title={question.title} />}
      <div className="mt-3 flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">{question.answer_count} {question.answer_count === 1 ? "answer" : "answers"}</span>
        <Link to="/questions/$id" params={{ id: question.id }} className="font-medium text-ember">Answer</Link>
      </div>
    </article>
  );
}

export function ReviewList({ titleId, userId, showTitle, emptyTitle }: { titleId?: string; userId?: string; showTitle?: boolean; emptyTitle: string }) {
  const q = useInfiniteQuery({
    queryKey: ["reviews", titleId ?? null, userId ?? null],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let qb = supabase.from("reviews").select(`*, ${AUTHOR}, ${TITLE}`).eq("removed", false).order("created_at", { ascending: false }).limit(PAGE);
      if (titleId) qb = qb.eq("title_id", titleId);
      if (userId) qb = qb.eq("user_id", userId);
      if (pageParam) qb = qb.lt("created_at", pageParam);
      const { data, error } = await qb;
      if (error) throw error;
      return data as unknown as Review[];
    },
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].created_at : null),
  });
  if (q.isLoading) return <FeedSkeleton />;
  const all = q.data?.pages.flat() ?? [];
  if (!all.length) return <Empty title={emptyTitle}>No ratings here — just what you thought.</Empty>;
  return (
    <div>
      {all.map((r) => <ReviewCard key={r.id} review={r} showTitle={showTitle} />)}
      {q.hasNextPage && <div className="py-6 text-center"><Button variant="ghost" onClick={() => q.fetchNextPage()}>Show more</Button></div>}
    </div>
  );
}

export function QuestionList({ titleId, userId, showTitle, emptyTitle }: { titleId?: string; userId?: string; showTitle?: boolean; emptyTitle: string }) {
  const q = useInfiniteQuery({
    queryKey: ["questions", titleId ?? null, userId ?? null],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let qb = supabase.from("questions").select(`*, ${AUTHOR}, ${TITLE}`).eq("removed", false).order("created_at", { ascending: false }).limit(PAGE);
      if (titleId) qb = qb.eq("title_id", titleId);
      if (userId) qb = qb.eq("user_id", userId);
      if (pageParam) qb = qb.lt("created_at", pageParam);
      const { data, error } = await qb;
      if (error) throw error;
      const rows = data as unknown as Question[];
      const ids = rows.filter((r) => r.answer_count > 0).map((r) => r.id);
      const top = new Map<string, Answer>();
      if (ids.length) {
        const { data: ans } = await supabase.from("answers").select(`*, ${AUTHOR}`).in("question_id", ids).eq("removed", false)
          .order("helpful", { ascending: false }).order("like_count", { ascending: false }).limit(ids.length * 3);
        for (const a of (ans ?? []) as unknown as Answer[]) if (!top.has(a.question_id)) top.set(a.question_id, a);
      }
      return rows.map((r) => ({ r, top: top.get(r.id) ?? null }));
    },
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].r.created_at : null),
  });
  if (q.isLoading) return <FeedSkeleton />;
  const all = q.data?.pages.flat() ?? [];
  if (!all.length) return <Empty title={emptyTitle}>Confused by an ending? Curious about a choice? Ask away.</Empty>;
  return (
    <div>
      {all.map(({ r, top }) => <QuestionCard key={r.id} question={r} topAnswer={top} showTitle={showTitle} />)}
      {q.hasNextPage && <div className="py-6 text-center"><Button variant="ghost" onClick={() => q.fetchNextPage()}>Show more</Button></div>}
    </div>
  );
}
