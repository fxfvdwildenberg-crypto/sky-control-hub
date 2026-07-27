import { createFileRoute } from "@tanstack/react-router";
import { getAppSession } from "@/lib/session.server";

export const Route = createFileRoute("/api/public/discord/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        if (!code) {
          return new Response("Missing code", { status: 400 });
        }

        const redirectUri = `${url.origin}/api/public/discord/callback`;
        const clientId = process.env.DISCORD_CLIENT_ID!;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET!;
        const botToken = process.env.DISCORD_BOT_TOKEN!;
        const guildId = process.env.DISCORD_GUILD_ID!;
        const atc365RoleId = process.env.DISCORD_ATC_ROLE_ID || "1491459844685824051";
        const controllerRoleId = process.env.DISCORD_CONTROLLER_ROLE_ID || "1493256521772044470";

        // Exchange code for token
        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
          }),
        });
        if (!tokenRes.ok) {
          return new Response(`Token exchange failed: ${await tokenRes.text()}`, { status: 401 });
        }
        const tokenJson = (await tokenRes.json()) as { access_token: string };

        // Get user identity
        const userRes = await fetch("https://discord.com/api/users/@me", {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        });
        if (!userRes.ok) {
          return new Response("Failed to fetch user", { status: 401 });
        }
        const user = (await userRes.json()) as {
          id: string;
          username: string;
          global_name?: string;
          avatar: string | null;
        };

        // Check guild membership + roles using bot token
        const memberRes = await fetch(
          `https://discord.com/api/guilds/${guildId}/members/${user.id}`,
          { headers: { Authorization: `Bot ${botToken}` } }
        );

        let hasAtcRole = false;
        let hasControllerRole = false;
        if (memberRes.ok) {
          const member = (await memberRes.json()) as { roles: string[] };
          hasAtcRole = member.roles.includes(atc365RoleId);
          hasControllerRole = member.roles.includes(controllerRoleId);
        }

        const session = await getAppSession();
        await session.update({
          discordId: user.id,
          username: user.global_name || user.username,
          avatar: user.avatar,
          hasAtcRole,
          hasControllerRole,
        });

        return new Response(null, {
          status: 302,
          headers: { Location: hasAtcRole ? "/" : "/login?error=no_role" },
        });
      },
    },
  },
});
