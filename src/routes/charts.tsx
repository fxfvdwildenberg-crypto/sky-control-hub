import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Map as MapIcon, Search, ExternalLink, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getAeronavCharts } from "@/lib/aeronav.functions";

export const Route = createFileRoute("/charts")({
  head: () => ({
    meta: [
      { title: "Charts — ATC365" },
      { name: "description", content: "PTFS aviation charts from AeroNav — SIDs, STARs, approaches, taxi & reference." },
    ],
  }),
  component: ChartsPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  SID: "Departures (SID)",
  STAR: "Arrivals (STAR)",
  APP: "Approaches",
  TAXI: "Taxi / Airport",
  REF: "Reference",
};

function ChartsPage() {
  const fn = useServerFn(getAeronavCharts);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["aeronav-charts"],
    queryFn: () => fn(),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 25 * 60 * 1000,
  });

  const [airport, setAirport] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const airports = data?.airports ?? [];

  const categories = useMemo(() => {
    const s = new Set<string>();
    airports.forEach((a) => a.charts.forEach((c) => s.add(c.category)));
    return Array.from(s).sort();
  }, [airports]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: { icao: string; airportName: string; chart: { id: string; title: string; category: string; viewLink: string } }[] = [];
    for (const a of airports) {
      if (airport !== "all" && a.icao !== airport) continue;
      for (const c of a.charts) {
        if (category !== "all" && c.category !== category) continue;
        if (q && !(`${a.icao} ${a.iata} ${a.name} ${c.id} ${c.title} ${c.category}`.toLowerCase().includes(q))) continue;
        out.push({ icao: a.icao, airportName: a.name, chart: c });
      }
    }
    return out;
  }, [airports, airport, category, query]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = `${r.icao} · ${r.airportName}`;
      if (!m.has(key)) m.set(key, [] as typeof rows);
      m.get(key)!.push(r);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
          <MapIcon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Charts</h1>
          <p className="text-sm text-muted-foreground">
            Live from AeroNav · {rows.length} charts · {airports.length} airports · auto-updates every 30 min
          </p>
        </div>
        <button onClick={() => refetch()} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-muted">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chart, ICAO, airport…" className="pl-8 font-mono" />
        </div>
        <Select value={airport} onValueChange={setAirport}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All airports</SelectItem>
            {airports.map((a) => <SelectItem key={a.icao} value={a.icao}>{a.icao} — {a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All chart types</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground font-mono">Loading charts…</div>}
      {!isLoading && rows.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No charts match your filters.
        </div>
      )}

      {grouped.map(([airportKey, list]) => (
        <section key={airportKey} className="space-y-2">
          <h2 className="text-sm font-mono uppercase tracking-[0.15em] text-muted-foreground">{airportKey}</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => (
              <a
                key={r.icao + r.chart.id}
                href={r.chart.viewLink}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-xl border bg-card px-3 py-2 hover:border-primary/50 transition"
              >
                <Badge variant="outline" className="font-mono text-[10px]">{r.chart.category}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.chart.title}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{r.chart.id}</div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
