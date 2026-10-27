import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Plus, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { collectionSlug } from "@/lib/community";
import type { TitleDetail } from "@/lib/tmdb.functions";
import { addCollectionItem } from "@/lib/collection-items";
import { writeLibraryStatus } from "@/lib/library-items";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function TitleActions({ title }: { title: TitleDetail }) {
  const titleId = title.id;
  const { user, requireAuth } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const libraryBusy = useRef(false);
  const [savingLibrary, setSavingLibrary] = useState(false);
  const status = useQuery({
    queryKey: ["library-status", titleId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("library").select("status").eq("user_id", user.id).eq("title_id", titleId).maybeSingle();
      if (error) throw error;
      return (data?.status as "watched" | "want" | undefined) ?? null;
    },
  });
  const set = async (s: "watched" | "want") => {
    if (libraryBusy.current || status.isLoading || status.isError) return;
    if (!requireAuth(s === "watched" ? "Sign in to track what you've watched" : "Sign in to build your watchlist") || !user) return;
    libraryBusy.current = true;
    setSavingLibrary(true);
    const current = status.data;
    qc.setQueryData(["library-status", titleId, user.id], current === s ? null : s);
    try {
      await writeLibraryStatus(user.id, titleId, current === s ? null : s);
    } catch {
      toast.error("Couldn't update your library.");
      qc.setQueryData(["library-status", titleId, user.id], current);
    } finally {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["library"] }),
        qc.invalidateQueries({ queryKey: ["library-status", titleId, user.id] }),
      ]);
      libraryBusy.current = false;
      setSavingLibrary(false);
    }
  };
  const s = status.data;
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={savingLibrary || (!!user && (status.isLoading || status.isError))} variant={s === "watched" ? "default" : "outline"} onClick={() => set("watched")} aria-pressed={s === "watched"}>
        {s === "watched" ? <Check /> : <Eye />} Watched
      </Button>
      <Button size="sm" disabled={savingLibrary || (!!user && (status.isLoading || status.isError))} variant={s === "want" ? "default" : "outline"} onClick={() => set("want")} aria-pressed={s === "want"}>
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
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const qc = useQueryClient();
  const lists = useQuery({
    queryKey: ["my-collections", user?.id, titleId],
    enabled: open && !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("collections").select("id, name, collection_items(title_id)").eq("user_id", user.id).eq("removed", false).order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c: any) => ({ id: c.id as string, name: c.name as string, has: (c.collection_items ?? []).some((i: any) => i.title_id === titleId), count: (c.collection_items ?? []).length }));
    },
  });
  const refresh = async () => {
    await Promise.all([
      lists.refetch(),
      qc.invalidateQueries({ queryKey: ["collections"] }),
      qc.invalidateQueries({ queryKey: ["collection"] }),
    ]);
  };
  const toggle = async (c: { id: string; has: boolean; count: number }) => {
    if (busy.current || !user) return;
    busy.current = true;
    setPending(true);
    try {
      if (c.has) {
        const { error } = await supabase.from("collection_items").delete().match({ collection_id: c.id, title_id: titleId });
        if (error) throw error;
      } else {
        await addCollectionItem(c.id, titleId, c.count);
      }
      const { error } = await supabase.from("collections").update({ updated_at: new Date().toISOString() }).eq("id", c.id);
      if (error) throw error;
    } catch {
      toast.error("Couldn't update collection. Please try again.");
    } finally {
      await refresh();
      busy.current = false;
      setPending(false);
    }
  };
  const create = async () => {
    if (!name.trim() || !user || busy.current) return;
    busy.current = true;
    setPending(true);
    let created = false;
    try {
      const { data, error } = await supabase.from("collections").insert({ name: name.trim(), slug: collectionSlug(name), user_id: user.id }).select("id").single();
      if (error || !data) throw error ?? new Error("Collection not created");
      created = true;
      setName("");
      await addCollectionItem(data.id, titleId, 0);
      toast.success("Added to your new collection");
    } catch {
      toast.error(created ? "Collection created, but the title wasn't added. Please try adding it again." : "Couldn't create collection. Please try again.");
    } finally {
      await refresh();
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display text-xl">Add to collection</DialogTitle></DialogHeader>
        <ul className="max-h-64 divide-y overflow-auto">
          {(lists.data ?? []).map((c) => (
            <li key={c.id}>
              <Button variant="ghost" disabled={pending} aria-pressed={c.has} onClick={() => toggle(c)} className="h-auto w-full justify-between whitespace-normal py-2.5 text-left text-sm">
                <span>{c.name}</span>{c.has && <Check className="size-4 text-ember" />}
              </Button>
            </li>
          ))}
          {lists.data?.length === 0 && <li className="py-2 text-sm text-muted-foreground">No collections yet.</li>}
          {lists.isError && <li className="py-2 text-sm text-destructive">Couldn't load your collections.</li>}
        </ul>
        <div className="flex gap-2">
          <Input placeholder="New collection name" disabled={pending} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} onKeyDown={(e) => e.key === "Enter" && create()} />
          <Button onClick={create} disabled={pending || !name.trim()}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
