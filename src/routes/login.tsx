import { createFileRoute, Link } from "@tanstack/react-router";
import { useCurrentUser } from "@/lib/use-current-user";
import { Button } from "@/components/ui/button";
import { LogIn, ShieldAlert, Plane } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ error: (s.error as string) || "" }),
  head: () => ({ meta: [{ title: "Sign in — ATC365" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { error } = Route.useSearch();
  const { data: user, isLoading } = useCurrentUser();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Plane className="h-5 w-5 -rotate-45" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Controller Sign-in</h1>
            <p className="text-xs text-muted-foreground">Discord verification required</p>
          </div>
        </div>

        {error === "no_role" && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Access denied</div>
              <div className="text-xs opacity-90">
                You must be a member of the ATC365 Discord with the <strong>Air Traffic Control</strong> role.
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking session…</p>
        ) : user?.hasAtcRole ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-mono text-foreground">{user.username}</span>
            </p>
            <Link to="/atc"><Button className="w-full">Enter ATC Center</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in with Discord to access the ATC Center and ATIS broadcasts. We'll verify your role in the ATC365 server.
            </p>
            <a href="/api/public/discord/login">
              <Button className="w-full gap-2 bg-[#5865F2] text-white hover:bg-[#4752c4]">
                <LogIn className="h-4 w-4" />
                Continue with Discord
              </Button>
            </a>
            <a
              href="https://discord.gg/pR6rWqhh9E"
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Need access? Join the ATC365 Discord →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
