import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, UserX, Users } from "lucide-react";
import { listMyFriends, acceptFriend, removeFriend } from "@/lib/prefs.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/friends")({
  head: () => ({ meta: [{ title: "Friends — ATC365" }, { name: "description", content: "Your ATC365 friends and requests." }] }),
  component: FriendsPage,
});

function FriendsPage() {
  const listFn = useServerFn(listMyFriends);
  const acceptFn = useServerFn(acceptFriend);
  const removeFn = useServerFn(removeFriend);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-friends"], queryFn: () => listFn(), staleTime: 15_000 });
  const accept = useMutation({ mutationFn: (id: string) => acceptFn({ data: { requesterDiscordId: id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-friends"] }); toast.success("Friend added"); } });
  const remove = useMutation({ mutationFn: (id: string) => removeFn({ data: { friendDiscordId: id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-friends"] }); toast.success("Removed"); } });

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary"><Users className="h-5 w-5" /></div>
        <h1 className="text-2xl font-bold">Friends</h1>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Incoming requests ({data?.incoming.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!data?.incoming.length && <p className="text-sm text-muted-foreground">No pending requests.</p>}
          {data?.incoming.map((u) => (
            <div key={u.discord_id} className="flex items-center gap-2 rounded border p-2">
              <span className="flex-1 font-mono text-sm">{u.username}</span>
              <Button size="sm" onClick={() => accept.mutate(u.discord_id)}><UserCheck className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(u.discord_id)}><UserX className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Friends ({data?.accepted.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!data?.accepted.length && <p className="text-sm text-muted-foreground">No friends yet. Head to <a href="/users" className="text-primary underline">Users</a>.</p>}
          {data?.accepted.map((u) => (
            <div key={u.discord_id} className="flex items-center gap-2 rounded border p-2">
              <span className="flex-1 font-mono text-sm">{u.username}</span>
              <span className="font-mono text-xs text-muted-foreground">{u.tokens} pts</span>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(u.discord_id)}><UserX className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sent ({data?.outgoing.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {data?.outgoing.map((u) => (
            <div key={u.discord_id} className="text-sm font-mono text-muted-foreground">{u.username} — pending</div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
