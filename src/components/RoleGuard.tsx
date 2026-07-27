import { Link } from "@tanstack/react-router";
import { ReactNode } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogIn, Loader2 } from "lucide-react";

export function RoleGuard({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying access…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <LogIn className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="text-lg font-semibold">Sign in required</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This area is restricted to verified controllers.
          </p>
          <Link to="/login" className="mt-4 inline-block">
            <Button className="gap-2"><LogIn className="h-4 w-4" /> Sign in with Discord</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!user.hasControllerRole) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-destructive/40 bg-card p-6 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <h2 className="text-lg font-semibold">Air Traffic Control role required</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hi <span className="font-mono">{user.username}</span> — controller tools are limited to members with the <strong>Air Traffic Control</strong> role in the ATC365 server.
          </p>
          <a
            href="https://discord.gg/pR6rWqhh9E"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block"
          >
            <Button variant="outline">Request the role on Discord</Button>
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
