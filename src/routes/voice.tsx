import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Headphones, Volume2, Users, Radar, RefreshCw, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/use-current-user";
import { listVoiceChannels, claimAtcSpot, releaseAtcSpot } from "@/lib/voice.functions";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Voice Channels — ATC365" },
      { name: "description", content: "Browse Discord voice channels and claim an ATC position." },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  const list = useServerFn(listVoiceChannels);
  const claim = useServerFn(claimAtcSpot);
  const release = useServerFn(releaseAtcSpot);
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["voice-channels"],
    queryFn: () => list(),
    refetchInterval: 15_000,
  });

  const claimMut = useMutation({
    mutationFn: (v: { channelId: string; channelName: string }) => claim({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(`Claimed ${v.channelName} as ATC`);
      qc.invalidateQueries({ queryKey: ["voice-channels"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const releaseMut = useMutation({
    mutationFn: () => release(),
    onSuccess: () => {
      toast.success("Released ATC position");
      qc.invalidateQueries({ queryKey: ["voice-channels"] });
    },
  });

  const guildId = data?.guildId;
  const myClaim = data?.claims.find((c) => c.discord_id === user?.discordId);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Voice Channels</h1>
            <p className="text-sm text-muted-foreground">
              {data?.channels.length ?? 0} channels • Live from Discord
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {myClaim && (
            <Button size="sm" variant="outline" onClick={() => releaseMut.mutate()} className="gap-2">
              <X className="h-3.5 w-3.5" /> Release {myClaim.channel_name}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </header>

      {isLoading && (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          Loading voice channels…
        </div>
      )}

      {!isLoading && data && data.channels.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          No voice channels found. Make sure the bot has access to the server.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.channels.map((ch) => {
          const claim = data.claims.find((c) => c.channel_id === ch.id);
          const isMine = claim?.discord_id === user?.discordId;
          const joinUrl = guildId ? `discord://discord.com/channels/${guildId}/${ch.id}` : "#";
          const webUrl = guildId ? `https://discord.com/channels/${guildId}/${ch.id}` : "#";

          return (
            <div
              key={ch.id}
              className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 animate-fade-in-up"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Volume2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate font-mono text-sm font-semibold">{ch.name}</span>
                </div>
                {claim && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-primary">
                    <Radar className="h-3 w-3" /> ATC
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3" />
                <span className="font-mono">
                  {ch.members.length}
                  {ch.userLimit > 0 ? ` / ${ch.userLimit}` : ""} connected
                </span>
              </div>

              {ch.members.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {ch.members.slice(0, 6).map((m) => (
                    <span key={m.id} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {m.username}
                    </span>
                  ))}
                </div>
              )}

              {claim && (
                <div className="mt-2 rounded-md bg-primary/5 px-2 py-1 text-[11px]">
                  <span className="text-muted-foreground">Controller: </span>
                  <span className="font-mono font-semibold">{claim.username}</span>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <a href={joinUrl} className="flex-1">
                  <Button size="sm" className="w-full gap-1.5">
                    <Headphones className="h-3.5 w-3.5" /> Join
                  </Button>
                </a>
                <a href={webUrl} target="_blank" rel="noreferrer" title="Open in browser">
                  <Button size="sm" variant="ghost" className="px-2">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
                {isMine ? (
                  <Button size="sm" variant="outline" onClick={() => releaseMut.mutate()} className="gap-1.5">
                    <X className="h-3.5 w-3.5" /> Release
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!claim || claimMut.isPending}
                    onClick={() => claimMut.mutate({ channelId: ch.id, channelName: ch.name })}
                    className="gap-1.5"
                  >
                    <Radar className="h-3.5 w-3.5" /> {claim ? "Claimed" : "Claim ATC"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
