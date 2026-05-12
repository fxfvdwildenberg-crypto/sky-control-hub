import * as React from "react";

export type FlightStatus = "parked" | "taxi" | "airborne" | "landed";

export interface FlightPlan {
  id: string;
  callsign: string;
  aircraft: string;
  departure: string;
  arrival: string;
  route: string;
  squawk: string;
  status: FlightStatus;
  createdAt: number;
}

export interface AtisEntry {
  id: string;
  icao: string;
  runway: string;
  wind: string;
  qnh: string;
  info: string;
  updatedAt: number;
}

interface StoreState {
  flights: FlightPlan[];
  atis: AtisEntry[];
  addFlight: (f: Omit<FlightPlan, "id" | "createdAt" | "status"> & { status?: FlightStatus }) => void;
  updateFlight: (id: string, patch: Partial<FlightPlan>) => void;
  removeFlight: (id: string) => void;
  upsertAtis: (a: Omit<AtisEntry, "id" | "updatedAt"> & { id?: string }) => void;
  removeAtis: (id: string) => void;
}

const StoreContext = React.createContext<StoreState | null>(null);

const seedFlights: FlightPlan[] = [
  { id: "1", callsign: "BAW245", aircraft: "B772", departure: "EGLL", arrival: "KJFK", route: "MALOT NATA TUDEP", squawk: "2451", status: "airborne", createdAt: Date.now() - 90000 },
  { id: "2", callsign: "DLH401", aircraft: "A359", departure: "EDDF", arrival: "KJFK", route: "RIDAR NATB", squawk: "1234", status: "taxi", createdAt: Date.now() - 60000 },
  { id: "3", callsign: "AFR083", aircraft: "B77W", departure: "LFPG", arrival: "KSFO", route: "ATSIX NATX", squawk: "3702", status: "parked", createdAt: Date.now() - 30000 },
  { id: "4", callsign: "UAE201", aircraft: "A388", departure: "OMDB", arrival: "EGLL", route: "DESDI L223", squawk: "5421", status: "landed", createdAt: Date.now() - 10000 },
];

const seedAtis: AtisEntry[] = [
  { id: "a1", icao: "EGLL", runway: "27R", wind: "260/12KT", qnh: "1013", info: "C", updatedAt: Date.now() },
  { id: "a2", icao: "KJFK", runway: "04L", wind: "040/08KT", qnh: "1015", info: "B", updatedAt: Date.now() },
];

export function FlightStoreProvider({ children }: { children: React.ReactNode }) {
  const [flights, setFlights] = React.useState<FlightPlan[]>(seedFlights);
  const [atis, setAtis] = React.useState<AtisEntry[]>(seedAtis);

  const value: StoreState = {
    flights,
    atis,
    addFlight: (f) =>
      setFlights((prev) => [
        {
          ...f,
          status: f.status ?? "parked",
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        },
        ...prev,
      ]),
    updateFlight: (id, patch) =>
      setFlights((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    removeFlight: (id) => setFlights((prev) => prev.filter((x) => x.id !== id)),
    upsertAtis: (a) =>
      setAtis((prev) => {
        const id = a.id ?? crypto.randomUUID();
        const exists = prev.some((x) => x.id === id);
        const entry: AtisEntry = { ...a, id, updatedAt: Date.now() };
        return exists ? prev.map((x) => (x.id === id ? entry : x)) : [entry, ...prev];
      }),
    removeAtis: (id) => setAtis((prev) => prev.filter((x) => x.id !== id)),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useFlightStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useFlightStore must be used within FlightStoreProvider");
  return ctx;
}

export const STATUS_META: Record<FlightStatus, { label: string; color: string; dot: string }> = {
  parked: { label: "Parked", color: "text-status-parked border-status-parked/40 bg-status-parked/10", dot: "bg-status-parked" },
  taxi: { label: "Taxi", color: "text-status-taxi border-status-taxi/40 bg-status-taxi/10", dot: "bg-status-taxi" },
  airborne: { label: "Airborne", color: "text-status-airborne border-status-airborne/40 bg-status-airborne/10", dot: "bg-status-airborne" },
  landed: { label: "Landed", color: "text-status-landed border-status-landed/40 bg-status-landed/10", dot: "bg-status-landed" },
};
