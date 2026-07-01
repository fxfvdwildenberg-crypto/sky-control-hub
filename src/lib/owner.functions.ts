import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAppSession } from "./session.server";

export const OWNER_DISCORD_ID = "1405496423570473011";

async function requireOwner() {
  const s = await getAppSession();
  if (s.data.discordId !== OWNER_DISCORD_ID) throw new Error("Owner access only");
  return s;
}

export const ownerOverview = createServerFn({ method: "GET" }).handler(async () => {
  await requireOwner();
  const [flights, atis, ground, partners, tickets, claims] = await Promise.all([
    supabaseAdmin.from("flight_plans").select("id,callsign,departure,arrival,filer_username,approval_status,created_at").order("created_at", { ascending: false }).limit(200),
    supabaseAdmin.from("atis").select("id,icao,info,updated_at").order("updated_at", { ascending: false }).limit(100),
    supabaseAdmin.from("ground_requests").select("id,callsign,gate,status,created_at").order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("partners").select("id,slug,name").order("name"),
    supabaseAdmin.from("tickets").select("id").limit(1),
    supabaseAdmin.from("atc_claims").select("channel_id,username,channel_name,claimed_at").order("claimed_at", { ascending: false }).limit(50),
  ]);
  return {
    flights: flights.data ?? [],
    atis: atis.data ?? [],
    ground: ground.data ?? [],
    partners: partners.data ?? [],
    claims: claims.data ?? [],
    counts: {
      flights: flights.data?.length ?? 0,
      atis: atis.data?.length ?? 0,
      ground: ground.data?.length ?? 0,
      partners: partners.data?.length ?? 0,
    },
  };
});

const delSchema = z.object({
  table: z.enum(["flight_plans", "atis", "ground_requests", "atc_claims", "partner_announcements", "partner_messages"]),
  id: z.string().uuid(),
});

export const ownerDelete = createServerFn({ method: "POST" })
  .inputValidator((d) => delSchema.parse(d))
  .handler(async ({ data }) => {
    await requireOwner();
    const { error } = await supabaseAdmin.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ownerResetPartnerCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ slug: z.string().min(1), code: z.string().min(4).max(64) }).parse(d))
  .handler(async ({ data }) => {
    await requireOwner();
    const { error } = await supabaseAdmin.from("partners").update({ owner_code: data.code } as never).eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
