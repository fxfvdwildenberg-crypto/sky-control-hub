import { useFlightStore, STATUS_META, type FlightPlan } from "@/lib/flight-store";
import { Plane, MapPin, Hash } from "lucide-react";

interface Props {
  flight: FlightPlan;
  compact?: boolean;
}

export function FlightCard({ flight, compact }: Props) {
  const meta = STATUS_META[flight.status];
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-[var(--shadow-card)] animate-fade-in-up">
      <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ background: "var(--gradient-radar)" }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Plane className="h-5 w-5 -rotate-45" />
          </div>
          <div>
            <div className="font-mono text-base font-semibold tracking-wider text-foreground">{flight.callsign}</div>
            <div className="text-xs text-muted-foreground font-mono">{flight.aircraft}</div>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider ${meta.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="relative mt-4 flex items-center gap-3 font-mono">
        <div className="text-center">
          <div className="text-lg font-semibold tracking-wider">{flight.departure}</div>
          <div className="text-[10px] uppercase text-muted-foreground">DEP</div>
        </div>
        <div className="flex flex-1 items-center gap-1 text-primary/60">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/40" />
          <Plane className="h-3.5 w-3.5 rotate-45" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/40" />
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold tracking-wider">{flight.arrival}</div>
          <div className="text-[10px] uppercase text-muted-foreground">ARR</div>
        </div>
      </div>

      {!compact && (
        <div className="relative mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted/40 px-2 py-1.5">
            <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground"><Hash className="h-3 w-3" />Squawk</div>
            <div className="font-mono text-sm">{flight.squawk || "----"}</div>
          </div>
          <div className="rounded-md bg-muted/40 px-2 py-1.5">
            <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground"><MapPin className="h-3 w-3" />Route</div>
            <div className="font-mono text-sm truncate">{flight.route || "DCT"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
