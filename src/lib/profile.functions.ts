import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAppSession } from "./session.server";
import { OWNER_DISCORD_ID } from "./owner.functions";

export type Tier = "Basic" | "Silver" | "Gold" | "Premium";

export const TIERS: {
  name: Tier;
  min: number;
  max: number | null;
  multiplier: number;
  dailyCap: number;
  perks: string[];
}[] = [
  { name: "Basic", min: 0, max: 49, multiplier: 1, dailyCap: 15, perks: ["Starter tier"] },
  { name: "Silver", min: 50, max: 249, multiplier: 2, dailyCap: 25, perks: ["2× points for ATIS/flight plans", "Daily cap 25"] },
  { name: "Gold", min: 250, max: 999, multiplier: 2, dailyCap: 25, perks: ["2× points", "Priority in the sky", "Daily cap 25"] },
  { name: "Premium", min: 1000, max: null, multiplier: 2, dailyCap: 25, perks: ["2× points", "Priority in the sky", "Elite status"] },
];

export function tierFor(points: number): (typeof TIERS)[number] {
  return [...TIERS].reverse().find((t) => points >= t.min) ?? TIERS[0];
}

export function nextTier(points: number): (typeof TIERS)[number] | null {
  return TIERS.find((t) => t.min > points) ?? null;
}

export const SHOP_TAGS: { tag: string; cost: number; note?: string }[] = [
  { tag: "No life", cost: 200 },
  { tag: "Flight master", cost: 100 },
  { tag: "Sky boss", cost: 75 },
  { tag: "Airbus", cost: 50 },
  { tag: "Boeing", cost: 50 },
  { tag: "Taxi king", cost: 30 },
  { tag: "beginner", cost: 5 },
];

// Base per-action reward before tier multiplier
export const BASE_REWARD = 5;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function loginBonus(streak: number): number {
  if (streak <= 1) return 5;
  if (streak <= 4) return 7;
  if (streak <= 6) return 10;
  return 15;
}

/**
 * Set the user's Discord guild nickname based on their equipped tag / ATC role.
 * Format: "{TAG} | {username}" — falls back to null (clears nickname) when no tag.
 * Best-effort: silently no-ops on missing env or Discord errors.
 */
export async function syncDiscordNickname(discordId: string): Promise<void> {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!guildId || !token) return;
    const { data: p0 } = await supabaseAdmin
      .from("user_profiles")
      .select("username, equipped_tag, has_atc_role")
      .eq("discord_id", discordId)
      .maybeSingle();
    if (!p0) return;
    const row = p0 as { username: string; equipped_tag: string | null; has_atc_role: boolean };
    const tag = row.has_atc_role ? "ATC" : row.equipped_tag;
    const nick = tag && row.username ? `${tag} | ${row.username}`.slice(0, 32) : null;
    await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
      method: "PATCH",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ nick }),
    });
  } catch (e) {
    console.error("syncDiscordNickname failed", e);
  }
}

async function ensureProfile(discordId: string, username: string, avatar: string | null, hasAtcRole: boolean) {
  const { data: existing } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("discord_id", discordId)
    .maybeSingle();
  if (!existing) {
    await supabaseAdmin.from("user_profiles").insert({
      discord_id: discordId,
      username,
      avatar,
      has_atc_role: hasAtcRole,
    } as never);
  } else {
    // keep username/avatar/role in sync
    await supabaseAdmin
      .from("user_profiles")
      .update({ username, avatar, has_atc_role: hasAtcRole } as never)
      .eq("discord_id", discordId);
  }
}

