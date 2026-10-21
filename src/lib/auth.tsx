import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  status: string;
};

type AuthCtx = {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  ready: boolean;
  /** Returns true when signed in, otherwise opens the sign-in prompt. */
  requireAuth: (reason?: string) => boolean;
  promptReason: string | null;
  closePrompt: () => void;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [promptReason, setPromptReason] = useState<string | null>(null);

  const load = useCallback(async (u: User | null) => {
    setUser(u);
    if (!u) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.id),
    ]);
    setProfile((p as Profile) ?? null);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        setTimeout(() => {
          load(session?.user ?? null).finally(() => setReady(true));
          if (event === "SIGNED_IN" || event === "SIGNED_OUT") qc.invalidateQueries();
        }, 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [load, qc]);

  const requireAuth = useCallback(
    (reason?: string) => {
      if (user) return true;
      setPromptReason(reason ?? "Join the conversation");
      return false;
    },
    [user],
  );

  return (
    <Ctx.Provider
      value={{
        user, profile, isAdmin, ready, requireAuth, promptReason,
        closePrompt: () => setPromptReason(null),
        refreshProfile: () => load(user),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}

export function safeRedirect(path: unknown): string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/";
}
