import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAppSession } from "./session.server";
import { OWNER_DISCORD_ID } from "./owner.functions";

export const getSiteBanner = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin.from("site_banner").select("message").eq("id", 1).maybeSingle();
  return { message: (data as { message: string } | null)?.message ?? "" };
});

export const setSiteBanner = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ message: z.string().max(300) }).parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (s.data.discordId !== OWNER_DISCORD_ID) throw new Error("Owner only");
    const { error } = await supabaseAdmin.from("site_banner").update({
      message: data.message, updated_at: new Date().toISOString(),
    } as never).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
