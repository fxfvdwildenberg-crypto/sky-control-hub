import { createFileRoute, Link } from "@tanstack/react-router";
import { useFlightStore, STATUS_META, type FlightStatus } from "@/lib/flight-store";
import { FlightCard } from "@/components/FlightCard";
import { Plane, Radio, Radar, ArrowRight, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Dashboard — ATC365 ATC" },
      { name: "description", content: "Real-time overview of active flights, ATIS broadcasts, and network activity." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { flights, atis } = useFlightStore();

  const counts = (["parked", "taxi", "airborne", "landed"] as FlightStatus[]).map((s) => ({
    status: s,
    count: flights.filter((f) => f.status === s).length,
  }));

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-background p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
                <Activity className="h-3 w-3" /> Network Live
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Air Traffic Control Center</h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                Monitor live traffic, manage flight plans, and broadcast ATIS information across the network.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/flight-plan" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition hover:bg-primary/90">
                <Plane className="h-4 w-4 -rotate-45" /> File Flight Plan
              </Link>
              <Link to="/atc" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:border-primary/50">
                <Radar className="h-4 w-4" /> Open ATC
              </Link>
            </div>
          </div>

          {/* Status pills */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {counts.map(({ status, count }) => {
              const meta = STATUS_META[status];
              return (
                <div key={status} className="rounded-lg border border-border bg-card/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{meta.label}</span>
                  </div>
                  <div className="mt-2 font-mono text-3xl font-semibold">{count.toString().padStart(2, "0")}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Live flights + ATIS */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">
                <Radar className="h-4 w-4 text-primary" /> Live Flights
              </h2>
              <Link to="/atc" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {flights.slice(0, 4).map((f) => (
                <FlightCard key={f.id} flight={f} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">
                <Radio className="h-4 w-4 text-primary" /> ATIS
              </h2>
              <Link to="/atis" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {atis.map((a) => (
                <div key={a.id} className="rounded-lg border border-border bg-card p-4 animate-fade-in-up">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-semibold tracking-wider">{a.icao}</span>
                    <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                      INFO {a.info}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
                    <div><div className="text-[10px] uppercase text-muted-foreground">RWY</div>{a.runway}</div>
                    <div><div className="text-[10px] uppercase text-muted-foreground">Wind</div>{a.wind}</div>
                    <div><div className="text-[10px] uppercase text-muted-foreground">QNH</div>{a.qnh}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
