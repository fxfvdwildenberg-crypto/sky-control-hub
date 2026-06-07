import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useFlightStore, STATUS_META, type FlightStatus, type FlightPlan } from "@/lib/flight-store";
import { PlaneTakeoff, PlaneLanding, Search, ChevronRight, Radio } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Flights — ATC365" },
      { name: "description", content: "Schiphol-style live arrivals and departures across the ATC365 network." },
    ],
  }),
  component: Dashboard,
});

type Mode = "departures" | "arrivals";

function Dashboard() {
  const { flights, atis } = useFlightStore();
  const [mode, setMode] = useState<Mode>("arrivals");
  const [query, setQuery] = useState("");

  const filtered = flights.filter((f) => {
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
      {/* Schiphol-style hero band */}
      <section className="bg-gradient-to-b from-secondary to-background px-4 pb-10 pt-8 md:px-8 md:pt-12">
        <div className="mx-auto max-w-5xl">
          {/* Pill toggle */}
          <div className="mx-auto flex w-fit items-center gap-1 rounded-full bg-card p-1 shadow-sm ring-1 ring-border">
            <button
              onClick={() => setMode("departures")}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition ${
                mode === "departures" ? "bg-primary text-primary-foreground shadow" : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <PlaneTakeoff className="h-4 w-4" /> Departures
            </button>
            <button
              onClick={() => setMode("arrivals")}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition ${
                mode === "arrivals" ? "bg-primary text-primary-foreground shadow" : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <PlaneLanding className="h-4 w-4" /> Arrivals
            </button>
          </div>

          {/* Day chips */}
          <div className="mx-auto mt-5 flex w-fit flex-wrap items-center justify-center gap-2">
            <Chip active>Today</Chip>
            <Chip>Tomorrow</Chip>
            <Chip>Choose a date</Chip>
          </div>

          {/* Big rounded search */}
          <div className="mx-auto mt-6 max-w-3xl">
            <div className="flex items-center gap-2 rounded-full bg-card pl-6 pr-2 py-2 shadow-md ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === "arrivals" ? "Origin, flight number or airline" : "Destination, flight number or airline"}
                className="flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground"
              />
              <button className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90">
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Flight list */}
      <section className="px-4 pb-16 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5">
            <div className="text-sm text-muted-foreground">
              All {mode === "arrivals" ? "incoming" : "outgoing"} flights from
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">All {mode === "arrivals" ? "origins" : "destinations"}</h1>
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

          {/* Rows */}
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground ring-1 ring-border">
                No flights match your search.
              </div>
            )}
            {filtered.map((f) => (
              <FlightRow key={f.id} flight={f} mode={mode} />
            ))}
          </div>

          {/* ATIS aside */}
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
                      <Field label="RWY" value={`${a.departureRunways}/${a.arrivalRunways}`} />
                      <Field label="Wind" value={a.wind} />
                      <Field label="QNH" value={a.qnh} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Chip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition ${
        active ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border hover:ring-primary/50"
      }`}
    >
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function FlightRow({ flight, mode }: { flight: FlightPlan; mode: Mode }) {
  const meta = STATUS_META[flight.status];
  const place = mode === "arrivals" ? flight.departure : flight.arrival;
  return (
    <Link
      to="/atc"
      className="group flex items-center gap-4 rounded-2xl bg-card px-4 py-4 ring-1 ring-border transition hover:ring-primary/50 md:px-6"
    >
      <div className="w-16 shrink-0 text-lg font-semibold tabular-nums md:w-20 md:text-xl">
        {flight.eta || "—"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-medium">
          {place} <span className="text-muted-foreground">— {place}</span>
        </div>
        <div className="mt-0.5 truncate text-sm text-muted-foreground">
          {flight.callsign} · {flight.aircraft}
        </div>
      </div>
      <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.color}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
      </span>
      <ChevronRight className="h-5 w-5 text-primary transition group-hover:translate-x-0.5" />
    </Link>
  );
}
