import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAppSession } from "./session.server";
import { OWNER_DISCORD_ID } from "./owner.functions";

// ---------- User Prefs ----------
export const DEFAULT_SHORTCUTS: Record<string, string> = {
  flightPlan: "g f",
  atis: "g a",
  voice: "g v",
  myFlights: "g m",
  profile: "g p",
  shop: "g s",
  charts: "g c",
  settings: "g ,",
  cheatsheet: "?",
};

async function ensurePrefs(discordId: string) {
  const { data } = await supabaseAdmin.from("user_prefs").select("*").eq("discord_id", discordId).maybeSingle();
  if (data) return data;
  const { data: created } = await supabaseAdmin.from("user_prefs").insert({
    discord_id: discordId,
    mini_stats: true,
    shortcuts: DEFAULT_SHORTCUTS,
    pinned_pages: [],
    seen_tours: [],
  } as never).select("*").single();
  return created;
}

export const getMyPrefs = createServerFn({ method: "GET" }).handler(async () => {
  const s = await getAppSession();
  if (!s.data.discordId) return null;
  const row = await ensurePrefs(s.data.discordId);
  return row;
});

const prefsSchema = z.object({
  miniStats: z.boolean().optional(),
  shortcuts: z.record(z.string(), z.string()).optional(),
  pinnedPages: z.array(z.string()).optional(),
  seenTours: z.array(z.string()).optional(),
  themeChoice: z.string().nullable().optional(),
});

export const updateMyPrefs = createServerFn({ method: "POST" })
  .inputValidator((d) => prefsSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Sign in");
    await ensurePrefs(s.data.discordId);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.miniStats !== undefined) patch.mini_stats = data.miniStats;
    if (data.shortcuts !== undefined) patch.shortcuts = data.shortcuts;
    if (data.pinnedPages !== undefined) patch.pinned_pages = data.pinnedPages;
    if (data.seenTours !== undefined) patch.seen_tours = data.seenTours;
    if (data.themeChoice !== undefined) patch.theme_choice = data.themeChoice;
    const { error } = await supabaseAdmin.from("user_prefs").update(patch as never).eq("discord_id", s.data.discordId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Site Theme ----------
export const SEASONAL_THEMES = ["summer", "winter", "halloween", "easter"] as const;

export const getSiteTheme = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin.from("site_theme").select("*").eq("id", 1).maybeSingle();
  return data ?? { enabled_themes: [], forced_theme: null };
});

const siteThemeSchema = z.object({
  enabledThemes: z.array(z.enum(SEASONAL_THEMES)),
  forcedTheme: z.enum(SEASONAL_THEMES).nullable(),
});

export const updateSiteTheme = createServerFn({ method: "POST" })
  .inputValidator((d) => siteThemeSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (s.data.discordId !== OWNER_DISCORD_ID) throw new Error("Owner only");
    if (data.forcedTheme && !data.enabledThemes.includes(data.forcedTheme)) {
      throw new Error("Forced theme must be one of the enabled themes");
    }
    const { error } = await supabaseAdmin.from("site_theme").update({
      enabled_themes: data.enabledThemes,
      forced_theme: data.forcedTheme,
      updated_at: new Date().toISOString(),
    } as never).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Shop Tags (DB-backed) ----------
export const listShopTags = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin.from("shop_tags").select("id,tag,cost").order("cost");
  return (data ?? []) as { id: string; tag: string; cost: number }[];
});

export const createShopTag = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ tag: z.string().min(1).max(30), cost: z.number().int().min(0).max(100000) }).parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (s.data.discordId !== OWNER_DISCORD_ID) throw new Error("Owner only");
    const { error } = await supabaseAdmin.from("shop_tags").insert({ tag: data.tag, cost: data.cost } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteShopTag = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (s.data.discordId !== OWNER_DISCORD_ID) throw new Error("Owner only");
    const { error } = await supabaseAdmin.from("shop_tags").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Users list ----------
export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { data: profiles } = await supabaseAdmin
    .from("user_profiles")
    .select("discord_id, username, avatar, tokens, equipped_tag, has_atc_role")
    .order("tokens", { ascending: false })
    .limit(200);
  const list = (profiles ?? []) as Array<{ discord_id: string; username: string; avatar: string | null; tokens: number; equipped_tag: string | null; has_atc_role: boolean }>;
  // Fetch counts in bulk
  const ids = list.map((p) => p.discord_id);
  if (ids.length === 0) return [];
  const { data: fps } = await supabaseAdmin.from("flight_plans").select("filer_discord_id").in("filer_discord_id", ids);
  const fpCounts = new Map<string, number>();
  for (const r of (fps ?? []) as Array<{ filer_discord_id: string }>) {
    fpCounts.set(r.filer_discord_id, (fpCounts.get(r.filer_discord_id) ?? 0) + 1);
  }
  return list.map((p) => ({ ...p, flightPlans: fpCounts.get(p.discord_id) ?? 0 }));
});

