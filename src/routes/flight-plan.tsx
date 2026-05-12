import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useFlightStore, type FlightStatus } from "@/lib/flight-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plane } from "lucide-react";

export const Route = createFileRoute("/flight-plan")({
  head: () => ({
    meta: [
      { title: "File Flight Plan — SkyControl ATC" },
      { name: "description", content: "Submit a new IFR/VFR flight plan to the ATC network." },
    ],
  }),
  component: FlightPlanPage,
});

const icao = z.string().trim().regex(/^[A-Z]{4}$/, "Must be a 4-letter ICAO");
const schema = z.object({
  callsign: z.string().trim().min(3, "Min 3 chars").max(8).regex(/^[A-Z0-9]+$/, "Uppercase A-Z, 0-9"),
  aircraft: z.string().trim().min(2).max(8).regex(/^[A-Z0-9]+$/, "Uppercase A-Z, 0-9"),
  departure: icao,
  arrival: icao,
  route: z.string().trim().max(200).optional().default(""),
  squawk: z.string().trim().regex(/^[0-7]{4}$/, "4 digits 0-7").optional().or(z.literal("")),
  status: z.enum(["parked", "taxi", "airborne", "landed"]),
});

function FlightPlanPage() {
  const { addFlight } = useFlightStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    callsign: "",
    aircraft: "",
    departure: "",
    arrival: "",
    route: "",
    squawk: "",
    status: "parked" as FlightStatus,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: k === "status" ? (v as FlightStatus) : v.toUpperCase() }));

  const onSubmit = (e: React.FormEvent) => {
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
    addFlight({ ...result.data, route: result.data.route ?? "", squawk: result.data.squawk ?? "" });
    toast.success(`Flight plan ${result.data.callsign} filed`);
    navigate({ to: "/atc" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">File Flight Plan</h1>
          <p className="text-sm text-muted-foreground">Submit a new flight plan to the ATC network</p>
        </div>
      </header>

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
          <Field label="Initial Status">
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="parked">Parked</SelectItem>
                <SelectItem value="taxi">Taxi</SelectItem>
                <SelectItem value="airborne">Airborne</SelectItem>
                <SelectItem value="landed">Landed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Route" error={errors.route}>
          <Input value={form.route} onChange={(e) => set("route", e.target.value)} placeholder="MALOT NATA TUDEP" maxLength={200} className="font-mono uppercase" />
        </Field>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground font-mono">All fields validated against ICAO standards</p>
          <Button type="submit" className="gap-2">
            <Plane className="h-4 w-4 -rotate-45" /> File Plan
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
