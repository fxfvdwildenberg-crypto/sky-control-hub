import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Coins, Flame, LogIn, Sparkles, Tag as TagIcon, Trophy } from "lucide-react";
import { useMyProfile } from "@/lib/use-my-profile";
import { equipTag, TIERS } from "@/lib/profile.functions";
import { TierCard, TIER_ACCENT } from "@/components/TierCard";
import type { Tier } from "@/lib/profile.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — ATC365" },
      { name: "description", content: "Your ATC365 loyalty profile, tokens, streak, and tags." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile, isLoading } = useMyProfile();
  const equipFn = useServerFn(equipTag);
  const qc = useQueryClient();
  const equipMut = useMutation({
    mutationFn: (tag: string | null) => equipFn({ data: { tag } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-profile"] }); toast.success("Tag updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground font-mono">Loading profile…</div>;
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center space-y-4">
        <Sparkles className="h-10 w-10 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">Sign in to see your profile</h1>
        <p className="text-sm text-muted-foreground">Earn tokens, unlock tiers, and grab tags from the shop.</p>
        <Link to="/login"><Button>Sign in with Discord</Button></Link>
      </div>
    );
  }

  const tier = profile.tier as Tier;
  const currentTierMeta = TIERS.find((t) => t.name === tier)!;
  const nextTierMeta = profile.nextTier ? TIERS.find((t) => t.name === profile.nextTier) : null;
  const progressPct = nextTierMeta
    ? Math.min(100, ((profile.tokens - currentTierMeta.min) / (nextTierMeta.min - currentTierMeta.min)) * 100)
    : 100;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8">
      <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-6 border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold">
              {profile.username.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">👋 Hey, {profile.username}!</h1>
                {profile.equippedTag && <Badge className="bg-primary text-primary-foreground">{profile.equippedTag}</Badge>}
                {profile.hasAtcRole && <Badge variant="outline" className="border-status-landed text-status-landed">ATC</Badge>}
              </div>
              <p className={`text-sm mt-1 font-semibold ${TIER_ACCENT[tier]}`}>
                <Trophy className="inline h-4 w-4 mr-1" /> {tier} tier
              </p>
            </div>
          </div>
          {profile.loginAward > 0 && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 gap-1">
              <LogIn className="h-3 w-3" /> +{profile.loginAward} daily bonus claimed!
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Coins className="h-4 w-4" />} label="Tokens" value={profile.tokens} />
        <StatCard icon={<Flame className="h-4 w-4" />} label="Login streak" value={`${profile.loginStreak} day${profile.loginStreak === 1 ? "" : "s"}`} />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label="Earned today" value={`${profile.earnedToday}/${currentTierMeta.dailyCap}`} />
        <StatCard icon={<LogIn className="h-4 w-4" />} label="Tomorrow's login bonus" value={`+${profile.nextLoginBonus}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {nextTierMeta ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>{tier}</span>
                  <span className="text-muted-foreground">{profile.pointsToNext} points to {nextTierMeta.name}</span>
                </div>
                <Progress value={progressPct} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">🎉 You've hit the top tier. Keep flying!</p>
            )}
            <div className="mt-4 rounded-md bg-muted/40 p-4 text-sm">
              <div className="font-semibold mb-2">{tier} perks</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {currentTierMeta.perks.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Your card</CardTitle></CardHeader>
          <CardContent className="flex justify-center"><TierCard tier={tier} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TagIcon className="h-4 w-4" /> Your tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.ownedTags.length === 0 && (
            <p className="text-sm text-muted-foreground">You don't own any tags yet. Visit the <Link to="/shop" className="text-primary underline">shop</Link> to buy some!</p>
          )}
          <div className="flex flex-wrap gap-2">
            {profile.ownedTags.map((t) => (
              <button
                key={t}
                onClick={() => equipMut.mutate(profile.equippedTag === t ? null : t)}
                className={`rounded-full px-3 py-1 text-xs border transition ${
                  profile.equippedTag === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                {t}{profile.equippedTag === t ? " · equipped" : ""}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>How to earn tokens</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div>✈️ File a flight plan — <b>+{5 * currentTierMeta.multiplier}</b> tokens (max {currentTierMeta.dailyCap}/day)</div>
          <div>📡 Broadcast an ATIS — <b>+{5 * currentTierMeta.multiplier}</b> tokens (max {currentTierMeta.dailyCap}/day)</div>
          <div>📅 Log in daily — 5 → 7 → 10 → 15 tokens as your streak grows</div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">{icon}{label}</div>
        <div className="text-2xl font-bold font-mono mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full bg-gradient-to-r from-primary via-primary to-accent transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}
