import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAppSession } from "./session.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export type Ticket = {
  id: string;
  flight_plan_id: string;
  passenger_discord_id: string;
  passenger_discord_username: string;
  passenger_roblox_username: string;
  seat: string | null;
  created_at: string;
};

export const listAllTickets = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await db
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Ticket[];
});

export const listFlightTickets = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ flightPlanId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await db
      .from("tickets")
      .select("*")
      .eq("flight_plan_id", data.flightPlanId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Ticket[];
  });

export const setTicketsEnabled = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ flightPlanId: z.string().uuid(), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Not signed in");
    const { data: row, error: e1 } = await db
      .from("flight_plans")
      .select("filer_discord_id")
      .eq("id", data.flightPlanId)
      .maybeSingle();
    if (e1 || !row) throw new Error("Flight not found");
    if (row.filer_discord_id !== s.data.discordId) throw new Error("Not your flight");
    const { error } = await db
      .from("flight_plans")
      .update({ tickets_enabled: data.enabled })
      .eq("id", data.flightPlanId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bookTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        flightPlanId: z.string().uuid(),
        discordUsername: z.string().trim().min(1).max(40),
        robloxUsername: z
          .string()
          .trim()
          .min(1)
          .max(32)
          .regex(/^[A-Za-z0-9_]+$/),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Sign in with Discord to book a ticket");
    const { data: flight, error: e1 } = await db
      .from("flight_plans")
      .select("id, tickets_enabled, filer_discord_id, callsign")
      .eq("id", data.flightPlanId)
      .maybeSingle();
    if (e1 || !flight) throw new Error("Flight not found");
    if (!flight.tickets_enabled) throw new Error("Tickets are closed for this flight");
    if (flight.filer_discord_id === s.data.discordId) {
      throw new Error("You're the flight owner — you don't need a ticket");
    }
    const { error } = await db.from("tickets").insert({
      flight_plan_id: data.flightPlanId,
      passenger_discord_id: s.data.discordId,
      passenger_discord_username: data.discordUsername,
      passenger_roblox_username: data.robloxUsername,
    });
    if (error) {
      if (error.code === "23505") throw new Error("You already booked a ticket for this flight");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const cancelTicket = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ticketId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const s = await getAppSession();
    if (!s.data.discordId) throw new Error("Not signed in");
    const { data: ticket, error: e1 } = await db
      .from("tickets")
      .select("id, flight_plan_id, passenger_discord_id")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (e1 || !ticket) throw new Error("Ticket not found");
    let allowed = ticket.passenger_discord_id === s.data.discordId;
    if (!allowed) {
      const { data: flight } = await db
        .from("flight_plans")
        .select("filer_discord_id")
        .eq("id", ticket.flight_plan_id)
        .maybeSingle();
      allowed = !!flight && flight.filer_discord_id === s.data.discordId;
    }
    if (!allowed) throw new Error("You can't cancel this ticket");
    const { error } = await db.from("tickets").delete().eq("id", data.ticketId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
