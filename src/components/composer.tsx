import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Kind } from "@/lib/titles";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "./bits";
import { cn } from "@/lib/utils";

const field = "w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground";

function SpoilerToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <Switch checked={value} onCheckedChange={onChange} aria-label="Contains spoilers" />
      Spoilers
    </label>
  );
}

function EpisodeRef({ season, episode, setSeason, setEpisode }: { season: string; episode: string; setSeason: (v: string) => void; setEpisode: (v: string) => void }) {
  const cls = "w-12 rounded border bg-transparent px-1.5 py-0.5 text-xs outline-none";
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      S<input className={cls} inputMode="numeric" value={season} onChange={(e) => setSeason(e.target.value.replace(/\D/g, ""))} aria-label="Season" />
      E<input className={cls} inputMode="numeric" value={episode} onChange={(e) => setEpisode(e.target.value.replace(/\D/g, ""))} aria-label="Episode" />
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  return (
    <div className="flex gap-3 border-b py-4">
      {profile ? <UserAvatar author={profile} /> : <span className="size-9 shrink-0 rounded-full bg-muted" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function PostComposer({ titleId, kind, category, placeholder, onPosted }: {
  titleId: string; kind: Kind; category: "lesson" | "quote" | "moment" | "trailer_thought"; placeholder: string; onPosted: () => void;
}) {
  const { user, requireAuth } = useAuth();
  const [body, setBody] = useState("");
  const [character, setCharacter] = useState("");
  const [explanation, setExplanation] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [season, setSeason] = useState("");
  const [episode, setEpisode] = useState("");
  const [busy, setBusy] = useState(false);
  const isQuote = category === "quote";
  const max = isQuote ? 400 : 1000;

  const submit = async () => {
    if (!requireAuth("Sign in to share your thoughts")) return;
    if (!body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("posts").insert({
      title_id: titleId, user_id: user!.id, category, body: body.trim(), spoiler,
      quote_character: isQuote ? character.trim() || null : null,
      explanation: isQuote ? explanation.trim() || null : null,
      season: season ? Number(season) : null, episode: episode ? Number(episode) : null,
    });
    setBusy(false);
    if (error) { toast.error(error.message.includes("row-level") ? "Your account can't post right now." : "Couldn't post. Try again."); return; }
    setBody(""); setCharacter(""); setExplanation(""); setSpoiler(false); setSeason(""); setEpisode("");
    onPosted();
  };

  return (
    <Shell>
      <textarea
        className={cn(field, isQuote && "font-display text-lg italic")}
        rows={body ? 3 : 2} maxLength={max} placeholder={placeholder} value={body}
        onFocus={() => requireAuth("Sign in to share your thoughts")}
        onChange={(e) => setBody(e.target.value)} aria-label={placeholder}
      />
      {isQuote && body && (
        <div className="mt-1 space-y-1">
          <input className={cn(field, "text-sm")} placeholder="Who said it? (optional)" value={character} onChange={(e) => setCharacter(e.target.value)} maxLength={80} />
          <input className={cn(field, "text-sm")} placeholder="Why it stayed with you (optional)" value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={400} />
          <p className="text-xs text-muted-foreground">Keep quotes short — a line or two, not whole scenes.</p>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SpoilerToggle value={spoiler} onChange={setSpoiler} />
          {kind === "series" && <EpisodeRef {...{ season, episode, setSeason, setEpisode }} />}
        </div>
        <div className="flex items-center gap-3">
          {body.length > max * 0.8 && <span className="text-xs text-muted-foreground">{max - body.length}</span>}
          <Button size="sm" onClick={submit} disabled={busy || !body.trim()}>Post</Button>
        </div>
      </div>
    </Shell>
  );
}

export function ReviewComposer({ titleId, placeholder, existing, onPosted, onCancel }: {
  titleId: string; placeholder: string; existing?: { id: string; heading: string | null; body: string; spoiler: boolean } | null; onPosted: () => void; onCancel?: () => void;
}) {
  const { user, requireAuth } = useAuth();
  const [heading, setHeading] = useState(existing?.heading ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [spoiler, setSpoiler] = useState(existing?.spoiler ?? false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!requireAuth("Sign in to write a review")) return;
    if (!body.trim()) return;
    setBusy(true);
    const payload = { heading: heading.trim() || null, body: body.trim(), spoiler, updated_at: new Date().toISOString() };
    const { error } = existing
      ? await supabase.from("reviews").update(payload).eq("id", existing.id)
      : await supabase.from("reviews").insert({ ...payload, title_id: titleId, user_id: user!.id });
    setBusy(false);
    if (error) { toast.error(error.code === "23505" ? "You've already reviewed this — edit your review instead." : "Couldn't publish."); return; }
    if (!existing) { setHeading(""); setBody(""); setSpoiler(false); }
    toast.success(existing ? "Review updated" : "Review published");
    onPosted();
  };

  return (
    <Shell>
      <input className={cn(field, "font-display text-lg")} placeholder="Title (optional)" value={heading} maxLength={140}
        onFocus={() => requireAuth("Sign in to write a review")} onChange={(e) => setHeading(e.target.value)} aria-label="Review title" />
      <textarea className={cn(field, "mt-1")} rows={body ? 7 : 3} placeholder={placeholder} value={body} maxLength={20000}
        onFocus={() => requireAuth("Sign in to write a review")} onChange={(e) => setBody(e.target.value)} aria-label="Review" />
      <div className="mt-2 flex items-center justify-between">
        <SpoilerToggle value={spoiler} onChange={setSpoiler} />
        <div className="flex gap-2">
          {onCancel && <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>}
          <Button size="sm" onClick={submit} disabled={busy || !body.trim()}>{existing ? "Save" : "Publish"}</Button>
        </div>
      </div>
    </Shell>
  );
}

export function QuestionComposer({ titleId, kind, placeholder, onPosted }: { titleId: string; kind: Kind; placeholder: string; onPosted: () => void }) {
  const { user, requireAuth } = useAuth();
  const [q, setQ] = useState("");
  const [details, setDetails] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [season, setSeason] = useState("");
  const [episode, setEpisode] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!requireAuth("Sign in to ask a question")) return;
    if (q.trim().length < 3) return;
    setBusy(true);
    const { error } = await supabase.from("questions").insert({
      title_id: titleId, user_id: user!.id, question: q.trim(), details: details.trim() || null, spoiler,
      season: season ? Number(season) : null, episode: episode ? Number(episode) : null,
    });
    setBusy(false);
    if (error) { toast.error("Couldn't post your question."); return; }
    setQ(""); setDetails(""); setSpoiler(false); setSeason(""); setEpisode("");
    onPosted();
  };
  return (
    <Shell>
      <input className={cn(field, "font-display text-lg")} placeholder={placeholder} value={q} maxLength={300}
        onFocus={() => requireAuth("Sign in to ask a question")} onChange={(e) => setQ(e.target.value)} aria-label="Question" />
      {q && <textarea className={cn(field, "mt-1 text-sm")} rows={2} placeholder="Add context (optional)" value={details} maxLength={2000} onChange={(e) => setDetails(e.target.value)} />}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SpoilerToggle value={spoiler} onChange={setSpoiler} />
          {kind === "series" && <EpisodeRef {...{ season, episode, setSeason, setEpisode }} />}
        </div>
        <Button size="sm" onClick={submit} disabled={busy || q.trim().length < 3}>Ask</Button>
      </div>
    </Shell>
  );
}

export function SimpleComposer({ placeholder, cta, onSubmit, rows = 2 }: { placeholder: string; cta: string; rows?: number; onSubmit: (body: string, spoiler: boolean) => Promise<boolean> }) {
  const { requireAuth } = useAuth();
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!requireAuth("Sign in to join the conversation")) return;
    if (!body.trim()) return;
    setBusy(true);
    const ok = await onSubmit(body.trim(), spoiler);
    setBusy(false);
    if (ok) { setBody(""); setSpoiler(false); }
  };
  return (
    <Shell>
      <textarea className={field} rows={body ? rows + 2 : rows} placeholder={placeholder} value={body} maxLength={10000}
        onFocus={() => requireAuth("Sign in to join the conversation")} onChange={(e) => setBody(e.target.value)} aria-label={placeholder} />
      <div className="mt-2 flex items-center justify-between">
        <SpoilerToggle value={spoiler} onChange={setSpoiler} />
        <Button size="sm" onClick={submit} disabled={busy || !body.trim()}>{cta}</Button>
      </div>
    </Shell>
  );
}
