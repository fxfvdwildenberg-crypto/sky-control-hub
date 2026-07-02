import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useFlightStore } from "@/lib/flight-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { useServerFn } from "@tanstack/react-start";
import { submitAtis } from "@/lib/atis.functions";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/atis")({
  head: () => ({
    meta: [
      { title: "ATIS Broadcast — ATC365" },
      { name: "description", content: "Manage Automatic Terminal Information Service broadcasts for airports." },
    ],
  }),
  component: () => <RoleGuard><AtisPage /></RoleGuard>,
});

const schema = z.object({
  icao: z.string().trim().regex(/^[A-Z]{4}$/, "4-letter ICAO"),
  departureRunways: z.string().trim().min(1, "Required").max(10, "Max 10 chars"),
  arrivalRunways: z.string().trim().min(1, "Required").max(10, "Max 10 chars"),
  wind: z.string().trim().regex(/^\d{3}\/\d{1,3}KT$/, "e.g. 260/12KT"),
  qnh: z.string().trim().regex(/^\d{4}$/, "4 digits"),
  info: z.string().trim().regex(/^[A-Z]$/, "Single letter"),
});

function AtisPage() {
  const { atis, removeAtis } = useFlightStore();
  const submit = useServerFn(submitAtis);
  const qc = useQueryClient();
  const [form, setForm] = useState({ icao: "", departureRunways: "", arrivalRunways: "", wind: "", qnh: "", info: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v.toUpperCase() }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const i of result.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      await submit({ data: result.data });
      toast.success(`ATIS ${result.data.icao} INFO ${result.data.info} broadcast · +tokens earned`);
      setForm({ icao: "", departureRunways: "", arrivalRunways: "", wind: "", qnh: "", info: "" });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Radio className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ATIS Broadcast</h1>
          <p className="text-sm text-muted-foreground">Higher info letters auto-replace older ones for the same airport</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] h-fit">
          <h2 className="text-sm font-mono uppercase tracking-[0.15em] text-muted-foreground">New Broadcast</h2>

          <Field label="Airport ICAO" error={errors.icao}>
            <Input value={form.icao} onChange={(e) => set("icao", e.target.value)} maxLength={4} placeholder="EGLL" className="font-mono uppercase tracking-wider" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dep Runways" error={errors.departureRunways}>
              <Input value={form.departureRunways} onChange={(e) => set("departureRunways", e.target.value)} maxLength={10} placeholder="27R/09L" className="font-mono uppercase" />
            </Field>
            <Field label="Arr Runways" error={errors.arrivalRunways}>
              <Input value={form.arrivalRunways} onChange={(e) => set("arrivalRunways", e.target.value)} maxLength={10} placeholder="27L" className="font-mono uppercase" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Info Letter" error={errors.info}>
              <Input value={form.info} onChange={(e) => set("info", e.target.value)} maxLength={1} placeholder="C" className="font-mono uppercase tracking-widest text-center" />
            </Field>
            <Field label="QNH" error={errors.qnh}>
              <Input value={form.qnh} onChange={(e) => set("qnh", e.target.value)} maxLength={4} placeholder="1013" className="font-mono" />
            </Field>
          </div>
          <Field label="Wind" error={errors.wind}>
            <Input value={form.wind} onChange={(e) => set("wind", e.target.value)} placeholder="260/12KT" className="font-mono uppercase" />
          </Field>

          <Button type="submit" className="w-full gap-2"><Plus className="h-4 w-4" /> Broadcast ATIS</Button>
        </form>

        <div className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-[0.15em] text-muted-foreground">Active Broadcasts</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {atis.length === 0 && (
              <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">No active ATIS broadcasts.</p>
            )}
            {atis.map((a) => (
              <div key={a.id} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition hover:border-primary/50 animate-fade-in-up">
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition-opacity opacity-0 group-hover:opacity-100" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="font-mono text-2xl font-bold tracking-wider">{a.icao}</div>
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                      <span className="relative inline-flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                      INFORMATION {a.info}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { removeAtis(a.id); toast.success(`Removed ATIS ${a.icao}`); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="relative mt-4 grid grid-cols-2 gap-3 font-mono">
                  <Stat label="Dep RWY" value={a.departureRunways} />
                  <Stat label="Arr RWY" value={a.arrivalRunways} />
                  <Stat label="Wind" value={a.wind} />
                  <Stat label="QNH" value={a.qnh} />
                </div>
                <div className="relative mt-4 border-t border-border/60 pt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Updated {new Date(a.updatedAt).toISOString().slice(11, 19)}Z
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
