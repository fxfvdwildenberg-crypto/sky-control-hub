import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAppSession } from "./session.server";

const icao = z.string().trim().regex(/^[A-Z]{4}$/);
const hhmm = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const ymd = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/);

const editSchema = z.object({
  id: z.string().uuid(),
  callsign: z.string().trim().min(2).max(8).regex(/^[A-Z0-9]+$/),
  aircraft: z.string().trim().min(2).max(8).regex(/^[A-Z0-9]+$/),
  departure: icao,
  arrival: icao,
  route: z.string().trim().max(200).default(""),
  flightRule: z.enum(["IFR", "VFR"]),
  cruiseLevel: z.string().trim().max(10),
  gate: z.string().trim().max(10),
  flightDate: z.union([ymd, z.literal("")]).default(""),
  etd: z.union([hhmm, z.literal("")]).default(""),
  eta: z.union([hhmm, z.literal("")]).default(""),
  robloxUsername: z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9_]+$/),
  discordUsername: z.string().trim().min(1).max(40),
  copilotDiscordUsername: z.string().trim().max(40).optional().default(""),
});

export const editMyFlightPlan = createServerFn({ method: "POST" })
  .inputValidator((d) => editSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Sign in first");
    const { data: row } = await supabaseAdmin.from("flight_plans")
      .select("filer_discord_id,approval_status").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Not found");
    const r = row as { filer_discord_id: string; approval_status: string };
    if (r.filer_discord_id !== s.data.discordId) throw new Error("Not your plan");
    if (r.approval_status === "denied") throw new Error("Denied plans can only be deleted");
    const { error } = await supabaseAdmin.from("flight_plans").update({
      callsign: data.callsign,
      aircraft: data.aircraft,
      departure: data.departure,
      arrival: data.arrival,
      route: data.route,
      flight_rule: data.flightRule,
      cruise_level: data.cruiseLevel,
      gate: data.gate,
      flight_date: data.flightDate || null,
      etd: data.etd || null,
      eta: data.eta || null,
      roblox_username: data.robloxUsername,
      discord_username: data.discordUsername,
      copilot_discord_username: data.copilotDiscordUsername ?? "",
    } as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