// ---------- Friends ----------
export const sendFriendRequest = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ friendDiscordId: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Sign in");
    if (data.friendDiscordId === s.data.discordId) throw new Error("Can't friend yourself");
    // Auto-accept if reverse request exists
    const { data: reverse } = await supabaseAdmin.from("friendships").select("id,status").eq("user_id", data.friendDiscordId).eq("friend_id", s.data.discordId).maybeSingle();
    if (reverse) {
      await supabaseAdmin.from("friendships").update({ status: "accepted" } as never).eq("id", (reverse as { id: string }).id);
      await supabaseAdmin.from("friendships").upsert({ user_id: s.data.discordId, friend_id: data.friendDiscordId, status: "accepted" } as never, { onConflict: "user_id,friend_id" });
      return { ok: true, accepted: true };
    }
    const { error } = await supabaseAdmin.from("friendships").upsert({
      user_id: s.data.discordId,
      friend_id: data.friendDiscordId,
      status: "pending",
    } as never, { onConflict: "user_id,friend_id" });
    if (error) throw new Error(error.message);
    return { ok: true, accepted: false };
  });

export const acceptFriend = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ requesterDiscordId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Sign in");
    await supabaseAdmin.from("friendships").update({ status: "accepted" } as never)
      .eq("user_id", data.requesterDiscordId).eq("friend_id", s.data.discordId);
    await supabaseAdmin.from("friendships").upsert({
      user_id: s.data.discordId, friend_id: data.requesterDiscordId, status: "accepted",
    } as never, { onConflict: "user_id,friend_id" });
    return { ok: true };
  });

export const removeFriend = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ friendDiscordId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Sign in");
    await supabaseAdmin.from("friendships").delete().eq("user_id", s.data.discordId).eq("friend_id", data.friendDiscordId);
    await supabaseAdmin.from("friendships").delete().eq("user_id", data.friendDiscordId).eq("friend_id", s.data.discordId);
    return { ok: true };
  });

export const listMyFriends = createServerFn({ method: "GET" }).handler(async () => {
  const s = await getAppSession();
  if (!s.data.discordId) return { accepted: [], incoming: [], outgoing: [] };
  const [out, inc] = await Promise.all([
    supabaseAdmin.from("friendships").select("*").eq("user_id", s.data.discordId),
    supabaseAdmin.from("friendships").select("*").eq("friend_id", s.data.discordId),
  ]);
  const outRows = (out.data ?? []) as Array<{ friend_id: string; status: string }>;
  const incRows = (inc.data ?? []) as Array<{ user_id: string; status: string }>;
  const acceptedIds = new Set<string>();
  outRows.forEach((r) => r.status === "accepted" && acceptedIds.add(r.friend_id));
  incRows.forEach((r) => r.status === "accepted" && acceptedIds.add(r.user_id));
  const incomingIds = incRows.filter((r) => r.status === "pending").map((r) => r.user_id);
  const outgoingIds = outRows.filter((r) => r.status === "pending").map((r) => r.friend_id);
  const allIds = Array.from(new Set([...acceptedIds, ...incomingIds, ...outgoingIds]));
  const { data: profs } = allIds.length ? await supabaseAdmin.from("user_profiles").select("discord_id,username,avatar,tokens").in("discord_id", allIds) : { data: [] };
  const byId = new Map<string, { discord_id: string; username: string; avatar: string | null; tokens: number }>();
  (profs ?? []).forEach((p) => byId.set((p as { discord_id: string }).discord_id, p as { discord_id: string; username: string; avatar: string | null; tokens: number }));
  const hydrate = (ids: string[]) => ids.map((id) => byId.get(id) ?? { discord_id: id, username: id, avatar: null, tokens: 0 });
  return {
    accepted: hydrate(Array.from(acceptedIds)),
    incoming: hydrate(incomingIds),
    outgoing: hydrate(outgoingIds),
  };
});

