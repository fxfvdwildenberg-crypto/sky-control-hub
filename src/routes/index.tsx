import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useFlightStore, STATUS_META, type FlightStatus, type FlightPhase, type FlightPlan } from "@/lib/flight-store";
import { PlaneTakeoff, PlaneLanding, Search, ChevronRight, Radio, Wrench, Ticket as TicketIcon } from "lucide-react";
import skylineAsset from "@/assets/city-skyline.png.asset.json";
import towerAsset from "@/assets/tower-night.png.asset.json";
import { NetworkGallery } from "@/components/NetworkGallery";
import { listAllTickets } from "@/lib/ticket.functions";
import { useCurrentUser } from "@/lib/use-current-user";
import { useRealtimeInvalidate } from "@/lib/use-realtime";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Flights — ATC365" },
      { name: "description", content: "Schiphol-style live arrivals and departures across the ATC365 network." },
    ],
  }),
  component: Dashboard,
});

type Mode = "departures" | "arrivals" | "onground";
type DateMode = "today" | "tomorrow" | "custom";

function isoDate(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function Dashboard() {
  const { flights, atis } = useFlightStore();
  const [mode, setMode] = useState<Mode>("departures");
  const [query, setQuery] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("today");
  const [customDate, setCustomDate] = useState<string>("");

  const today = isoDate(new Date());
  const tomorrow = isoDate(new Date(Date.now() + 86400000));

  const activeDate =
    dateMode === "today" ? today : dateMode === "tomorrow" ? tomorrow : customDate;

  const filtered = flights.filter((f) => {
    // Phase / mode filter
    if (mode === "departures" && f.phase !== "departure") return false;
    if (mode === "arrivals" && f.phase !== "arrival") return false;
    if (mode === "onground") {
      const groundByStatus = f.status === "parked" || f.status === "taxi" || f.status === "landed";
      if (!(f.phase === "on_ground" || groundByStatus)) return false;
    }
    // Date filter — show flights with that date, plus flights with no date when "today" is selected
    if (activeDate) {
      if (f.flightDate) {
        if (f.flightDate !== activeDate) return false;
      } else if (dateMode !== "today") {
        return false;
      }
    }
    const q = query.trim().toUpperCase();
    if (!q) return true;
    return (
      f.callsign.toUpperCase().includes(q) ||
      f.departure.toUpperCase().includes(q) ||
      f.arrival.toUpperCase().includes(q) ||
      f.aircraft.toUpperCase().includes(q)
    );
  });

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="relative h-48 w-full overflow-hidden md:h-64">
        <img src={skylineAsset.url} alt="City skyline at dusk" className="absolute inset-0 h-full w-full object-cover" />
        <img src={towerAsset.url} alt="ATC tower at night" className="absolute bottom-0 right-0 h-full w-1/3 object-cover opacity-80 mix-blend-screen md:w-1/4" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="relative z-10 mx-auto flex h-full max-w-5xl items-end px-4 pb-4 md:px-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-4xl">Live flight operations</h1>
            <p className="text-xs text-muted-foreground md:text-sm">Real-time departures, arrivals, and ground movement across the network.</p>
          </div>
        </div>
      </div>
      <section className="bg-gradient-to-b from-secondary to-background px-4 pb-10 pt-8 md:px-8 md:pt-12">
        <div className="mx-auto max-w-5xl">
          {/* Phase pill toggle */}
          <div className="mx-auto flex w-fit items-center gap-1 rounded-full bg-card p-1 shadow-sm ring-1 ring-border">
            <PillButton active={mode === "departures"} onClick={() => setMode("departures")}>
              <PlaneTakeoff className="h-4 w-4" /> Departures
            </PillButton>
            <PillButton active={mode === "arrivals"} onClick={() => setMode("arrivals")}>
              <PlaneLanding className="h-4 w-4" /> Arrivals
            </PillButton>
            <PillButton active={mode === "onground"} onClick={() => setMode("onground")}>
              <Wrench className="h-4 w-4" /> On Ground
            </PillButton>
          </div>

          {/* Day chips */}
          <div className="mx-auto mt-5 flex w-fit flex-wrap items-center justify-center gap-2">
            <Chip active={dateMode === "today"} onClick={() => setDateMode("today")}>Today</Chip>
            <Chip active={dateMode === "tomorrow"} onClick={() => setDateMode("tomorrow")}>Tomorrow</Chip>
            <Chip active={dateMode === "custom"} onClick={() => setDateMode("custom")}>
              {dateMode === "custom" && customDate ? customDate : "Choose a date"}
            </Chip>
            {dateMode === "custom" && (
              <input
                type="date"
                value={customDate}
                min={tomorrow}
                onChange={(e) => setCustomDate(e.target.value)}
                className="rounded-full bg-card px-3 py-1.5 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>

          {/* Search */}
          <div className="mx-auto mt-6 max-w-3xl">
            <div className="flex items-center gap-2 rounded-full bg-card pl-6 pr-2 py-2 shadow-md ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  mode === "arrivals" ? "Origin, flight number or airline"
                    : mode === "departures" ? "Destination, flight number or airline"
                      : "Callsign, airport or aircraft"
                }
                className="flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground"
              />
              <button className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90">
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5">
            <div className="text-sm text-muted-foreground">
              {mode === "arrivals" ? "All incoming flights" : mode === "departures" ? "All outgoing flights" : "All aircraft on the ground"}
              {" · "}{dateMode === "today" ? "Today" : dateMode === "tomorrow" ? "Tomorrow" : (customDate || "Pick a date")}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {mode === "arrivals" ? "Arrivals" : mode === "departures" ? "Departures" : "On the ground"}
            </h1>
          </div>

          {/* Status totals */}
          <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
            {(["parked", "taxi", "airborne", "landed"] as FlightStatus[]).map((s) => {
              const meta = STATUS_META[s];
              const count = flights.filter((f) => f.status === s).length;
              return (
                <div key={s} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                    <span>{meta.label}</span>
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  </div>
                  <div className="mt-1 text-3xl font-semibold tabular-nums">{count.toString().padStart(2, "0")}</div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground ring-1 ring-border">
                No flights match your filters.
              </div>
            )}
            {filtered.map((f) => (
              <FlightRow key={f.id} flight={f} mode={mode} />
            ))}
          </div>

          {atis.length > 0 && (
            <div className="mt-10">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Radio className="h-4 w-4 text-primary" /> ATIS broadcasts
                </h2>
                <Link to="/atis" className="text-sm text-primary hover:underline">Manage</Link>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {atis.map((a) => (
                  <div key={a.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold tracking-wider">{a.icao}</span>
                      <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">INFO {a.info}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <InfoField label="RWY" value={`${a.departureRunways}/${a.arrivalRunways}`} />
                      <InfoField label="Wind" value={a.wind} />
                      <InfoField label="QNH" value={a.qnh} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      <NetworkGallery />
    </div>
  );
}

function PillButton({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition ${
        active ? "bg-primary text-primary-foreground shadow" : "text-foreground/70 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition ${
        active ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border hover:ring-primary/50"
      }`}
    >
      {children}
    </button>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function FlightRow({ flight, mode }: { flight: FlightPlan; mode: Mode }) {
  const meta = STATUS_META[flight.status];
  const time = mode === "arrivals" ? flight.eta : mode === "departures" ? flight.etd : null;
  return (
    <Link
      to="/flights/$id"
      params={{ id: flight.id }}
      className="group flex items-center gap-4 rounded-2xl bg-card px-4 py-4 ring-1 ring-border transition hover:ring-primary/50 md:px-6"
    >
      <div className="w-16 shrink-0 text-center md:w-20">
        <div className="text-lg font-semibold tabular-nums md:text-xl">{time || flight.cruiseLevel || "—"}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {mode === "arrivals" ? "ETA" : mode === "departures" ? "ETD" : "Level"}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-medium">
          {flight.departure} <span className="text-muted-foreground">→</span> {flight.arrival}
        </div>
        <div className="mt-0.5 truncate text-sm text-muted-foreground">
          {flight.callsign} · {flight.aircraft}{flight.gate ? ` · Gate ${flight.gate}` : ""}
          {flight.flightDate ? ` · ${flight.flightDate}` : ""}
        </div>
      </div>
      <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.color}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
      </span>
      <ChevronRight className="h-5 w-5 text-primary transition group-hover:translate-x-0.5" />
    </Link>
  );
}

export type { FlightPhase };
