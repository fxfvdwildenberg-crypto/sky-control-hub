import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getOverview } from "@/lib/overview.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, FileText, Radio, Wrench, Loader2 } from "lucide-react";

export const Route = createFileRoute("/overview")({
  component: OverviewPage,
  head: () => ({ meta: [{ title: "Overview — ATC365" }] }),
});

type Plan = {
  id: string; callsign: string; aircraft: string; departure: string; arrival: string;
  squawk: string; status: string; approval_status: string; gate: string; cruise_level: string;
  flight_rule: string; route: string; filer_username: string | null; created_at: string;
};
type Atis = {
  id: string; icao: string; info: string; wind: string; qnh: string;
  departure_runways: string; arrival_runways: string; updated_at: string;
};
type Ground = {
  id: string; callsign: string; airport: string; gate: string; aircraft: string;
  services: string[]; status: string; pilot_username: string;
  crew_username: string | null; crew_roblox_username: string | null; created_at: string;
};

function OverviewPage() {
  const fn = useServerFn(getOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fn() as Promise<{ flightPlans: Plan[]; atis: Atis[]; groundRequests: Ground[] }>,
    refetchInterval: 5000,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Network Overview</h1>
          <p className="text-sm text-muted-foreground">All filed plans, ATIS reports and ground requests across the network.</p>
        </div>
      </header>

      {isLoading || !data ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <Tabs defaultValue="plans">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="plans" className="gap-2"><FileText className="h-3.5 w-3.5" /> Plans ({data.flightPlans.length})</TabsTrigger>
            <TabsTrigger value="atis" className="gap-2"><Radio className="h-3.5 w-3.5" /> ATIS ({data.atis.length})</TabsTrigger>
            <TabsTrigger value="ground" className="gap-2"><Wrench className="h-3.5 w-3.5" /> Ground ({data.groundRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-4 space-y-2">
            {data.flightPlans.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No filed plans.</Card>}
            {data.flightPlans.map((p) => (
              <Card key={p.id} className="p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-mono text-sm font-semibold">
                    {p.callsign} <span className="text-muted-foreground">· {p.aircraft} · {p.departure}→{p.arrival}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Badge variant="outline" className="text-[10px]">{p.approval_status}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">sq {p.squawk}</Badge>
                  </div>
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {p.flight_rule} · {p.cruise_level || "—"} · Gate {p.gate || "—"} · filed by {p.filer_username ?? "?"}
                </div>
                {p.route && <div className="mt-1 font-mono text-[11px] text-muted-foreground">Route: {p.route}</div>}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="atis" className="mt-4 space-y-2">
            {data.atis.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No ATIS reports.</Card>}
            {data.atis.map((a) => (
              <Card key={a.id} className="p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-mono text-sm font-semibold">{a.icao} <Badge variant="outline" className="ml-1 text-[10px]">INFO {a.info}</Badge></div>
                  <div className="text-[11px] text-muted-foreground">{new Date(a.updated_at).toLocaleString()}</div>
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  Wind {a.wind} · QNH {a.qnh} · DEP RWY {a.departure_runways || "—"} · ARR RWY {a.arrival_runways || "—"}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="ground" className="mt-4 space-y-2">
            {data.groundRequests.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No ground requests.</Card>}
            {data.groundRequests.map((g) => (
              <Card key={g.id} className="p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-mono text-sm font-semibold">
                    {g.callsign} <span className="text-muted-foreground">· {g.aircraft} · {g.airport} · Gate {g.gate}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{g.status.replace("_", " ")}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {g.services.map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  pilot {g.pilot_username}
                  {g.crew_username && ` · crew ${g.crew_username}${g.crew_roblox_username ? ` (Roblox: ${g.crew_roblox_username})` : ""}`}
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
