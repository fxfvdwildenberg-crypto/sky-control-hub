import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/discord/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const redirectUri = `${url.origin}/api/public/discord/callback`;
        const clientId = process.env.DISCORD_CLIENT_ID!;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "identify guilds.members.read",
          prompt: "consent",
        });
        return new Response(null, {
          status: 302,
          headers: { Location: `https://discord.com/api/oauth2/authorize?${params}` },
        });
      },
    },
  },
});