/** Award tokens with tier multiplier & daily cap. Silent no-op if not signed in or capped. */
export async function awardActionTokens(discordId: string): Promise<{ awarded: number; capped: boolean }> {
  const { data: p } = await supabaseAdmin
    .from("user_profiles")
    .select("tokens,earned_today,earned_today_date")
    .eq("discord_id", discordId)
    .maybeSingle();
  if (!p) return { awarded: 0, capped: false };
  const row = p as { tokens: number; earned_today: number; earned_today_date: string | null };
  const today = todayISO();
  const earnedToday = row.earned_today_date === today ? row.earned_today : 0;
  const tier = tierFor(row.tokens);
  const reward = BASE_REWARD * tier.multiplier;
  const room = Math.max(0, tier.dailyCap - earnedToday);
  const give = Math.min(reward, room);
  if (give <= 0) return { awarded: 0, capped: true };
  await supabaseAdmin
    .from("user_profiles")
    .update({
      tokens: row.tokens + give,
      earned_today: earnedToday + give,
      earned_today_date: today,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("discord_id", discordId);
  return { awarded: give, capped: give < reward };
}

/**
 * Get my profile — also runs daily login claim and syncs ATC tag on first call each day.
 */
export const getMyProfile = createServerFn({ method: "GET" }).handler(async () => {
  const s = await getAppSession();
  if (!s.data.discordId) return null;
  await ensureProfile(s.data.discordId, s.data.username ?? "", s.data.avatar ?? null, !!s.data.hasAtcRole);

  // Auto-grant ATC tag if role
  if (s.data.hasAtcRole) {
    await supabaseAdmin
      .from("user_tags")
      .upsert({ discord_id: s.data.discordId, tag: "ATC" } as never, { onConflict: "discord_id,tag" });
  }

  // Daily login claim
  const { data: p0 } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("discord_id", s.data.discordId)
    .maybeSingle();
  const p = p0 as {
    tokens: number; login_streak: number; last_login_date: string | null;
    earned_today: number; earned_today_date: string | null; equipped_tag: string | null;
  };
  const today = todayISO();
  let loginAward = 0;
  if (p.last_login_date !== today) {
    let streak = 1;
    if (p.last_login_date) {
      const y = new Date();
      y.setUTCDate(y.getUTCDate() - 1);
      const yesterday = y.toISOString().slice(0, 10);
      streak = p.last_login_date === yesterday ? p.login_streak + 1 : 1;
    }
    loginAward = loginBonus(streak);
    await supabaseAdmin
      .from("user_profiles")
      .update({
        tokens: p.tokens + loginAward,
        login_streak: streak,
        last_login_date: today,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("discord_id", s.data.discordId);
    p.tokens += loginAward;
    p.login_streak = streak;
    p.last_login_date = today;
  }

  const { data: tags } = await supabaseAdmin
    .from("user_tags")
    .select("tag")
    .eq("discord_id", s.data.discordId);
  const owned = (tags ?? []).map((t) => (t as { tag: string }).tag);
  const tier = tierFor(p.tokens);
  const next = nextTier(p.tokens);

  return {
    discordId: s.data.discordId,
    username: s.data.username ?? "",
    avatar: s.data.avatar ?? null,
    hasAtcRole: !!s.data.hasAtcRole,
    tokens: p.tokens,
    loginStreak: p.login_streak,
    earnedToday: p.earned_today_date === today ? p.earned_today : 0,
    equippedTag: p.equipped_tag,
    ownedTags: owned,
    tier: tier.name,
    tierMeta: tier,
    nextTier: next?.name ?? null,
    pointsToNext: next ? Math.max(0, next.min - p.tokens) : 0,
    loginAward,
    nextLoginBonus: loginBonus(p.login_streak + 1),
  };
});

/** Public read of any user's profile (for owner console & profile view by ID). */
export const getUserProfile = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ discordId: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { data: p0 } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("discord_id", data.discordId)
      .maybeSingle();
    if (!p0) return null;
    const p = p0 as {
      discord_id: string; username: string; avatar: string | null;
      tokens: number; login_streak: number; equipped_tag: string | null; has_atc_role: boolean;
    };
    const { data: tags } = await supabaseAdmin.from("user_tags").select("tag").eq("discord_id", data.discordId);
    const tier = tierFor(p.tokens);
    const next = nextTier(p.tokens);
    return {
      discordId: p.discord_id,
      username: p.username,
      avatar: p.avatar,
      tokens: p.tokens,
      loginStreak: p.login_streak,
      equippedTag: p.equipped_tag,
      hasAtcRole: p.has_atc_role,
      ownedTags: (tags ?? []).map((t) => (t as { tag: string }).tag),
      tier: tier.name,
      tierMeta: tier,
      nextTier: next?.name ?? null,
      pointsToNext: next ? Math.max(0, next.min - p.tokens) : 0,
    };
  });

export const buyTag = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ tag: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Sign in first");
    const item = SHOP_TAGS.find((t) => t.tag === data.tag);
    if (!item) throw new Error("Unknown tag");
    const { data: p0 } = await supabaseAdmin.from("user_profiles").select("tokens").eq("discord_id", s.data.discordId).maybeSingle();
    const p = p0 as { tokens: number } | null;
    if (!p) throw new Error("Profile not found");
    if (p.tokens < item.cost) throw new Error("Not enough tokens");
    const { data: existing } = await supabaseAdmin.from("user_tags").select("id").eq("discord_id", s.data.discordId).eq("tag", data.tag).maybeSingle();
    if (existing) throw new Error("You already own this tag");
    await supabaseAdmin.from("user_profiles").update({ tokens: p.tokens - item.cost, updated_at: new Date().toISOString() } as never).eq("discord_id", s.data.discordId);
    await supabaseAdmin.from("user_tags").insert({ discord_id: s.data.discordId, tag: data.tag } as never);
    return { ok: true };
  });

export const equipTag = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ tag: z.string().nullable() }).parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Sign in first");
    if (data.tag) {
      const { data: owned } = await supabaseAdmin.from("user_tags").select("id").eq("discord_id", s.data.discordId).eq("tag", data.tag).maybeSingle();
      if (!owned) throw new Error("You don't own this tag");
    }
    await supabaseAdmin.from("user_profiles").update({ equipped_tag: data.tag, updated_at: new Date().toISOString() } as never).eq("discord_id", s.data.discordId);
    return { ok: true };
  });

// Owner-only administration
export const ownerListProfiles = createServerFn({ method: "GET" }).handler(async () => {
  const s = await getAppSession();
  if (s.data.discordId !== OWNER_DISCORD_ID) throw new Error("Owner only");
  const { data } = await supabaseAdmin.from("user_profiles").select("*").order("tokens", { ascending: false });
  return data ?? [];
});

export const ownerAdjustPoints = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ discordId: z.string().min(1), delta: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (s.data.discordId !== OWNER_DISCORD_ID) throw new Error("Owner only");
    const { data: p } = await supabaseAdmin.from("user_profiles").select("tokens").eq("discord_id", data.discordId).maybeSingle();
    if (!p) throw new Error("Profile not found");
    const next = Math.max(0, (p as { tokens: number }).tokens + data.delta);
    await supabaseAdmin.from("user_profiles").update({ tokens: next, updated_at: new Date().toISOString() } as never).eq("discord_id", data.discordId);
    return { ok: true, tokens: next };
  });
