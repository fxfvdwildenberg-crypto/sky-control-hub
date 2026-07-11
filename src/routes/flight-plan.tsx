import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plane } from "lucide-react";
import { fileFlightPlan } from "@/lib/flight.functions";
import { getFlightPlanDefaults } from "@/lib/prefs.functions";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/flight-plan")({
  head: () => ({
    meta: [
      { title: "File Flight Plan — ATC365" },
      { name: "description", content: "Submit a new IFR/VFR flight plan to the ATC365 network." },
    ],
  }),
  component: FlightPlanPage,
});

const icao = z.string().trim().regex(/^[A-Z]{4}$/, "4-letter ICAO");
const hhmm = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM");
const ymd = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Date required");

const schema = z.object({
  callsign: z.string().trim().min(2).max(8).regex(/^[A-Z0-9]+$/, "A-Z, 0-9"),
  aircraft: z.string().trim().min(2).max(8).regex(/^[A-Z0-9]+$/, "A-Z, 0-9"),
  departure: icao,
  arrival: icao,
  route: z.string().trim().max(200).default(""),
  flightRule: z.enum(["IFR", "VFR"]),
  cruiseLevel: z.string().trim().min(2).max(10).regex(/^[A-Z0-9]+$/, "e.g. FL350"),
  gate: z.string().trim().min(1).max(10, "Max 10 chars"),
  flightDate: ymd,
  etd: hhmm,
  eta: hhmm,
  robloxUsername: z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9_]+$/, "Roblox letters/digits/_"),
  discordUsername: z.string().trim().min(1).max(40, "Required"),
  copilotDiscordUsername: z.string().trim().max(40).optional().default(""),
});

const UPPER_KEYS = new Set(["callsign", "aircraft", "departure", "arrival", "cruiseLevel", "gate", "route"]);

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function FlightPlanPage() {
  const navigate = useNavigate();
  const file = useServerFn(fileFlightPlan);
  const defaultsFn = useServerFn(getFlightPlanDefaults);
  const { data: user } = useCurrentUser();
  const { data: defaults } = useQuery({ queryKey: ["flight-defaults"], queryFn: () => defaultsFn(), staleTime: 60_000 });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    callsign: "", aircraft: "", departure: "", arrival: "",
    route: "", flightRule: "IFR" as "IFR" | "VFR",
    cruiseLevel: "", gate: "",
    flightDate: todayISO(), etd: "", eta: "",
    robloxUsername: "", discordUsername: "", copilotDiscordUsername: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prefill smart defaults once loaded (only for empty fields)
  useEffect(() => {
    if (!defaults) return;
    setForm((s) => ({
      ...s,
      aircraft: s.aircraft || defaults.aircraft || "",
      departure: s.departure || defaults.departure || "",
      cruiseLevel: s.cruiseLevel || defaults.cruiseLevel || "",
      flightRule: (s.flightRule || defaults.flightRule || "IFR") as "IFR" | "VFR",
      gate: s.gate || defaults.gate || "",
      robloxUsername: s.robloxUsername || defaults.robloxUsername || "",
      discordUsername: s.discordUsername || defaults.discordUsername || "",
    }));
  }, [defaults]);


  const set = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: k === "flightRule" ? (v as "IFR" | "VFR") : UPPER_KEYS.has(k) ? v.toUpperCase() : v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      toast.error("Please fix the errors in the form");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await file({ data: result.data });
      toast.success(`Flight plan ${result.data.callsign} filed — pending approval (squawk 1000)`);
      navigate({ to: "/my-flights" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to file");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">File Flight Plan</h1>
          <p className="text-sm text-muted-foreground">Squawk is set to 1000 until your plan is approved. Pending until ATC approval (auto-approves after 5 min)</p>
        </div>
      </header>

      {!user && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          You must sign in with Discord to file a flight plan.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Callsign" error={errors.callsign}>
            <Input value={form.callsign} onChange={(e) => set("callsign", e.target.value)} placeholder="BAW245" maxLength={8} className="font-mono uppercase tracking-wider" />
          </Field>
          <Field label="Aircraft Type" error={errors.aircraft}>
            <Input value={form.aircraft} onChange={(e) => set("aircraft", e.target.value)} placeholder="B772" maxLength={8} className="font-mono uppercase tracking-wider" />
          </Field>
          <Field label="Departure (ICAO)" error={errors.departure}>
            <Input value={form.departure} onChange={(e) => set("departure", e.target.value)} placeholder="EGLL" maxLength={4} className="font-mono uppercase tracking-wider" />
          </Field>
          <Field label="Arrival (ICAO)" error={errors.arrival}>
            <Input value={form.arrival} onChange={(e) => set("arrival", e.target.value)} placeholder="KJFK" maxLength={4} className="font-mono uppercase tracking-wider" />
          </Field>
          <Field label="Flight Date" error={errors.flightDate}>
            <Input type="date" value={form.flightDate} min={todayISO()} onChange={(e) => set("flightDate", e.target.value)} />
          </Field>
          <Field label="Flight Rule">
            <Select value={form.flightRule} onValueChange={(v) => set("flightRule", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IFR">IFR</SelectItem>
                <SelectItem value="VFR">VFR</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Expected Departure (HH:MM)" error={errors.etd}>
            <Input type="time" value={form.etd} onChange={(e) => set("etd", e.target.value)} className="font-mono" />
          </Field>
          <Field label="Expected Arrival (HH:MM)" error={errors.eta}>
            <Input type="time" value={form.eta} onChange={(e) => set("eta", e.target.value)} className="font-mono" />
          </Field>
          <Field label="Cruise Level" error={errors.cruiseLevel}>
            <Input value={form.cruiseLevel} onChange={(e) => set("cruiseLevel", e.target.value)} placeholder="FL350" maxLength={10} className="font-mono uppercase tracking-wider" />
          </Field>
          <Field label="Gate" error={errors.gate}>
            <Input value={form.gate} onChange={(e) => set("gate", e.target.value)} placeholder="A12" maxLength={10} className="font-mono uppercase tracking-wider" />
          </Field>
          <Field label="Roblox Username" error={errors.robloxUsername}>
            <Input value={form.robloxUsername} onChange={(e) => set("robloxUsername", e.target.value)} placeholder="Builderman" maxLength={32} className="font-mono" />
          </Field>
          <Field label="Discord Username" error={errors.discordUsername}>
            <Input value={form.discordUsername} onChange={(e) => set("discordUsername", e.target.value)} placeholder="pilot.user" maxLength={40} className="font-mono" />
          </Field>
          <Field label="Copilot Discord (optional)" error={errors.copilotDiscordUsername}>
            <Input value={form.copilotDiscordUsername} onChange={(e) => set("copilotDiscordUsername", e.target.value)} placeholder="copilot.user" maxLength={40} className="font-mono" />
          </Field>
        </div>
        <Field label="Route" error={errors.route}>
          <Input value={form.route} onChange={(e) => set("route", e.target.value)} placeholder="MALOT NATA TUDEP" maxLength={200} className="font-mono uppercase" />
        </Field>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground font-mono">Squawk is auto-assigned to 1000. Editable in My Flights after approval.</p>
          <Button type="submit" className="gap-2" disabled={submitting || !user}>
            <Plane className="h-4 w-4 -rotate-45" /> {submitting ? "Filing…" : "File Plan"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
