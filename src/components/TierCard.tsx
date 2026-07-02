import { TIERS, type Tier } from "@/lib/profile.functions";
import basicAsset from "@/assets/tier-basic.png.asset.json";
import silverAsset from "@/assets/tier-silver.png.asset.json";
import goldAsset from "@/assets/tier-gold.png.asset.json";
import premiumAsset from "@/assets/tier-premium.png.asset.json";

export const TIER_IMAGE: Record<Tier, string> = {
  Basic: basicAsset.url,
  Silver: silverAsset.url,
  Gold: goldAsset.url,
  Premium: premiumAsset.url,
};

export const TIER_ACCENT: Record<Tier, string> = {
  Basic: "text-zinc-300",
  Silver: "text-slate-300",
  Gold: "text-amber-400",
  Premium: "text-indigo-300",
};

export function TierCard({ tier, className = "" }: { tier: Tier; className?: string }) {
  return (
    <img
      src={TIER_IMAGE[tier]}
      alt={`${tier} tier card`}
      className={`w-full max-w-sm rounded-xl shadow-lg ${className}`}
    />
  );
}

export function tierList() {
  return TIERS;
}
