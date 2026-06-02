import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAppSession } from "./session.server";

const SERVICES = [
  "Ground power",
  "Fuel service",
  "Pushback",
  "Deicing",
  "Catering",
  "Air stairs",
  "Baggage",
  "Cleaning",
  "Cargo loading",
  "Aircraft maintenance",
  "Security check",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export const listGroundRequests = createServerFn({ method: "GET" }).handler(async () => {
  const cutoff = new Date(Date.now() - 10_000).toISOString();
  // delete finished older than 10s
  await db.from("ground_requests").delete().eq("status", "finished").lt("finished_at", cutoff);
  // delete denied older than 10s
  await db.from("ground_requests").delete().eq("status", "denied").lt("denied_at", cutoff);

  const { data, error } = await db
    .from("ground_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getRequestMessages = createServerFn({ method: "GET" })
  .inputValidator((d: { requestId: string }) =>
    z.object({ requestId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: msgs, error } = await db
      .from("ground_messages")
      .select("*")
      .eq("request_id", data.requestId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);
    return msgs ?? [];
  });

export const createGroundRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        callsign: z.string().min(1).max(20),
        gate: z.string().min(1).max(20),
        aircraft: z.string().min(1).max(40),
        airport: z.string().min(1).max(10),
        services: z.array(z.enum(SERVICES)).min(1).max(SERVICES.length),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const session = await getAppSession();
    if (!session.data.discordId) throw new Error("Sign in with Discord first");
    const { error } = await db.from("ground_requests").insert({
      pilot_discord_id: session.data.discordId,
      pilot_username: session.data.username ?? "Pilot",
      callsign: data.callsign,
      gate: data.gate,
      aircraft: data.aircraft,
      airport: data.airport.toUpperCase(),
      services: data.services,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateGroundStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["accepted", "denied", "in_progress", "finished"]),
        crew_roblox_username: z.string().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const session = await getAppSession();
    if (!session.data.discordId) throw new Error("Sign in with Discord first");

    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "accepted" || data.status === "in_progress") {
      patch.crew_discord_id = session.data.discordId;
      patch.crew_username = session.data.username ?? "Crew";
      if (data.crew_roblox_username) patch.crew_roblox_username = data.crew_roblox_username;
    }
    if (data.status === "finished") patch.finished_at = new Date().toISOString();
    if (data.status === "denied") patch.denied_at = new Date().toISOString();

    const { error } = await db.from("ground_requests").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGroundRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await db.from("ground_requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendGroundMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        content: z.string().min(1).max(500),
        role: z.enum(["pilot", "crew"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const session = await getAppSession();
    if (!session.data.discordId) throw new Error("Sign in with Discord first");
    const { error } = await db.from("ground_messages").insert({
      request_id: data.requestId,
      discord_id: session.data.discordId,
      username: session.data.username ?? "User",
      role: data.role,
      content: data.content,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const GROUND_SERVICES = SERVICES;
