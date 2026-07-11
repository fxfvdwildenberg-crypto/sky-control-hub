import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ownerOverview, ownerDelete, ownerResetPartnerCode, OWNER_DISCORD_ID } from "@/lib/owner.functions";
import { useCurrentUser } from "@/lib/use-current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageBanner } from "@/components/PageBanner";
import bannerAsset from "@/assets/city-skyline.png.asset.json";
import { Shield, Trash2, KeyRound, Coins, Megaphone, Palette, Handshake, Tag, Plus } from "lucide-react";
import { ownerListProfiles, ownerAdjustPoints } from "@/lib/profile.functions";
import { getSiteBanner, setSiteBanner } from "@/lib/site.functions";
import { getSiteTheme, updateSiteTheme, SEASONAL_THEMES, listShopTags, createShopTag, deleteShopTag, ownerCreatePartner, ownerDeletePartner } from "@/lib/prefs.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/owner")({
  head: () => ({
    meta: [
      { title: "Owner Console — ATC365" },
      { name: "description", content: "Owner administration console for ATC365." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OwnerPage,
});

function OwnerPage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div className="p-6 font-mono text-sm text-muted-foreground">Checking access…</div>;
  }

  if (!user || user.discordId !== OWNER_DISCORD_ID) {
    return (
      <div className="p-6">
        <Card className="max-w-lg mx-auto border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-4 w-4" /> Access denied
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>This page is restricted to the site owner.</p>
            {!user && (
              <Link to="/login" className="text-primary underline">Sign in with Discord</Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <OwnerConsole />;
}

function OwnerConsole() {
  const load = useServerFn(ownerOverview);
  const del = useServerFn(ownerDelete);
  const reset = useServerFn(ownerResetPartnerCode);
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["owner-overview"], queryFn: () => load(), refetchInterval: 15000 });

  const delMut = useMutation({
    mutationFn: (v: { table: "flight_plans" | "atis" | "ground_requests" | "partner_announcements" | "partner_messages"; id: string }) => del({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["owner-overview"] }); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageBanner image={bannerAsset.url} title="Owner console" subtitle="Site-wide administration" />
      <div className="px-4 md:px-6 space-y-6 pb-10">
        <SiteBannerPanel />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Flight plans" value={data?.counts.flights ?? 0} />
          <StatCard label="ATIS entries" value={data?.counts.atis ?? 0} />
          <StatCard label="Ground jobs" value={data?.counts.ground ?? 0} />
          <StatCard label="Partners" value={data?.counts.partners ?? 0} />
        </div>

        <Card>
          <CardHeader><CardTitle>Flight plans</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-96 overflow-y-auto">
            {data?.flights.map((f) => (
              <Row key={f.id} label={`${f.callsign} · ${f.departure}→${f.arrival}`} sub={`${f.filer_username ?? "?"} · ${f.approval_status}`}
                onDelete={() => delMut.mutate({ table: "flight_plans", id: f.id })} />
            ))}
            {!data?.flights.length && <Empty />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>ATIS</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-72 overflow-y-auto">
            {data?.atis.map((a) => (
              <Row key={a.id} label={`${a.icao} · INFO ${a.info}`} sub={new Date(a.updated_at).toLocaleString()}
                onDelete={() => delMut.mutate({ table: "atis", id: a.id })} />
            ))}
            {!data?.atis.length && <Empty />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ground requests</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-72 overflow-y-auto">
            {data?.ground.map((g) => (
              <Row key={g.id} label={`${g.callsign} · gate ${g.gate}`} sub={g.status}
                onDelete={() => delMut.mutate({ table: "ground_requests", id: g.id })} />
            ))}
            {!data?.ground.length && <Empty />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>ATC claims</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-60 overflow-y-auto">
            {data?.claims.map((c) => (
              <div key={c.channel_id} className="rounded-md border px-3 py-2 text-sm">
                <div className="font-mono">{c.username} · {c.channel_name}</div>
                <div className="text-xs text-muted-foreground">{new Date(c.claimed_at).toLocaleString()}</div>
              </div>
            ))}
            {!data?.claims.length && <Empty />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Reset partner owner code</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data?.partners.map((p) => (
              <PartnerCodeRow key={p.id} slug={p.slug} name={p.name} onReset={async (code) => {
                try { await reset({ data: { slug: p.slug, code } }); toast.success(`New code set for ${p.name}`); }
                catch (e) { toast.error((e as Error).message); }
              }} />
            ))}
          </CardContent>
        </Card>
        <ProfilesPanel />
        <ThemePanel />
        <PartnersAdminPanel />
        <ShopTagsPanel />
      </div>
    </div>
  );
}

function ThemePanel() {
  const loadFn = useServerFn(getSiteTheme);
  const saveFn = useServerFn(updateSiteTheme);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["owner-site-theme"], queryFn: () => loadFn() });
  const enabled = (data?.enabled_themes ?? []) as string[];
  const forced = (data?.forced_theme ?? null) as string | null;
  const save = useMutation({
    mutationFn: (v: { enabledThemes: typeof SEASONAL_THEMES[number][]; forcedTheme: typeof SEASONAL_THEMES[number] | null }) => saveFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["owner-site-theme"] }); qc.invalidateQueries({ queryKey: ["site-theme"] }); toast.success("Theme updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = (t: string) => {
    const next = enabled.includes(t) ? enabled.filter((x) => x !== t) : [...enabled, t];
    const nextForced = forced && !next.includes(forced) ? null : forced;
    save.mutate({ enabledThemes: next as typeof SEASONAL_THEMES[number][], forcedTheme: nextForced as typeof SEASONAL_THEMES[number] | null });
  };
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-4 w-4" /> Seasonal themes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Enabled themes are available to users. Forcing a theme applies it site-wide.</p>
        <div className="space-y-2">
          {SEASONAL_THEMES.map((t) => (
            <div key={t} className="flex items-center gap-3 rounded-md border p-2">
              <Switch checked={enabled.includes(t)} onCheckedChange={() => toggle(t)} />
              <span className="flex-1 capitalize text-sm">{t}</span>
              <Button size="sm" variant={forced === t ? "default" : "outline"} disabled={!enabled.includes(t)}
                onClick={() => save.mutate({ enabledThemes: enabled as typeof SEASONAL_THEMES[number][], forcedTheme: forced === t ? null : t })}>
                {forced === t ? "Force ON" : "Force"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PartnersAdminPanel() {
  const createFn = useServerFn(ownerCreatePartner);
  const deleteFn = useServerFn(ownerDeletePartner);
  const loadFn = useServerFn(ownerOverview);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["owner-overview"], queryFn: () => loadFn() });
  const [form, setForm] = useState({ name: "", slug: "", ownerCode: "", primaryColor: "#3b82f6", accentColor: "#f59e0b", bio: "" });
  const create = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["owner-overview"] }); toast.success("Partner created"); setForm({ name: "", slug: "", ownerCode: "", primaryColor: "#3b82f6", accentColor: "#f59e0b", bio: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({ mutationFn: (slug: string) => deleteFn({ data: { slug } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["owner-overview"] }); toast.success("Deleted"); } });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Handshake className="h-4 w-4" /> Partner dashboards</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          {(data?.partners ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <span className="font-mono">{p.name} <Badge variant="outline" className="ml-1 text-[10px]">{p.slug}</Badge></span>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Delete ${p.name}?`)) del.mutate(p.slug); }}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 border-t pt-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="slug (lowercase-dashes)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
          <Input placeholder="Owner code" value={form.ownerCode} onChange={(e) => setForm({ ...form, ownerCode: e.target.value })} />
          <div className="flex gap-2 items-center">
            <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="h-9 w-14 rounded border" />
            <input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="h-9 w-14 rounded border" />
            <span className="text-xs text-muted-foreground">colors</span>
          </div>
          <Input className="sm:col-span-2" placeholder="Bio (optional)" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <Button size="sm" onClick={() => create.mutate()} className="gap-1"><Plus className="h-3.5 w-3.5" /> Create partner</Button>
      </CardContent>
    </Card>
  );
}

function ShopTagsPanel() {
  const listFn = useServerFn(listShopTags);
  const createFn = useServerFn(createShopTag);
  const deleteFn = useServerFn(deleteShopTag);
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["shop-tags"], queryFn: () => listFn() });
  const [tag, setTag] = useState(""); const [cost, setCost] = useState("");
  const create = useMutation({
    mutationFn: () => createFn({ data: { tag, cost: parseInt(cost, 10) || 0 } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shop-tags"] }); toast.success("Tag created"); setTag(""); setCost(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({ mutationFn: (id: string) => deleteFn({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["shop-tags"] }); toast.success("Deleted"); } });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="h-4 w-4" /> Shop tags</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {data.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span>{t.tag} <span className="text-muted-foreground font-mono">· {t.cost} pts</span></span>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del.mutate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
        <div className="flex gap-2 border-t pt-3">
          <Input placeholder="Tag name" value={tag} onChange={(e) => setTag(e.target.value)} />
          <Input placeholder="Cost" value={cost} onChange={(e) => setCost(e.target.value)} className="w-24" />
          <Button size="sm" onClick={() => create.mutate()}>Add</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SiteBannerPanel() {
  const loadFn = useServerFn(getSiteBanner);
  const saveFn = useServerFn(setSiteBanner);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["owner-site-banner"], queryFn: () => loadFn() });
  const [msg, setMsg] = useState("");
  const initialized = data?.message ?? "";
  const [touched, setTouched] = useState(false);
  const value = touched ? msg : initialized;
  const save = useMutation({
    mutationFn: (message: string) => saveFn({ data: { message } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["owner-site-banner"] }); qc.invalidateQueries({ queryKey: ["site-banner"] }); toast.success("Banner updated"); setTouched(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4" /> Site-wide banner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">Shown at the top of every page for all visitors until cleared.</p>
        <div className="flex gap-2">
          <Input value={value} onChange={(e) => { setMsg(e.target.value); setTouched(true); }} placeholder="e.g. Scheduled event tonight at 20:00Z — join in Voice" />
          <Button size="sm" onClick={() => save.mutate(value)}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => save.mutate("")}>Clear</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfilesPanel() {
  const listFn = useServerFn(ownerListProfiles);
  const adjustFn = useServerFn(ownerAdjustPoints);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["owner-profiles"], queryFn: () => listFn(), refetchInterval: 15000 });
  const adjust = useMutation({
    mutationFn: (v: { discordId: string; delta: number }) => adjustFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["owner-profiles"] }); toast.success("Points updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="h-4 w-4" /> User profiles & points</CardTitle></CardHeader>
      <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
        {(data ?? []).map((p) => {
          const row = p as { discord_id: string; username: string; tokens: number; login_streak: number };
          return (
            <div key={row.discord_id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono">{row.username || row.discord_id}</div>
                <div className="text-xs text-muted-foreground font-mono">{row.tokens} pts · streak {row.login_streak}</div>
              </div>
              <PointAdjuster onApply={(delta) => adjust.mutate({ discordId: row.discord_id, delta })} />
            </div>
          );
        })}
        {!data?.length && <Empty />}
      </CardContent>
    </Card>
  );
}

function PointAdjuster({ onApply }: { onApply: (delta: number) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex items-center gap-1">
      <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="±10" className="h-7 w-20 text-xs" />
      <Button size="sm" className="h-7 text-xs" onClick={() => { const n = parseInt(val, 10); if (Number.isFinite(n)) { onApply(n); setVal(""); } }}>Apply</Button>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold font-mono">{value}</div>
      </CardContent>
    </Card>
  );
}

function Row({ label, sub, onDelete }: { label: string; sub?: string; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <div className="min-w-0">
        <div className="truncate font-mono">{label}</div>
        {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
      </div>
      <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 text-destructive hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function Empty() {
  return <div className="text-xs text-muted-foreground font-mono py-2">Nothing here.</div>;
}

function PartnerCodeRow({ slug, name, onReset }: { slug: string; name: string; onReset: (code: string) => void | Promise<void> }) {
  const [code, setCode] = useState("");
  return (
    <div className="flex items-center gap-2">
      <div className="w-40 text-sm truncate">{name} <Badge variant="outline" className="ml-1 text-[10px]">{slug}</Badge></div>
      <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="New owner code" className="h-8" />
      <Button size="sm" onClick={() => { if (code.trim()) { onReset(code.trim()); setCode(""); } }}>Set</Button>
    </div>
  );
}
