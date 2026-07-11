import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUserProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/users/$discordId")({
  head: () => ({ meta: [{ title: "Pilot profile — ATC365" }, { name: "description", content: "Pilot profile on ATC365." }] }),
  component: UserProfilePage,
});

function UserProfilePage() {
  const { discordId } = Route.useParams();
  const fn = useServerFn(getUserProfile);
  const { data, isLoading } = useQuery({ queryKey: ["user-profile", discordId], queryFn: () => fn({ data: { discordId } }) });
  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-8 text-sm">User not found. <Link to="/users" className="text-primary underline">Back</Link></div>;
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-3">
            {data.avatar ? <img src={`https://cdn.discordapp.com/avatars/${data.discordId}/${data.avatar}.png`} className="h-16 w-16 rounded-full" alt="" /> : <div className="h-16 w-16 rounded-full bg-muted" />}
            <div>
              <h1 className="text-xl font-bold font-mono">{data.username}</h1>
              <div className="flex gap-1.5 mt-1">
                {data.equippedTag && <Badge variant="secondary">{data.equippedTag}</Badge>}
                {data.hasAtcRole && <Badge className="bg-primary/20 text-primary border-primary/40">ATC</Badge>}
                <Badge variant="outline">{data.tier}</Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center pt-3 border-t">
            <div><div className="text-xl font-mono font-bold">{data.tokens}</div><div className="text-[10px] uppercase text-muted-foreground">Tokens</div></div>
            <div><div className="text-xl font-mono font-bold">{data.loginStreak}</div><div className="text-[10px] uppercase text-muted-foreground">Streak (d)</div></div>
            <div><div className="text-xl font-mono font-bold">{data.ownedTags.length}</div><div className="text-[10px] uppercase text-muted-foreground">Tags owned</div></div>
          </div>
        </CardContent>
      </Card>
      <Link to="/users" className="text-sm text-primary underline">← All users</Link>
    </div>
  );
}
