import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Scruttin" },
      { name: "description", content: "Choose a new password for your Scruttin account." },
      { property: "og:title", content: "Reset password — Scruttin" },
      { property: "og:description", content: "Choose a new password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message); else { toast.success("Password updated"); navigate({ to: "/" }); }
  };
  return (
    <form onSubmit={save} className="mx-auto max-w-sm space-y-4 px-4 py-16">
      <h1 className="font-display text-3xl">Choose a new password</h1>
      <Input type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
      <Button type="submit" className="w-full">Save password</Button>
    </form>
  );
}
