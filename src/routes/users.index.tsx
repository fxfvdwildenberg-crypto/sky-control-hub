import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus } from "lucide-react";
import { listUsers, sendFriendRequest } from "@/lib/prefs.functions";
import { useCurrentUser } from "@/lib/use-current-user";
import { toast } from "sonner";

export const Route = createFileRoute("/users/")({
  head: () => ({ meta: [{ title: "Users — ATC365" }, { name: "description", content: "Browse ATC365 pilots and controllers." }] }),
  component: UsersPage,
});

function UsersPage() {
  const listFn = useServerFn(listUsers);
  const sendFn = useServerFn(sendFriendRequest);
  const { data: me } = useCurrentUser();
  const { data = [] } = useQuery({ queryKey: ["users-list"], queryFn: () => listFn(), staleTime: 30_000 });
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return data.filter((u) => !s || u.username?.toLowerCase().includes(s));
  }, [data, q]);
  const friendMut = useMutation({
    mutationFn: (id: string) => sendFn({ data: { friendDiscordId: id } }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["my-friends"] }); toast.success(r.accepted ? "You're now friends!" : "Friend request sent"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary"><Users className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">{data.length} pilots and controllers</p>
        </div>
      </header>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" />
      <div className="grid gap-2">
        {filtered.map((u) => (
          <Card key={u.discord_id} className="transition hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="flex items-center gap-3 p-3">
              {u.avatar ? (
                <img src={`https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png`} className="h-10 w-10 rounded-full" alt="" />
              ) : <div className="h-10 w-10 rounded-full bg-muted" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <Link to="/users/$discordId" params={{ discordId: u.discord_id }} className="truncate hover:underline">{u.username}</Link>
                  {u.equipped_tag && <Badge variant="secondary" className="text-[10px]">{u.equipped_tag}</Badge>}
                  {u.has_atc_role && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/40">ATC</Badge>}
                </div>
                <div className="font-mono text-xs text-muted-foreground">{u.tokens} pts · {u.flightPlans} plans</div>
              </div>
              {me && me.discordId !== u.discord_id && (
                <Button size="sm" variant="outline" onClick={() => friendMut.mutate(u.discord_id)}>
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
