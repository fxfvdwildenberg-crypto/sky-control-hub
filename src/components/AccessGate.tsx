import { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useCurrentUser } from "@/lib/use-current-user";
import { Button } from "@/components/ui/button";
import { LogIn, ShieldAlert, Loader2, Plane } from "lucide-react";

const ALLOW = new Set<string>(["/login"]);

export function AccessGate({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const path = loc.pathname;
  const allowed = ALLOW.has(path) || path.startsWith("/api/");
  const { data: user, isLoading } = useCurrentUser();

  if (allowed) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying access…
      </div>
    );
  }

  if (user?.hasAtcRole) return <>{children}</>;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Plane className="h-6 w-6 -rotate-45" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">ATC365 role required</h1>
        {!user ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with Discord to continue. Access to ATC365 is restricted to members with the
            <strong> ATC365</strong> role.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Hi <span className="font-mono">{user.username}</span> — your Discord account doesn't have the
            <strong> ATC365</strong> role yet. Join the ATC365 Discord and request the role to unlock the site.
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          {!user && (
            <Link to="/login">
              <Button className="w-full gap-2"><LogIn className="h-4 w-4" /> Sign in with Discord</Button>
            </Link>
          )}
          <a href="https://discord.gg/pR6rWqhh9E" target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full gap-2">
              <ShieldAlert className="h-4 w-4" /> Join ATC365 Discord
            </Button>
          </a>
          {user && (
            <Link to="/login">
              <Button variant="ghost" className="w-full text-xs">Re-check role</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
