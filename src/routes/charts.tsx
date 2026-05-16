import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Map as MapIcon, Search, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/charts")({
  head: () => ({
    meta: [
      { title: "Charts — ATC365" },
      { name: "description", content: "PTFS airport ground charts grouped by island." },
    ],
  }),
  component: ChartsPage,
});

type Chart = { icao: string; name: string; island: string; url: string };

const BASE = "https://ptfs.app/charts/light";
const c = (icao: string, name: string, island: string): Chart => ({
  icao,
  name,
  island,
  url: `${BASE}/${icao}%20Ground%20Chart.png`,
});

const CHARTS: Chart[] = [
  c("IBAR", "Barra Airport", "Cyprus"),
  c("IHEN", "Henstridge Airfield", "Cyprus"),
  c("ILAR", "Larnaca Intl.", "Cyprus"),
  c("IIAB", "McConnell AFB", "Cyprus"),
  c("IPAP", "Paphos Intl.", "Cyprus"),
  c("IKFL", "Keflavik Intl.", "Grindavik"),
  c("ITEY", "Pingeyri Airport", "Grindavik"),
  c("IJAF", "Al Najaf", "Izolirani"),
  c("IZOL", "Izolirani Intl.", "Izolirani"),
  c("ISCM", "RAF Scampton", "Izolirani"),
  c("IBRD", "Bird Island Airfield", "Orenji"),
  c("IDCS", "Saba Airport", "Orenji"),
  c("ITKO", "Tokyo Intl.", "Orenji"),
  c("ILKL", "Lukla Airport", "Perth"),
  c("IPPH", "Perth Intl.", "Perth"),
  c("IGAR", "Air Base Garry", "Rockford"),
  c("IBLT", "Boltic Airfield", "Rockford"),
  c("IRFD", "Greater Rockford", "Rockford"),
  c("IMLR", "Mellor Intl.", "Rockford"),
  c("ITRC", "Training Centre", "Rockford"),
  c("IBTH", "Saint Barthelemy", "Saint Barthelemy"),
  c("IUFO", "UFO Base", "Saint Barthelemy"),
  c("ISAU", "Sauthamptona Airport", "Sauthamptona"),
  c("ISKP", "Skopelos Airfield", "Skopelos"),
];

const ISLANDS = Array.from(new Set(CHARTS.map((x) => x.island))).sort();

function ChartsPage() {
  const [island, setIsland] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHARTS.filter((ch) => {
      if (island !== "all" && ch.island !== island) return false;
      if (!q) return true;
      return ch.icao.toLowerCase().includes(q) || ch.name.toLowerCase().includes(q);
    });
  }, [island, query]);

  const grouped = useMemo(() => {
    const m = new Map<string, Chart[]>();
    for (const ch of filtered) {
      if (!m.has(ch.island)) m.set(ch.island, []);
      m.get(ch.island)!.push(ch);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
          <MapIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Charts</h1>
          <p className="text-sm text-muted-foreground">
            PTFS ground charts · {filtered.length} of {CHARTS.length} · Click a chart to open it in a new tab (zoom & rotate in the browser)
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ICAO or airport name…" className="pl-8 font-mono" />
        </div>
        <Select value={island} onValueChange={setIsland}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All islands</SelectItem>
            {ISLANDS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No charts match your filters.
        </div>
      )}

      {grouped.map(([islandName, list]) => (
        <section key={islandName} className="space-y-2">
          <h2 className="text-sm font-mono uppercase tracking-[0.15em] text-muted-foreground">{islandName}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((ch) => (
              <a
                key={ch.icao}
                href={ch.url}
                target="_blank"
                rel="noreferrer"
                className="group block rounded-xl border border-border bg-card p-3 transition hover:border-primary/50 animate-fade-in-up"
              >
                <div className="aspect-square w-full overflow-hidden rounded-md bg-muted/30">
                  <img src={ch.url} alt={`${ch.name} ground chart (${ch.icao})`} loading="lazy" className="h-full w-full object-contain transition group-hover:scale-105" />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold tracking-wider">{ch.icao}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{ch.name}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                </div>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
