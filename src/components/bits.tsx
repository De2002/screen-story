import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { Heart, MoreHorizontal, Share2, Flag, Trash2, Pencil, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { posterUrl } from "@/lib/titles";
import type { Author, TargetType } from "@/lib/community";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function Poster({ path, title, className, size = "w342" }: { path: string | null | undefined; title: string; className?: string; size?: "w92" | "w185" | "w342" | "w500" }) {
  const url = posterUrl(path, size);
  return (
    <div className={cn("relative aspect-[2/3] overflow-hidden rounded-md bg-muted", className)}>
      {url ? (
        <img src={url} alt={`${title} poster`} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-2 text-center font-display text-xs text-muted-foreground">{title}</div>
      )}
    </div>
  );
}

export function UserAvatar({ author, size = 36 }: { author: Pick<Author, "display_name" | "username" | "avatar_url">; size?: number }) {
  const initial = (author.display_name || author.username || "?").slice(0, 1).toUpperCase();
  return author.avatar_url ? (
    <img src={author.avatar_url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-ember-soft font-display text-sm text-ember" style={{ width: size, height: size }} aria-hidden>
      {initial}
    </span>
  );
}

export function AuthorLine({ author, date, extra }: { author: Author; date: string; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
      <Link to="/u/$username" params={{ username: author.username }} className="font-medium text-foreground hover:underline">
        {author.display_name || author.username}
      </Link>
      <span className="text-muted-foreground">@{author.username}</span>
      <span className="text-muted-foreground">· <TimeAgo date={date} /></span>
      {extra}
    </div>
  );
}

export function TimeAgo({ date }: { date: string }) {
  return <time dateTime={date} title={new Date(date).toLocaleString()}>{formatDistanceToNowStrict(new Date(date))}</time>;
}

export function Spoiler({ on, children }: { on: boolean; children: ReactNode }) {
  const [shown, setShown] = useState(false);
  if (!on || shown) return <>{children}</>;
  return (
    <div className="relative">
      <div className="spoiler-veil" aria-hidden onClick={() => setShown(true)}>{children}</div>
      <button
        onClick={() => setShown(true)}
        className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium text-foreground"
      >
        <EyeOff className="size-4" /> Contains spoilers · Tap to reveal
      </button>
    </div>
  );
}

export function LikeButton({ type, id, count, liked, onChange }: { type: TargetType; id: string; count: number; liked: boolean; onChange?: (liked: boolean) => void }) {
  const { user, requireAuth } = useAuth();
  const [state, setState] = useState({ liked, count });
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (!requireAuth("Sign in to like contributions")) return;
    if (busy) return;
    const prev = state;
    const next = { liked: !prev.liked, count: prev.count + (prev.liked ? -1 : 1) };
    setState(next);
    setBusy(true);
    const res = prev.liked
      ? await supabase.from("likes").delete().match({ user_id: user!.id, target_type: type, target_id: id })
      : await supabase.from("likes").insert({ user_id: user!.id, target_type: type, target_id: id });
    setBusy(false);
    if (res.error) {
      setState(prev);
      toast.error("Couldn't save that like.");
    } else onChange?.(next.liked);
  };
  return (
    <button onClick={toggle} aria-pressed={state.liked} aria-label={state.liked ? "Unlike" : "Like"}
      className={cn("inline-flex items-center gap-1.5 text-sm transition-colors", state.liked ? "text-ember" : "text-muted-foreground hover:text-foreground")}>
      <Heart className={cn("size-4", state.liked && "fill-current")} />
      {state.count > 0 && <span>{state.count}</span>}
    </button>
  );
}

export function ShareButton({ path, label = "Share" }: { path: string; label?: string }) {
  const share = async () => {
    const url = window.location.origin + path;
    try {
      if (navigator.share) await navigator.share({ url, title: "Scruttin" });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* cancelled */ }
  };
  return (
    <button onClick={share} aria-label={label} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <Share2 className="size-4" />
    </button>
  );
}

const TABLE: Record<"post" | "review" | "question" | "answer" | "reply", "posts" | "reviews" | "questions" | "answers" | "replies"> = {
  post: "posts", review: "reviews", question: "questions", answer: "answers", reply: "replies",
};

export function ItemMenu({ type, id, ownerId, onEdit, onDeleted }: { type: "post" | "review" | "question" | "answer" | "reply"; id: string; ownerId: string; onEdit?: () => void; onDeleted?: () => void }) {
  const { user, isAdmin, requireAuth } = useAuth();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const mine = user?.id === ownerId;

  const del = async () => {
    if (!confirm("Delete this for good?")) return;
    const { error } = await supabase.from(TABLE[type]).delete().eq("id", id);
    if (error) toast.error("Couldn't delete.");
    else { toast.success("Deleted"); onDeleted?.(); }
  };
  const remove = async () => {
    const { error } = await supabase.from(TABLE[type]).update({ removed: true }).eq("id", id);
    if (!error && user) await supabase.from("moderation_log").insert({ admin_id: user.id, action: "remove", target_type: type, target_id: id });
    if (error) toast.error("Couldn't remove."); else { toast.success("Removed from public view"); onDeleted?.(); }
  };
  const report = async () => {
    if (!user) return;
    const { error } = await supabase.from("reports").insert({ reporter_id: user.id, target_type: type, target_id: id, reason: reason.trim() || "No reason given" });
    setReporting(false); setReason("");
    if (error) toast.error("Couldn't send report."); else toast.success("Thanks — a moderator will take a look.");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="More actions" className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {mine && onEdit && <DropdownMenuItem onClick={onEdit}><Pencil className="size-4" /> Edit</DropdownMenuItem>}
          {mine && <DropdownMenuItem onClick={del}><Trash2 className="size-4" /> Delete</DropdownMenuItem>}
          {!mine && <DropdownMenuItem onClick={() => requireAuth("Sign in to report content") && setReporting(true)}><Flag className="size-4" /> Report</DropdownMenuItem>}
          {isAdmin && !mine && <DropdownMenuItem onClick={remove}><EyeOff className="size-4" /> Remove (admin)</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={reporting} onOpenChange={setReporting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this</DialogTitle>
            <DialogDescription>Tell us briefly what's wrong. Reports are private.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Spam, harassment, unmarked spoilers, copyrighted script…" maxLength={2000} />
          <Button onClick={report}>Send report</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="py-14 text-center">
      <p className="font-display text-xl text-foreground">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}

export function TitleChip({ title }: { title: { kind: "movie" | "series"; slug: string; title: string; year: number | null; poster_path: string | null } }) {
  const to = title.kind === "movie" ? "/movie/$slug" : "/series/$slug";
  return (
    <Link to={to} params={{ slug: title.slug }} className="mt-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
      <Poster path={title.poster_path} title={title.title} size="w92" className="w-5 rounded-sm" />
      <span className="font-medium text-foreground">{title.title}</span>
      {title.year && <span>{title.year}</span>}
    </Link>
  );
}
