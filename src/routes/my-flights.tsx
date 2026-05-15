import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plane, Trash2, FileText, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { useFlightStore, STATUS_META, APPROVAL_META, type FlightPlan, type FlightStatus } from "@/lib/flight-store";
import { useCurrentUser } from "@/lib/use-current-user";
import { updateOwnFlightPlan, deleteOwnFlightPlan } from "@/lib/flight.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/my-flights")({
  head: () => ({
    meta: [
      { title: "My Flight Plans — ATC365" },
      { name: "description", content: "View and manage your filed flight plans." },
    ],
  }),
  component: MyFlightsPage,
});

function MyFlightsPage() {
  const { flights } = useFlightStore();
  const { data: user, isLoading } = useCurrentUser();

  const mine = useMemo(
    () => flights.filter((f) => user && f.filerDiscordId === user.discordId),
    [flights, user],
  );

  if (isLoading) {
    return <div className="px-8 py-12 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">My Flight Plans</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with Discord to view your flight plans.</p>
        <Link to="/login"><Button className="mt-4">Sign in</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Flight Plans</h1>
            <p className="text-sm text-muted-foreground">{mine.length} filed · {user.username}</p>
          </div>
        </div>
        <Link to="/flight-plan"><Button>File new plan</Button></Link>
      </header>

      <div className="space-y-3">
        {mine.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            You haven't filed any flight plans yet.
          </div>
        )}
        {mine.map((f) => <MyFlightRow key={f.id} flight={f} />)}
      </div>
    </div>
  );
}

function MyFlightRow({ flight }: { flight: FlightPlan }) {
  const update = useServerFn(updateOwnFlightPlan);
  const remove = useServerFn(deleteOwnFlightPlan);
  const [squawk, setSquawk] = useState(flight.squawk);
  const isDenied = flight.approvalStatus === "denied";
  const meta = STATUS_META[flight.status];
  const ap = APPROVAL_META[flight.approvalStatus];

  const onStatus = async (v: string) => {
    try {
      await update({ data: { id: flight.id, status: v as FlightStatus } });
      toast.success(`${flight.callsign} → ${STATUS_META[v as FlightStatus].label}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const saveSquawk = async () => {
    if (!/^[0-7]{4}$/.test(squawk)) { toast.error("Squawk must be 4 digits 0-7"); return; }
    try {
      await update({ data: { id: flight.id, squawk } });
      toast.success("Squawk updated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const randomSquawk = () => {
    const s = Array.from({ length: 4 }, () => Math.floor(Math.random() * 8)).join("");
    setSquawk(s);
    update({ data: { id: flight.id, squawk: s } }).then(() => toast.success(`Assigned ${s}`)).catch((e) => toast.error(e.message));
  };

  const onDelete = async () => {
    try {
      await remove({ data: { id: flight.id } });
      toast.success(`Deleted ${flight.callsign}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Plane className="h-4 w-4 -rotate-45" />
          </div>
          <div>
            <div className="font-mono text-sm font-semibold tracking-wider">{flight.callsign} <span className="text-muted-foreground">· {flight.aircraft}</span></div>
            <div className="font-mono text-xs text-muted-foreground">
              {flight.departure} → {flight.arrival} · {flight.flightRule} · {flight.cruiseLevel || "—"} · Gate {flight.gate || "—"}
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${ap.className}`}>
          {ap.label}
        </span>
      </div>

      {flight.route && <div className="mt-2 font-mono text-[11px] text-muted-foreground">Route: {flight.route}</div>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono uppercase text-muted-foreground mr-1">Squawk</span>
          <Input value={squawk} maxLength={4} disabled={isDenied}
            onChange={(e) => setSquawk(e.target.value.replace(/[^0-7]/g, ""))}
            onBlur={saveSquawk}
            className="h-8 w-20 font-mono tracking-widest text-center" />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={randomSquawk} disabled={isDenied}>
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase ${meta.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
          </span>
          <Select value={flight.status} onValueChange={onStatus} disabled={isDenied}>
            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="parked">Parked</SelectItem>
              <SelectItem value="taxi">Taxi</SelectItem>
              <SelectItem value="airborne">Airborne</SelectItem>
              <SelectItem value="landed">Landed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" variant="ghost" className="ml-auto text-destructive hover:bg-destructive/10 gap-1.5" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      {isDenied && (
        <p className="mt-2 text-[11px] text-destructive">This flight plan was denied. You can no longer edit it — only delete.</p>
      )}
    </div>
  );
}
