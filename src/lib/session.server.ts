import { useSession } from "@tanstack/react-start/server";

export type SessionData = {
  discordId?: string;
  username?: string;
  avatar?: string | null;
  hasAtcRole?: boolean;
};

export function getAppSession() {
  return useSession<SessionData>({
    password: process.env.SESSION_SECRET ?? "fallback-dev-only-secret-change-me-please-1234567890",
    name: "atc365_session",
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    },
  });
}
