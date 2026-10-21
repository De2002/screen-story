import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AUTHOR, TITLE, fetchMyLikes, type Answer, type Question } from "@/lib/community";
import { AuthorLine, ItemMenu, LikeButton, ShareButton, Spoiler, TitleChip, UserAvatar, Empty } from "@/components/bits";
import { SimpleComposer } from "@/components/composer";
import { Replies, FeedSkeleton } from "@/components/feeds";
import { Page } from "@/components/shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/questions/$id")({
  head: () => ({
    meta: [
      { title: "Question — Scruttin" },
      { name: "description", content: "A viewer question and the community's answers on Scruttin." },
      { property: "og:title", content: "A question on Scruttin" },
      { property: "og:description", content: "See what others think, and add your answer." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuestionPage,
});

function QuestionPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["question", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select(`*, ${AUTHOR}, ${TITLE}`).eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      const qs = data as unknown as Question;
      const { data: ans } = await supabase.from("answers").select(`*, ${AUTHOR}`).eq("question_id", id).eq("removed", false)
        .order("helpful", { ascending: false }).order("like_count", { ascending: false }).order("created_at");
      const answers = (ans ?? []) as unknown as Answer[];
      const [lq, la] = await Promise.all([fetchMyLikes(user?.id, "question", [id]), fetchMyLikes(user?.id, "answer", answers.map((a) => a.id))]);
      return { q: qs, answers, likedQ: lq.has(id), likedA: la };
    },
  });
  if (q.isLoading) return <Page narrow><FeedSkeleton /></Page>;
  if (!q.data) return <Page narrow><Empty title="Question not found" /></Page>;
  const { q: question, answers, likedQ, likedA } = q.data;
  const isAsker = user?.id === question.user_id;

  return (
    <Page narrow>
      {question.title && <TitleChip title={question.title} />}
      <article className="border-b pb-5 pt-4">
        <div className="flex items-start justify-between gap-2">
          <Spoiler on={question.spoiler}><h1 className="font-display text-3xl leading-tight">{question.question}</h1></Spoiler>
          <ItemMenu type="question" id={question.id} ownerId={question.user_id} onDeleted={() => history.back()} />
        </div>
        {question.details && <Spoiler on={question.spoiler}><p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{question.details}</p></Spoiler>}
        <div className="mt-3 flex items-center gap-3">
          <UserAvatar author={question.author} size={26} />
          <AuthorLine author={question.author} date={question.created_at} />
        </div>
        <div className="mt-4 flex gap-6">
          <LikeButton type="question" id={question.id} count={question.like_count} liked={likedQ} />
          <ShareButton path={`/questions/${question.id}`} />
        </div>
      </article>

      <SimpleComposer placeholder="Share your answer or interpretation" cta="Answer" rows={3} onSubmit={async (body, spoiler) => {
        const { error } = await supabase.from("answers").insert({ question_id: id, user_id: user!.id, body, spoiler });
        if (error) { toast.error("Couldn't post your answer."); return false; }
        q.refetch(); return true;
      }} />

      <h2 className="mt-6 text-sm uppercase tracking-widest text-muted-foreground">{answers.length} {answers.length === 1 ? "answer" : "answers"}</h2>
      {answers.length === 0 && <Empty title="No answers yet">What's your take?</Empty>}
      {answers.map((a) => <AnswerItem key={a.id} a={a} liked={likedA.has(a.id)} isAsker={isAsker} onChanged={() => q.refetch()} />)}
    </Page>
  );
}

function AnswerItem({ a, liked, isAsker, onChanged }: { a: Answer; liked: boolean; isAsker: boolean; onChanged: () => void }) {
  const [replies, setReplies] = useState(false);
  const toggleHelpful = async () => {
    const { error } = await supabase.rpc("mark_helpful", { _answer_id: a.id, _value: !a.helpful });
    if (error) toast.error("Couldn't update."); else onChanged();
  };
  return (
    <article className="flex gap-3 border-b py-5">
      <UserAvatar author={a.author} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between">
          <AuthorLine author={a.author} date={a.created_at} />
          <ItemMenu type="answer" id={a.id} ownerId={a.user_id} onDeleted={onChanged} />
        </div>
        {a.helpful && <p className="mt-1 inline-flex items-center gap-1 text-xs text-ember"><CheckCircle2 className="size-3.5" /> The asker found this helpful</p>}
        <Spoiler on={a.spoiler}><div className="mt-1 space-y-3 whitespace-pre-line text-[15px] leading-relaxed">{a.body}</div></Spoiler>
        <div className="mt-3 flex items-center gap-6">
          <LikeButton type="answer" id={a.id} count={a.like_count} liked={liked} />
          <button onClick={() => setReplies((v) => !v)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><MessageCircle className="size-4" />{a.reply_count > 0 && a.reply_count}</button>
          {isAsker && (
            <button onClick={toggleHelpful} className={cn("inline-flex items-center gap-1 text-sm", a.helpful ? "text-ember" : "text-muted-foreground hover:text-foreground")}>
              <CheckCircle2 className="size-4" /> {a.helpful ? "Helpful" : "Mark helpful"}
            </button>
          )}
        </div>
        {replies && <Replies parentType="answer" parentId={a.id} onChanged={onChanged} />}
      </div>
    </article>
  );
}
