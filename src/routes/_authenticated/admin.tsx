import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Page } from "@/components/shell";
import { Empty, TimeAgo } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Moderation — Scruttin" },
      { name: "description", content: "Scruttin moderation dashboard." },
      { property: "og:title", content: "Moderation — Scruttin" },
      { property: "og:description", content: "Moderation dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const TABLE: Record<string, "posts" | "reviews" | "questions" | "answers" | "replies" | "collections"> = {
  post: "posts", review: "reviews", question: "questions", answer: "answers", reply: "replies", collection: "collections",
};
const TABS = ["Reports", "Users", "History"] as const;

function Admin() {
  const { isAdmin, ready, user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Reports");
  if (!ready) return null;
  if (!isAdmin) return <Page narrow><Empty title="Moderators only">This area is for the Scruttin team.</Empty></Page>;
  const log = (action: string, target_type: string, target_id: string, note?: string) =>
    supabase.from("moderation_log").insert({ admin_id: user!.id, action, target_type, target_id, note: note ?? null });
  return (
    <Page>
      <h1 className="font-display text-4xl">Moderation</h1>
      <div className="mt-6 flex gap-1 border-b">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={cn("border-b-2 px-3 py-3 text-sm", t === tab ? "border-ember font-medium" : "border-transparent text-muted-foreground")}>{t}</button>)}
      </div>
      {tab === "Reports" && <Reports log={log} />}
      {tab === "Users" && <Users log={log} />}
      {tab === "History" && <History />}
    </Page>
  );
}

type Log = (a: string, t: string, id: string, n?: string) => PromiseLike<unknown>;

function Reports({ log }: { log: Log }) {
  const [status, setStatus] = useState<"open" | "resolved" | "dismissed">("open");
  const q = useQuery({
    queryKey: ["admin-reports", status],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*, reporter:profiles!inner(username)").eq("status", status).order("created_at", { ascending: false }).limit(100);
      const rows = (data ?? []) as any[];
      // fetch content previews
      const out = await Promise.all(rows.map(async (r) => {
        const tbl = TABLE[r.target_type];
        if (!tbl || !r.target_id) return { ...r, content: null };
        const { data: c } = await supabase.from(tbl).select("*").eq("id", r.target_id).maybeSingle();
        return { ...r, content: c };
      }));
      return out;
    },
  });
  const setContent = async (r: any, removed: boolean) => {
    const { error } = await supabase.from(TABLE[r.target_type]).update({ removed }).eq("id", r.target_id);
    if (error) return toast.error("Couldn't update.");
    await log(removed ? "remove" : "restore", r.target_type, r.target_id);
    q.refetch();
  };
  const resolve = async (r: any, s: "resolved" | "dismissed") => {
    await supabase.from("reports").update({ status: s }).eq("id", r.id);
    await log(`report_${s}`, "report", r.id);
    q.refetch();
  };
  return (
    <div>
      <div className="mt-4 flex gap-2">
        {(["open", "resolved", "dismissed"] as const).map((s) => <Button key={s} size="sm" variant={s === status ? "default" : "outline"} onClick={() => setStatus(s)}>{s}</Button>)}
      </div>
      {q.data?.length === 0 && <Empty title="Nothing to review" />}
      <ul className="divide-y">
        {(q.data ?? []).map((r) => {
          const text = r.content?.body ?? r.content?.question ?? r.content?.name ?? null;
          return (
            <li key={r.id} className="py-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{r.target_type} · reported by @{r.reporter.username} · <TimeAgo date={r.created_at} /></p>
              <p className="mt-1 text-sm"><strong>Reason:</strong> {r.reason}</p>
              {text && <p className="mt-2 line-clamp-4 rounded-md bg-muted p-3 text-sm">{text}</p>}
              {r.content?.removed && <p className="mt-1 text-xs text-destructive">Currently removed</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.content && (r.content.removed
                  ? <Button size="sm" variant="outline" onClick={() => setContent(r, false)}>Restore</Button>
                  : <Button size="sm" variant="destructive" onClick={() => setContent(r, true)}>Remove content</Button>)}
                {status === "open" && <>
                  <Button size="sm" variant="outline" onClick={() => resolve(r, "resolved")}>Mark resolved</Button>
                  <Button size="sm" variant="ghost" onClick={() => resolve(r, "dismissed")}>Dismiss</Button>
                </>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Users({ log }: { log: Log }) {
  const [term, setTerm] = useState("");
  const q = useQuery({
    queryKey: ["admin-users", term],
    queryFn: async () => {
      let qb = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
      if (term.trim()) qb = qb.ilike("username", `%${term.trim()}%`);
      return (await qb).data ?? [];
    },
  });
  const setStatus = async (id: string, status: "active" | "restricted" | "suspended" | "banned") => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return toast.error("Couldn't update.");
    await log(`status_${status}`, "user", id);
    q.refetch();
  };
  return (
    <div className="mt-4">
      <Input placeholder="Find by username" value={term} onChange={(e) => setTerm(e.target.value)} className="max-w-xs" />
      <ul className="mt-4 divide-y">
        {(q.data ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
            <Link to="/u/$username" params={{ username: p.username }} className="font-medium hover:underline">@{p.username}</Link>
            <span className={cn("rounded px-2 py-0.5 text-xs", p.status === "active" ? "bg-muted text-muted-foreground" : "bg-destructive/15 text-destructive")}>{p.status}</span>
            <div className="ml-auto flex flex-wrap gap-1">
              {(["active", "restricted", "suspended", "banned"] as const).filter((s) => s !== p.status).map((s) => (
                <Button key={s} size="sm" variant="ghost" onClick={() => setStatus(p.id, s)}>{s === "active" ? "Reinstate" : s[0].toUpperCase() + s.slice(1, -2)}</Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">Restricted, suspended and banned accounts can still read, but can't post, reply, like or create collections.</p>
    </div>
  );
}

function History() {
  const q = useQuery({
    queryKey: ["admin-history"],
    queryFn: async () => ((await supabase.from("moderation_log").select("*, admin:profiles!inner(username)").order("created_at", { ascending: false }).limit(200)).data ?? []) as any[],
  });
  if (q.data?.length === 0) return <Empty title="No moderation actions yet" />;
  return (
    <ul className="mt-4 divide-y text-sm">
      {(q.data ?? []).map((l) => (
        <li key={l.id} className="py-2.5"><span className="font-medium">@{l.admin.username}</span> · {l.action} · {l.target_type} <span className="text-muted-foreground">{l.target_id.slice(0, 8)} · <TimeAgo date={l.created_at} /></span></li>
      ))}
    </ul>
  );
}
