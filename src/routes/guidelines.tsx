import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Page } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/guidelines")({
  head: () => ({
    meta: [
      { title: "Community guidelines & copyright — Scruttin" },
      { name: "description", content: "How we keep Scruttin calm and kind, our rules on quotes, and how to file a copyright complaint." },
      { property: "og:title", content: "Community guidelines — Scruttin" },
      { property: "og:description", content: "How we keep Scruttin calm and kind." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Guidelines,
});

function Guidelines() {
  const { user, requireAuth } = useAuth();
  const [text, setText] = useState("");
  const send = async () => {
    if (!requireAuth("Sign in to file a copyright complaint")) return;
    const { error } = await supabase.from("reports").insert({ reporter_id: user!.id, target_type: "copyright", reason: text.trim() });
    if (error) toast.error("Couldn't send."); else { setText(""); toast.success("Received. We'll review it and take down infringing content."); }
  };
  return (
    <Page narrow>
      <h1 className="font-display text-4xl">Community guidelines</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed">
        <p>Scruttin is a quiet room for people who just finished watching something. Be kind. Disagree with ideas, never with people.</p>
        <p><strong>Mark spoilers.</strong> If it gives away a twist, an ending or a death, switch on “Spoilers”.</p>
        <p><strong>No ratings.</strong> Say what stayed with you — not a score.</p>
        <p><strong>Keep quotes short.</strong> A line or two of dialogue is a quote. Long passages, full scenes or scripts are not allowed, because they belong to the people who wrote them.</p>
        <p><strong>No spam, harassment or hate.</strong> Repeated breaks lead to restrictions or a ban.</p>
      </div>
      <h2 className="mt-12 font-display text-2xl">Copyright complaints</h2>
      <p className="mt-2 text-[15px] text-muted-foreground">If you hold rights to material posted here, tell us what it is, where it appears (link), and how to reach you. We review every request and remove infringing content.</p>
      <Textarea className="mt-4" rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Work, link to the content, your contact details…" />
      <Button className="mt-3" onClick={send} disabled={text.trim().length < 10}>Send complaint</Button>
    </Page>
  );
}
