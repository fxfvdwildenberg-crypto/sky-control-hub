import { createFileRoute, Link } from "@tanstack/react-router";
import { useCurrentUser } from "@/lib/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ExternalLink, Lock } from "lucide-react";
import { sfx } from "@/lib/sounds";

const ROBLOX_PRIVATE_SERVER =
  "https://www.roblox.com/share?code=e71d47864a886a48a67dda3f424b73cb&type=Server";

export const Route = createFileRoute("/server")({
  head: () => ({
    meta: [
      { title: "Private server — ATC365" },
      { name: "description", content: "Roblox private server for verified ATC365 controllers." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ServerPage,
});

function ServerPage() {
  const { data: user, isLoading } = useCurrentUser();
  const unlocked = !!user?.hasAtcRole;

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card className="animate-fade-in-up overflow-hidden">
        <CardContent className="p-6 space-y-4 text-center">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${unlocked ? "bg-primary/15 text-primary animate-pulse-soft" : "bg-muted text-muted-foreground"}`}>
            {unlocked ? <Shield className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
          </div>
          <h1 className="text-2xl font-bold">Private Roblox server</h1>
          <p className="text-sm text-muted-foreground">
            Restricted to members with the <span className="font-mono text-foreground">ATC365</span> role.
          </p>

          {isLoading && <p className="text-sm text-muted-foreground">Verifying access…</p>}

          {!isLoading && !user && (
            <Link to="/login"><Button onClick={() => sfx.click()}>Sign in with Discord</Button></Link>
          )}

          {!isLoading && user && !unlocked && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              You need the ATC365 role in the ATC365 Discord to access this server.
            </div>
          )}

          {unlocked && (
            <a
              href={ROBLOX_PRIVATE_SERVER}
              target="_blank"
              rel="noreferrer"
              onClick={() => sfx.success()}
              className="inline-block"
            >
              <Button size="lg" className="gap-2 hover:-translate-y-0.5 hover:shadow-lg transition-all">
                Join private server <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
