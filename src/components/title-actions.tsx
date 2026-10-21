import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Plus, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { collectionSlug } from "@/lib/community";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function TitleActions({ titleId }: { titleId: string }) {
  const { user, requireAuth } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const status = useQuery({
    queryKey: ["library-status", titleId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("library").select("status").eq("user_id", user!.id).eq("title_id", titleId).maybeSingle();
      return (data?.status as "watched" | "want" | undefined) ?? null;
    },
  });
  const set = async (s: "watched" | "want") => {
    if (!requireAuth(s === "watched" ? "Sign in to track what you've watched" : "Sign in to build your watchlist")) return;
    const current = status.data;
    qc.setQueryData(["library-status", titleId, user!.id], current === s ? null : s);
    const res = current === s
      ? await supabase.from("library").delete().match({ user_id: user!.id, title_id: titleId })
      : await supabase.from("library").upsert({ user_id: user!.id, title_id: titleId, status: s });
    if (res.error) { toast.error("Couldn't update your library."); qc.setQueryData(["library-status", titleId, user!.id], current); }
    qc.invalidateQueries({ queryKey: ["library"] });
  };
  const s = status.data;
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant={s === "watched" ? "default" : "outline"} onClick={() => set("watched")} aria-pressed={s === "watched"}>
        {s === "watched" ? <Check /> : <Eye />} Watched
      </Button>
      <Button size="sm" variant={s === "want" ? "default" : "outline"} onClick={() => set("want")} aria-pressed={s === "want"}>
        <Bookmark /> Want to watch
      </Button>
      <Button size="sm" variant="outline" onClick={() => requireAuth("Sign in to make collections") && setOpen(true)}>
        <Plus /> Add to collection
      </Button>
      {user && <AddToCollection open={open} onOpenChange={setOpen} titleId={titleId} />}
    </div>
  );
}

function AddToCollection({ open, onOpenChange, titleId }: { open: boolean; onOpenChange: (o: boolean) => void; titleId: string }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const lists = useQuery({
    queryKey: ["my-collections", user!.id, titleId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("collections").select("id, name, collection_items(title_id)").eq("user_id", user!.id).order("updated_at", { ascending: false });
      return (data ?? []).map((c: any) => ({ id: c.id as string, name: c.name as string, has: (c.collection_items ?? []).some((i: any) => i.title_id === titleId), count: (c.collection_items ?? []).length }));
    },
  });
  const toggle = async (c: { id: string; has: boolean; count: number }) => {
    const res = c.has
      ? await supabase.from("collection_items").delete().match({ collection_id: c.id, title_id: titleId })
      : await supabase.from("collection_items").insert({ collection_id: c.id, title_id: titleId, position: c.count });
    if (res.error) toast.error("Couldn't update collection.");
    await supabase.from("collections").update({ updated_at: new Date().toISOString() }).eq("id", c.id);
    lists.refetch();
  };
  const create = async () => {
    if (!name.trim()) return;
    const { data, error } = await supabase.from("collections").insert({ name: name.trim(), slug: collectionSlug(name), user_id: user!.id }).select("id").single();
    if (error || !data) { toast.error("Couldn't create collection."); return; }
    await supabase.from("collection_items").insert({ collection_id: data.id, title_id: titleId, position: 0 });
    setName("");
    toast.success("Added to your new collection");
    lists.refetch();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display text-xl">Add to collection</DialogTitle></DialogHeader>
        <ul className="max-h-64 divide-y overflow-auto">
          {(lists.data ?? []).map((c) => (
            <li key={c.id}>
              <button onClick={() => toggle(c)} className="flex w-full items-center justify-between py-2.5 text-left text-sm">
                <span>{c.name}</span>{c.has && <Check className="size-4 text-ember" />}
              </button>
            </li>
          ))}
          {lists.data?.length === 0 && <li className="py-2 text-sm text-muted-foreground">No collections yet.</li>}
        </ul>
        <div className="flex gap-2">
          <Input placeholder="New collection name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} onKeyDown={(e) => e.key === "Enter" && create()} />
          <Button onClick={create} disabled={!name.trim()}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
