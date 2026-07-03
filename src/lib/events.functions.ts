import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAppSession } from "./session.server";
import { OWNER_DISCORD_ID } from "./owner.functions";

async function requireOwner() {
  const s = await getAppSession();
  if (s.data.discordId !== OWNER_DISCORD_ID) throw new Error("Owner only");
}

export const getEventsPage = createServerFn({ method: "GET" }).handler(async () => {
  const { data: page } = await supabaseAdmin.from("events_page").select("*").eq("id", 1).maybeSingle();
  const { data: events } = await supabaseAdmin.from("events").select("*").order("event_date");
  return { page: page ?? { header_image: "", description: "" }, events: events ?? [] };
});

export const getEvent = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin.from("events").select("*").eq("id", data.id).maybeSingle();
    return row;
  });

export const updateEventsPage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ header_image: z.string().max(2000), description: z.string().max(5000) }).parse(d))
  .handler(async ({ data }) => {
    await requireOwner();
    const { error } = await supabaseAdmin.from("events_page").update({
      header_image: data.header_image,
      description: data.description,
      updated_at: new Date().toISOString(),
    } as never).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    id: z.string().uuid().optional(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    title: z.string().min(1).max(120),
    image: z.string().max(2000).default(""),
    description: z.string().max(10000).default(""),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireOwner();
    if (data.id) {
      const { error } = await supabaseAdmin.from("events").update({
        event_date: data.event_date, title: data.title, image: data.image, description: data.description,
        updated_at: new Date().toISOString(),
      } as never).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await supabaseAdmin.from("events").insert({
      event_date: data.event_date, title: data.title, image: data.image, description: data.description,
    } as never).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (ins as { id: string }).id };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireOwner();
    await supabaseAdmin.from("events").delete().eq("id", data.id);
    return { ok: true };
  });
