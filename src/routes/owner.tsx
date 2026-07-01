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
import { Shield, Trash2, KeyRound } from "lucide-react";

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
      </div>
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
