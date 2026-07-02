import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAppSession } from "./session.server";
import { awardActionTokens } from "./profile.functions";

const schema = z.object({
  icao: z.string().trim().regex(/^[A-Z]{4}$/),
  departureRunways: z.string().trim().min(1).max(10),
  arrivalRunways: z.string().trim().min(1).max(10),
  wind: z.string().trim().regex(/^\d{3}\/\d{1,3}KT$/),
  qnh: z.string().trim().regex(/^\d{4}$/),
  info: z.string().trim().regex(/^[A-Z]$/),
});

export const submitAtis = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Sign in first");
    const { error } = await supabaseAdmin.from("atis").insert({
      icao: data.icao,
      departure_runways: data.departureRunways,
      arrival_runways: data.arrivalRunways,
      wind: data.wind,
      qnh: data.qnh,
      info: data.info,
    } as never);
    if (error) throw new Error(error.message);
    try { await awardActionTokens(s.data.discordId); } catch (e) { console.error(e); }
    return { ok: true };
  });
