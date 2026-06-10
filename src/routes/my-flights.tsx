import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plane, Trash2, FileText, Wrench, Ticket as TicketIcon, Users } from "lucide-react";
import { toast } from "sonner";
import { useFlightStore, STATUS_META, APPROVAL_META, PHASE_META, emergencyFor, type FlightPlan, type FlightStatus, type FlightPhase } from "@/lib/flight-store";
import { useCurrentUser } from "@/lib/use-current-user";
import { updateOwnFlightPlan, deleteOwnFlightPlan } from "@/lib/flight.functions";
import { listGroundRequests } from "@/lib/ground.functions";
import { listAllTickets, setTicketsEnabled, cancelTicket, type Ticket } from "@/lib/ticket.functions";
import { useRealtimeInvalidate } from "@/lib/use-realtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

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

  const mine = useMemo(() => {
    if (!user) return [];
    const myDiscordHandle = (user.username ?? "").toLowerCase();
    return flights.filter((f) => {
      if (f.filerDiscordId === user.discordId) return true;
      const copilot = (f.copilotDiscordUsername ?? "").trim().toLowerCase();
      return !!copilot && copilot === myDiscordHandle;
    });
  }, [flights, user]);

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
  const { data: user } = useCurrentUser();
  const update = useServerFn(updateOwnFlightPlan);
  const remove = useServerFn(deleteOwnFlightPlan);
  const listGround = useServerFn(listGroundRequests);
  const { data: groundReqs = [] } = useQuery({
    queryKey: ["ground-requests"],
    queryFn: () => listGround() as Promise<Array<{ id: string; callsign: string; airport: string; gate: string; services: string[]; status: string; crew_username: string | null }>>,
    refetchInterval: 5000,
  });
  const myGround = useMemo(
    () => groundReqs.filter((g) => g.callsign.toUpperCase() === flight.callsign.toUpperCase()),
    [groundReqs, flight.callsign],
  );
  const [squawk, setSquawk] = useState(flight.squawk);
  const isOwner = !!user && flight.filerDiscordId === user.discordId;
  const isDenied = flight.approvalStatus === "denied";
  const isApproved = flight.approvalStatus === "approved";
  const meta = STATUS_META[flight.status];
  const ap = APPROVAL_META[flight.approvalStatus];
  const emerg = emergencyFor(flight.squawk);
  const canEditStatus = isOwner && !isDenied;
  const canEditSquawk = isOwner && isApproved;

  const onStatus = async (v: string) => {
    try {
      await update({ data: { id: flight.id, status: v as FlightStatus } });
      toast.success(`${flight.callsign} → ${STATUS_META[v as FlightStatus].label}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const onPhase = async (v: string) => {
    try {
      await update({ data: { id: flight.id, phase: v as FlightPhase } });
      toast.success(`${flight.callsign} → ${PHASE_META[v as FlightPhase].label}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const saveSquawk = async () => {
    if (squawk === flight.squawk) return;
    if (!/^[0-7]{4}$/.test(squawk)) { toast.error("Squawk must be 4 digits 0-7"); return; }
    try {
      await update({ data: { id: flight.id, squawk } });
      toast.success("Squawk updated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const onDelete = async () => {
    try {
      await remove({ data: { id: flight.id } });
      toast.success(`Deleted ${flight.callsign}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className={`rounded-xl border p-4 animate-fade-in-up ${emerg ? "border-destructive bg-destructive/10 ring-1 ring-destructive/40" : "border-border bg-card"}`}>
      {emerg && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/20 px-3 py-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider">SQUAWK {flight.squawk} · {emerg.label}</span>
          <span className="text-[11px] opacity-80">{emerg.short}</span>
        </div>
      )}
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
            <div className="font-mono text-[10px] text-muted-foreground">
              {flight.flightDate || "no date"} · ETD {flight.etd || "—"} · ETA {flight.eta || "—"}
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${ap.className}`}>
          {ap.label}
        </span>
      </div>

      <div className="mt-2 font-mono text-[11px] text-muted-foreground space-y-0.5">
        {flight.route && <div>Route: {flight.route}</div>}
        <div>
          Pilot: {flight.robloxUsername || "—"} (Roblox) · {flight.discordUsername || "—"} (Discord)
          {flight.copilotDiscordUsername && <> · Copilot: {flight.copilotDiscordUsername}</>}
        </div>
        {!isOwner && <div className="text-primary">You are listed as copilot on this flight.</div>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono uppercase text-muted-foreground mr-1">Squawk</span>
          <Input value={squawk} maxLength={4} disabled={!canEditSquawk}
            onChange={(e) => setSquawk(e.target.value.replace(/[^0-7]/g, ""))}
            onBlur={saveSquawk}
            title={canEditSquawk ? "Editable" : isApproved ? "Only the filer can change squawk" : "Squawk unlocks after approval"}
            className="h-8 w-20 font-mono tracking-widest text-center" />
        </div>

        <div className="flex items-center gap-1">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase ${meta.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
          </span>
          <Select value={flight.status} onValueChange={onStatus} disabled={!canEditStatus}>
            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="parked">Parked</SelectItem>
              <SelectItem value="taxi">Taxi</SelectItem>
              <SelectItem value="airborne">Airborne</SelectItem>
              <SelectItem value="landed">Landed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono uppercase text-muted-foreground mr-1">Phase</span>
          <Select value={flight.phase} onValueChange={onPhase} disabled={!canEditStatus}>
            <SelectTrigger className="h-8 w-[125px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="departure">Departure</SelectItem>
              <SelectItem value="arrival">Arrival</SelectItem>
              <SelectItem value="on_ground">On Ground</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isOwner && (
          <Button size="sm" variant="ghost" className="ml-auto text-destructive hover:bg-destructive/10 gap-1.5" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        )}
      </div>

      {isDenied && isOwner && (
        <p className="mt-2 text-[11px] text-destructive">This flight plan was denied. You can no longer edit it — only delete.</p>
      )}
      {!isApproved && !isDenied && isOwner && (
        <p className="mt-2 text-[11px] text-muted-foreground">Squawk stays 1000 until ATC approves your plan.</p>
      )}

      {myGround.length > 0 && (
        <div className="mt-3 rounded-md border border-border bg-muted/30 p-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <Wrench className="h-3 w-3" /> Ground requests for {flight.callsign}
          </div>
          <div className="space-y-1.5">
            {myGround.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                <Badge variant="outline" className="text-[10px]">{g.status.replace("_", " ")}</Badge>
                <span className="text-muted-foreground">{g.airport} · Gate {g.gate}</span>
                <span className="flex flex-wrap gap-1">
                  {g.services.map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                </span>
                {g.crew_username && <span className="text-muted-foreground">· crew: {g.crew_username}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
