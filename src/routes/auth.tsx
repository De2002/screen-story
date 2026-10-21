import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { safeRedirect, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({
    redirect: z.string().catch("/").default("/"),
    mode: z.enum(["signin", "signup"]).catch("signin").default("signin"),
  }),
  head: () => ({
    meta: [
      { title: "Join Scruttin" },
      { name: "description", content: "Sign in or create an account to share what stayed with you." },
      { property: "og:title", content: "Join Scruttin" },
      { property: "og:description", content: "Sign in or create an account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const RETURN_KEY = "scruttin:return";

function AuthPage() {
  const { redirect, mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const target = safeRedirect(redirect.startsWith("/auth") ? "/" : redirect);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const isSignup = mode === "signup";

  useEffect(() => {
    if (ready && user) {
      const stored = sessionStorage.getItem(RETURN_KEY);
      sessionStorage.removeItem(RETURN_KEY);
      navigate({ to: safeRedirect(stored ?? target), replace: true });
    }
  }, [ready, user, navigate, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + target, data: { username: username.trim() || undefined } },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message);
    }
  };

  const oauth = async (provider: "google" | "lovable") => {
    sessionStorage.setItem(RETURN_KEY, target);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error("Sign-in didn't complete. Please try again.");
  };

  const forgot = async () => {
    if (!email) return toast.message("Enter your email first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message); else toast.success("Check your email for a reset link.");
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Check your email</h1>
        <p className="mt-3 text-muted-foreground">We sent a confirmation link to {email}. Click it and you'll land right back where you were.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <h1 className="font-display text-4xl">{isSignup ? "Join the conversation" : "Welcome back"}</h1>
      <p className="mt-2 text-muted-foreground">You don't have to be a critic to have something worth saying.</p>
      <div className="mt-8 space-y-2">
        <Button variant="outline" className="w-full" onClick={() => oauth("google")}>Continue with Google</Button>
        <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>Continue with Lovable</button>
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <form onSubmit={submit} className="space-y-4">
        {isSignup && (
          <div className="space-y-1.5"><Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} maxLength={20} placeholder="moviefriend" /></div>
        )}
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignup ? "new-password" : "current-password"} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{isSignup ? "Create account" : "Sign in"}</Button>
      </form>
      <div className="mt-5 flex justify-between text-sm">
        <Link to="/auth" search={{ redirect: target, mode: isSignup ? "signin" : "signup" }} className="text-ember">
          {isSignup ? "I have an account" : "Create an account"}
        </Link>
        {!isSignup && <button onClick={forgot} className="text-muted-foreground hover:text-foreground">Forgot password?</button>}
      </div>
    </div>
  );
}
