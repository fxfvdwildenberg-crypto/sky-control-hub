import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plane, MapPin, Clock, User, Wrench, Ticket as TicketIcon, Users } from "lucide-react";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useFlightStore, STATUS_META, APPROVAL_META, PHASE_META, emergencyFor } from "@/lib/flight-store";
import { listGroundRequests } from "@/lib/ground.functions";
import { listFlightTickets } from "@/lib/ticket.functions";
import { useCurrentUser } from "@/lib/use-current-user";
import { useRealtimeInvalidate } from "@/lib/use-realtime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/flights/$id")({
  head: () => ({
    meta: [
      { title: "Flight Details — ATC365" },
      { name: "description", content: "Full details for a single flight plan." },
    ],
  }),
  component: FlightDetail,
});

function FlightDetail() {
  const { id } = Route.useParams();
  const { flights } = useFlightStore();
  const flight = flights.find((f) => f.id === id);
  const { data: user } = useCurrentUser();

  const listGround = useServerFn(listGroundRequests);
  const listTickets = useServerFn(listFlightTickets);
  useRealtimeInvalidate("tickets", [["flight-tickets", id]]);
  const { data: groundReqs = [] } = useQuery({
    queryKey: ["ground-requests"],
    queryFn: () => listGround() as Promise<Array<{ id: string; callsign: string; airport: string; gate: string; services: string[]; status: string; crew_username: string | null }>>,
    refetchInterval: 5000,
  });
  const { data: tickets = [] } = useQuery({
    queryKey: ["flight-tickets", id],
    queryFn: () => listTickets({ data: { flightPlanId: id } }),
  });
  const related = useMemo(
    () => (flight ? groundReqs.filter((g) => g.callsign.toUpperCase() === flight.callsign.toUpperCase()) : []),
    [groundReqs, flight],
  );
  const isOwner = !!user && !!flight && flight.filerDiscordId === user.discordId;
  const myTicket = tickets.find((t) => t.passenger_discord_id === user?.discordId);

  if (!flight) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Flight not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This flight may have been removed.</p>
        <Link to="/"><Button className="mt-4" variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to dashboard</Button></Link>
      </div>
    );
  }

  const meta = STATUS_META[flight.status];
  const ap = APPROVAL_META[flight.approvalStatus];
  const emerg = emergencyFor(flight.squawk);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8">
      <div>
        <Link to="/">
          <Button size="sm" variant="ghost" className="gap-2 -ml-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
        </Link>
      </div>

      <header className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Plane className="h-6 w-6 -rotate-45" />
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Callsign</div>
              <h1 className="text-3xl font-bold tracking-wider font-mono">{flight.callsign}</h1>
              <div className="mt-1 text-sm text-muted-foreground font-mono">{flight.aircraft} · {flight.flightRule}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono uppercase ${ap.className}`}>{ap.label}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono uppercase ${meta.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
            </span>
            <Badge variant="outline" className="font-mono text-xs">{PHASE_META[flight.phase].label}</Badge>
          </div>
        </div>

        {emerg && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/20 px-3 py-2 text-destructive">
            <span className="font-mono text-xs font-bold uppercase tracking-wider">SQUAWK {flight.squawk} · {emerg.label}</span>
            <span className="text-[11px] opacity-80">{emerg.short}</span>
          </div>
        )}
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <Card title="Route" icon={<MapPin className="h-4 w-4" />}>
          <div className="flex items-center gap-3 text-xl font-mono">
            <span className="font-bold tracking-wider">{flight.departure}</span>
            <span className="text-primary">→</span>
            <span className="font-bold tracking-wider">{flight.arrival}</span>
          </div>
          {flight.route && <div className="mt-2 font-mono text-xs text-muted-foreground">{flight.route}</div>}
        </Card>

        <Card title="Schedule" icon={<Clock className="h-4 w-4" />}>
          <Row label="Date" value={flight.flightDate || "—"} />
          <Row label="ETD" value={flight.etd || "—"} />
          <Row label="ETA" value={flight.eta || "—"} />
        </Card>

        <Card title="Flight Info" icon={<Plane className="h-4 w-4 -rotate-45" />}>
          <Row label="Squawk" value={flight.squawk || "—"} mono />
          <Row label="Cruise" value={flight.cruiseLevel || "—"} mono />
          <Row label="Gate" value={flight.gate || "—"} mono />
          <Row label="Rule" value={flight.flightRule} mono />
        </Card>

        <Card title="Pilot" icon={<User className="h-4 w-4" />}>
          <Row label="Roblox" value={flight.robloxUsername || "—"} mono />
          <Row label="Discord" value={flight.discordUsername || "—"} mono />
          {flight.copilotDiscordUsername && <Row label="Copilot" value={flight.copilotDiscordUsername} mono />}
          {flight.filerUsername && <Row label="Filed by" value={flight.filerUsername} mono />}
        </Card>
      </section>

      {related.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Wrench className="h-4 w-4" /> Ground services for {flight.callsign}
          </div>
          <div className="space-y-2">
            {related.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
                <Badge variant="outline">{g.status.replace("_", " ")}</Badge>
                <span className="text-muted-foreground">{g.airport} · Gate {g.gate}</span>
                <span className="flex flex-wrap gap-1">
                  {g.services.map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                </span>
                {g.crew_username && <span className="text-muted-foreground">· crew: {g.crew_username}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {flight.ticketsEnabled && !isOwner && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm">
            <TicketIcon className="h-5 w-5 text-primary" />
            {myTicket ? (
              <span><Badge className="bg-status-landed/20 text-status-landed border-status-landed/40">Ticket bought</Badge> You're on the passenger list.</span>
            ) : (
              <span>Tickets are open for this flight.</span>
            )}
          </div>
          {!myTicket && (
            <Link to="/flights/$id/ticket" params={{ id: flight.id }}>
              <Button className="gap-2"><TicketIcon className="h-4 w-4" /> Get ticket</Button>
            </Link>
          )}
        </section>
      )}

      {isOwner && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4" /> Passengers ({tickets.length})
          </div>
          {tickets.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tickets booked yet{flight.ticketsEnabled ? "." : " — open tickets in My Flights to let passengers book."}</p>
          ) : (
            <div className="space-y-1.5">
              {tickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-2 text-xs font-mono">
                  <span>{t.passenger_discord_username} · Roblox: {t.passenger_roblox_username}</span>
                  <span className="text-muted-foreground">{new Date(t.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">
        {icon} {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono font-medium" : "font-medium"}>{value}</span>
    </div>
  );
}
