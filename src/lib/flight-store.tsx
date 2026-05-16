import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export type FlightStatus = "parked" | "taxi" | "airborne" | "landed";
export type ApprovalStatus = "pending" | "approved" | "denied";
export type FlightRule = "IFR" | "VFR";

export interface FlightPlan {
  id: string;
  callsign: string;
  aircraft: string;
  departure: string;
  arrival: string;
  route: string;
  squawk: string;
  status: FlightStatus;
  flightRule: FlightRule;
  cruiseLevel: string;
  gate: string;
  filerDiscordId: string | null;
  filerUsername: string | null;
  approvalStatus: ApprovalStatus;
  createdAt: number;
  robloxUsername: string;
  discordUsername: string;
  copilotDiscordUsername: string;
}

export const EMERGENCY_SQUAWKS: Record<string, { label: string; short: string }> = {
  "7700": { label: "EMERGENCY", short: "General emergency" },
  "7600": { label: "HIJACKING", short: "Hijacking in progress" },
  "7500": { label: "RADIO FAILURE", short: "Lost communications" },
};

export function emergencyFor(squawk: string) {
  return EMERGENCY_SQUAWKS[squawk] ?? null;
}

export interface AtisEntry {
  id: string;
  icao: string;
  departureRunways: string;
  arrivalRunways: string;
  wind: string;
  qnh: string;
  info: string;
  updatedAt: number;
}

interface StoreState {
  flights: FlightPlan[];
  atis: AtisEntry[];
  loading: boolean;
  updateFlight: (id: string, patch: Partial<FlightPlan>) => Promise<void>;
  removeFlight: (id: string) => Promise<void>;
  upsertAtis: (a: Omit<AtisEntry, "id" | "updatedAt"> & { id?: string }) => Promise<void>;
  removeAtis: (id: string) => Promise<void>;
}

const StoreContext = React.createContext<StoreState | null>(null);

type FlightRow = {
  id: string;
  callsign: string;
  aircraft: string;
  departure: string;
  arrival: string;
  route: string;
  squawk: string;
  status: FlightStatus;
  flight_rule: string;
  cruise_level: string;
  gate: string;
  filer_discord_id: string | null;
  filer_username: string | null;
  approval_status: string;
  created_at: string;
  roblox_username?: string;
  discord_username?: string;
  copilot_discord_username?: string;
};

type AtisRow = {
  id: string;
  icao: string;
  departure_runways: string;
  arrival_runways: string;
  wind: string;
  qnh: string;
  info: string;
  updated_at: string;
};

const mapFlight = (r: FlightRow): FlightPlan => ({
  id: r.id,
  callsign: r.callsign,
  aircraft: r.aircraft,
  departure: r.departure,
  arrival: r.arrival,
  route: r.route ?? "",
  squawk: r.squawk ?? "",
  status: r.status,
  flightRule: (r.flight_rule as FlightRule) ?? "IFR",
  cruiseLevel: r.cruise_level ?? "",
  gate: r.gate ?? "",
  filerDiscordId: r.filer_discord_id,
  filerUsername: r.filer_username,
  approvalStatus: (r.approval_status as ApprovalStatus) ?? "pending",
  createdAt: new Date(r.created_at).getTime(),
});

const mapAtis = (r: AtisRow): AtisEntry => ({
  id: r.id,
  icao: r.icao,
  departureRunways: r.departure_runways ?? "",
  arrivalRunways: r.arrival_runways ?? "",
  wind: r.wind,
  qnh: r.qnh,
  info: r.info,
  updatedAt: new Date(r.updated_at).getTime(),
});

export function FlightStoreProvider({ children }: { children: React.ReactNode }) {
  const [flights, setFlights] = React.useState<FlightPlan[]>([]);
  const [atis, setAtis] = React.useState<AtisEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: fp }, { data: at }] = await Promise.all([
        supabase.from("flight_plans").select("*").order("created_at", { ascending: false }),
        supabase.from("atis").select("*").order("updated_at", { ascending: false }),
      ]);
      if (!mounted) return;
      setFlights((fp ?? []).map((r) => mapFlight(r as unknown as FlightRow)));
      setAtis((at ?? []).map((r) => mapAtis(r as unknown as AtisRow)));
      setLoading(false);
    })();

    const fpChan = supabase
      .channel("flight_plans-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "flight_plans" }, (payload) => {
        setFlights((prev) => {
          if (payload.eventType === "INSERT") {
            const row = mapFlight(payload.new as unknown as FlightRow);
            if (prev.some((x) => x.id === row.id)) return prev;
            return [row, ...prev];
          }
          if (payload.eventType === "UPDATE") {
            const row = mapFlight(payload.new as unknown as FlightRow);
            return prev.map((x) => (x.id === row.id ? row : x));
          }
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            return prev.filter((x) => x.id !== id);
          }
          return prev;
        });
      })
      .subscribe();

    const atChan = supabase
      .channel("atis-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "atis" }, (payload) => {
        setAtis((prev) => {
          if (payload.eventType === "INSERT") {
            const row = mapAtis(payload.new as unknown as AtisRow);
            if (prev.some((x) => x.id === row.id)) return prev;
            return [row, ...prev];
          }
          if (payload.eventType === "UPDATE") {
            const row = mapAtis(payload.new as unknown as AtisRow);
            return prev.map((x) => (x.id === row.id ? row : x));
          }
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            return prev.filter((x) => x.id !== id);
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(fpChan);
      supabase.removeChannel(atChan);
    };
  }, []);

  const value: StoreState = {
    flights,
    atis,
    loading,
    updateFlight: async (id, patch) => {
      const dbPatch: Record<string, unknown> = {};
      if (patch.callsign !== undefined) dbPatch.callsign = patch.callsign;
      if (patch.aircraft !== undefined) dbPatch.aircraft = patch.aircraft;
      if (patch.departure !== undefined) dbPatch.departure = patch.departure;
      if (patch.arrival !== undefined) dbPatch.arrival = patch.arrival;
      if (patch.route !== undefined) dbPatch.route = patch.route;
      if (patch.squawk !== undefined) dbPatch.squawk = patch.squawk;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.flightRule !== undefined) dbPatch.flight_rule = patch.flightRule;
      if (patch.cruiseLevel !== undefined) dbPatch.cruise_level = patch.cruiseLevel;
      if (patch.gate !== undefined) dbPatch.gate = patch.gate;
      if (patch.approvalStatus !== undefined) dbPatch.approval_status = patch.approvalStatus;
      await supabase.from("flight_plans").update(dbPatch as never).eq("id", id);
    },
    removeFlight: async (id) => {
      await supabase.from("flight_plans").delete().eq("id", id);
    },
    upsertAtis: async (a) => {
      if (a.id) {
        await supabase.from("atis").update({
          icao: a.icao,
          departure_runways: a.departureRunways,
          arrival_runways: a.arrivalRunways,
          wind: a.wind, qnh: a.qnh, info: a.info,
        }).eq("id", a.id);
      } else {
        await supabase.from("atis").insert({
          icao: a.icao,
          departure_runways: a.departureRunways,
          arrival_runways: a.arrivalRunways,
          wind: a.wind, qnh: a.qnh, info: a.info,
        });
      }
    },
    removeAtis: async (id) => {
      await supabase.from("atis").delete().eq("id", id);
    },
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

export const APPROVAL_META: Record<ApprovalStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "text-status-taxi border-status-taxi/40 bg-status-taxi/10" },
  approved: { label: "Approved", className: "text-status-landed border-status-landed/40 bg-status-landed/10" },
  denied: { label: "Denied", className: "text-destructive border-destructive/40 bg-destructive/10" },
};
