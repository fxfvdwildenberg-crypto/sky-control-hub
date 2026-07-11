import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ExternalLink } from "lucide-react";
import { getPrivateServerInvite } from "@/lib/prefs.functions";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/server")({
  head: () => ({ meta: [{ title: "Private server — ATC365" }, { name: "description", content: "Secure invite for verified ATC365 members." }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ServerPage,
});

function ServerPage() {
  const { data: user } = useCurrentUser();
  const fn = useServerFn(getPrivateServerInvite);
  const { data, error, isLoading } = useQuery({
    queryKey: ["private-invite"],
    queryFn: () => fn(),
    enabled: !!user?.hasAtcRole,
    retry: false,
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card>
        <CardContent className="p-6 space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary"><Shield className="h-6 w-6" /></div>
          <h1 className="text-2xl font-bold">Private server</h1>
          <p className="text-sm text-muted-foreground">Restricted to verified ATC365 members.</p>
          {!user && <Link to="/login"><Button>Sign in with Discord</Button></Link>}
          {user && !user.hasAtcRole && <p className="text-sm text-destructive">You need the Air Traffic Control role to access this.</p>}
          {isLoading && user?.hasAtcRole && <p className="text-sm text-muted-foreground">Loading invite…</p>}
          {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
          {data && (
            <a href={data.invite} target="_blank" rel="noreferrer">
              <Button className="gap-2">Open invite <ExternalLink className="h-4 w-4" /></Button>
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
