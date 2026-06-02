import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Headphones, Volume2, Users, Radar, RefreshCw, X, ExternalLink, Search, Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type Mode = "easy" | "hard";

function frequencyOf(name: string): string {
  // Voice channel names look like "362.372 | Foo". The frequency is the first token.
  return (name.split(/\s/)[0] ?? "").trim();
}

function VoicePage() {
  const list = useServerFn(listVoiceChannels);
  const claim = useServerFn(claimAtcSpot);
  const release = useServerFn(releaseAtcSpot);
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();

  const [mode, setMode] = useState<Mode>("easy");
  const [query, setQuery] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["voice-channels"],
    queryFn: () => list(),
    refetchInterval: 15_000,
  });

  const claimMut = useMutation({
    mutationFn: (v: { channelId: string; channelName: string }) => claim({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(`Claimed ${v.channelName} as ATC (auto-releases in 1h)`);
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
  const canClaimAtc = !!user?.hasAtcRole;

  const filtered = useMemo(() => {
    const channels = data?.channels ?? [];
    const q = query.trim().toLowerCase();
    if (mode === "hard") {
      // HARD: nothing visible until query matches exact frequency
      if (!q) return [];
      return channels.filter((c) => frequencyOf(c.name).toLowerCase() === q);
    }
    if (!q) return channels;
    return channels.filter((c) => c.name.toLowerCase().includes(q));
  }, [data, query, mode]);

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
              {filtered.length} of {data?.channels.length ?? 0} channels • Live from Discord
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="inline-flex rounded-md border border-border p-0.5">
          <button
            onClick={() => { setMode("easy"); setQuery(""); }}
            className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded ${mode === "easy" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Easy
          </button>
          <button
            onClick={() => { setMode("hard"); setQuery(""); }}
            className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded ${mode === "hard" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Hard
          </button>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          {mode === "hard" ? (
            <Radio className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          ) : (
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "hard" ? "Search by frequency only (e.g. 362.372)" : "Search channels…"}
            className="pl-8 font-mono"
          />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {mode === "hard" ? "Hard: frequency search only" : "Easy: full name search"}
        </span>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          Loading voice channels…
        </div>
      )}

      {!isLoading && data && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          {mode === "hard"
            ? "Hard mode: type the exact frequency (e.g. 362.372) to reveal a channel."
            : "No voice channels match your search."}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((ch) => {
          const claim = data?.claims.find((c) => c.channel_id === ch.id);
          const isMine = claim?.discord_id === user?.discordId;
          const joinUrl = guildId ? `discord://discord.com/channels/${guildId}/${ch.id}` : "#";
          const webUrl = guildId ? `https://discord.com/channels/${guildId}/${ch.id}` : "#";
          const freq = frequencyOf(ch.name);

          return (
            <div
              key={ch.id}
              className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 animate-fade-in-up"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Volume2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate font-mono text-sm font-semibold">
                    {mode === "hard" ? freq : ch.name}
                  </span>
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

              {mode === "easy" && ch.members.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {ch.members.slice(0, 6).map((m) => (
                    <span key={m.id} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {m.username}
                    </span>
                  ))}
                </div>
              )}

              {claim && mode === "easy" && (
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
                ) : canClaimAtc ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!claim || claimMut.isPending}
                    onClick={() => claimMut.mutate({ channelId: ch.id, channelName: ch.name })}
                    className="gap-1.5"
                  >
                    <Radar className="h-3.5 w-3.5" /> {claim ? "Claimed" : "Claim ATC"}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
