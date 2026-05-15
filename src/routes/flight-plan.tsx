import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plane } from "lucide-react";
import { fileFlightPlan } from "@/lib/flight.functions";
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
const schema = z.object({
  callsign: z.string().trim().min(2).max(8).regex(/^[A-Z0-9]+$/, "A-Z, 0-9"),
  aircraft: z.string().trim().min(2).max(8).regex(/^[A-Z0-9]+$/, "A-Z, 0-9"),
  departure: icao,
  arrival: icao,
  squawk: z.string().trim().regex(/^[0-7]{4}$/, "4 digits 0-7"),
  route: z.string().trim().max(200).default(""),
  flightRule: z.enum(["IFR", "VFR"]),
  cruiseLevel: z.string().trim().min(2).max(10).regex(/^[A-Z0-9]+$/, "e.g. FL350"),
  gate: z.string().trim().min(1).max(10, "Max 10 chars"),
});

function FlightPlanPage() {
  const navigate = useNavigate();
  const file = useServerFn(fileFlightPlan);
  const { data: user } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    callsign: "", aircraft: "", departure: "", arrival: "",
    squawk: "", route: "", flightRule: "IFR" as "IFR" | "VFR",
    cruiseLevel: "", gate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: k === "flightRule" ? (v as "IFR" | "VFR") : v.toUpperCase() }));

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
      toast.success(`Flight plan ${result.data.callsign} filed — pending approval`);
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
          <p className="text-sm text-muted-foreground">Pending until ATC approval (auto-approves after 5 min)</p>
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
          <Field label="Squawk" error={errors.squawk}>
            <Input value={form.squawk} onChange={(e) => set("squawk", e.target.value)} placeholder="2000" maxLength={4} className="font-mono tracking-wider" />
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
          <Field label="Cruise Level" error={errors.cruiseLevel}>
            <Input value={form.cruiseLevel} onChange={(e) => set("cruiseLevel", e.target.value)} placeholder="FL350" maxLength={10} className="font-mono uppercase tracking-wider" />
          </Field>
          <Field label="Gate" error={errors.gate}>
            <Input value={form.gate} onChange={(e) => set("gate", e.target.value)} placeholder="A12" maxLength={10} className="font-mono uppercase tracking-wider" />
          </Field>
        </div>
        <Field label="Route" error={errors.route}>
          <Input value={form.route} onChange={(e) => set("route", e.target.value)} placeholder="MALOT NATA TUDEP" maxLength={200} className="font-mono uppercase" />
        </Field>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground font-mono">All fields validated against ICAO standards</p>
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
