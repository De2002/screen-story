import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Page } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Scruttin" },
      { name: "description", content: "Manage your Scruttin profile." },
      { property: "og:title", content: "Settings — Scruttin" },
      { property: "og:description", content: "Manage your profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { profile, refreshProfile } = useAuth();
  const [f, setF] = useState({ username: "", display_name: "", bio: "", avatar_url: "" });
  useEffect(() => {
    if (profile) setF({ username: profile.username, display_name: profile.display_name, bio: profile.bio, avatar_url: profile.avatar_url ?? "" });
  }, [profile]);
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    if (!profile) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB.");
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error || !signed.data) throw signed.error;
      const url = signed.data.signedUrl;
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
      if (error) throw error;
      setF((p) => ({ ...p, avatar_url: url }));
      toast.success("Profile picture updated");
      refreshProfile();
    } catch {
      toast.error("Couldn't upload that picture.");
    } finally {
      setUploading(false);
    }
  };
  const save = async () => {
    if (!profile) return;
    const username = f.username.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (username.length < 3) return toast.error("Username needs at least 3 letters or numbers.");
    const { error } = await supabase.from("profiles").update({
      username, display_name: f.display_name.trim(), bio: f.bio.trim(), avatar_url: f.avatar_url.trim() || null,
    }).eq("id", profile.id);
    if (error) toast.error(error.code === "23505" ? "That username is taken." : "Couldn't save.");
    else { toast.success("Saved"); refreshProfile(); }
  };
  return (
    <Page narrow>
      <h1 className="font-display text-4xl">Settings</h1>
      <div className="mt-8 space-y-5">
        <div className="space-y-1.5"><Label htmlFor="u">Username</Label><Input id="u" value={f.username} maxLength={20} onChange={(e) => setF({ ...f, username: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="d">Display name</Label><Input id="d" value={f.display_name} maxLength={50} onChange={(e) => setF({ ...f, display_name: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label htmlFor="a">Profile picture</Label>
          <div className="flex items-center gap-4">
            {f.avatar_url ? (
              <img src={f.avatar_url} alt="Your profile picture" className="size-16 rounded-full object-cover" />
            ) : (
              <div className="size-16 rounded-full bg-muted" />
            )}
            <Input id="a" type="file" accept="image/*" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file); e.target.value = ""; }} />
          </div>
          {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
        </div>
        <div className="space-y-1.5"><Label htmlFor="b">About you</Label><Textarea id="b" value={f.bio} maxLength={300} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
        <Button onClick={save}>Save changes</Button>
      </div>
    </Page>
  );
}
