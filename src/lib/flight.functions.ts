import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAppSession } from "./session.server";

const icao = z.string().trim().regex(/^[A-Z]{4}$/, "4-letter ICAO");

const fileSchema = z.object({
  callsign: z.string().trim().min(2).max(8).regex(/^[A-Z0-9]+$/),
  aircraft: z.string().trim().min(2).max(8).regex(/^[A-Z0-9]+$/),
  departure: icao,
  arrival: icao,
  squawk: z.string().trim().regex(/^[0-7]{4}$/),
  route: z.string().trim().max(200).default(""),
  flightRule: z.enum(["IFR", "VFR"]),
  cruiseLevel: z.string().trim().max(10).regex(/^[A-Z0-9]+$/),
  gate: z.string().trim().max(10),
});

export const fileFlightPlan = createServerFn({ method: "POST" })
  .inputValidator((d) => fileSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Sign in with Discord to file a flight plan");
    const { error } = await supabaseAdmin.from("flight_plans").insert({
      callsign: data.callsign,
      aircraft: data.aircraft,
      departure: data.departure,
      arrival: data.arrival,
      squawk: data.squawk,
      route: data.route ?? "",
      status: "parked",
      flight_rule: data.flightRule,
      cruise_level: data.cruiseLevel,
      gate: data.gate,
      filer_discord_id: s.data.discordId,
      filer_username: s.data.username ?? null,
      approval_status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ownerUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["parked", "taxi", "airborne", "landed"]).optional(),
  squawk: z.string().regex(/^[0-7]{4}$/).optional(),
});

export const updateOwnFlightPlan = createServerFn({ method: "POST" })
  .inputValidator((d) => ownerUpdateSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Not signed in");
    const { data: row, error: e1 } = await supabaseAdmin
      .from("flight_plans")
      .select("filer_discord_id, approval_status")
      .eq("id", data.id)
      .maybeSingle();
    if (e1 || !row) throw new Error("Flight plan not found");
    if (row.filer_discord_id !== s.data.discordId) throw new Error("Not your flight plan");
    if (row.approval_status === "denied") throw new Error("This flight plan was denied — you can only delete it");
    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.squawk) patch.squawk = data.squawk;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin.from("flight_plans").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOwnFlightPlan = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Not signed in");
    const { data: row } = await supabaseAdmin
      .from("flight_plans")
      .select("filer_discord_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    if (row.filer_discord_id !== s.data.discordId) throw new Error("Not your flight plan");
    const { error } = await supabaseAdmin.from("flight_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const decisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "denied"]),
});

export const decideFlightPlan = createServerFn({ method: "POST" })
  .inputValidator((d) => decisionSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Not signed in");
    if (!s.data.hasAtcRole) throw new Error("ATC role required");
    const patch: Record<string, unknown> = {
      approval_status: data.decision,
      approved_at: data.decision === "approved" ? new Date().toISOString() : null,
    };
    const { error } = await supabaseAdmin.from("flight_plans").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
