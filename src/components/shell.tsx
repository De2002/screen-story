import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Compass, Search, Library, User, LogOut, Settings, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./bits";
import { SearchBox } from "./search-box";
import { useQueryClient } from "@tanstack/react-query";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/search", label: "Search", icon: Search },
  { to: "/collections", label: "Collections", icon: Library },
] as const;

export function Wordmark() {
  return <Link to="/" className="font-display text-2xl tracking-tight text-foreground">Scruttin<span className="text-ember">.</span></Link>;
}

function AccountMenu() {
  const { user, profile, isAdmin, ready } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const loc = useLocation();
  if (!ready) return <span className="size-8" />;
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link to="/auth" search={{ redirect: loc.href, mode: "signin" }}>Sign in</Link></Button>
        <Button size="sm" asChild><Link to="/auth" search={{ redirect: loc.href, mode: "signup" }}>Get started</Link></Button>
      </div>
    );
  }
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account" className="rounded-full">
        {profile ? <UserAvatar author={profile} size={32} /> : <span className="block size-8 rounded-full bg-muted" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {profile && <DropdownMenuItem asChild><Link to="/u/$username" params={{ username: profile.username }}><User className="size-4" /> Profile</Link></DropdownMenuItem>}
        <DropdownMenuItem asChild><Link to="/library"><Library className="size-4" /> Library</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings"><Settings className="size-4" /> Settings</Link></DropdownMenuItem>
        {isAdmin && <DropdownMenuItem asChild><Link to="/admin"><Shield className="size-4" /> Moderation</Link></DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}><LogOut className="size-4" /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AuthPrompt() {
  const { promptReason, closePrompt } = useAuth();
  const loc = useLocation();
  return (
    <Dialog open={!!promptReason} onOpenChange={(o) => !o && closePrompt()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{promptReason}</DialogTitle>
          <DialogDescription>You don't have to be a critic to have something worth saying. It takes a few seconds to join.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button asChild onClick={closePrompt}><Link to="/auth" search={{ redirect: loc.href, mode: "signup" }}>Get started</Link></Button>
          <Button variant="ghost" asChild onClick={closePrompt}><Link to="/auth" search={{ redirect: loc.href, mode: "signin" }}>I already have an account</Link></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const { user, profile } = useAuth();
  const isActive = (to: string) => (to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to));
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Wordmark />
          <nav className="hidden items-center gap-5 md:flex" aria-label="Main">
            {NAV.filter((n) => n.to !== "/search").map((n) => (
              <Link key={n.to} to={n.to} className={isActive(n.to) ? "text-sm font-medium text-foreground" : "text-sm text-muted-foreground hover:text-foreground"}>{n.label}</Link>
            ))}
            {user && <Link to="/library" className={isActive("/library") ? "text-sm font-medium text-foreground" : "text-sm text-muted-foreground hover:text-foreground"}>Library</Link>}
          </nav>
          <SearchBox className="ml-auto hidden w-72 md:block" />
          <div className="ml-auto md:ml-0"><AccountMenu /></div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mx-auto hidden max-w-5xl px-4 py-10 text-xs text-muted-foreground md:block">
        <Link to="/guidelines" className="hover:text-foreground">Community guidelines & copyright</Link>
        <span className="mx-2">·</span>Movie and series data from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
      </footer>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive(n.to) ? "text-foreground" : "text-muted-foreground"}`}>
              <n.icon className="size-5" />{n.label}
            </Link>
          ))}
          {profile ? (
            <Link to="/library" className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive("/library") ? "text-foreground" : "text-muted-foreground"}`}>
              <User className="size-5" />Profile
            </Link>
          ) : (
            <Link to="/auth" search={{ redirect: loc.href, mode: "signin" }} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground">
              <User className="size-5" />Sign in
            </Link>
          )}
        </div>
      </nav>
      <AuthPrompt />
    </div>
  );
}

export function Page({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return <div className={`mx-auto px-4 py-6 ${narrow ? "max-w-2xl" : "max-w-5xl"}`}>{children}</div>;
}
