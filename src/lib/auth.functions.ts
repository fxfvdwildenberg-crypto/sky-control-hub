import { createServerFn } from "@tanstack/react-start";
import { getAppSession } from "./session.server";

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getAppSession();
  if (!session.data.discordId) return null;
  return {
    discordId: session.data.discordId,
    username: session.data.username ?? "",
    avatar: session.data.avatar ?? null,
    hasAtcRole: !!session.data.hasAtcRole,
    hasControllerRole: !!session.data.hasControllerRole,
  };
});

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAppSession();
  await session.clear();
  return { ok: true };
});
