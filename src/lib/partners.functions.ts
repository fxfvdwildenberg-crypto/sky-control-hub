import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAppSession } from "./session.server";

export const listPartners = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("partners")
    .select("id,slug,name,bio,discord_url,theme")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getPartner = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { data: partner, error } = await supabaseAdmin
      .from("partners")
      .select("id,slug,name,bio,discord_url,theme")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!partner) throw new Error("Partner not found");

    const [{ data: anns }, { data: msgs }] = await Promise.all([
      supabaseAdmin
        .from("partner_announcements")
        .select("id,author_username,content,created_at")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("partner_messages")
        .select("id,username,discord_id,content,created_at")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);

    return { partner, announcements: anns ?? [], messages: msgs ?? [] };
  });

async function verifyCode(slug: string, code: string) {
  const { data, error } = await supabaseAdmin
    .from("partners")
    .select("id,owner_code")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Partner not found");
  if (data.owner_code !== code.trim()) throw new Error("Invalid owner code");
  return data.id as string;
}

export const postAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; code: string; content: string }) =>
    z.object({
      slug: z.string().min(1).max(64),
      code: z.string().min(1).max(128),
      content: z.string().min(1).max(2000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const partnerId = await verifyCode(data.slug, data.code);
    const session = await getAppSession();
    const author = session.data.username ?? "Owner";
    const { error } = await supabaseAdmin
      .from("partner_announcements")
      .insert({ partner_id: partnerId, author_username: author, content: data.content });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; code: string; id: string }) =>
    z.object({
      slug: z.string().min(1).max(64),
      code: z.string().min(1).max(128),
      id: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const partnerId = await verifyCode(data.slug, data.code);
    const { error } = await supabaseAdmin
      .from("partner_announcements")
      .delete()
      .eq("id", data.id)
      .eq("partner_id", partnerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updatePartnerProfile = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; code: string; bio?: string; discord_url?: string }) =>
    z.object({
      slug: z.string().min(1).max(64),
      code: z.string().min(1).max(128),
      bio: z.string().max(500).optional(),
      discord_url: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await verifyCode(data.slug, data.code);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.bio !== undefined) patch.bio = data.bio;
    if (data.discord_url !== undefined) {
      const url = data.discord_url.trim();
      if (url && !/^https?:\/\//i.test(url)) throw new Error("Discord URL must start with http(s)://");
      patch.discord_url = url;
    }
    const { error } = await supabaseAdmin.from("partners").update(patch).eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const postPartnerMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; content: string }) =>
    z.object({
      slug: z.string().min(1).max(64),
      content: z.string().min(1).max(500),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const session = await getAppSession();
    if (!session.data.discordId) throw new Error("Sign in with Discord to chat");
    const { data: partner, error: pErr } = await supabaseAdmin
      .from("partners")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!partner) throw new Error("Partner not found");
    const { error } = await supabaseAdmin.from("partner_messages").insert({
      partner_id: partner.id,
      discord_id: session.data.discordId,
      username: session.data.username ?? "user",
      content: data.content,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
