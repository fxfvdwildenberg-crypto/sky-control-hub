import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listGroundRequests,
  createGroundRequest,
  updateGroundStatus,
  deleteGroundRequest,
  sendGroundMessage,
  getRequestMessages,
  GROUND_SERVICES,
} from "@/lib/ground.functions";
import { useCurrentUser } from "@/lib/use-current-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wrench, Send, Check, X, Play, CheckCircle2, Loader2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/ground")({
  component: GroundPage,
  head: () => ({ meta: [{ title: "Ground Crew — ATC365" }] }),
});

type GroundReq = {
  id: string;
  pilot_discord_id: string;
  pilot_username: string;
  callsign: string;
  gate: string;
  aircraft: string;
  airport: string;
  services: string[];
  status: "pending" | "accepted" | "in_progress" | "finished" | "denied";
  crew_discord_id: string | null;
  crew_username: string | null;
  crew_roblox_username: string | null;
  created_at: string;
  finished_at: string | null;
};

function GroundPage() {
  const { data: user } = useCurrentUser();
  const listFn = useServerFn(listGroundRequests);
  const { data: requests = [] } = useQuery({
    queryKey: ["ground-requests"],
    queryFn: () => listFn() as Promise<GroundReq[]>,
    refetchInterval: 4000,
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Wrench className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Ground Crew</h1>
          <p className="text-sm text-muted-foreground">
            Request and provide aircraft ground services.
          </p>
        </div>
      </div>

      {!user && (
        <Card className="mb-4 p-4 text-sm text-muted-foreground">
          Sign in with Discord to use Ground Crew services.
        </Card>
      )}

      <Tabs defaultValue="pilot">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pilot">Pilot</TabsTrigger>
          <TabsTrigger value="crew">Ground Crew</TabsTrigger>
        </TabsList>

        <TabsContent value="pilot" className="mt-4 space-y-4">
          <PilotForm />
          <PilotRequests requests={requests} discordId={user?.discordId} />
        </TabsContent>

        <TabsContent value="crew" className="mt-4 space-y-4">
          <CrewQueue requests={requests} discordId={user?.discordId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PilotForm() {
  const qc = useQueryClient();
  const createFn = useServerFn(createGroundRequest);
  const [callsign, setCallsign] = useState("");
  const [gate, setGate] = useState("");
  const [aircraft, setAircraft] = useState("");
  const [airport, setAirport] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (s: string) =>
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submit = async () => {
    if (!callsign || !gate || !aircraft || !airport || services.length === 0) {
      return toast.error("Fill all fields and pick at least one service");
    }
    setLoading(true);
    try {
      await createFn({ data: { callsign, gate, aircraft, airport, services: services as never } });
      toast.success("Request submitted");
      setCallsign(""); setGate(""); setAircraft(""); setAirport(""); setServices([]);
      qc.invalidateQueries({ queryKey: ["ground-requests"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 font-semibold">New ground request</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Callsign</Label><Input value={callsign} onChange={(e) => setCallsign(e.target.value)} maxLength={20} /></div>
        <div><Label>Aircraft</Label><Input value={aircraft} onChange={(e) => setAircraft(e.target.value)} maxLength={40} /></div>
        <div><Label>Airport (ICAO)</Label><Input value={airport} onChange={(e) => setAirport(e.target.value.toUpperCase())} maxLength={10} /></div>
        <div><Label>Gate</Label><Input value={gate} onChange={(e) => setGate(e.target.value)} maxLength={20} /></div>
      </div>
      <div className="mt-4">
        <Label>Services</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {GROUND_SERVICES.map((s) => (
            <label key={s} className="flex items-center gap-2 rounded border border-border p-2 text-sm">
              <Checkbox checked={services.includes(s)} onCheckedChange={() => toggle(s)} />
              {s}
            </label>
          ))}
        </div>
      </div>
      <Button className="mt-4 w-full" onClick={submit} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit request
      </Button>
    </Card>
  );
}

function statusColor(s: GroundReq["status"]) {
  return {
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    accepted: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    in_progress: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    finished: "bg-green-500/20 text-green-300 border-green-500/40",
    denied: "bg-red-500/20 text-red-300 border-red-500/40",
  }[s];
}

function PilotRequests({ requests, discordId }: { requests: GroundReq[]; discordId?: string }) {
  const mine = requests.filter((r) => r.pilot_discord_id === discordId);
  if (!discordId) return null;
  if (mine.length === 0) return <Card className="p-4 text-sm text-muted-foreground">No active requests.</Card>;
  return (
    <div className="space-y-3">
      {mine.map((r) => <RequestCard key={r.id} req={r} role="pilot" />)}
    </div>
  );
}

function CrewQueue({ requests, discordId }: { requests: GroundReq[]; discordId?: string }) {
  const [roblox, setRoblox] = useState("");
  if (!discordId)
    return <Card className="p-4 text-sm text-muted-foreground">Sign in to work as ground crew.</Card>;

  return (
    <>
      <Card className="p-4">
        <Label>Your Roblox username (required to accept jobs)</Label>
        <Input className="mt-1" value={roblox} onChange={(e) => setRoblox(e.target.value)} placeholder="Roblox username" maxLength={40} />
        <p className="mt-1 text-xs text-muted-foreground">Discord: signed in as your account.</p>
      </Card>
      <div className="space-y-3">
        {requests.length === 0 && <Card className="p-4 text-sm text-muted-foreground">No requests in queue.</Card>}
        {requests.map((r) => <RequestCard key={r.id} req={r} role="crew" roblox={roblox} discordId={discordId} />)}
      </div>
    </>
  );
}

function RequestCard({
  req, role, roblox, discordId,
}: { req: GroundReq; role: "pilot" | "crew"; roblox?: string; discordId?: string }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateGroundStatus);
  const delFn = useServerFn(deleteGroundRequest);
  const [open, setOpen] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["ground-requests"] });

  const act = async (status: "accepted" | "denied" | "in_progress" | "finished") => {
    if ((status === "accepted" || status === "in_progress") && !roblox) {
      return toast.error("Enter your Roblox username first");
    }
    try {
      await updateFn({ data: { id: req.id, status, crew_roblox_username: roblox } });
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  const remove = async () => {
    try { await delFn({ data: { id: req.id } }); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const isCrewOnJob = role === "crew" && req.crew_discord_id === discordId;
  const isRed = req.status === "denied";

  return (
    <Card className={`p-4 ${isRed ? "border-red-500/60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-semibold">{req.callsign}</span>
            <Badge variant="outline" className={statusColor(req.status)}>{req.status.replace("_", " ")}</Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {req.airport} · Gate {req.gate} · {req.aircraft} · pilot {req.pilot_username}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {req.services.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
          </div>
          {req.crew_username && (
            <div className="mt-2 text-xs text-muted-foreground">
              Crew: {req.crew_username}{req.crew_roblox_username ? ` (Roblox: ${req.crew_roblox_username})` : ""}
            </div>
          )}
          {req.status === "finished" && (
            <div className="mt-1 text-xs text-green-500">Auto-deletes 10s after completion.</div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {role === "crew" && req.status === "pending" && (
            <>
              <Button size="sm" onClick={() => act("accepted")} className="gap-1"><Check className="h-3.5 w-3.5" />Accept</Button>
              <Button size="sm" variant="destructive" onClick={() => act("denied")} className="gap-1"><X className="h-3.5 w-3.5" />Deny</Button>
            </>
          )}
          {role === "crew" && req.status === "accepted" && isCrewOnJob && (
            <Button size="sm" onClick={() => act("in_progress")} className="gap-1"><Play className="h-3.5 w-3.5" />Start</Button>
          )}
          {role === "crew" && req.status === "in_progress" && isCrewOnJob && (
            <Button size="sm" onClick={() => act("finished")} className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Finish</Button>
          )}
          {role === "pilot" && req.pilot_discord_id === discordId && (
            <Button size="sm" variant="outline" onClick={remove} className="gap-1"><Trash2 className="h-3.5 w-3.5" />Cancel</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>{open ? "Hide chat" : "Chat"}</Button>
        </div>
      </div>

      {open && <Chat requestId={req.id} role={role} />}
    </Card>
  );
}

function Chat({ requestId, role }: { requestId: string; role: "pilot" | "crew" }) {
  const msgFn = useServerFn(getRequestMessages);
  const sendFn = useServerFn(sendGroundMessage);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data: msgs = [] } = useQuery({
    queryKey: ["ground-msgs", requestId],
    queryFn: () => msgFn({ data: { requestId } }) as Promise<Array<{ id: string; username: string; content: string; role: string; created_at: string }>>,
    refetchInterval: 3000,
  });

  const send = async () => {
    if (!text.trim()) return;
    try {
      await sendFn({ data: { requestId, content: text, role } });
      setText("");
      qc.invalidateQueries({ queryKey: ["ground-msgs", requestId] });
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="mt-3 rounded border border-border bg-muted/30 p-2">
      <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
        {msgs.length === 0 && <p className="text-xs text-muted-foreground">No messages yet.</p>}
        {msgs.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="text-xs text-muted-foreground">[{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}]</span>{" "}
            <span className="font-semibold">{m.username}</span>{" "}
            <Badge variant="outline" className="text-[10px]">{m.role}</Badge>: {m.content}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} maxLength={500} placeholder="Type a message…" />
        <Button onClick={send} size="sm" className="gap-1"><Send className="h-3.5 w-3.5" />Send</Button>
      </div>
    </div>
  );
}
