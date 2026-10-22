import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/tanstack-react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ensureProfile } from "@/lib/d1.server";

export type User = { id: string; primaryEmailAddress?: { emailAddress: string } | null };

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
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [promptReason, setPromptReason] = useState<string | null>(null);
  const ready = isLoaded;

  const load = useCallback(async (u: User | null) => {
    setUser(u);
    if (!u) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    const p = await ensureProfile();
    setProfile(p as Profile);
    setIsAdmin(false);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const u = isSignedIn && clerkUser ? {
      id: clerkUser.id,
      primaryEmailAddress: clerkUser.primaryEmailAddress,
    } : null;
    load(u).catch((error) => console.error("[v0] Failed to provision Clerk profile", error));
    qc.invalidateQueries();
  }, [clerkUser, isLoaded, isSignedIn, load, qc]);

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