// ---------- Smart Defaults ----------
export const getFlightPlanDefaults = createServerFn({ method: "GET" }).handler(async () => {
  const s = await getAppSession();
  if (!s.data.discordId) return null;
  const { data } = await supabaseAdmin
    .from("flight_plans")
    .select("aircraft,departure,cruise_level,flight_rule,gate,roblox_username,discord_username")
    .eq("filer_discord_id", s.data.discordId)
    .order("created_at", { ascending: false })
    .limit(10);
  const rows = (data ?? []) as Array<{ aircraft: string; departure: string; cruise_level: string; flight_rule: string; gate: string; roblox_username: string; discord_username: string }>;
  if (rows.length === 0) return null;
  const mode = <K extends string>(field: K, arr: Record<K, string>[]): string => {
    const c = new Map<string, number>();
    for (const r of arr) {
      const v = r[field]; if (!v) continue;
      c.set(v, (c.get(v) ?? 0) + 1);
    }
    let best = ""; let bestC = 0;
    c.forEach((v, k) => { if (v > bestC) { best = k; bestC = v; } });
    return best;
  };
  return {
    aircraft: mode("aircraft", rows),
    departure: mode("departure", rows),
    cruiseLevel: mode("cruise_level", rows),
    flightRule: mode("flight_rule", rows) || "IFR",
    gate: mode("gate", rows),
    robloxUsername: mode("roblox_username", rows),
    discordUsername: mode("discord_username", rows),
  };
});

export const getAtisDefaults = createServerFn({ method: "GET" }).handler(async () => {
  const s = await getAppSession();
  if (!s.data.discordId) return null;
  const { data } = await supabaseAdmin
    .from("atis")
    .select("icao,departure_runways,arrival_runways")
    .order("updated_at", { ascending: false })
    .limit(10);
  const rows = (data ?? []) as Array<{ icao: string; departure_runways: string; arrival_runways: string }>;
  if (rows.length === 0) return null;
  return { icao: rows[0].icao, departureRunways: rows[0].departure_runways, arrivalRunways: rows[0].arrival_runways };
});

// ---------- Owner: partner management ----------
const partnerCreateSchema = z.object({
  name: z.string().min(2).max(64),
  slug: z.string().min(2).max(48).regex(/^[a-z0-9-]+$/),
  ownerCode: z.string().min(4).max(64),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  bio: z.string().max(500).optional().default(""),
});

export const ownerCreatePartner = createServerFn({ method: "POST" })
  .inputValidator((d) => partnerCreateSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (s.data.discordId !== OWNER_DISCORD_ID) throw new Error("Owner only");
    const theme = { bg: data.primaryColor, primary: data.primaryColor, accent: data.accentColor };
    const { error } = await supabaseAdmin.from("partners").insert({
      name: data.name,
      slug: data.slug,
      owner_code: data.ownerCode,
      bio: data.bio,
      theme,
      created_by_owner: true,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ownerDeletePartner = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (s.data.discordId !== OWNER_DISCORD_ID) throw new Error("Owner only");
    const { data: p } = await supabaseAdmin.from("partners").select("id").eq("slug", data.slug).maybeSingle();
    if (!p) throw new Error("Not found");
    const pid = (p as { id: string }).id;
    await supabaseAdmin.from("partner_announcements").delete().eq("partner_id", pid);
    await supabaseAdmin.from("partner_messages").delete().eq("partner_id", pid);
    const { error } = await supabaseAdmin.from("partners").delete().eq("id", pid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Secure private server invite ----------
export const getPrivateServerInvite = createServerFn({ method: "GET" }).handler(async () => {
  const s = await getAppSession();
  if (!s.data.discordId) throw new Error("Sign in first");
  if (!s.data.hasAtcRole) throw new Error("ATC role required");
  const invite = process.env.DISCORD_PRIVATE_INVITE || "https://discord.gg/pR6rWqhh9E";
  return { invite };
});
