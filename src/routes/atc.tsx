import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFlightStore, STATUS_META, type FlightStatus, type FlightPlan } from "@/lib/flight-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radar, Search, RefreshCw, Trash2, Shuffle, Plane } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/atc")({
  head: () => ({
    meta: [
      { title: "ATC Center — ATC365" },
      { name: "description", content: "Manage active flight plans, assign squawk codes, and update flight statuses." },
    ],
  }),
  component: AtcPage,
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ATC Control Center</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} of {flights.length} flights</p>
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

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.2fr_0.8fr_1.4fr_1fr_1.2fr_0.6fr] gap-3 border-b border-border bg-muted/30 px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span>Callsign / Aircraft</span>
          <span>Route</span>
          <span>Path</span>
          <span>Squawk</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        <ul className="divide-y divide-border">
          {filtered.length === 0 && (
            <li className="px-4 py-12 text-center text-sm text-muted-foreground">No flights match your filters</li>
          )}
          {filtered.map((f) => (
            <FlightRow key={f.id} flight={f} onUpdate={updateFlight} onRemove={removeFlight} />
          ))}
        </ul>
      </div>
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
  const meta = STATUS_META[flight.status];

  const randomSquawk = () => {
    const s = Array.from({ length: 4 }, () => Math.floor(Math.random() * 8)).join("");
    setSquawk(s);
    onUpdate(flight.id, { squawk: s });
    toast.success(`Assigned ${s} to ${flight.callsign}`);
  };

  const saveSquawk = () => {
    if (!/^[0-7]{4}$/.test(squawk)) {
      toast.error("Squawk must be 4 digits 0-7");
      return;
    }
    onUpdate(flight.id, { squawk });
    toast.success(`Squawk updated for ${flight.callsign}`);
  };

  return (
    <li className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr_1.4fr_1fr_1.2fr_0.6fr] items-center gap-3 px-4 py-3 transition hover:bg-muted/20 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Plane className="h-4 w-4 -rotate-45" />
        </div>
        <div>
          <div className="font-mono text-sm font-semibold tracking-wider">{flight.callsign}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{flight.aircraft}</div>
        </div>
      </div>
      <div className="font-mono text-xs text-muted-foreground truncate" title={flight.route}>{flight.route || "DCT"}</div>
      <div className="flex items-center gap-2 font-mono text-sm">
        <span className="font-semibold tracking-wider">{flight.departure}</span>
        <span className="text-primary/60">→</span>
        <span className="font-semibold tracking-wider">{flight.arrival}</span>
      </div>
      <div className="flex items-center gap-1">
        <Input
          value={squawk}
          maxLength={4}
          onChange={(e) => setSquawk(e.target.value.replace(/[^0-7]/g, ""))}
          onBlur={saveSquawk}
          className="h-8 w-20 font-mono tracking-widest text-center"
          placeholder="----"
        />
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={randomSquawk} title="Assign random">
          <Shuffle className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${meta.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        <Select value={flight.status} onValueChange={(v) => { onUpdate(flight.id, { status: v as FlightStatus }); toast.success(`${flight.callsign} → ${STATUS_META[v as FlightStatus].label}`); }}>
          <SelectTrigger className="h-8 w-[110px] text-xs"><RefreshCw className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="parked">Parked</SelectItem>
            <SelectItem value="taxi">Taxi</SelectItem>
            <SelectItem value="airborne">Airborne</SelectItem>
            <SelectItem value="landed">Landed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end">
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { onRemove(flight.id); toast.success(`Removed ${flight.callsign}`); }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
