import { createServerFn } from "@tanstack/react-start";

export type AeroChart = { id: string; title: string; category: string; link: string; viewLink: string };
export type AeroAirport = { icao: string; iata: string; name: string; charts: AeroChart[] };

let cache: { at: number; data: AeroAirport[] } | null = null;
const TTL_MS = 30 * 60 * 1000;

function extractArray(src: string, name: string): string {
  const idx = src.indexOf(name);
  if (idx < 0) throw new Error(`${name} not found`);
  const start = src.indexOf("[", idx);
  if (start < 0) throw new Error("no array");
  let depth = 0;
  let inStr: false | '"' | "'" | "`" = false;
  let esc = false;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === inStr) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
    if (ch === "[") depth++;
    else if (ch === "]") { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error("unbalanced");
}

function driveView(link: string): string {
  // convert drive.google.com/file/d/{id}/view -> preview link with zoom/rotate
  const m = link.match(/\/file\/d\/([^/]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/view`;
  return link;
}

async function loadAeronav(): Promise<AeroAirport[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const res = await fetch("https://aeronav.space/js/data.js", { headers: { "cache-control": "no-cache" } });
  const text = await res.text();
  const arrText = extractArray(text, "AIRPORTS");
  const raw = JSON.parse(arrText) as AeroAirport[];
  const data = raw.map((a) => ({
    ...a,
    charts: a.charts.map((c) => ({ ...c, viewLink: driveView(c.link) })),
  }));
  cache = { at: Date.now(), data };
  return data;
}

export const getAeronavCharts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const airports = await loadAeronav();
    return { ok: true as const, airports, updated: new Date().toISOString() };
  } catch (e) {
    return { ok: false as const, airports: [] as AeroAirport[], error: (e as Error).message, updated: new Date().toISOString() };
  }
});
