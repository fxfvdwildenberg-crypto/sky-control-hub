import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export const getOverview = createServerFn({ method: "GET" }).handler(async () => {
  const [plans, atis, ground] = await Promise.all([
    db.from("flight_plans").select("*").order("created_at", { ascending: false }),
    db.from("atis").select("*").order("updated_at", { ascending: false }),
    db.from("ground_requests").select("*").order("created_at", { ascending: false }),
  ]);
  return {
    flightPlans: plans.data ?? [],
    atis: atis.data ?? [],
    groundRequests: ground.data ?? [],
  };
});
