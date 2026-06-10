import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plane, Check, Ticket as TicketIcon } from "lucide-react";
import { toast } from "sonner";
import { useFlightStore } from "@/lib/flight-store";
import { useCurrentUser } from "@/lib/use-current-user";
import { bookTicket, listAllTickets } from "@/lib/ticket.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/flights/$id/ticket")({
  head: () => ({ meta: [{ title: "Book Ticket — ATC365" }] }),
  component: TicketPage,
});

function TicketPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { flights } = useFlightStore();
  const flight = flights.find((f) => f.id === id);
  const { data: user } = useCurrentUser();
  const book = useServerFn(bookTicket);
  const listTickets = useServerFn(listAllTickets);
  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => listTickets(),
  });
  const [discord, setDiscord] = useState(user?.username ?? "");
  const [roblox, setRoblox] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!flight) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Flight not found</h1>
        <Link to="/"><Button className="mt-4" variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button></Link>
      </div>
    );
  }

  const already = tickets.find(
    (t) => t.flight_plan_id === flight.id && t.passenger_discord_id === user?.discordId,
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Sign in with Discord first");
    if (!discord.trim() || !roblox.trim()) return toast.error("Fill both usernames");
    setSubmitting(true);
    try {
      await book({ data: { flightPlanId: flight.id, discordUsername: discord, robloxUsername: roblox } });
      toast.success("Ticket booked!");
      qc.invalidateQueries({ queryKey: ["tickets"] });
      navigate({ to: "/flights/$id", params: { id: flight.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <Link to="/flights/$id" params={{ id: flight.id }}>
        <Button size="sm" variant="ghost" className="-ml-2 mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to flight
        </Button>
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        {/* Boarding pass header */}
        <div className="relative bg-gradient-to-r from-primary/30 via-primary/10 to-transparent px-6 py-5">
          <div className="flex items-center gap-3">
            <TicketIcon className="h-6 w-6 text-primary" />
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">Boarding pass</div>
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-xs uppercase text-muted-foreground">Flight</div>
              <div className="font-mono text-2xl font-bold tracking-wider">{flight.callsign}</div>
            </div>
            <div className="flex items-center gap-3 text-lg font-mono">
              <div className="text-right">
                <div className="text-[10px] uppercase text-muted-foreground">From</div>
                <div className="text-2xl font-bold">{flight.departure}</div>
              </div>
              <Plane className="h-5 w-5 -rotate-45 text-primary" />
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">To</div>
                <div className="text-2xl font-bold">{flight.arrival}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3 text-xs font-mono">
            <Cell label="Date" value={flight.flightDate || "—"} />
            <Cell label="Departure" value={flight.etd || "—"} />
            <Cell label="Arrival" value={flight.eta || "—"} />
            <Cell label="Gate" value={flight.gate || "—"} />
          </div>
        </div>

        <div className="border-t border-dashed border-border" />

        {already ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-landed/20 text-status-landed">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-lg font-semibold">Ticket already booked</h2>
            <p className="text-sm text-muted-foreground">You're on the passenger list for this flight.</p>
            <Link to="/my-flights"><Button className="mt-4">View My Flights</Button></Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 px-6 py-6">
            <h2 className="text-sm font-mono uppercase tracking-[0.15em] text-muted-foreground">Passenger details</h2>
            {!user && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                Sign in with Discord to book a ticket.
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Discord Username</Label>
                <Input value={discord} onChange={(e) => setDiscord(e.target.value)} maxLength={40} placeholder="passenger.user" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Roblox Username</Label>
                <Input value={roblox} onChange={(e) => setRoblox(e.target.value)} maxLength={32} placeholder="Builderman" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3">
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-xl font-bold text-primary">FREE</div>
              </div>
              <Button type="submit" disabled={submitting || !user} size="lg" className="gap-2">
                {submitting ? "Booking…" : "Confirm booking"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
