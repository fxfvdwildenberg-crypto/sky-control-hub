import { Coins, Plane, Shield } from "lucide-react";
import { useMyProfile } from "@/lib/use-my-profile";
import { useFlightStore } from "@/lib/flight-store";
import { usePrefs } from "@/lib/prefs";
import { useCurrentUser } from "@/lib/use-current-user";

export function MiniStats() {
  const { prefs } = usePrefs();
  const { data: profile } = useMyProfile();
  const { data: user } = useCurrentUser();
  const { flights } = useFlightStore();
  if (!prefs.miniStats || !profile) return null;
  const myActive = flights.filter((f) => f.filerDiscordId === user?.discordId && f.status !== "landed").length;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 hidden md:flex">
      <div className="pointer-events-auto flex flex-col gap-1 rounded-lg border border-border bg-card/95 px-3 py-2 text-[11px] font-mono shadow-lg backdrop-blur">
        <div className="flex items-center gap-2"><Coins className="h-3 w-3 text-primary" /> {profile.tokens} pts · {profile.tier}</div>
        <div className="flex items-center gap-2"><Plane className="h-3 w-3 text-primary" /> {myActive} active</div>
        <div className="flex items-center gap-2"><Shield className="h-3 w-3" /> {user?.hasAtcRole ? "ATC" : "no ATC"}</div>
      </div>
    </div>
  );
}
