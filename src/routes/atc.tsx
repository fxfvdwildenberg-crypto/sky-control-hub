import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useFlightStore, STATUS_META, APPROVAL_META, emergencyFor, type FlightStatus, type FlightPhase, type FlightPlan } from "@/lib/flight-store";
import { decideFlightPlan } from "@/lib/flight.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radar, Search, RefreshCw, Trash2, Shuffle, Plane, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/atc")({
  head: () => ({
    meta: [
      { title: "ATC Center — ATC365" },
      { name: "description", content: "Manage active flight plans, approve filings, and assign squawk codes." },
    ],
  }),
  component: () => <RoleGuard><AtcPage /></RoleGuard>,
});

function AtcPage() {
  const { flights, updateFlight, removeFlight } = useFlightStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | FlightStatus>("all");

  const filtered = useMemo(() => {
    return flights.filter((f) => {
      const q = query.trim().toUpperCase();
      const matchQ = !q || f.callsign.includes(q) || f.departure.includes(q) || f.arrival.includes(q);
      const matchS = filter === "all" || f.status === filter;
      return matchQ && matchS;
    });
  }, [flights, query, filter]);

  const pending = filtered.filter((f) => f.approvalStatus === "pending");
  const others = filtered.filter((f) => f.approvalStatus !== "pending");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ATC Control Center</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} of {flights.length} flights · {pending.length} pending</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Callsign or ICAO" className="pl-8 font-mono uppercase w-56" />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="parked">Parked</SelectItem>
              <SelectItem value="taxi">Taxi</SelectItem>
              <SelectItem value="airborne">Airborne</SelectItem>
              <SelectItem value="landed">Landed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-mono uppercase tracking-[0.15em] text-muted-foreground">Pending approval</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
            {pending.map((f) => <FlightRow key={f.id} flight={f} onUpdate={updateFlight} onRemove={removeFlight} />)}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-mono uppercase tracking-[0.15em] text-muted-foreground">Active</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {others.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No flights match your filters</div>
          )}
          {others.map((f) => <FlightRow key={f.id} flight={f} onUpdate={updateFlight} onRemove={removeFlight} />)}
        </div>
      </section>
    </div>
  );
}

function FlightRow({
  flight,
  onUpdate,
  onRemove,
}: {
  flight: FlightPlan;
  onUpdate: (id: string, p: Partial<FlightPlan>) => void;
  onRemove: (id: string) => void;
}) {
  const [squawk, setSquawk] = useState(flight.squawk);
  const decide = useServerFn(decideFlightPlan);
  const meta = STATUS_META[flight.status];
  const ap = APPROVAL_META[flight.approvalStatus];

  const randomSquawk = () => {
    const s = Array.from({ length: 4 }, () => Math.floor(Math.random() * 8)).join("");
    setSquawk(s);
    onUpdate(flight.id, { squawk: s });
    toast.success(`Assigned ${s} to ${flight.callsign}`);
  };

  const saveSquawk = () => {
    if (!/^[0-7]{4}$/.test(squawk)) { toast.error("Squawk must be 4 digits 0-7"); return; }
    onUpdate(flight.id, { squawk });
  };

  const onDecide = async (decision: "approved" | "denied") => {
    try {
      await decide({ data: { id: flight.id, decision } });
      toast.success(`${flight.callsign} ${decision}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const emerg = emergencyFor(flight.squawk);
  return (
    <div className={`px-4 py-3 transition animate-fade-in-up ${emerg ? "bg-destructive/15 ring-1 ring-inset ring-destructive/40" : "hover:bg-muted/20"}`}>
      {emerg && (
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider">SQUAWK {flight.squawk} · {emerg.label}</span>
          <span className="text-[11px] opacity-80">{emerg.short}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Plane className="h-4 w-4 -rotate-45" />
          </div>
          <div>
            <div className="font-mono text-sm font-semibold tracking-wider">{flight.callsign}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{flight.aircraft} · {flight.flightRule} · {flight.cruiseLevel || "—"}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="font-semibold tracking-wider">{flight.departure}</span>
          <span className="text-primary/60">→</span>
          <span className="font-semibold tracking-wider">{flight.arrival}</span>
          <span className="text-[11px] text-muted-foreground">Gate {flight.gate || "—"}</span>
        </div>

        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase ${ap.className}`}>{ap.label}</span>

        <div className="flex items-center gap-1 ml-auto">
          <Input value={squawk} maxLength={4}
            onChange={(e) => setSquawk(e.target.value.replace(/[^0-7]/g, ""))}
            onBlur={saveSquawk}
            className="h-8 w-20 font-mono tracking-widest text-center" placeholder="----" />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={randomSquawk} title="Assign random">
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase ${meta.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
          </span>
          <Select value={flight.status} onValueChange={(v) => { onUpdate(flight.id, { status: v as FlightStatus }); }}>
            <SelectTrigger className="h-8 w-[110px] text-xs"><RefreshCw className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="parked">Parked</SelectItem>
              <SelectItem value="taxi">Taxi</SelectItem>
              <SelectItem value="airborne">Airborne</SelectItem>
              <SelectItem value="landed">Landed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={flight.phase} onValueChange={(v) => { onUpdate(flight.id, { phase: v as FlightPhase }); }}>
            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="departure">Departure</SelectItem>
              <SelectItem value="arrival">Arrival</SelectItem>
              <SelectItem value="on_ground">On Ground</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {flight.approvalStatus === "pending" && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-8 gap-1 border-status-landed/40 text-status-landed hover:bg-status-landed/10" onClick={() => onDecide("approved")}>
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => onDecide("denied")}>
              <X className="h-3.5 w-3.5" /> Deny
            </Button>
          </div>
        )}

        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { onRemove(flight.id); toast.success(`Removed ${flight.callsign}`); }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {flight.filerUsername && (
        <div className="mt-1.5 ml-12 text-[10px] font-mono text-muted-foreground">Filed by {flight.filerUsername}{flight.route ? ` · ${flight.route}` : ""}</div>
      )}
    </div>
  );
}
