import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAppSession } from "./session.server";

type VoiceChannel = {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
  userLimit: number;
  members: { id: string; username: string; avatar: string | null }[];
};

type Claim = {
  channel_id: string;
  channel_name: string;
  discord_id: string;
  username: string;
  claimed_at: string;
};

function admin() {
  return supabaseAdmin;
}

export const HIDDEN_VOICE_CHANNELS = new Set([
  "AFK.AFK | AFK",
  "365.365 | VC365",
  "038.293 | Staff",
  "Join To Create",
  "000.000 | Beta's office",
  "987.654 | Event",
  "event-stage",
  "983.783 | Training2",
  "983.882 | Training1",
]);

export const listVoiceChannels = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ guildId: string; channels: VoiceChannel[]; claims: Claim[] }> => {
    const guildId = process.env.DISCORD_GUILD_ID!;
    const botToken = process.env.DISCORD_BOT_TOKEN!;

    // Auto-release ATC claims older than 1 hour so controllers can't go AFK indefinitely.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await admin().from("atc_claims").delete().lt("claimed_at", oneHourAgo);

    const [chRes, voiceRes, claimsRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${botToken}` },
      }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/voice-states`, {
        headers: { Authorization: `Bot ${botToken}` },
      }).catch(() => null),
      admin().from("atc_claims").select("*"),
    ]);

    if (!chRes.ok) {
      throw new Error(`Discord channels fetch failed: ${chRes.status}`);
    }
    const all = (await chRes.json()) as Array<{
      id: string;
      name: string;
      type: number;
      parent_id: string | null;
      position: number;
      user_limit?: number;
    }>;

    // Voice states (requires GUILD_VOICE_STATES intent). May not be available; degrade gracefully.
    const voiceStates: Array<{ channel_id: string | null; user_id: string }> =
      voiceRes && voiceRes.ok ? await voiceRes.json() : [];

    // Resolve member usernames in parallel for occupied channels
    const userIds = Array.from(new Set(voiceStates.filter((v) => v.channel_id).map((v) => v.user_id)));
    const members = await Promise.all(
      userIds.map(async (uid) => {
        const r = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${uid}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (!r.ok) return null;
        const m = (await r.json()) as { user: { id: string; username: string; global_name?: string; avatar: string | null } };
        return {
          id: m.user.id,
          username: m.user.global_name || m.user.username,
          avatar: m.user.avatar,
        };
      }),
    );
    const memberMap = new Map(members.filter(Boolean).map((m) => [m!.id, m!]));

    const channels: VoiceChannel[] = all
      .filter((c) => c.type === 2 || c.type === 13) // 2=voice, 13=stage
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        id: c.id,
        name: c.name,
        parentId: c.parent_id,
        position: c.position,
        userLimit: c.user_limit ?? 0,
        members: voiceStates
          .filter((v) => v.channel_id === c.id)
          .map((v) => memberMap.get(v.user_id))
          .filter((m): m is { id: string; username: string; avatar: string | null } => !!m),
      }));

    return {
      guildId,
      channels,
      claims: (claimsRes.data ?? []) as Claim[],
    };
  },
);

export const claimAtcSpot = createServerFn({ method: "POST" })
  .inputValidator((data: { channelId: string; channelName: string }) => data)
  .handler(async ({ data }) => {
    const session = await getAppSession();
    if (!session.data.discordId || !session.data.hasAtcRole) {
      throw new Error("ATC role required");
    }
    const sb = admin();

    // Remove any existing claim by this user, then upsert this channel
    await sb.from("atc_claims").delete().eq("discord_id", session.data.discordId);
    const { error } = await sb.from("atc_claims").upsert(
      {
        channel_id: data.channelId,
        channel_name: data.channelName,
        discord_id: session.data.discordId,
        username: session.data.username ?? "controller",
      },
      { onConflict: "channel_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const releaseAtcSpot = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAppSession();
  if (!session.data.discordId) throw new Error("Not signed in");
  const sb = admin();
  await sb.from("atc_claims").delete().eq("discord_id", session.data.discordId);
  return { ok: true };
});
